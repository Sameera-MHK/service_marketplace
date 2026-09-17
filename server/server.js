import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes          from './routes/auth.js';
import userRoutes          from './routes/users.js';
import workerRoutes        from './routes/workers.js';
import businessRoutes      from './routes/businesses.js';
import jobRoutes           from './routes/jobs.js';
import notificationRoutes  from './routes/notifications.js';
import adminRoutes         from './routes/admin.js';
import categoryRoutes      from './routes/categories.js';
import groupRoutes         from './routes/groups.js';
import subscriptionRoutes  from './routes/subscriptions.js';
import contactRoutes       from './routes/contact.js';
import previewRoutes       from './routes/preview.js';
import progressPostRoutes  from './routes/progressPosts.js';
import consultationRoutes  from './routes/consultations.js';
import liveClassRoutes     from './routes/liveClasses.js';
import shopRoutes          from './routes/shop.js';
import stripeWebhookRoutes from './routes/stripeWebhook.js';

import './cron.js';
import { agenda } from './services/agendaService.js';
import { ALLOWED_ORIGINS } from './config/site.js';
import { demoGuard, demoHeader, DEMO_MODE } from './middleware/demoMode.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// Stripe webhook needs the *raw* body for signature verification.
// MUST be mounted before express.json().
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }), stripeWebhookRoutes);

// ── Allowed CORS origins ───────────────────────────────────────────────────
// Configured in server/config/site.js from CLIENT_URL + ALLOWED_ORIGINS.
// Localhost dev servers are always permitted.

// ── Security middleware ────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, server-to-server)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin '${origin}' is not allowed`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));

// ── Demo mode (opt-in via DEMO_MODE=true) ──────────────────────────────────
// Keeps a public demo usable; a no-op in a normal deployment.
app.use(demoHeader);
app.use('/api', demoGuard);

// ── Rate limiters ──────────────────────────────────────────────────────────

// Strict: auth endpoints — prevents brute-force on login/register
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { success: false, data: null, message: 'Too many attempts — please wait 15 minutes and try again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Moderate: write operations — job creation, subscription requests, file uploads
const writeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: { success: false, data: null, message: 'Too many requests — slow down and try again shortly.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General: all other API calls
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  message: { success: false, data: null, message: 'Too many requests — please try again in a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth', authLimiter);
app.use('/api/jobs',          writeLimiter);
app.use('/api/subscriptions', writeLimiter);
app.use('/api/workers',       writeLimiter);
app.use('/api',               generalLimiter);

// ── Health check ───────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  const dbState = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({
    status: 'ok',
    db: dbState[mongoose.connection.readyState] || 'unknown',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// ── Static uploads (local dev fallback when Cloudinary not configured) ────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/workers',       workerRoutes);
app.use('/api/businesses',    businessRoutes);
app.use('/api/jobs',          jobRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/categories',    categoryRoutes);
app.use('/api/groups',        groupRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/contact',          contactRoutes);
app.use('/api/progress-posts',   progressPostRoutes);
app.use('/api/consultations',    consultationRoutes);
app.use('/api/live-classes',     liveClassRoutes);
app.use('/api/shop',             shopRoutes);
app.use('/render',               previewRoutes);  // SSR meta-tag previews for social-media scrapers

// ── Global error handler ───────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(`[error] ${req.method} ${req.path}:`, err.message);
  const status = err.status || err.statusCode || 500;
  // Never leak stack traces or raw Mongoose errors to the client
  const message = status < 500 ? err.message : 'An unexpected error occurred';
  res.status(status).json({ success: false, data: null, message });
});

// ── Start ──────────────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected');

    // Start Agenda job queue
    await agenda.start();
    console.log('[agenda] Job queue started');

    // Recurring: auto-complete stale live sessions every 10 minutes
    await agenda.every('10 minutes', 'auto-complete-live-classes');
    console.log('[agenda] auto-complete-live-classes scheduled every 10 min');

    // Graceful shutdown — let running jobs finish
    const graceful = async () => {
      await agenda.stop();
      process.exit(0);
    };
    process.on('SIGTERM', graceful);
    process.on('SIGINT',  graceful);

    app.listen(process.env.PORT || 5000, () => {
      console.log(`Server running on port ${process.env.PORT || 5000}`);
      console.log(`LiveKit: ${process.env.LIVEKIT_API_KEY ? '✓ configured (' + process.env.LIVEKIT_URL + ')' : '✗ NOT configured'}`);
      console.log(`Stripe:  ${process.env.STRIPE_SECRET_KEY ? '✓ configured' : '✗ NOT configured'}`);
      if (DEMO_MODE) console.log('Demo:    ✓ DEMO_MODE on — credential changes and password reset are blocked');
      console.log(`Webhook: ${process.env.STRIPE_WEBHOOK_SECRET && process.env.STRIPE_WEBHOOK_SECRET !== 'whsec_...' ? '✓ configured' : '✗ NOT configured'}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
