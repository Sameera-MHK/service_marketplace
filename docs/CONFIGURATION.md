# Configuration

Everything brand-, locale- and deployment-specific is read from environment
variables through two modules:

| Module | Consumed by | Source of values |
|--------|-------------|------------------|
| [`client/src/config/site.js`](../client/src/config/site.js) | React app | `VITE_*` variables, baked in at build time |
| [`server/config/site.js`](../server/config/site.js) | Express API | `process.env`, read at boot |

Every value has a neutral default, so a fresh clone runs with an empty `.env`
apart from the database URI and the two JWT secrets.

> **Client variables are public.** Anything prefixed `VITE_` is compiled into the
> JavaScript bundle and visible to every visitor. Never put a secret there — the
> Stripe *publishable* key belongs in the client, the *secret* key never does.

## Contents

- [Rebranding in five minutes](#rebranding-in-five-minutes)
- [Server variables](#server-variables)
- [Client variables](#client-variables)
- [Changing the currency](#changing-the-currency)
- [Changing the service regions](#changing-the-service-regions)
- [Changing the time zone](#changing-the-time-zone)
- [Adding a language](#adding-a-language)
- [Subscription plans and payment channels](#subscription-plans-and-payment-channels)
- [Optional integrations](#optional-integrations)
- [Things still hardcoded](#things-still-hardcoded)

## Rebranding in five minutes

1. **Name and URLs** — set `VITE_SITE_NAME`, `VITE_SITE_URL`,
   `VITE_SUPPORT_EMAIL`, `VITE_CONTACT_EMAIL` in `client/.env.production`, and
   `SITE_NAME`, `SUPPORT_EMAIL`, `CLIENT_URL`, `API_URL` in `server/.env`.
2. **Logo and icons** — replace `client/src/img/logo.png` (transparent PNG,
   roughly 1200×340), `client/public/favicon.svg` and
   `client/public/og-image.jpg` (exactly 1200×630).
3. **Colours** — edit the `skillhub` palette and `brand-gradient` in
   [`client/tailwind.config.js`](../client/tailwind.config.js).
4. **Static meta** — `client/index.html` holds fallback SEO for scrapers that
   ignore client-side rendering. Update the title, description, canonical URL and
   both JSON-LD blocks. Add your analytics snippet at the marked comment.
5. **Crawl files** — change the domain in `client/public/robots.txt` and
   `client/public/sitemap.xml`.
6. **Legal pages** — `client/src/pages/Terms.jsx` and `Privacy.jsx` read
   `VITE_COUNTRY` and `VITE_LEGAL_ADDRESS`, but the clause text is sample
   wording. Have a lawyer review it.

## Server variables

Copy [`server/.env.example`](../server/.env.example) to `server/.env`.

### Required

| Variable | Description |
|----------|-------------|
| `MONGO_URI` | MongoDB connection string, e.g. `mongodb://localhost:27017/skillhub` |
| `JWT_SECRET` | Signs 15-minute access tokens. Use a long random string. |
| `JWT_REFRESH_SECRET` | Signs 7-day refresh tokens. Must differ from `JWT_SECRET`. |

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### URLs and CORS

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5000` | Port the API listens on |
| `CLIENT_URL` | `http://localhost:5173` | Frontend origin. Used in password-reset links, e-mail bodies, and allowed automatically by CORS. |
| `API_URL` | `http://localhost:$PORT` | Public base URL of this API, used to build absolute image URLs in server-rendered social previews |
| `ALLOWED_ORIGINS` | *(empty)* | Extra browser origins allowed to call the API, comma-separated. `http://localhost:5173` and `http://localhost:3000` are always allowed. |

### Branding and locale

| Variable | Default | Description |
|----------|---------|-------------|
| `SITE_NAME` | `SkillHub` | Prefixes e-mail subjects, SMS bodies and generated page titles |
| `SUPPORT_EMAIL` | `support@skillhub.example.com` | Shown in subscription e-mails |
| `DEFAULT_CURRENCY` | `USD` | ISO-4217 code used when a price carries no currency of its own |
| `SERVICE_AREA` | `your area` | Human-readable service area in generated titles and descriptions |
| `TIMEZONE` | `UTC` | IANA zone for dates in e-mails and SMS, and the default consultation schedule zone |
| `DATE_LOCALE` | `en-US` | BCP-47 tag used to format dates and times in e-mail and SMS bodies |
| `PHONE_COUNTRY_CODE` | `1` | Dialling code without `+` |
| `PHONE_NATIONAL_DIGITS` | `10` | Length of a national subscriber number (10 for +1, 9 for much of Europe) |

Phone numbers are normalised to bare international format on register, login and
profile . `normalizePhone()` accepts `00<cc>…`, `<cc>…`, `0<national>` and
a bare national number.

## Client variables

Copy [`client/.env.example`](../client/.env.example) to `client/.env.local` for
development or `client/.env.production` for a build.

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | *(empty)* | API origin. Leave blank in dev to use the Vite proxy; set the full origin in production. |
| `VITE_SITE_NAME` | `SkillHub` | Displayed brand name |
| `VITE_SITE_LEGAL` | `the SkillHub platform` | Legal entity name used in Terms and Privacy |
| `VITE_SITE_URL` | `https://skillhub.example.com` | Canonical origin for SEO tags |
| `VITE_SITE_TAGLINE` | `Local Skills Marketplace` | Short strapline |
| `VITE_SUPPORT_EMAIL` | `support@skillhub.example.com` | Legal and support contact |
| `VITE_CONTACT_EMAIL` | `hello@skillhub.example.com` | General contact link on the landing page |
| `VITE_TWITTER_HANDLE` | `@skillhub` | `twitter:site` meta tag |
| `VITE_OG_IMAGE` | `<site url>/og-image.jpg` | Social preview image, 1200×630 |
| `VITE_HERO_VIDEO_URL` | *(empty)* | Optional looping landing-page video. The video is skipped entirely when blank, on mobile, and when the visitor prefers reduced motion. |
| `VITE_SERVICE_AREA` | `your area` | Service area in page titles and empty states |
| `VITE_COUNTRY` | `the Republic of Example` | Jurisdiction named in Terms and Privacy |
| `VITE_LEGAL_ADDRESS` | `1 Example Street, Example City` | Registered address in Terms and Privacy |
| `VITE_DEFAULT_CURRENCY` | `USD` | Drives the currency symbol and price-picker default |
| `VITE_COUNTRY_CODE` | `US` | ISO 3166-1 alpha-2 code emitted in schema.org `PostalAddress` markup |
| `VITE_TIMEZONE` | *(empty)* | IANA zone for rendering dates. Blank uses each visitor's own zone. |
| `VITE_DATE_LOCALE` | *(empty)* | BCP-47 tag for date and time formatting. Blank uses each visitor's own locale. |
| `VITE_STRIPE_PUBLISHABLE_KEY` | *(empty)* | `pk_test_…` or `pk_live_…`. Publishable key only. |

## Changing the currency

Set `DEFAULT_CURRENCY` (server) and `VITE_DEFAULT_CURRENCY` (client) to the same
ISO-4217 code. The client maps the code to a display symbol in
`CURRENCY_SYMBOLS`; add yours there if it is missing, otherwise the code itself
is shown as the prefix.

```js
// client/src/config/site.js
const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', /* … */ };
```

Use the `formatMoney()` helper from the same module in new code:

```jsx
import { formatMoney } from '../config/site.js';
<span>{formatMoney(offer.priceMin)}</span>   // → $1,200
```

Individual listings (consultations, live classes, shop items) store their own
currency, so Pros can price in something other than the platform default. Stripe
must support the currency you choose, and the amount is sent in the currency's
smallest unit.

## Changing the service regions

The regions users filter and register against live in one array:

```js
// client/src/config/site.js
export const DISTRICTS = ['Ashford', 'Brookside', /* … */];
```

Replace it with your own list. It is imported by both browse pages, both
onboarding flows, the Pro profile settings and the business dashboard, so there
is nothing else to change. The value is stored on the user as
`location.district` and on a business as `district`; it is a free-form string in
the schema, so no migration is needed when the list changes — but existing
documents keep their old values, so re-seed or migrate if you rename regions in
a live database.

## Changing the time zone and date format

Two independent settings: the **zone** a time is shown in, and the **locale** that
decides its wording and field order (`31/01/2026` versus `1/31/2026`).

- **Server** — `TIMEZONE` (default `UTC`) and `DATE_LOCALE` (default `en-US`)
  format dates in e-mail and SMS bodies. `TIMEZONE` also sets the default zone on
  a Pro's consultation schedule.
- **Client** — `VITE_TIMEZONE` and `VITE_DATE_LOCALE`. Leave both blank so each
  visitor sees times in their own zone and their own date format, which is
  usually what you want.

## Adding a language

1. Copy `client/src/locales/en.json` to `client/src/locales/<code>.json` and
   translate the values. Keep every key — missing keys fall back to English.
2. Register it in [`client/src/i18n.js`](../client/src/i18n.js):

```js
import es from './locales/es.json';

export const LOCALES = [
  { code: 'en', label: 'EN', nativeName: 'English', resource: en },
  { code: 'es', label: 'ES', nativeName: 'Español', resource: es },
];
```

The language switcher renders itself from `LOCALES` and hides while only one
locale is registered, so there is no third place to . The chosen language
persists in `localStorage` and sets `<html lang>`.

## Subscription plans and payment channels

Plan names, prices, lead limits and feature lists live in
[`server/config/plans.js`](../server/config/plans.js). The landing page and the
business dashboard hold their own display copies of the tier cards. If you change
prices, update all three: `PLANS` in `server/config/plans.js`, the `plans` array
in `client/src/pages/Landing.jsx`, and `BIZ_PLANS_DISPLAY` in
`client/src/pages/business/Dashboard.jsx`.

`PAYMENT_METHODS` in the same file lists the manual channels a subscriber can
pay through. Subscription payments are **not** automated — a subscriber submits
a reference and an admin verifies it in the admin panel. Replace the placeholder
account details with your own.

Payout rails (`bank`, `mobile_money`, `digital_wallet`) are enum values on the
`Payout` and `WorkerProfile` models. Changing them means updating the enum in
both models, the validator in `server/routes/consultations.js`, and the labels in
`client/src/components/WorkerPayoutSection.jsx`.

## Optional integrations

### Stripe

```bash
STRIPE_SECRET_KEY=sk_test_…
STRIPE_WEBHOOK_SECRET=whsec_…
```

```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_…
```

Locally, forward webhooks with the Stripe CLI — the secret it prints goes in
`STRIPE_WEBHOOK_SECRET`:

```bash
stripe listen --forward-to localhost:5000/api/stripe/webhook
```

The webhook route is mounted before `express.json()` because signature
verification needs the raw request body. Keep it that way.

### Cloudinary

```bash
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_FOLDER=skillhub
```

Leave blank to store uploads on local disk under `server/uploads/`, which is
fine for development but not for a multi-instance deployment.

### LiveKit

```bash
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
LIVEKIT_URL=wss://your-project.livekit.cloud
```

Required only to join live classes and video consultations.

### SMTP

```bash
SMTP_HOST=
SMTP_PORT=465
SMTP_USER=
SMTP_PASS=
SMTP_FROM=          # optional; defaults to SMTP_USER
```

With `SMTP_HOST`, `SMTP_USER` or `SMTP_PASS` unset, e-mails are printed to the
server console instead of being sent — password-reset links included, which is
exactly what you want in development.

### SMS

```bash
SMS_API_URL=        # your gateway's send endpoint
SMS_API_TOKEN=
SMS_SENDER_ID=SkillHub
```

The request body is the common
`{ api_token, recipient, sender_id, type, message }` shape; adapt `sendSMS()` in
`server/services/smsService.js` for a gateway that expects something else.
Messages are truncated to 160 GSM-7 characters. With the URL or token unset,
messages are logged instead of sent.

### Unsplash

`UNSPLASH_ACCESS_KEY` is used only by `npm run seed:images` to fetch category
cover photos.

## Things still hardcoded

These are intentional and easy to find, but they are not environment variables:

- **Category list** — `server/seeds/seedCategories.js` (141 canonical categories
  across 8 groups). Categories are database records; edit them in the admin panel
  after seeding.
- **Score weights and bands** — the constants at the top of
  `server/services/scoreService.js`.
- **Rate limits** — the three limiters in `server/server.js`.
- **Escrow deposit percentage** — 30%, in the job routes and seed data.
- **Brand colours** — `client/tailwind.config.js`.
- **Legal clause text** — `client/src/pages/Terms.jsx` and `Privacy.jsx`.
