# Deployment

A single-server setup: nginx terminates TLS and serves the built frontend, PM2
keeps the API alive, MongoDB runs locally or on Atlas. Adapt freely — nothing in
the app depends on this particular shape.

## Contents

- [Before you deploy](#before-you-deploy)
- [Build the frontend](#build-the-frontend)
- [Run the API](#run-the-api)
- [nginx](#nginx)
- [Social preview routing](#social-preview-routing)
- [Stripe webhooks](#stripe-webhooks)
- [Database](#database)
- [Uploads](#uploads)
- [Health checks and logs](#health-checks-and-logs)
- [Hardening checklist](#hardening-checklist)

## Before you deploy

- [ ] `server/.env` and `client/.env.*` are **not** committed — `.gitignore`
      excludes them, but confirm with `git status --ignored`.
- [ ] `JWT_SECRET` and `JWT_REFRESH_SECRET` are long random strings, different
      from each other, and different from any value used in development.
- [ ] Seed accounts are removed or their passwords changed. `npm run seed`
      creates an admin with a published default password.
- [ ] Stripe is on live keys, and the webhook secret is the one from the live
      endpoint — not from `stripe listen`.
- [ ] `CLIENT_URL` and `API_URL` point at real hostnames over HTTPS.
- [ ] The legal pages have been reviewed by a lawyer.

## Build the frontend

```bash
cd client
cp .env.example .env.production   # then fill it in
npm ci
npm run build                     # → client/dist/
```

`VITE_*` variables are read at **build** time and baked into the bundle, so
changing one means rebuilding. Everything in the bundle is public.

Copy `dist/` to wherever nginx serves from, e.g. `/var/www/skillhub`.

## Run the API

```bash
cd server
npm ci --omit=dev
cp .env.example .env              # then fill it in
```

With PM2 (config already in [`ecosystem.config.cjs`](../server/ecosystem.config.cjs)):

```bash
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup                       # run the command it prints, to survive reboot
```

Useful afterwards:

```bash
pm2 logs skillhub
pm2 restart skillhub
pm2 monit
```

> The config runs a single instance. Cluster mode needs two changes first: the
> node-cron task in `cron.js` would fire once per worker, and local-disk uploads
> would not be shared. Move the cron task to Agenda and switch to Cloudinary (or
> shared storage) before scaling out.

## nginx

```nginx
# ── Frontend ─────────────────────────────────────────────────────────────────
server {
    listen 443 ssl http2;
    server_name skillhub.example.com www.skillhub.example.com;

    ssl_certificate     /etc/letsencrypt/live/skillhub.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/skillhub.example.com/privkey.pem;

    root  /var/www/skillhub;
    index index.html;

    # Hashed asset filenames — safe to cache hard
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback: every unknown path renders the app
    location / {
        try_files $uri $uri/ /index.html;
    }
}

# ── API ──────────────────────────────────────────────────────────────────────
server {
    listen 443 ssl http2;
    server_name api.skillhub.example.com;

    ssl_certificate     /etc/letsencrypt/live/api.skillhub.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.skillhub.example.com/privkey.pem;

    client_max_body_size 10M;   # must exceed the 5MB JSON limit plus uploads

    location / {
        proxy_pass         http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}

# ── Redirect HTTP ────────────────────────────────────────────────────────────
server {
    listen 80;
    server_name skillhub.example.com www.skillhub.example.com api.skillhub.example.com;
    return 301 https://$host$request_uri;
}
```

Get certificates with `certbot --nginx -d skillhub.example.com -d www.skillhub.example.com -d api.skillhub.example.com`.

Set `ALLOWED_ORIGINS=https://skillhub.example.com,https://www.skillhub.example.com`
in `server/.env` so the API accepts browser requests from both hostnames.

> Rate limiting keys on the client IP. Behind a proxy, every request appears to
> come from the proxy unless Express trusts the forwarded header — add
> `app.set('trust proxy', 1)` in `server.js` when you deploy behind nginx or a
> load balancer, otherwise one visitor hitting a limit blocks everyone.

## Social preview routing

Scrapers do not run JavaScript, so route them to the server-rendered previews.
Add this inside the **frontend** server block, before `location /`:

```nginx
set $is_bot 0;
if ($http_user_agent ~* "facebookexternalhit|WhatsApp|Twitterbot|LinkedInBot|Slackbot|Discordbot|TelegramBot|Pinterest|redditbot|Applebot|Googlebot") {
    set $is_bot 1;
}

location ~ ^/pro/(.+)$ {
    if ($is_bot) { proxy_pass https://api.skillhub.example.com/render/workers/$1; }
    try_files $uri /index.html;
}

location ~ ^/businesses/(.+)$ {
    if ($is_bot) { proxy_pass https://api.skillhub.example.com/render/businesses/$1; }
    try_files $uri /index.html;
}
```

Verify with:

```bash
curl -A "facebookexternalhit/1.1" https://skillhub.example.com/pro/daniel | grep "og:title"
```

## Stripe webhooks

1. In the Stripe dashboard, add an endpoint at
   `https://api.skillhub.example.com/api/stripe/webhook`.
2. Subscribe to `payment_intent.succeeded` and `payment_intent.payment_failed`.
3. Copy the signing secret into `STRIPE_WEBHOOK_SECRET` and restart the API.

The route is mounted before `express.json()` because signature verification needs
the raw body. Do not reorder it, and do not let a proxy rewrite the body.

## Database

**MongoDB Atlas** (managed) — create a cluster, add a database user, allow your
server's IP, and paste the connection string into `MONGO_URI`.

**Self-hosted** — bind `mongod` to `127.0.0.1`, enable authentication, and take
regular dumps:

```bash
mongodump --uri="$MONGO_URI" --archive=/backups/skillhub-$(date +%F).gz --gzip
```

Mongoose creates indexes on boot from the schema definitions; no separate
migration step is needed for a fresh database.

Seed reference data once, on the production database:

```bash
npm run seed:categories   # 141 categories
npm run seed:groups       # 9 category groups
```

Do **not** run `npm run seed` or `npm run reseed` in production — both wipe every
collection.

## Uploads

With Cloudinary configured, images go straight there and nothing is written to
disk. Without it, files land in `server/uploads/` and are served at `/uploads/*`.
That directory is gitignored except for its `.gitkeep`, is not shared between
instances, and is not backed up by a database dump — use Cloudinary or another
object store for anything you care about.

## Health checks and logs

`GET /health` returns:

```json
{ "status": "ok", "db": "connected", "uptime": 3600, "timestamp": "..." }
```

It is unauthenticated and not rate limited. Point your load balancer or uptime
monitor at it, and alert on `db` being anything other than `connected`.

PM2 writes to `server/logs/pm2-out.log` and `server/logs/pm2-error.log`. Add
rotation:

```bash
pm2 install pm2-logrotate
```

## Hardening checklist

- [ ] HTTPS everywhere; HTTP redirects to HTTPS.
- [ ] `app.set('trust proxy', 1)` so rate limiting sees real client IPs.
- [ ] `ALLOWED_ORIGINS` lists exactly your frontend hostnames — no wildcards.
- [ ] MongoDB is not reachable from the public internet, and authentication is on.
- [ ] Secrets live only in `server/.env` with `chmod 600`, owned by the service user.
- [ ] Seed accounts removed; the admin password changed.
- [ ] Automated database backups, and a restore you have actually tested.
- [ ] `npm audit` clean, and dependencies updated on a schedule.
- [ ] Uptime monitoring on `/health`.
- [ ] Log rotation configured so the disk cannot fill.
