/**
 * Demo-mode guard.
 *
 * A public demo publishes its own credentials, so anyone can sign in as the
 * demo admin. This middleware keeps a hosted demo usable by blocking the two
 * things that would lock everyone else out — credential changes and account
 * deletion — while leaving every other feature explorable.
 *
 * Everything else is handled by resetting the database on a schedule
 * (`npm run demo:reset`), not by restricting the app.
 *
 * Enabled with DEMO_MODE=true. Off by default, so a normal deployment is
 * unaffected.
 */

export const DEMO_MODE = process.env.DEMO_MODE === 'true';

/** Routes that would break a shared demo for everyone else. */
const BLOCKED = [
  { method: 'POST', path: '/api/auth/forgot-password' },
  { method: 'POST', path: '/api/auth/reset-password'  },
];

const deny = (res, message) =>
  res.status(403).json({ success: false, data: null, message });

export function demoGuard(req, res, next) {
  if (!DEMO_MODE) return next();

  if (BLOCKED.some((b) => b.method === req.method && req.path === b.path.replace(/^\/api/, ''))) {
    return deny(res, 'Disabled in the demo — password reset would lock out other visitors.');
  }

  // Silently drop credential changes rather than failing the whole request,
  // so the profile form still demonstrates saving the other fields.
  if (req.method === 'PUT' && req.body && typeof req.body === 'object') {
    delete req.body.email;
    delete req.body.password;
    delete req.body.role;
  }

  if (req.method === 'DELETE' && /^\/(me|users)\b/.test(req.path)) {
    return deny(res, 'Disabled in the demo — account deletion is turned off.');
  }

  return next();
}

/** Adds an X-Demo-Mode header so the frontend (or a curl) can tell. */
export function demoHeader(req, res, next) {
  if (DEMO_MODE) res.set('X-Demo-Mode', 'true');
  next();
}
