/**
 * Single source of truth for brand- and locale-specific server values.
 *
 * Everything falls back to a neutral placeholder so the server boots with an
 * empty `.env`. Override per-environment in `server/.env` — see
 * `server/.env.example`.
 */

// ── Identity ──────────────────────────────────────────────────────────────────
export const SITE_NAME = process.env.SITE_NAME || 'SkillHub';
export const SITE_URL  = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
export const API_URL   = (process.env.API_URL    || `http://localhost:${process.env.PORT || 5000}`).replace(/\/$/, '');

export const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@skillhub.example.com';

/** Bare host shown in SMS bodies, where a full URL would eat the 160-char budget. */
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, '');

// ── Locale ────────────────────────────────────────────────────────────────────
/** Default ISO-4217 currency for prices that do not carry their own. */
export const DEFAULT_CURRENCY = (process.env.DEFAULT_CURRENCY || 'USD').toUpperCase();

/** Human-readable service area, used in generated page titles and descriptions. */
export const SERVICE_AREA = process.env.SERVICE_AREA || 'your area';

/**
 * IANA time zone used when formatting dates in e-mails and SMS, and as the
 * default for a professional's consultation schedule.
 */
export const TIMEZONE = process.env.TIMEZONE || 'UTC';

/** BCP-47 tag used to format dates and times in e-mail and SMS bodies. */
export const DATE_LOCALE = process.env.DATE_LOCALE || 'en-US';

/**
 * Phone normalisation. `PHONE_COUNTRY_CODE` is the dialling code without `+`,
 * `PHONE_NATIONAL_DIGITS` the length of a national subscriber number
 * (10 for +1 North America, 9 for most of Europe, and so on).
 */
export const PHONE_COUNTRY_CODE   = process.env.PHONE_COUNTRY_CODE || '1';
export const PHONE_NATIONAL_DIGITS = Number(process.env.PHONE_NATIONAL_DIGITS || 10);

// ── CORS ──────────────────────────────────────────────────────────────────────
/**
 * Comma-separated list of browser origins allowed to call the API.
 * Localhost dev servers are always allowed.
 */
export const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  ...(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean),
  ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL.replace(/\/$/, '')] : []),
].filter((o, i, a) => a.indexOf(o) === i);
