# API reference

Base URL: `http://localhost:5000/api` in development, `${API_URL}/api` in
production.

## Contents

- [Response envelope](#response-envelope)
- [Authentication](#authentication)
- [Rate limits](#rate-limits)
- [Errors](#errors)
- [Endpoints](#endpoints)
- [Non-`/api` routes](#non-api-routes)

## Response envelope

Every endpoint returns the same shape, success or failure:

```json
{
  "success": true,
  "data": { },
  "message": "OK"
}
```

On failure, `success` is `false`, `data` is `null`, and `message` carries a
human-readable reason. Read the HTTP status for the category and `message` for
the detail.

## Authentication

Send the access token as a bearer token:

```
Authorization: Bearer <accessToken>
```

`POST /api/auth/login` and `POST /api/auth/register` return
`{ accessToken, refreshToken, user }`. Access tokens last 15 minutes; exchange
an expired one at `POST /api/auth/refresh` with `{ refreshToken }`. The client's
Axios interceptor does this automatically.

Routes are marked below as:

| Mark | Meaning |
|------|---------|
| — | Public |
| 🔒 | Any authenticated user |
| 👷 | Role `worker` |
| 🏪 | Role `business` |
| 👤 | Role `client` |
| 🛡️ | Role `admin` |

Some public routes use *optional* auth: they respond to anonymous callers but
reveal more — contact details, for instance — to an authenticated one.

## Rate limits

| Scope | Window | Max |
|-------|--------|-----|
| `/api/auth/*` | 15 minutes | 20 |
| `/api/jobs`, `/api/subscriptions`, `/api/workers` | 1 minute | 30 |
| All other `/api/*` | 1 minute | 120 |

Exceeding a limit returns `429` with the envelope above. Standard
`RateLimit-*` headers are sent; the legacy `X-RateLimit-*` headers are not.

## Errors

| Status | Meaning |
|--------|---------|
| `400` | Validation failed, or the request is invalid for the resource's current state |
| `401` | Missing, malformed or expired access token |
| `403` | Authenticated but not allowed — wrong role, or not the owner |
| `404` | No such resource |
| `429` | Rate limit exceeded |
| `500` | Unexpected server error. The message is always generic; details are in the server log. |

## Endpoints

### Auth — `/api/auth`

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| POST | `/register` | — | Create a client, worker or business account. Requires `name`, `password` (min 6), `role`, and at least one of `email` / `phone`. |
| POST | `/login` | — | Sign in with an e-mail address or phone number |
| POST | `/refresh` | — | Exchange a refresh token for a new access token |
| POST | `/logout` | — | Client-side token disposal |
| POST | `/forgot-password` | — | Send a one-hour reset token by e-mail or SMS. Always responds identically, whether or not the account exists. |
| POST | `/reset-password` | — | Consume the token and set a new password |

### Users — `/api/users`

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/me` | 🔒 | Current user |
| PUT | `/me` | 🔒 | Update name, phone, location, social links |

### Workers — `/api/workers`

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/featured` | — | Featured Pros for the landing page |
| GET | `/` | — | Search and filter. Query: `category`, `district`, `minScore`, `page`, `limit`. |
| GET | `/dashboard` | 👷 | Own dashboard aggregate |
| GET | `/:slug` | optional | Public profile. Contact details are omitted for anonymous callers. |
| POST | `/onboarding` | 👷 | Complete profile setup |
| PUT | `/profile` | 👷 | Update profile fields |
| PUT | `/profile/photo` | 👷 | Upload an avatar (multipart) |
| PUT | `/profile/cover` | 👷 | Upload a cover image (multipart) |
| PUT | `/profile/idDoc` | 👷 | Upload ID front and back for verification (multipart) |
| PUT | `/profile/certifications` | 👷 | Upload trade certifications (multipart) |
| PUT | `/profile/portfolio` | 👷 | Add portfolio photos, capped by plan |
| DELETE | `/profile/portfolio` | 👷 | Remove a portfolio photo |
| PUT | `/profile/portfolio/paid` | 👷 | Mark a portfolio slot as paid |
| POST | `/featured-request` | 👷 | Request featured placement |
| GET | `/featured-request/my` | 👷 | Own featured requests |
| POST | `/offers` | 👷 | Create a service offer card |
| GET | `/offers/my` | 👷 | Own offer cards |
| PUT | `/offers/:id` | 👷 | Update an offer card |
| DELETE | `/offers/:id` | 👷 | Delete an offer card |
| GET | `/:id/offers` | — | A Pro's public offer cards |

### Businesses — `/api/businesses`

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/` | — | Search and filter businesses |
| GET | `/:slug` | optional | Public business profile |
| GET | `/dashboard/me` | 🏪 | Own dashboard aggregate |
| PUT | `/profile/me` | 🏪 | Update the business profile |
| POST | `/onboarding/complete` | 🏪 | Finish onboarding |
| POST | `/services` | 🏪 | Add a service |
| PUT | `/services/:serviceId` | 🏪 | Update a service |
| DELETE | `/services/:serviceId` | 🏪 | Remove a service |

### Jobs — `/api/jobs`

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| POST | `/` | 👤 | Post a job. A 30% deposit is computed from `agreedRate`. |
| GET | `/` | 🔒 | Jobs for the caller, filtered by their role |
| GET | `/:id` | 🔒 | One job — client, assigned worker or admin only |
| PUT | `/:id/accept` | 👷 | Accept and agree a rate |
| PUT | `/:id/deposit-paid` | 👤 | Mark the deposit paid; moves to `in_progress` |
| PUT | `/:id/complete` | 👷 | Mark the work finished |
| PUT | `/:id/confirm-complete` | 👤 | Confirm and release the balance; triggers a score recalculation |
| PUT | `/:id/rate` | 🔒 | Leave a rating and review |
| PUT | `/:id/dispute` | 🔒 | Open a dispute |
| PUT | `/:id/resolve-dispute` | 🛡️ | Resolve with `client_favour`, `worker_favour` or `mutual` |

### Consultations — `/api/consultations`

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| PUT | `/me/enable` | 👷 | Turn consultations on or off |
| GET | `/me/commission` | 👷 | Own effective commission rate |
| GET · PUT | `/me/schedule` | 👷 | Weekly availability and time zone |
| GET · POST | `/me/offerings` | 👷 | List or create bookable sessions |
| PUT · DELETE | `/me/offerings/:id` | 👷 | Update or remove an offering |
| GET · PUT | `/me/payout-details` | 👷 | Bank or wallet details for withdrawals |
| GET | `/me/balance` | 👷 | Available balance per currency |
| POST | `/me/payouts/request` | 👷 | Request a withdrawal |
| GET | `/me/payouts` | 👷 | Own payout history |
| GET | `/workers/:userId/offerings` | — | A Pro's public offerings |
| GET | `/workers/:userId/slots` | — | Bookable slots for a date range |
| POST | `/bookings` | 👤 | Book a session; creates a Stripe payment intent |
| GET | `/bookings/mine` | 🔒 | Own bookings |
| GET | `/bookings/:id` | 🔒 | One booking |
| POST | `/bookings/:id/livekit-token` | 🔒 | Join token for the video room |
| POST | `/bookings/:id/confirm-payment` | 👤 | Confirm payment after Stripe returns |
| PUT | `/bookings/:id/cancel` | 🔒 | Cancel a booking |

### Live classes — `/api/live-classes`

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/settings` | — | Platform live-class settings |
| GET | `/my-rate` | 👷 | Own commission rate |
| GET | `/me/balance` | 👷 | Available balance |
| POST | `/me/payouts/request` | 👷 | Request a withdrawal |
| GET | `/me/payouts` | 👷 | Own payout history |
| GET | `/` | — | Browse upcoming classes |
| GET | `/mine` | 👷 | Classes the caller hosts |
| GET | `/my-enrollments` | 🔒 | Classes the caller is enrolled in |
| GET | `/:id` | optional | Class detail |
| POST | `/` | 👷 | Create a class |
| PUT | `/:id` | 👷 | Update a class |
| DELETE | `/:id` | 👷 | Cancel a class and refund enrolments |
| POST | `/:id/start` · `/:id/end` | 👷 | Open and close the video room |
| POST | `/:id/enroll` | 🔒 | Enrol; creates a Stripe payment intent |
| POST | `/:id/confirm-payment` | 🔒 | Confirm payment after Stripe returns |
| POST | `/:id/join` | 🔒 | Join token for the video room |

### Shop — `/api/shop`

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/items` | — | Browse storefront listings |
| GET | `/items/:id` | — | Listing detail |
| GET | `/me/commission` | 👷 | Own shop commission rate |
| GET · POST | `/me/items` | 👷 | List or create own listings |
| PUT · DELETE | `/me/items/:id` | 👷 | Update or remove a listing |
| GET | `/me/requests` | 👷 | Incoming custom-commission requests |
| PUT | `/me/requests/:id/quote` | 👷 | Quote a price |
| PUT | `/me/requests/:id/decline` | 👷 | Decline a request |
| PUT | `/me/requests/:id/complete` | 👷 | Mark a commission delivered |
| POST | `/items/:id/buy` | 🔒 | Start checkout |
| POST | `/items/:id/confirm` | 🔒 | Confirm payment |
| POST | `/requests` | 🔒 | Request a custom commission |
| GET | `/my-requests` | 🔒 | Own requests |
| POST | `/requests/:id/pay` | 🔒 | Pay a quoted request |
| POST | `/requests/:id/confirm-payment` | 🔒 | Confirm payment |
| PUT | `/requests/:id/cancel` | 🔒 | Cancel a request |
| GET | `/me/balance` · `/me/payouts` · `/me/earnings` | 👷 | Shop earnings and payouts |
| POST | `/me/payouts/request` | 👷 | Request a withdrawal |

### Subscriptions — `/api/subscriptions`

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/plans` | — | Plan definitions and accepted payment channels |
| GET | `/my` | 🔒 | Own subscription and history |
| POST | `/request` | 🔒 | Submit a payment for admin verification |
| PUT | `/:id/activate` | 🛡️ | Approve and activate |
| PUT | `/:id/reject` | 🛡️ | Reject with a reason |
| GET | `/pending` · `/all` | 🛡️ | Review queue and full history |

### Categories, groups, notifications, contact, progress

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/api/categories` | — | All active categories |
| GET | `/api/groups` | — | Category groups |
| GET | `/api/notifications` | 🔒 | Own notifications |
| PUT | `/api/notifications/read-all` | 🔒 | Mark all read |
| PUT | `/api/notifications/:id/read` | 🔒 | Mark one read |
| POST | `/api/contact` | — | Submit the contact form |
| GET | `/api/contact` | 🛡️ | Read submissions |
| PATCH | `/api/contact/:id` | 🛡️ | Update status |
| GET | `/api/progress-posts/pulse/worker/:slug` | — | A Pro's activity feed |
| GET | `/api/progress-posts/pulse/business/:slug` | — | A business's activity feed |
| POST | `/api/progress-posts` | 🔒 | Publish an update |
| GET | `/api/progress-posts/me` | 🔒 | Own updates |
| DELETE | `/api/progress-posts/:id` | 🔒 | Delete an update |
| GET | `/api/progress-posts/admin/all` | 🛡️ | Moderation queue |
| PATCH | `/api/progress-posts/admin/:id` | 🛡️ | Moderate an update |

### Admin — `/api/admin`

All routes require 🛡️. Most mutations are written to the audit log, readable
at `GET /audit`.

| Area | Endpoints |
|------|-----------|
| **Dashboard** | `GET /analytics`, `/stats`, `/action-required`, `/action-count`, `/flagged` |
| **Moderation** | `GET /moderation`, `PUT /moderation/bio/:workerId/{approve,reject}`, `PUT /moderation/photo/:workerId/{approve,reject}` |
| **Pros** | `GET /workers`, `PUT /workers/:id/{verify-idDoc,subscription,suspend,reinstate,feature,features,clear-flag}` |
| **Businesses** | `GET /businesses`, `PUT /businesses/:id/{verify,suspend,reinstate,feature}` |
| **Disputes** | `PUT /disputes/:jobId/resolve` |
| **Commissions** | `GET · PUT /settings/{consultations,live-classes,shop}`; per-Pro `GET /workers/:id/effective-*-commission`, `PUT · DELETE /workers/:id/*-commission-override` |
| **Payouts** | `GET /payouts`, `PUT /payouts/:id/{process,reject}` |
| **Categories** | `GET · POST /categories`, `PUT · DELETE /categories/:id`, `POST · DELETE /categories/:id/cover` |
| **Featured** | `GET /featured-requests`, `PUT /featured-requests/:id/{approve,reject}` |
| **Audit** | `GET /audit` |

## Non-`/api` routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness probe: `{ status, db, uptime, timestamp }`. Unauthenticated and unrated — point your load balancer here. |
| GET | `/uploads/*` | Static files, when Cloudinary is not configured |
| GET | `/render/workers/:slug` | Server-rendered Open Graph HTML for scrapers |
| GET | `/render/businesses/:slug` | As above, for businesses |
| POST | `/api/stripe/webhook` | Stripe events. Verified by signature; mounted before the JSON body parser. |
