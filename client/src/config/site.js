/**
 * Single source of truth for everything brand- and locale-specific.
 *
 * All values fall back to neutral placeholders so the app runs out of the box.
 * Override them per-environment with the matching `VITE_*` variable in
 * `client/.env.local` (dev) or `client/.env.production` (build) — see
 * `client/.env.example`.
 */

const env = import.meta.env;

// ── Identity ──────────────────────────────────────────────────────────────────
export const SITE_NAME    = env.VITE_SITE_NAME    || 'SkillHub';
export const SITE_LEGAL   = env.VITE_SITE_LEGAL   || 'the SkillHub platform';
export const SITE_URL     = (env.VITE_SITE_URL    || 'https://skillhub.example.com').replace(/\/$/, '');
export const SITE_TAGLINE = env.VITE_SITE_TAGLINE || 'Local Skills Marketplace';

export const SUPPORT_EMAIL = env.VITE_SUPPORT_EMAIL || 'support@skillhub.example.com';
export const CONTACT_EMAIL = env.VITE_CONTACT_EMAIL || 'hello@skillhub.example.com';

export const TWITTER_HANDLE = env.VITE_TWITTER_HANDLE || '@skillhub';
export const OG_IMAGE       = env.VITE_OG_IMAGE       || `${SITE_URL}/og-image.jpg`;

/** Optional looping hero video on the landing page. Hidden when unset. */
export const HERO_VIDEO_URL = env.VITE_HERO_VIDEO_URL || '';

// ── Locale & jurisdiction ─────────────────────────────────────────────────────
/** Shown wherever the platform's service area is named. */
export const SERVICE_AREA = env.VITE_SERVICE_AREA || 'your area';
/** Legal jurisdiction used in the Terms and Privacy pages. */
export const COUNTRY      = env.VITE_COUNTRY      || 'the Republic of Example';
/** Registered address line used in the Terms and Privacy pages. */
export const LEGAL_ADDRESS = env.VITE_LEGAL_ADDRESS || '1 Example Street, Example City';

/**
 * BCP-47 tag used to format dates and times, e.g. 'en-GB' for 31/01/2026.
 * Leave `VITE_DATE_LOCALE` unset to use each visitor's own locale.
 */
export const DATE_LOCALE = env.VITE_DATE_LOCALE || undefined;

/** ISO 3166-1 alpha-2 code emitted in schema.org PostalAddress markup. */
export const COUNTRY_CODE = env.VITE_COUNTRY_CODE || 'US';

/** Default ISO-4217 currency. Individual listings may override it. */
export const DEFAULT_CURRENCY = env.VITE_DEFAULT_CURRENCY || 'USD';
/** Currencies offered in price pickers. */
export const CURRENCIES = ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY'];

const CURRENCY_SYMBOLS = {
  USD: '$', EUR: '\u20ac', GBP: '\u00a3',
  AUD: 'A$', CAD: 'C$', JPY: '\u00a5',
};

/** Short prefix shown next to amounts, e.g. `$1,200`. */
export const CURRENCY_SYMBOL = CURRENCY_SYMBOLS[DEFAULT_CURRENCY] || `${DEFAULT_CURRENCY} `;

/** Format a number as a display amount: `formatMoney(1200)` -> `$1,200`. */
export function formatMoney(amount) {
  if (amount == null || Number.isNaN(Number(amount))) return '\u2014';
  return `${CURRENCY_SYMBOL}${Number(amount).toLocaleString()}`;
}

/**
 * IANA time zone used to render dates and times.
 * Leave `VITE_TIMEZONE` unset to use each visitor's own time zone.
 */
export const TIMEZONE = env.VITE_TIMEZONE || undefined;

// ── Coverage areas ────────────────────────────────────────────────────────────
/**
 * The service regions users can filter and register against. Stored on the
 * user as `location.district`. Replace this list with your own regions — the
 * names below are deliberately fictional placeholders.
 */
export const DISTRICTS = [
  'Ashford', 'Brookside', 'Cedar Hills', 'Downtown', 'Eastside',
  'Fairview', 'Greenfield', 'Harborview', 'Hillview', 'Lakeside',
  'Maplewood', 'Midtown', 'Northside', 'Oakland Park', 'Pinecrest',
  'Riverside', 'Rosewood', 'Silverlake', 'Southside', 'Springfield',
  'Stonebridge', 'Sunnyvale', 'Uptown', 'Westside', 'Willowbrook',
];

/** Languages a professional can advertise. Independent of the UI locales. */
export const LANGUAGES = ['English', 'Spanish', 'French'];
