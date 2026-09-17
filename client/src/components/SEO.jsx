import { Helmet } from 'react-helmet-async';
import { SITE_NAME, SITE_URL, OG_IMAGE, TWITTER_HANDLE, SERVICE_AREA } from '../config/site.js';

const DEFAULT_IMG  = OG_IMAGE; // 1200×630 — served from public/og-image.jpg
const DEFAULT_DESC = `Find and hire verified local Pros and businesses in ${SERVICE_AREA} — electricians, plumbers, salons, caterers, tutors and 49+ categories.`;

/**
 * SEO component — drop into any page to set dynamic meta tags.
 *
 * Props:
 *   title        - Page title (appended with " | <site name>")
 *   description  - Meta description (max ~155 chars)
 *   image        - OG image URL (defaults to site OG image)
 *   url          - Canonical URL (defaults to current path)
 *   type         - OG type: 'website' | 'profile' | 'article' (default: 'website')
 *   noindex      - Set true for dashboard/admin pages
 *   schema       - JSON-LD object (optional structured data)
 */
export default function SEO({
  title,
  description = DEFAULT_DESC,
  image       = DEFAULT_IMG,
  url,
  type        = 'website',
  noindex     = false,
  schema      = null,
}) {
  const fullTitle    = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Workers, Businesses & Services in ${SERVICE_AREA}`;
  const canonicalUrl = url ? `${SITE_URL}${url}` : undefined;
  const desc         = description.slice(0, 155);

  return (
    <Helmet>
      {/* ── Primary ───────────────────────────────────────────────── */}
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* ── Open Graph ────────────────────────────────────────────── */}
      <meta property="og:site_name"   content={SITE_NAME} />
      <meta property="og:title"       content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:type"        content={type} />
      <meta property="og:image"       content={image} />
      <meta property="og:image:width"  content="1200" />
      <meta property="og:image:height" content="630" />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}

      {/* ── Twitter Card ──────────────────────────────────────────── */}
      <meta name="twitter:card"        content="summary_large_image" />
      <meta name="twitter:site"        content={TWITTER_HANDLE} />
      <meta name="twitter:title"       content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image"       content={image} />

      {/* ── JSON-LD structured data ───────────────────────────────── */}
      {schema && (
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      )}
    </Helmet>
  );
}
