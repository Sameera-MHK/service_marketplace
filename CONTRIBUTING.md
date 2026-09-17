# Contributing

Thanks for taking an interest. Issues and pull requests are both welcome.

## Getting set up

Follow [Quick start](README.md#quick-start) in the README. You need Node 18+ and
a MongoDB instance; nothing else is required to run the whole app, because every
external integration degrades gracefully when its credentials are absent.

```bash
cd server && npm install && cp .env.example .env   # fill in MONGO_URI + the two JWT secrets
npm run dev

cd ../client && npm install && cp .env.example .env.local
npm run dev

cd ../server && npm run reseed                     # demo data
```

## Reporting a bug

Open an issue with:

- What you did, what you expected, what happened instead.
- Node version, operating system, and whether you are on the seeded database.
- The relevant server log lines and browser console output.

For anything security-related, do **not** open a public issue — see
[SECURITY.md](SECURITY.md).

## Pull requests

1. Fork and branch from `main`. Name the branch for the change:
   `fix/refresh-token-race`, not `patch-1`.
2. Keep it focused. One concern per pull request; unrelated cleanups make review
   slower and reverts harder.
3. Verify before you push:

   ```bash
   cd client && npm run build      # must succeed
   ```

   Then exercise the affected screens against a seeded database. There is no
   automated test suite yet — adding one is a welcome contribution in itself.
4. Describe what you changed and why, and say how you verified it. Screenshots
   help for UI changes.

## Conventions

The codebase is consistent; match what is already there rather than importing
your own style.

**JavaScript**

- ES modules everywhere (`"type": "module"` in both packages). No `require`.
- 2-space indent, single quotes, semicolons.
- `async`/`await` over promise chains.
- Section headers use the existing box-drawing comment style:

  ```js
  // ── Section name ──────────────────────────────────────────────────────────
  ```

**Backend**

- Every response goes through the envelope:
  `{ success, data, message }`. No bare arrays, no bare strings.
- Validate input with `express-validator` on routes that accept a body.
- Guard routes with `authenticateToken` and `requireRole`; use `optionalAuth`
  where a public page shows more to a signed-in visitor.
- Business logic belongs in `services/`, not in route handlers. Routes should
  read as: validate, authorise, call a service, respond.
- Never log secrets, tokens or password hashes.

**Frontend**

- Server state goes through TanStack Query; client state through Zustand only
  when it is genuinely global. Local state stays local.
- Query keys are arrays namespaced by resource: `['workers', slug]`. Mutations
  invalidate the keys they affect.
- All HTTP goes through `src/lib/axios.js` — never call `fetch` directly, or you
  lose the token refresh.
- User-facing strings belong in `src/locales/en.json` and are read with
  `useTranslation()`. Do not hardcode copy in JSX.
- Anything brand-, currency-, region- or time-zone-specific belongs in
  `src/config/site.js`. If you find yourself typing a domain name, a currency
  symbol or a place name into a component, put it in the config instead.
- Tailwind utilities for styling. Brand colours come from the `skillhub` palette
  in `tailwind.config.js`, not from arbitrary hex values.

**Database**

- New fields need a default, or code that tolerates their absence — existing
  documents will not have them.
- Add an index for any field you filter or sort on in a list endpoint.
- If a change needs a data migration, add a script under `server/seeds/` with a
  `--dry-run` flag, following the pattern of `migrateCategorySlugs.js`.

## Commit messages

Short imperative subject, body only when the reason is not obvious from the
diff:

```
Fix token refresh race on concurrent 401s

Two requests failing at once each triggered their own refresh, and the
second overwrote the first's token. Queue the second behind the first.
```
