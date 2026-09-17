/**
 * Server-side rendered Open Graph previews for social-media scrapers.
 *
 * Scrapers (WhatsApp, Facebook, LinkedIn, Twitter, Slack, etc.) don't run
 * JavaScript, so they never see meta tags injected by react-helmet-async.
 *
 * Wire-up (nginx on your web host):
 *   if ($http_user_agent ~* "facebookexternalhit|WhatsApp|Twitterbot|LinkedInBot|Slackbot|Discordbot|TelegramBot|Pinterest|redditbot|Applebot|Googlebot") {
 *     rewrite ^/pro/(.+)$          /render/workers/$1    break;
 *     rewrite ^/businesses/(.+)$   /render/businesses/$1 break;
 *     proxy_pass https://api.your-domain.example;
 *   }
 */
import express from 'express';
import WorkerProfile from '../models/WorkerProfile.js';
import BusinessProfile from '../models/BusinessProfile.js';
import { SITE_NAME, SITE_URL, API_URL, SERVICE_AREA } from '../config/site.js';

const router = express.Router();

const DEFAULT_IMG = `${SITE_URL}/og-image.jpg`;

function absUrl(u) {
  if (!u) return DEFAULT_IMG;
  if (/^https?:\/\//i.test(u)) return u;
  return `${API_URL}${u.startsWith('/') ? '' : '/'}${u}`;
}

function escape(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildHtml({ title, description, image, url, type = 'website' }) {
  const t  = escape(title);
  const d  = escape((description || '').slice(0, 200));
  const i  = escape(image || DEFAULT_IMG);
  const u  = escape(url);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t}</title>
  <meta name="description" content="${d}">
  <link rel="canonical" href="${u}">

  <meta property="og:site_name" content="${SITE_NAME}">
  <meta property="og:title" content="${t}">
  <meta property="og:description" content="${d}">
  <meta property="og:type" content="${type}">
  <meta property="og:url" content="${u}">
  <meta property="og:image" content="${i}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${t}">
  <meta name="twitter:description" content="${d}">
  <meta name="twitter:image" content="${i}">

  <meta http-equiv="refresh" content="0; url=${u}">
</head>
<body>
  <p>Redirecting to <a href="${u}">${t}</a>…</p>
</body>
</html>`;
}

function notFoundHtml(path) {
  return buildHtml({
    title:       `${SITE_NAME} — Page Not Found`,
    description: `Find verified Pros and businesses in ${SERVICE_AREA}.`,
    image:       DEFAULT_IMG,
    url:         `${SITE_URL}${path}`,
  });
}

/* ── /render/workers/:slug  (frontend lives at /pro/:slug) ───────── */
router.get('/workers/:slug', async (req, res) => {
  try {
    const w = await WorkerProfile
      .findOne({ slug: req.params.slug.toLowerCase() })
      .select('workerName category bio serviceDistricts slug userId')
      .populate('userId', 'name profilePhoto');

    if (!w) return res.status(404).send(notFoundHtml(`/pro/${req.params.slug}`));

    const name        = w.workerName || w.userId?.name || '';
    const photo       = w.userId?.profilePhoto || null;
    const districts   = (w.serviceDistricts || []).slice(0, 3).join(', ');
    const category    = (w.category || '').replace(/_/g, ' ');
    const titleBits   = [name, category].filter(Boolean).join(' — ');
    const description = w.bio
      || `Verified ${category || 'service Pro'}${districts ? ' serving ' + districts : ''} on ${SITE_NAME}.`;

    res.set('Cache-Control', 'public, max-age=600').send(buildHtml({
      title:       `${titleBits} | ${SITE_NAME}`,
      description,
      image:       absUrl(photo),
      url:         `${SITE_URL}/pro/${w.slug}`,
      type:        'profile',
    }));
  } catch (err) {
    console.error('preview workers error:', err);
    res.status(500).send(notFoundHtml(`/pro/${req.params.slug}`));
  }
});

/* ── /render/businesses/:slug ─────────────────────────────────────── */
router.get('/businesses/:slug', async (req, res) => {
  try {
    const b = await BusinessProfile.findOne({ slug: req.params.slug.toLowerCase() })
      .select('name tagline description coverPhoto logo categories city');
    if (!b) return res.status(404).send(notFoundHtml(`/businesses/${req.params.slug}`));

    const description = b.tagline || (b.description || '').slice(0, 200)
      || `Verified business on ${SITE_NAME}${b.city ? ' — ' + b.city : ''}.`;

    res.set('Cache-Control', 'public, max-age=600').send(buildHtml({
      title:       `${b.name} | ${SITE_NAME}`,
      description,
      image:       absUrl(b.coverPhoto || b.logo),
      url:         `${SITE_URL}/businesses/${b.slug}`,
      type:        'website',
    }));
  } catch (err) {
    console.error('preview businesses error:', err);
    res.status(500).send(notFoundHtml(`/businesses/${req.params.slug}`));
  }
});

/* ── Fallback for any other rendered path ─────────────────────────── */
router.get('/*', (req, res) => {
  res.set('Cache-Control', 'public, max-age=600').send(buildHtml({
    title:       `${SITE_NAME} — Workers, Businesses & Services in ${SERVICE_AREA}`,
    description: `Find and hire verified local Pros and businesses in ${SERVICE_AREA} — electricians, plumbers, salons, caterers, tutors and 49+ categories.`,
    image:       DEFAULT_IMG,
    url:         `${SITE_URL}${req.originalUrl.replace(/^\/render/, '')}`,
  }));
});

export default router;
