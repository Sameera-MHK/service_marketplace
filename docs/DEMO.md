# Hosting a public demo

GitHub cannot host this app. GitHub Pages serves static files only, and this is
a full stack — a Node API, MongoDB, and a React build. A live demo needs three
services. All three have free tiers.

| Piece | Service | Free tier reality |
|-------|---------|-------------------|
| Frontend | Vercel or Netlify | Genuinely free for this; config files are in the repo |
| API | Render, Railway or Fly.io | Render's free instance sleeps after 15 min idle — expect a 30–50 s cold start |
| Database | MongoDB Atlas M0 | 512 MB, free forever, plenty for seeded demo data |

> **Think twice before doing this.** A demo you forget about becomes a cost, a
> security liability, and a broken link in your README. Screenshots keep working
> forever. If you only want people to *see* the app, the gallery in the main
> README already does that.

## Contents

- [Before you start](#before-you-start)
- [1. Database](#1-database)
- [2. API](#2-api)
- [3. Frontend](#3-frontend)
- [4. Seed it](#4-seed-it)
- [5. Keep it resettable](#5-keep-it-resettable)
- [What demo mode does](#what-demo-mode-does)
- [Costs and limits](#costs-and-limits)
- [Taking it down](#taking-it-down)

## Before you start

A public demo publishes its own credentials — that is the point, and also the
problem. Anyone who opens it can sign in as the admin, delete every listing, and
edit other people's data. Plan for that from the start:

- Use a **throwaway database**, never one that shares a cluster with anything real.
- Set `DEMO_MODE=true` so credential changes and password reset are blocked.
- Schedule `npm run demo:reset` so vandalism is temporary.
- Use **Stripe test keys only** (`sk_test_…` / `pk_test_…`). A live key on a public
  demo means real charges.
- Leave **LiveKit unset** unless you want the bill. It charges per participant-minute,
  and a public demo is an open invitation.

## 1. Database

1. Create a free M0 cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Add a database user with a generated password.
3. Under **Network Access**, allow `0.0.0.0/0` — free API hosts do not publish
   static egress IPs. This is acceptable *only* because the demo database holds
   nothing real.
4. Copy the connection string. Name the database something obviously disposable,
   e.g. `…/skillhub-demo?retryWrites=true&w=majority`.

## 2. API

[`render.yaml`](../render.yaml) at the repo root is a Render blueprint.

1. On Render, choose **New → Blueprint** and pick your fork.
2. Render reads `render.yaml`, creates the service, and generates `JWT_SECRET`
   and `JWT_REFRESH_SECRET` for you.
3. Fill in the three values marked `sync: false` in the dashboard:

   | Variable | Value |
   |----------|-------|
   | `MONGO_URI` | Your Atlas connection string |
   | `CLIENT_URL` | Your frontend URL (from step 3 — set it after, then redeploy) |
   | `API_URL` | This service's own URL, e.g. `https://skillhub-api.onrender.com` |

4. Deploy, then check `https://<your-api>/health`. It should return
   `{"status":"ok","db":"connected",…}`.

Railway or Fly.io work the same way; use `server/` as the root, `npm ci` to
build, `npm start` to run, and set the same variables.

## 3. Frontend

[`client/vercel.json`](../client/vercel.json) and
[`client/netlify.toml`](../client/netlify.toml) are both included — use whichever
host you prefer.

**Vercel:** import the repo, set **Root Directory** to `client`. The framework,
build command and SPA rewrite come from `vercel.json`.

**Netlify:** import the repo, set **Base directory** to `client`. The rest comes
from `netlify.toml`.

Then set the environment variables in the host's dashboard. At minimum:

```
VITE_API_URL=https://your-api.onrender.com
VITE_SITE_URL=https://your-demo.vercel.app
VITE_SITE_NAME=SkillHub
```

`VITE_*` variables are read at **build** time, so changing one means triggering a
new deploy — not just a restart.

Finally, go back to the API and set `CLIENT_URL` to this frontend URL, then
redeploy it. That one value drives both the CORS allowlist and the links in
outgoing e-mail.

## 4. Seed it

From your machine, pointed at the demo database:

```bash
cd server
MONGO_URI="<your atlas demo uri>" DEMO_MODE=true npm run demo:reset
```

That wipes the database and rebuilds it: 20 pros, 6 businesses, 5 clients, jobs
in every state, 141 categories, and an admin.

Put the demo credentials somewhere obvious on the demo itself, or in your README:

| Role | E-mail | Password |
|------|--------|----------|
| Admin | `admin@skillhub.example.com` | `Admin123!` |
| Pro | `daniel@example.com` | `password123` |
| Client | `alice@example.com` | `password123` |

## 5. Keep it resettable

Schedule the reset so the demo heals itself. Hourly is plenty.

**Render cron job** (a second service, free tier):

```yaml
# Append to render.yaml
  - type: cron
    name: skillhub-demo-reset
    runtime: node
    plan: free
    rootDir: server
    schedule: "0 * * * *"        # top of every hour, UTC
    buildCommand: npm ci
    startCommand: npm run demo:reset
    envVars:
      - key: DEMO_MODE
        value: "true"
      - key: MONGO_URI
        sync: false
```

**Or a GitHub Action**, if you would rather not pay for a second service — put
the demo URI in a repository secret:

```yaml
# .github/workflows/demo-reset.yml
name: Reset demo data
on:
  schedule: [{ cron: '0 * * * *' }]
  workflow_dispatch:
jobs:
  reset:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm', cache-dependency-path: server/package-lock.json }
      - run: npm ci
        working-directory: server
      - run: npm run demo:reset
        working-directory: server
        env:
          DEMO_MODE: 'true'
          MONGO_URI: ${{ secrets.DEMO_MONGO_URI }}
```

`demoReset.js` refuses to run unless `DEMO_MODE=true`, and refuses again if
`MONGO_URI` contains `prod`, `production` or `live`. Both guards exist because
this script deletes every document it can reach.

## What demo mode does

`DEMO_MODE=true` turns on
[`server/middleware/demoMode.js`](../server/middleware/demoMode.js), which:

- blocks `POST /api/auth/forgot-password` and `/reset-password`, so nobody can
  change the shared accounts' passwords and lock everyone out;
- strips `email`, `password` and `role` from `PUT` bodies, so profile edits still
  save everything else;
- blocks account deletion;
- sets an `X-Demo-Mode: true` response header.

It deliberately does **not** make the app read-only. Visitors should be able to
post jobs, edit profiles and use the admin panel — that is what they came to
see. The scheduled reset is what makes that safe.

With `DEMO_MODE` unset, none of this runs.

## Costs and limits

| What | Free tier | What to watch |
|------|-----------|---------------|
| Render web (free) | Sleeps after 15 min idle | First visit after idle takes 30–50 s. Put a note on your README link. |
| Atlas M0 | 512 MB, shared CPU | Seeded data is a few MB — not a concern |
| Vercel / Netlify | 100 GB bandwidth/mo | Fine unless your demo goes viral |
| Stripe | Test mode is free | Never use a live key here |
| LiveKit | Paid per participant-minute | Leave unset on a public demo |
| Cloudinary | 25 GB/mo free | Visitors can upload. The hourly reset clears database references but **not** the files themselves — prune the folder periodically, or leave Cloudinary unset so uploads go to the API's local disk and vanish on redeploy. |

## Taking it down

If you stop maintaining the demo, remove the link from your README first — a
dead demo link is worse than none. Then delete the Render service, the Vercel or
Netlify project, and the Atlas cluster. Free tiers do not bill you, but an
abandoned public database with `0.0.0.0/0` access is not something to leave
lying around.
