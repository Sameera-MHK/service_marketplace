# Security

## Reporting a vulnerability

Do not open a public issue. Report it privately through GitHub's
**Security → Report a vulnerability** on this repository, or by e-mail to the
address in the repository profile.

Please include what you found, how to reproduce it, and what an attacker could
do with it. You will get an acknowledgement within a few days.

## What this codebase does

- Passwords hashed with bcrypt at cost 10; plaintext is never stored or logged.
- JWT access tokens expire in 15 minutes; refresh tokens in 7 days, signed with
  a separate secret.
- Rate limiting on every `/api` route, tightest on authentication.
- `helmet()` security headers.
- A CORS allowlist — no wildcard origins.
- Input validation with `express-validator` on routes that accept a body.
- Role guards on every privileged route, plus ownership checks inside handlers.
- 5xx responses return a generic message; Mongoose errors and stack traces stay
  in the server log.
- Password reset responds identically whether or not the account exists, so it
  cannot be used to enumerate users. Tokens are single-use and expire in an hour.
- Stripe webhooks are verified by signature against the raw request body.
- Admin actions are written to an append-only audit log (29 of the 34
  mutating admin routes, plus subscription approvals).

## What it does not do

Know these before you put it in front of real users:

- **Tokens live in `localStorage`.** Any successful XSS can read them. Moving the
  refresh token to an `httpOnly`, `SameSite=Strict` cookie with CSRF protection
  is the standard hardening step.
- **Escrow is simulated.** The platform records deposit and release state for
  jobs but does not hold funds in a segregated account. Handling other people's
  money for real means a payment provider that supports it and compliance with
  your jurisdiction's money-transmission rules.
- **No CSRF tokens.** Safe while authentication is bearer-token-only; required
  the moment you move to cookies.
- **No account lockout.** Rate limiting slows brute force but nothing locks an
  account after repeated failures.
- **No two-factor authentication**, for admins or anyone else.
- **ID verification is manual.** An admin eyeballs uploaded photos. There is no
  document authenticity check.
- **Uploaded files are not virus-scanned.** Type and size are checked; contents
  are not.
- **No automated test suite**, so there is no regression safety net around any of
  the above.

## Deploying safely

The [hardening checklist](docs/DEPLOYMENT.md#hardening-checklist) in the
deployment guide is the short version. The two that bite hardest:

- **Change the seed credentials.** `npm run seed` creates
  `admin@skillhub.example.com` with a password published in this repository.
  Delete the account or change the password before the app is reachable.
- **Set `app.set('trust proxy', 1)`** when running behind nginx or a load
  balancer. Without it, every request looks like it comes from the proxy, so one
  visitor hitting a rate limit locks out everyone.

## Secrets

No real credentials belong in this repository. `.gitignore` excludes `.env` and
`.env.*` while keeping `.env.example`, but that only protects files you have not
already committed.

If a secret does reach a commit, rotating it is the fix — removing it from
history is not. Assume anything pushed to a public repository is compromised the
moment it lands.
