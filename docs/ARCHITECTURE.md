# Architecture

A conventional two-tier application: a React SPA talking to a REST API over
JSON, with MongoDB for storage and a handful of external services for payments,
video, images, e-mail and SMS.

```
┌─────────────────────┐        JSON over HTTPS         ┌──────────────────────┐
│  React SPA (Vite)   │ ─────────────────────────────▶ │  Express API         │
│  TanStack Query     │ ◀───────────────────────────── │  JWT auth            │
│  Zustand (auth)     │    Bearer <access token>       │  Rate limiting       │
└─────────────────────┘                                └──────────┬───────────┘
         │                                                        │
         │ Stripe.js / LiveKit client                             │ Mongoose
         ▼                                                        ▼
┌─────────────────────┐                                ┌──────────────────────┐
│ Stripe · LiveKit    │ ◀── webhooks / tokens ───────  │  MongoDB             │
│ Cloudinary          │                                │  + Agenda job queue  │
└─────────────────────┘                                └──────────────────────┘
```

## Contents

- [Request lifecycle](#request-lifecycle)
- [Authentication](#authentication)
- [Data model](#data-model)
- [Trust score](#trust-score)
- [Job and escrow flow](#job-and-escrow-flow)
- [Money flow and commissions](#money-flow-and-commissions)
- [Background jobs](#background-jobs)
- [Social previews](#social-previews)
- [Frontend structure](#frontend-structure)

## Request lifecycle

Middleware order in [`server/server.js`](../server/server.js) matters:

1. `/api/stripe/webhook` is mounted **first**, with `express.raw()`. Stripe
   signature verification needs the unparsed body, so this must come before
   `express.json()`.
2. `helmet()` sets security headers.
3. `cors()` checks the origin against `ALLOWED_ORIGINS` from
   `server/config/site.js`. Requests with no `Origin` header (server-to-server,
   curl, mobile apps) are allowed through.
4. `express.json({ limit: '5mb' })`.
5. Rate limiters — 20 requests / 15 min on `/api/auth`, 30/min on writes
   (`/api/jobs`, `/api/subscriptions`, `/api/workers`), 120/min on everything
   else under `/api`.
6. Route modules.
7. A global error handler that returns the message for 4xx and a generic
   `"An unexpected error occurred"` for 5xx, so Mongoose errors and stack traces
   never reach the client.

Every response uses the same envelope:

```json
{ "success": true, "data": {}, "message": "OK" }
```

## Authentication

JWT with a short access token and a longer refresh token.

| Token | Lifetime | Signed with |
|-------|----------|-------------|
| Access | 15 minutes | `JWT_SECRET` |
| Refresh | 7 days | `JWT_REFRESH_SECRET` |

- **Register / login** return both tokens plus the user object. A user may sign
  in with either an e-mail address or a phone number; phone numbers are
  normalised to bare international format first.
- Passwords are hashed with bcrypt (cost 10). The plaintext is never stored or
  logged.
- The client keeps tokens in a Zustand store persisted to `localStorage`. An
  Axios response interceptor catches the first `401`, calls `/api/auth/refresh`,
  replays the original request, and queues any requests that fail while a
  refresh is already in flight.
- `authenticateToken` rejects anything without a valid access token;
  `optionalAuth` attaches `req.user` when a token is present and otherwise
  continues, which is how public profile pages hide contact details from
  anonymous visitors.
- `requireRole('worker')` guards role-specific routes.
- **Password reset** issues a single-use token with a one-hour expiry, delivered
  by e-mail or SMS. The response is deliberately identical whether or not the
  account exists, so the endpoint cannot be used to enumerate users.

> Storing tokens in `localStorage` makes them readable by any script that
> achieves XSS on the page. It is the pragmatic choice for an SPA with a separate
> API origin; if you need stronger guarantees, move the refresh token to an
> `httpOnly`, `SameSite=Strict` cookie and add CSRF protection.

## Data model

21 Mongoose models. The important relationships:

```
User (client | worker | business | admin)
 ├── WorkerProfile   1:1 for role=worker   — score, plan, portfolio, payout details
 │    ├── WorkerOffer     1:N              — service cards on the public profile
 │    ├── ConsultationOffering 1:N         — bookable paid sessions
 │    ├── LiveClass        1:N             — scheduled group sessions
 │    └── ShopItem         1:N             — storefront listings
 ├── BusinessProfile 1:1 for role=business — services, photos, opening hours
 ├── Job             N:M client ↔ worker   — the escrow-backed work order
 ├── Subscription    1:N                   — plan history, admin-verified
 ├── Payout          1:N                   — withdrawal requests
 └── Notification    1:N

Category ──┬── Group                       — 141 categories across 9 groups
           └── referenced by WorkerProfile, BusinessProfile, LiveClass, ShopItem

PlatformSettings   singleton — commission defaults, volume tiers, feature flags
AuditLog           append-only record of admin actions
```

Supporting models: `ConsultationBooking`, `ShopRequest` (custom commissions),
`ShopSale`, `ProgressPost` (the activity feed), `ContactMessage`,
`FeaturedRequest`.

Identity fields on `User` — `idNumber`, `idVerified`, `idPhotoFront`,
`idPhotoBack`, `idSubmitted` — hold a government-issued photo ID that an admin
verifies manually. `idVerified` feeds the trust score and lifts the score cap.

## Trust score

`recalculateScore(workerId)` in
[`server/services/scoreService.js`](../server/services/scoreService.js) runs on
every job state change and produces a 0–100 score.

| Component | Weight | How it is computed |
|-----------|--------|--------------------|
| Completion | 30% | completed ÷ (completed + cancelled), 100 when there is no history yet |
| Rating | 25% | Bayesian-adjusted mean of client ratings, exponentially decayed by age (λ = 0.003/day) toward a platform mean of 4.2 with a prior weight of 30 reviews |
| Responsiveness | 20% | `100 − (avg response minutes ÷ 60) × 20`, floored at 0 |
| Dispute | 15% | `100 − (disputes lost ÷ completed) × 500`, floored at 0 |
| Trust | 10% | ID verified +50, trade certification +30, referred by a high-scoring Pro +20, capped at 100 |

Then:

- **Verification cap** — a Pro without `idVerified` is capped at 70, however
  well they perform.
- **Hard override** — two or more disputes lost in the last 30 days suspends the
  profile and caps the score at 34.
- **Fraud flag** — sets the score to 0 and suspends immediately.

Bands: `elite` 90+, `trusted` 75–89, `rising` 55–74, `probation` 35–54,
`suspended` ≤34. The breakdown is stored on the profile so the dashboard can
show a Pro exactly which component is holding them back.

The Bayesian adjustment is what stops a Pro with a single five-star review from
outranking one with fifty averaging 4.6, and the time decay keeps an old
reputation from carrying indefinitely.

## Job and escrow flow

```
client posts job            → status: pending
worker accepts, rate agreed → status: accepted     deposit = 30% of agreed rate
client pays deposit         → status: in_progress  depositPaid: true
worker marks complete       → awaiting confirmation
client confirms             → status: completed    finalPaid: true, score recalculated
       │
       └── or raises a dispute → status: disputed
                                admin resolves: client_favour | worker_favour | mutual
                                outcome feeds the dispute component of the score
```

Escrow is **simulated** — the platform records deposit and release state but does
not itself hold funds in a segregated account. Consultations, live classes and
shop purchases go through Stripe payment intents; job payments in this reference
implementation are settled between the parties. Running this for real means
integrating a payment provider that supports holding and releasing funds, and
complying with the money-transmission rules of your jurisdiction.

## Money flow and commissions

Stripe-backed transactions (consultations, live classes, shop sales) split each
payment between the Pro and the platform.
[`commissionService.js`](../server/services/commissionService.js) resolves the
rate in priority order:

1. **Per-Pro override** — an explicit percentage set by an admin, optionally with
   an expiry date.
2. **Volume tier** — when enabled, the tier matching the Pro's completed session
   count this calendar month.
3. **Category rate** — set on the `Category` record.
4. **Platform default** — from the `PlatformSettings` singleton (15% if unset).

Each transaction type — consultation, live class, shop — resolves independently,
so a Pro can have a different rate for each.

Payouts are manual: a Pro requests a withdrawal against their available balance,
an admin marks it processing, then completed with a transaction reference, and
the balance is decremented. Balances are held per currency on the Pro's profile.

## Background jobs

Two schedulers run inside the API process.

**Agenda** (MongoDB-backed, survives restarts) —
[`agendaService.js`](../server/services/agendaService.js):

| Job | Trigger |
|-----|---------|
| `consultation-reminder` | Scheduled at booking time, fires 10 minutes before the session |
| `live-class-reminder` | Scheduled at enrolment, fires 1 hour before the class |
| `auto-complete-live-classes` | Every 10 minutes, closes sessions that ended without being marked complete |

**node-cron** (in-memory) — [`cron.js`](../server/cron.js):

| Job | Schedule |
|-----|----------|
| `checkExpiredSubscriptions` | Daily at 00:05 — downgrades lapsed plans to Free |

The server calls `agenda.stop()` on `SIGTERM` and `SIGINT` so running jobs finish
before the process exits.

> Both run in-process. If you scale to more than one instance, Agenda's MongoDB
> locking keeps its jobs from double-firing, but the node-cron task will run once
> per instance — move it to Agenda, or to an external scheduler, before scaling
> out.

## Social previews

Scrapers for WhatsApp, Facebook, LinkedIn, Slack and the rest do not execute
JavaScript, so meta tags injected by `react-helmet-async` are invisible to them.
[`server/routes/preview.js`](../server/routes/preview.js) serves
`/render/workers/:slug` and `/render/businesses/:slug` as static HTML with real
Open Graph tags. A user-agent rule in nginx routes known bots there — see
[DEPLOYMENT.md](DEPLOYMENT.md#social-preview-routing).

## Frontend structure

- **Routing** — React Router 6. Route components live in `src/pages/`, grouped
  by the role that uses them.
- **Server state** — TanStack Query. Query keys are arrays namespaced by
  resource; mutations invalidate the keys they touch.
- **Client state** — Zustand, for auth and notifications only. Everything else
  is server state or local component state.
- **Forms** — React Hook Form with Zod resolvers.
- **HTTP** — one Axios instance in `src/lib/axios.js` with the JWT and
  refresh-retry interceptors.
- **Styling** — Tailwind utility classes, with brand tokens in
  `tailwind.config.js`. There is no component library; the shared primitives are
  in `src/components/`.
- **i18n** — i18next, reading the locale registry exported from `src/i18n.js`.
- **Configuration** — `src/config/site.js` is the only place that reads
  `import.meta.env` for branding and locale values.
