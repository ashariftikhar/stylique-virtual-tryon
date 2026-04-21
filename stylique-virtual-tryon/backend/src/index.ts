import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { getJwtSecret, requireAuth } from './middleware/auth.ts';
import authRoutes from './routes/auth.ts';
import productRoutes from './routes/products.ts';
import woocommerceRoutes from './routes/woocommerce.ts';
import imagesRoutes from './routes/images.ts';
import recommendationsRoutes from './routes/recommendations.ts';
import storeRoutes from './routes/store.ts';
import analyticsRoutes from './routes/analytics.ts';
import inventoryRoutes from './routes/inventory.ts';
import multer from 'multer';
import pluginRoutes from './routes/plugin.ts';
import shopifyRoutes, { shopifyWebhookHandler } from './routes/shopify.ts';

const app = express();
const PORT = process.env.PORT || 5000;
getJwtSecret();

// ──────────────────────────────────────────────
// Rate Limiting — 10 requests per minute per IP
// ──────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per windowMs
  message: 'Too many login attempts, please try again later',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  keyGenerator: (req) => req.ip || req.socket.remoteAddress || 'unknown',
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.method === 'GET';
  },
});

const pluginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per windowMs
  message: 'Too many requests to plugin API, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || req.socket.remoteAddress || 'unknown',
});

// ──────────────────────────────────────────────
// CORS — applied first so every response (and OPTIONS) gets headers when allowed
// ──────────────────────────────────────────────
/** Theme editor / storefront preview (https://…shopifypreview.com) */
const RE_SHOPIFY_PREVIEW_ORIGIN = /^https:\/\/[^\s/]+\.shopifypreview\.com\/?$/i;

const STATIC_CORS_ORIGINS = new Set([
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3002',
  'http://127.0.0.1:3003',
  'http://stylique.local',
  'https://stylique.local',
]);

function isShopifyStorefrontHost(host: string): boolean {
  const h = host.toLowerCase();
  return (
    h.endsWith('.myshopify.com') ||
    h === 'myshopify.com' ||
    h.endsWith('.shopifypreview.com') ||
    h === 'shopifypreview.com'
  );
}

function isNgrokDevHost(host: string): boolean {
  const h = host.toLowerCase();
  return h.includes('ngrok-free.') || h.endsWith('.ngrok.io') || h.endsWith('.ngrok.app');
}

function isVercelDeployment(host: string): boolean {
  const h = host.toLowerCase();
  return h.endsWith('.vercel.app');
}

function corsDecision(
  origin: string | undefined,
  mode: 'development' | 'production',
  panelOrigin: string,
): { allow: boolean; reason: string } {
  if (!origin) {
    return { allow: true, reason: 'no-origin (same-site or non-browser)' };
  }
  const trimmed = origin.replace(/\/$/, '');
  if (STATIC_CORS_ORIGINS.has(trimmed)) {
    return { allow: true, reason: 'static-allowlist' };
  }
  if (trimmed === panelOrigin) {
    return { allow: true, reason: 'FRONTEND_URL panel' };
  }
  try {
    const host = new URL(origin).hostname.toLowerCase();
    if (RE_SHOPIFY_PREVIEW_ORIGIN.test(origin.trim())) {
      return { allow: true, reason: 'regex shopifypreview.com' };
    }
    if (isShopifyStorefrontHost(host)) {
      return { allow: true, reason: 'shopify storefront host' };
    }
    if (isNgrokDevHost(host)) {
      return { allow: true, reason: 'ngrok dev host' };
    }
    if (isVercelDeployment(host)) {
      return { allow: true, reason: 'vercel deployment' };
    }
  } catch {
    return { allow: false, reason: 'invalid Origin URL' };
  }
  return { allow: false, reason: 'not in policy' };
}

const CORS_METHODS = 'GET,POST,PUT,PATCH,DELETE,OPTIONS';
const CORS_HEADERS =
  'Content-Type, Authorization, X-Current-URL, X-Store-ID, X-Stylique-Sync-Secret, X-Webhook-Secret, X-Sync-Secret, ngrok-skip-browser-warning';

/** Runs before all routes: reflect Origin + handle OPTIONS preflight */
function attachEarlyCors(panelOrigin: string, mode: 'development' | 'production') {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const origin = req.get('Origin');
    const { allow, reason } = corsDecision(origin, mode, panelOrigin);
    console.log(
      `[CORS] ${req.method} ${req.originalUrl || req.url} origin=${origin ?? '(none)'} allowed=${allow} (${reason})`,
    );

    if (allow && origin) {
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    if (req.method === 'OPTIONS') {
      if (allow && origin) {
        res.setHeader('Access-Control-Allow-Methods', CORS_METHODS);
        res.setHeader('Access-Control-Allow-Headers', CORS_HEADERS);
        res.setHeader('Access-Control-Max-Age', '86400');
        return res.status(204).end();
      }
      return res.status(403).json({ error: 'CORS preflight denied' });
    }

    next();
  };
}

const panelOrigin = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
const corsMode = process.env.NODE_ENV === 'production' ? 'production' : 'development';
app.use(attachEarlyCors(panelOrigin, corsMode));

app.use(
  cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      const { allow, reason } = corsDecision(origin, corsMode, panelOrigin);
      console.log(`[CORS:cors pkg] origin=${origin ?? '(none)'} allowed=${allow} (${reason})`);
      if (allow) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Current-URL',
      'X-Store-ID',
      'X-Stylique-Sync-Secret',
      'X-Webhook-Secret',
      'X-Sync-Secret',
      'ngrok-skip-browser-warning',
    ],
  }),
);
console.log(`[CORS] Early + cors() middleware for ${corsMode.toUpperCase()}`);

// Shopify webhooks need the raw body for HMAC verification — must run before express.json()
app.post(
  '/api/webhooks/shopify',
  express.raw({ type: 'application/json' }),
  (req, res, next) => {
    void shopifyWebhookHandler(req, res).catch(next);
  },
);

app.use(express.json());

// ──────────────────────────────────────────────
// Health check (unauthenticated)
// ──────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Stylique Virtual Try-On API is running',
    timestamp: new Date().toISOString(),
  });
});
app.get('/api/cors-test', (_req, res) => {
  res.json({ success: true, cors: true, message: 'CORS probe' });
});
app.get('/api/ping', (_req, res) => {
  res.json({ ping: true, ts: Date.now() });
});
console.log('✓ Health check + /api/ping registered');

// ──────────────────────────────────────────────
// Public routes – no JWT required
// ──────────────────────────────────────────────
// Apply login rate limit BEFORE routing to auth endpoints
app.post('/api/auth/login', loginLimiter);
app.use('/api', authRoutes);
console.log('✓ Auth routes          (POST /api/auth/register, /api/auth/login with rate limiting)');

// Apply plugin rate limit to all plugin endpoints
app.use('/plugin', pluginLimiter);
app.use('/api/plugin', pluginLimiter);
app.use('/plugin', pluginRoutes);
app.use('/api/plugin', pluginRoutes);

const skinUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
app.post('/api/detect-skin-tone', skinUpload.single('image'), (_req, res) => {
  console.log('[detect-skin-tone] stub response');
  res.json({ success: true, skinTone: '#C68642', label: 'Medium', message: 'Stub — connect real provider for production.' });
});
console.log('✓ Plugin routes        (/plugin/*, /api/plugin/* with rate limiting)');

// Webhook sync endpoints called by external platforms
app.use('/api', productRoutes);
console.log('✓ Product sync routes  (POST /api/sync/shopify, /api/sync/products)');

app.use('/api', woocommerceRoutes);
console.log('✓ WooCommerce sync     (POST /api/sync/woocommerce)');

app.use('/api', shopifyRoutes);
console.log('✓ Shopify OAuth        (GET /api/shopify/oauth, /api/shopify/callback)');
console.log('✓ Shopify webhooks     (POST /api/webhooks/shopify)');

// ──────────────────────────────────────────────
// Protected routes – JWT required
// All mounted under /api with requireAuth applied per-group
// ──────────────────────────────────────────────
const protectedApi = express.Router();
protectedApi.use(requireAuth);
protectedApi.use(inventoryRoutes);
protectedApi.use(imagesRoutes);
protectedApi.use(recommendationsRoutes);
protectedApi.use(storeRoutes);
protectedApi.use(analyticsRoutes);

app.use('/api', protectedApi);
console.log('✓ Protected routes     (inventory, images, recommendations, store, analytics)');

// ──────────────────────────────────────────────
// Error handling
// ──────────────────────────────────────────────
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

// ──────────────────────────────────────────────
// Start server
// ──────────────────────────────────────────────
const server = app.listen(PORT, () => {
  const otpEmailConfigured = Boolean(process.env.SENDGRID_API_KEY && (process.env.OTP_FROM_EMAIL || process.env.SENDGRID_FROM_EMAIL));
  const devOtpEnabled = process.env.NODE_ENV !== 'production' && (process.env.ALLOW_DEV_OTP_LOGIN === 'true' || process.env.STYLIQUE_DEV_OTP_LOGIN === 'true');
  console.log(`[Config] OTP email: ${otpEmailConfigured ? 'configured' : 'missing'}; dev OTP fallback: ${devOtpEnabled ? 'enabled' : 'disabled'}`);

  console.log(`\n🚀 Server is running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔑 Auth:         POST http://localhost:${PORT}/api/auth/login`);
  console.log(`🔌 Plugin:       POST http://localhost:${PORT}/plugin/auth\n`);
});

server.on('error', (error: any) => {
  console.error('Server error:', error);
  process.exit(1);
});

process.on('uncaughtException', (error: any) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: any) => {
  console.error('Unhandled rejection:', reason);
  process.exit(1);
});
