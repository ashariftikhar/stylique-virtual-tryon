import express from 'express';
import type { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { getSupabase } from '../services/supabase.ts';
import { getJwtSecret } from '../middleware/auth.ts';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const router: Router = express.Router();

interface StoreContext {
  storeUUID: string;
  storeId: string;
  widgetToken?: string;
  source: 'widget-token' | 'legacy-store-id';
}

interface StoreLookupRow {
  id: string;
  store_id: string;
  shopify_shop_domain?: string | null;
  woocommerce_site_url?: string | null;
}

interface WidgetTokenPayload {
  purpose?: string;
  storeUUID?: string;
  storeId?: string;
  host?: string | null;
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function resolveStoreId(storeId: string) {
  return storeId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
}

function sendPluginError(res: Response, err: any): void {
  const status = typeof err?.status === 'number' ? err.status : 500;
  res.status(status).json({
    success: false,
    error: status >= 500 ? 'Internal server error' : err?.message || 'Request failed',
  });
}

async function lookupStoreUUID(storeId: string): Promise<string | null> {
  if (resolveStoreId(storeId)) return storeId;
  const supabase = getSupabase();
  const { data } = await supabase
    .from('stores')
    .select('id')
    .eq('store_id', storeId)
    .maybeSingle();
  return data?.id ?? null;
}

function normalizeHost(value: string | null | undefined): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '');
}

function hostFromUrl(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') return '';
  try {
    return normalizeHost(new URL(value).hostname);
  } catch {
    return normalizeHost(value);
  }
}

function extractWidgetToken(req: Request): string | null {
  const explicit = req.get('X-Stylique-Widget-Token');
  if (explicit) return explicit;

  const auth = req.get('Authorization') || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

async function lookupStoreRecord(storeId: string): Promise<StoreLookupRow | null> {
  const supabase = getSupabase();
  let query = supabase
    .from('stores')
    .select('id, store_id, shopify_shop_domain, woocommerce_site_url');

  query = resolveStoreId(storeId) ? query.eq('id', storeId) : query.eq('store_id', storeId);
  const { data } = await query.maybeSingle();
  return data as StoreLookupRow | null;
}

function storeMatchesUrl(store: StoreLookupRow, currentUrl?: unknown): boolean {
  const requestHost = hostFromUrl(currentUrl);
  if (!requestHost) return true;

  const storeHosts = [
    store.store_id,
    store.shopify_shop_domain,
    store.woocommerce_site_url,
  ]
    .map((value) => hostFromUrl(value))
    .filter(Boolean);

  return storeHosts.some((host) => requestHost === host || requestHost.endsWith(`.${host}`));
}

function signWidgetToken(store: StoreLookupRow, currentUrl?: unknown): string {
  return jwt.sign(
    {
      purpose: 'stylique_widget',
      storeUUID: store.id,
      storeId: store.store_id,
      host: hostFromUrl(currentUrl) || null,
    },
    getJwtSecret(),
    { expiresIn: '4h' },
  );
}

async function resolveStoreContext(
  req: Request,
  requestedStoreId: unknown,
  currentUrl?: unknown,
): Promise<StoreContext> {
  const token = extractWidgetToken(req);
  if (token) {
    try {
      const decoded = jwt.verify(token, getJwtSecret()) as WidgetTokenPayload;
      if (decoded.purpose !== 'stylique_widget' || !decoded.storeUUID || !decoded.storeId) {
        const error = new Error('Invalid widget token');
        (error as any).status = 401;
        throw error;
      }

      if (requestedStoreId) {
        const requested = await lookupStoreRecord(String(requestedStoreId));
        if (requested && requested.id !== decoded.storeUUID) {
          const error = new Error('Widget token store mismatch');
          (error as any).status = 403;
          throw error;
        }
      }

      return { storeUUID: decoded.storeUUID, storeId: decoded.storeId, source: 'widget-token' };
    } catch (err: any) {
      const error = new Error(err?.message || 'Invalid widget token');
      (error as any).status = err?.status || 401;
      throw error;
    }
  }

  if (!requestedStoreId) {
    const error = new Error('storeId required');
    (error as any).status = 400;
    throw error;
  }

  const store = await lookupStoreRecord(String(requestedStoreId));
  if (!store) {
    const error = new Error('Store not found');
    (error as any).status = 404;
    throw error;
  }

  if (!storeMatchesUrl(store, currentUrl)) {
    const message = 'Storefront URL does not match registered store domain';
    if (process.env.STRICT_STOREFRONT_AUTH === 'true') {
      const error = new Error(message);
      (error as any).status = 403;
      throw error;
    }
    console.warn(`[Plugin Auth] ${message}: store=${store.store_id} currentUrl=${String(currentUrl || '')}`);
  }

  return {
    storeUUID: store.id,
    storeId: store.store_id,
    widgetToken: signWidgetToken(store, currentUrl),
    source: 'legacy-store-id',
  };
}

const inventorySelect =
  'id, product_name, tryon_image_url, image_url, tier, sizes, measurements, product_link, images';

type NumericMeasurements = Record<string, number>;

export interface CompleteLookProductRow {
  id: string;
  product_name?: string | null;
  image_url?: string | null;
  tryon_image_url?: string | null;
  product_link?: string | null;
  price?: number | string | null;
  sizes?: unknown;
  brand?: string | null;
  shopify_product_id?: string | number | null;
  woocommerce_product_id?: string | number | null;
  images?: unknown;
}

export interface CompleteLookItem {
  id: string;
  product_name: string;
  title: string;
  image_url: string;
  product_link: string;
  url: string;
  price: string | null;
  sizes: string[];
  brand?: string;
  reason: string;
}

interface SizeChartEntry {
  size: string;
  measurements: NumericMeasurements;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (value && typeof value === 'object' && 'value' in value) {
    return toFiniteNumber((value as { value?: unknown }).value);
  }
  return null;
}

function normalizeMeasurements(raw: unknown): NumericMeasurements {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};

  const normalized: NumericMeasurements = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const numericValue = toFiniteNumber(value);
    if (numericValue != null) normalized[key] = numericValue;
  }
  return normalized;
}

function findSizeMeasurements(productMeasurements: unknown, size: string): NumericMeasurements {
  if (!productMeasurements || typeof productMeasurements !== 'object' || Array.isArray(productMeasurements)) {
    return {};
  }

  const measurementMap = productMeasurements as Record<string, unknown>;
  const direct = measurementMap[size] ?? measurementMap[size.toUpperCase()] ?? measurementMap[size.toLowerCase()];
  if (direct) return normalizeMeasurements(direct);

  const matched = Object.entries(measurementMap).find(([key]) => key.toLowerCase() === size.toLowerCase());
  return matched ? normalizeMeasurements(matched[1]) : {};
}

function buildSizeChart(productMeasurements: unknown, availableSizes: string[]): SizeChartEntry[] {
  if (!productMeasurements || typeof productMeasurements !== 'object' || Array.isArray(productMeasurements)) {
    return [];
  }

  const sourceMap = productMeasurements as Record<string, unknown>;
  const sizeLabels = availableSizes.length > 0 ? availableSizes : Object.keys(sourceMap);

  return sizeLabels
    .map((size) => ({
      size,
      measurements: findSizeMeasurements(productMeasurements, size),
    }))
    .filter((entry) => Object.keys(entry.measurements).length > 0);
}

function isRealSizeLabel(size: unknown): size is string {
  if (typeof size !== 'string') return false;
  const normalized = size.trim().toLowerCase();
  return normalized !== '' && normalized !== 'default title' && normalized !== 'title';
}

function resolveAvailableSizes(productSizes: unknown, productMeasurements: unknown): string[] {
  const measuredSizes = productMeasurements && typeof productMeasurements === 'object' && !Array.isArray(productMeasurements)
    ? Object.keys(productMeasurements as Record<string, unknown>).filter(isRealSizeLabel)
    : [];

  const variantSizes = Array.isArray(productSizes) ? productSizes.filter(isRealSizeLabel) : [];
  const merged = variantSizes.length > 0 ? variantSizes : measuredSizes;

  return merged.length > 0 ? merged : ['M'];
}

function normalizeCompleteLookSizes(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((size): size is string => isRealSizeLabel(size))
      .map((size) => size.trim());
  }

  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>).filter(isRealSizeLabel);
  }

  return [];
}

function firstImageFromImages(value: unknown): string {
  if (!Array.isArray(value)) return '';

  for (const image of value) {
    if (typeof image === 'string' && image.trim()) return image.trim();
    if (image && typeof image === 'object') {
      const record = image as Record<string, unknown>;
      const url = record.url || record.src;
      if (typeof url === 'string' && url.trim()) return url.trim();
    }
  }

  return '';
}

function normalizeCompleteLookPrice(value: unknown): string | null {
  if (value == null || value === '') return null;
  const numeric = typeof value === 'number' ? value : Number(value);
  if (Number.isFinite(numeric)) return numeric.toFixed(2);
  return String(value);
}

function normalizeCompleteLookItem(row: CompleteLookProductRow): CompleteLookItem | null {
  const title = String(row.product_name || '').trim();
  const imageUrl = String(row.tryon_image_url || row.image_url || firstImageFromImages(row.images) || '').trim();

  if (!row.id || !title || !imageUrl) return null;

  const productLink = String(row.product_link || '').trim();
  const item: CompleteLookItem = {
    id: row.id,
    product_name: title,
    title,
    image_url: imageUrl,
    product_link: productLink,
    url: productLink,
    price: normalizeCompleteLookPrice(row.price),
    sizes: normalizeCompleteLookSizes(row.sizes),
    reason: 'Same-store recommendation',
  };

  if (row.brand) item.brand = String(row.brand);
  return item;
}

function isCurrentCompleteLookProduct(row: CompleteLookProductRow, productId: unknown): boolean {
  if (productId == null || productId === '') return false;
  const current = String(productId).trim();
  if (!current) return false;

  return [
    row.id,
    row.shopify_product_id,
    row.woocommerce_product_id,
  ].some((value) => value != null && String(value).trim() === current);
}

export function buildCompleteLookPayload(
  rows: CompleteLookProductRow[],
  productId?: unknown,
  limit = 4,
  widgetToken?: string,
) {
  const safeLimit = Math.max(1, Math.min(8, Number.isFinite(Number(limit)) ? Number(limit) : 4));
  const items = rows
    .filter((row) => !isCurrentCompleteLookProduct(row, productId))
    .map(normalizeCompleteLookItem)
    .filter((item): item is CompleteLookItem => Boolean(item))
    .slice(0, safeLimit);

  const reasoning = items.length > 0
    ? "Recommended from this store's synced catalog."
    : 'No same-store synced recommendations are available yet.';
  const outfits = items.length > 0
    ? [{
        id: 'same-store-look',
        title: 'Complete the Look',
        reasoning,
        totalConfidence: 8.5,
        items,
      }]
    : [];

  return {
    success: true,
    items,
    products: items,
    outfits,
    reasoning,
    widgetToken,
  };
}

function cleanUserMeasurements(userMeasurements: Record<string, unknown>): NumericMeasurements {
  const cleaned: NumericMeasurements = {};
  for (const [key, value] of Object.entries(userMeasurements)) {
    const numericValue = toFiniteNumber(value);
    if (numericValue != null) cleaned[key] = numericValue;
  }
  return cleaned;
}

function describeFitDelta(field: string, delta: number): string {
  const absDelta = Math.round(Math.abs(delta) * 10) / 10;

  if (absDelta < 0.5) {
    return field === 'length' || field === 'sleeve' || field === 'inseam'
      ? 'balanced'
      : 'perfect fit';
  }

  if (field === 'length' || field === 'sleeve' || field === 'inseam') {
    return delta > 0 ? `${absDelta}" longer` : `${absDelta}" shorter`;
  }

  if (field === 'shoulder') {
    return delta > 0 ? `${absDelta}" relaxed` : `${absDelta}" tight`;
  }

  return delta > 0 ? `${absDelta}" looser` : `${absDelta}" tighter`;
}

function buildFitFeel(
  userMeasurements: NumericMeasurements,
  productMeasurements: unknown,
  recommendedSize: string,
): Record<string, string> {
  const garmentMeasurements = findSizeMeasurements(productMeasurements, recommendedSize);
  const fitFeel: Record<string, string> = {};

  for (const field of ['chest', 'waist', 'hips', 'shoulder', 'length', 'sleeve', 'inseam']) {
    const userValue = userMeasurements[field];
    const garmentValue = garmentMeasurements[field];
    if (userValue == null || garmentValue == null) continue;
    fitFeel[field] = describeFitDelta(field, garmentValue - userValue);
  }

  return fitFeel;
}

function buildSizeUpDownInfo(recommendedSize: string, alternatives?: string[]) {
  const safeAlternatives = Array.isArray(alternatives)
    ? alternatives.filter((size) => typeof size === 'string' && size.trim() !== '')
    : [];

  return {
    sizeDown: safeAlternatives[0]
      ? { size: safeAlternatives[0], notes: ['Closer fit option'] }
      : null,
    sizeUp: safeAlternatives[1]
      ? { size: safeAlternatives[1], notes: ['More relaxed fit option'] }
      : null,
    recommended: recommendedSize,
  };
}

/**
 * Build URL path variants for matching product_link (trailing slash, encoding).
 */
function productPathCandidates(currentUrl: string): string[] {
  try {
    const url = new URL(currentUrl);
    let path = url.pathname || '/';
    const out = new Set<string>();
    const add = (p: string) => {
      const t = p.trim();
      if (t) out.add(t);
    };
    add(path);
    add(path.replace(/\/+$/, '') || '/');
    add(path.endsWith('/') ? path : `${path}/`);
    try {
      const dec = decodeURIComponent(path);
      add(dec);
      add(dec.replace(/\/+$/, '') || '/');
      add(dec.endsWith('/') ? dec : `${dec}/`);
    } catch {
      /* ignore decode errors */
    }
    const lower = path.toLowerCase();
    if (lower !== path) {
      add(lower);
      add(lower.replace(/\/+$/, '') || '/');
    }
    return [...out];
  } catch {
    return [];
  }
}

/**
 * Find one inventory row for the storefront product page (avoid .maybeSingle() when multiple LIKE matches).
 * Includes comprehensive debug logging for troubleshooting.
 */
async function findInventoryForCheckProduct(
  storeUUID: string,
  currentUrl: string,
  wooProductId?: number | string | null,
  shopifyProductId?: number | string | null,
): Promise<Record<string, unknown> | null> {
  const supabase = getSupabase();
  
  console.log(`[Plugin] findInventoryForCheckProduct: store_uuid=${storeUUID}, wooProductId=${wooProductId} (type: ${typeof wooProductId}), shopifyProductId=${shopifyProductId}`);

  const shopifyStr =
    shopifyProductId != null && String(shopifyProductId).trim() !== ''
      ? String(shopifyProductId).trim()
      : null;

  if (shopifyStr) {
    console.log(`[Plugin] Attempting Shopify ID match: shopify_product_id=${shopifyStr}`);
    const { data, error } = await supabase
      .from('inventory')
      .select(inventorySelect)
      .eq('store_id', storeUUID)
      .eq('shopify_product_id', shopifyStr)
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      console.log(`[Plugin] ✓ MATCHED by shopify_product_id=${shopifyStr}, product_id=${data.id}`);
      return data as Record<string, unknown>;
    }
    if (error) {
      console.warn(`[Plugin] Shopify ID lookup error: ${error.message}`);
    }
  }

  const wooStr =
    wooProductId != null && String(wooProductId).trim() !== ''
      ? String(wooProductId).trim()
      : null;

  if (wooStr) {
    try {
      // Try to match by integer woocommerce_product_id
      const wooNum = Number(wooStr);
      console.log(`[Plugin] Attempting WooCommerce ID match: wooStr="${wooStr}" → wooNum=${wooNum} (isFinite: ${Number.isFinite(wooNum)}, > 0: ${wooNum > 0})`);
      
      if (Number.isFinite(wooNum) && wooNum > 0) {
        console.log(`[Plugin] Executing query: SELECT ${inventorySelect} FROM inventory WHERE store_id='${storeUUID}' AND woocommerce_product_id=${wooNum}`);
        
        const { data, error } = await supabase
          .from('inventory')
          .select(inventorySelect)
          .eq('store_id', storeUUID)
          .eq('woocommerce_product_id', wooNum)
          .limit(1)
          .maybeSingle();

        console.log(`[Plugin] Query result: error=${error ? error.message : 'none'}, data=${data ? `found (id=${data.id}, woocommerce_product_id=${data.woocommerce_product_id})` : 'null'}`);

        if (!error && data) {
          console.log(`[Plugin] ✓ MATCHED by woocommerce_product_id=${wooNum} (numeric), product_id=${data.id}`);
          return data as Record<string, unknown>;
        }
        if (error) {
          console.warn(`[Plugin] WooCommerce ID lookup error: ${error.message}`);
        }
      } else {
        console.log(`[Plugin] WooCommerce ID is not a valid positive integer, skipping numeric lookup`);
      }
    } catch (e: any) {
      /* column may not exist yet — fall through to URL matching */
      console.warn(`[Plugin] Exception during WooCommerce ID lookup: ${e.message}`);
    }
  }

  console.log(`[Plugin] No ID match found, attempting URL-based matching for ${currentUrl}`);

  const paths = productPathCandidates(currentUrl);
  console.log(`[Plugin] URL candidates for matching: ${JSON.stringify(paths)}`);
  
  for (const p of paths) {
    if (!p || p === '/') continue;
    console.log(`[Plugin] Trying product_link ILIKE match for path fragment: "${p}"`);
    
    const { data, error } = await supabase
      .from('inventory')
      .select(inventorySelect)
      .eq('store_id', storeUUID)
      .ilike('product_link', `%${p}%`)
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      console.log(`[Plugin] ✓ MATCHED by product_link ILIKE path fragment="${p}", product_id=${data.id}`);
      return data as Record<string, unknown>;
    }
    if (error) {
      console.warn(`[Plugin] product_link ILIKE lookup error for "${p}": ${error.message}`);
    }
  }

  try {
    const url = new URL(currentUrl);
    const segments = url.pathname.split('/').filter(Boolean);
    const slug = segments[segments.length - 1];
    if (slug && slug.length > 0) {
      console.log(`[Plugin] Trying product_link ILIKE match for slug: "/${slug}/"`);
      
      const { data, error } = await supabase
        .from('inventory')
        .select(inventorySelect)
        .eq('store_id', storeUUID)
        .ilike('product_link', `%/${slug}%`)
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        console.log(`[Plugin] ✓ MATCHED by product_link ILIKE slug="/${slug}/", product_id=${data.id}`);
        return data as Record<string, unknown>;
      }
      if (error) {
        console.warn(`[Plugin] product_link ILIKE lookup error for slug "/${slug}/": ${error.message}`);
      }
    }
  } catch (e: any) {
    /* invalid URL already handled above */
    console.warn(`[Plugin] Error parsing URL for slug extraction: ${e.message}`);
  }

  console.log(`[Plugin] ✗ NO MATCH FOUND for woo=${wooStr ?? 'none'}, shopify=${shopifyStr ?? 'none'}, url=${String(currentUrl).slice(0, 120)}`);
  return null;
}

function isValidUUID(v: unknown): boolean {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

function generateOTP(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function maskEmailForLog(email: string): string {
  const [name, domain] = email.split('@');
  if (!name || !domain) return 'invalid-email';
  return `${name.slice(0, 2)}***@${domain}`;
}

async function sendOtpEmail(toEmail: string, code: string): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.OTP_FROM_EMAIL || process.env.SENDGRID_FROM_EMAIL;
  const fromName = process.env.OTP_FROM_NAME || 'Stylique';

  if (!apiKey || !fromEmail) {
    throw new Error('OTP email provider is not configured');
  }

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: toEmail }] }],
      from: { email: fromEmail, name: fromName },
      subject: 'Your Stylique verification code',
      content: [
        {
          type: 'text/plain',
          value: `Your Stylique verification code is ${code}. It expires in 10 minutes.`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OTP email provider failed with HTTP ${response.status}: ${text.slice(0, 200)}`);
  }
}

function isOtpEmailProviderConfigured(): boolean {
  return Boolean(process.env.SENDGRID_API_KEY && (process.env.OTP_FROM_EMAIL || process.env.SENDGRID_FROM_EMAIL));
}

function isProductionEnv(): boolean {
  return process.env.NODE_ENV === 'production';
}

function isDevOtpLoginEnabled(): boolean {
  if (isProductionEnv()) return false;
  return process.env.ALLOW_DEV_OTP_LOGIN === 'true' || process.env.STYLIQUE_DEV_OTP_LOGIN === 'true';
}

function isLogOnlyOtpLoginEnabled(): boolean {
  return process.env.ALLOW_LOG_ONLY_OTP_LOGIN === 'true' || process.env.STYLIQUE_LOG_ONLY_OTP_LOGIN === 'true';
}

function shouldLogOtpCode(): boolean {
  return isLogOnlyOtpLoginEnabled() || process.env.LOG_OTP_CODES === 'true' || process.env.STYLIQUE_LOG_OTP_CODES === 'true';
}

// ──────────────────────────────────────────────
// GET /plugin/simple, /plugin/test-2d — storefront widget testAPIConnection()
// ──────────────────────────────────────────────
router.get('/simple', (_req: Request, res: Response) => {
  res.json({ success: true, ok: true, message: 'Plugin API reachable' });
});

router.get('/test-2d', (_req: Request, res: Response) => {
  res.json({ success: true, ok: true, message: '2D try-on probe', mode: '2d' });
});

router.get('/debug', (_req: Request, res: Response) => {
  res.json({ success: true, ok: true, message: 'Plugin debug stub' });
});

router.get('/test', (_req: Request, res: Response) => {
  res.json({ success: true, ok: true, message: 'Plugin test stub' });
});

// ──────────────────────────────────────────────
// POST /plugin/auth
// Actions: send_otp | verify_otp
// ──────────────────────────────────────────────
router.post('/auth', async (req: Request, res: Response) => {
  try {
    const { email, action, otp } = req.body;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const logEmail = maskEmailForLog(normalizedEmail);

    if (!normalizedEmail || !action) {
      return res.status(400).json({ success: false, code: 'missing_email_or_action', error: 'Email and action are required.' });
    }

    if (action === 'send_otp') {
      const providerConfigured = isOtpEmailProviderConfigured();
      const devFallbackEnabled = isDevOtpLoginEnabled();
      const logOnlyOtpEnabled = isLogOnlyOtpLoginEnabled();

      if (!providerConfigured && !devFallbackEnabled && !logOnlyOtpEnabled) {
        console.error('[Plugin Auth] OTP email provider is not configured. Set SENDGRID_API_KEY and OTP_FROM_EMAIL or SENDGRID_FROM_EMAIL.');
        return res.status(503).json({
          success: false,
          code: 'otp_email_not_configured',
          error: 'Verification email is not configured yet. Please contact the store owner.',
        });
      }

      const supabase = getSupabase();
      const code = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      console.log(`[Plugin Auth] send_otp requested for ${logEmail}; expires=${expiresAt.toISOString()}`);

      // Ensure user row exists in DB
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (!existingUser) {
        const { error: insertErr } = await supabase
          .from('users')
          .insert({ email: normalizedEmail });
        if (insertErr) {
          console.error(`[Plugin Auth] Could not create user row for ${logEmail}: ${insertErr.message}`);
          return res.status(500).json({ success: false, code: 'user_create_failed', error: 'Failed to create user.' });
        }
        console.log(`[Plugin Auth] Created user row for ${logEmail}`);
      }

      // Store OTP in database only
      const { error: updateErr } = await supabase
        .from('users')
        .update({ otp_code: code, otp_expires_at: expiresAt.toISOString() })
        .eq('email', normalizedEmail);

      if (updateErr) {
        console.error(`[Plugin Auth] Failed to store OTP in DB for ${logEmail}: ${updateErr.message}`);
        return res.status(500).json({ success: false, code: 'otp_store_failed', error: 'Failed to send verification code.' });
      }

      if (shouldLogOtpCode()) {
        console.warn(`[Plugin Auth] OTP for ${logEmail}: OTP=${code} expires=${expiresAt.toISOString()}`);
      }

      if (!providerConfigured && logOnlyOtpEnabled) {
        console.warn(`[Plugin Auth] LOG-ONLY OTP mode enabled for ${logEmail}. Turn this off before client production.`);
        return res.json({
          success: true,
          code: 'otp_logged',
          message: 'Verification code generated. Check backend logs.',
        });
      }

      if (!providerConfigured && devFallbackEnabled) {
        console.warn(`[Plugin Auth] DEV OTP fallback enabled for ${logEmail}. Configure SendGrid before production use.`);
        return res.json({
          success: true,
          code: 'dev_otp_sent',
          message: `Development verification code: ${code}`,
          dev_otp: code,
        });
      }

      try {
        await sendOtpEmail(normalizedEmail, code);
      } catch (emailErr: any) {
        await supabase
          .from('users')
          .update({ otp_code: null, otp_expires_at: null })
          .eq('email', normalizedEmail);
        console.error(`[Plugin Auth] Failed to deliver OTP email for ${logEmail}: ${emailErr.message}`);
        return res.status(502).json({
          success: false,
          code: 'otp_email_delivery_failed',
          error: 'Verification email could not be delivered. Please try again shortly.',
        });
      }

      console.log(`[Plugin Auth] OTP email sent to ${logEmail}`);

      return res.json({ success: true, code: 'otp_sent', message: 'Verification code sent.' });
    }

    if (action === 'verify_otp') {
      if (!otp) {
        return res.status(400).json({ success: false, code: 'missing_otp', error: 'Verification code is required.' });
      }

      const receivedCode = String(otp).trim();

      console.log(`[Plugin Auth] verify_otp requested for ${logEmail}`);

      const supabase = getSupabase();

      // Check OTP from database only
      const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (!user) {
        console.log(`[Plugin Auth] User not found for email: ${logEmail}`);
        return res.status(401).json({ success: false, code: 'invalid_or_expired_otp', error: 'Invalid or expired code.' });
      }

      if (!user.otp_code) {
        console.log(`[Plugin Auth] No OTP found for user ${logEmail}`);
        return res.status(401).json({ success: false, code: 'invalid_or_expired_otp', error: 'Invalid or expired code.' });
      }

      const storedCode = String(user.otp_code);
      const expiresAt = user.otp_expires_at ? new Date(user.otp_expires_at) : null;
      const isExpired = !expiresAt || expiresAt <= new Date();

      if (storedCode !== receivedCode) {
        console.log(`[Plugin Auth] REJECTED: code mismatch for ${logEmail}`);
        return res.status(401).json({ success: false, code: 'invalid_or_expired_otp', error: 'Invalid or expired code.' });
      }

      if (isExpired) {
        console.log(`[Plugin Auth] REJECTED: code expired for ${logEmail}`);
        return res.status(401).json({ success: false, code: 'invalid_or_expired_otp', error: 'Invalid or expired code.' });
      }

      // OTP verified - clear it from database
      await supabase
        .from('users')
        .update({ otp_code: null, otp_expires_at: null })
        .eq('id', user.id);

      console.log(`[Plugin Auth] OTP VERIFIED for ${logEmail}`);

      const isNewUser = !user.name && !user.height;

      const token = jwt.sign({ userId: user.id, email: user.email }, getJwtSecret(), { expiresIn: '30d' });

      // Strip sensitive fields
      const safeUser = { ...user };
      delete safeUser.otp_code;
      delete safeUser.otp_expires_at;
      delete safeUser.password_hash;

      return res.json({
        success: true,
        user: safeUser,
        token,
        isNewUser,
      });
    }

    return res.status(400).json({ success: false, error: `Unknown action: ${action}` });
  } catch (err: any) {
    console.error('[Plugin Auth] Error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ──────────────────────────────────────────────
// POST /plugin/verify-token
// Validates a stored JWT and returns fresh user data.
// Body: { token }
// ──────────────────────────────────────────────
router.post('/verify-token', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, error: 'token required' });
    }

    let decoded: { userId?: string; email?: string };
    try {
      decoded = jwt.verify(token, getJwtSecret()) as { userId?: string; email?: string };
    } catch {
      return res.status(401).json({ success: false, error: 'Token expired or invalid' });
    }

    if (!decoded.userId && !decoded.email) {
      return res.status(401).json({ success: false, error: 'Malformed token' });
    }

    const supabase = getSupabase();
    let user: Record<string, unknown> | null = null;

    if (decoded.userId) {
      const { data } = await supabase.from('users').select('*').eq('id', decoded.userId).maybeSingle();
      user = data;
    }
    if (!user && decoded.email) {
      const { data } = await supabase.from('users').select('*').eq('email', decoded.email).maybeSingle();
      user = data;
    }

    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    const safeUser = { ...user } as Record<string, unknown>;
    delete safeUser.otp_code;
    delete safeUser.otp_expires_at;
    delete safeUser.password_hash;

    console.log(`[Plugin Auth] verify-token: valid for user ${safeUser.id} (${safeUser.email})`);

    return res.json({ success: true, user: safeUser });
  } catch (err: any) {
    console.error('[Plugin Auth] verify-token error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ──────────────────────────────────────────────
// POST /plugin/check-product
// Body: { storeId, currentUrl }
// ──────────────────────────────────────────────
router.post('/check-product', async (req: Request, res: Response) => {
  try {
    const { storeId, currentUrl, wooProductId, productId, shopifyProductId } = req.body;
    const wooId = wooProductId ?? productId;

    if (!storeId || !currentUrl) {
      return res.status(400).json({ success: false, available: false, error: 'storeId and currentUrl required' });
    }

    const storeContext = await resolveStoreContext(req, storeId, currentUrl);
    const storeUUID = storeContext.storeUUID;

    let wooNum: number | undefined;
    if (wooId != null && wooId !== '') {
      const n = Number(wooId);
      if (Number.isFinite(n) && n > 0) wooNum = n;
    }

    console.log(`[Plugin] check-product: attempting to find product for store=${storeId}, wooProductId=${wooNum ?? 'none'}, shopifyProductId=${shopifyProductId ?? 'none'}`);
    const product = await findInventoryForCheckProduct(storeUUID, currentUrl, wooNum, shopifyProductId);

    if (!product) {
      console.log(
        `[Plugin] check-product: NO MATCH for url=${String(currentUrl).slice(0, 120)} woo=${wooNum ?? 'none'} shopify=${shopifyProductId ?? 'none'}`,
      );
      return res.json({ success: true, available: false, message: 'Product not found in inventory' });
    }

    const pathname = (() => {
      try {
        return new URL(currentUrl).pathname;
      } catch {
        return '';
      }
    })();
    console.log(`[Plugin] check-product: found product=${product.id} for ${pathname}`);

    // Build images array for carousel (Tier 1/2)
    let images: string[] = [];
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      // Use stored images array (if populated)
      images = product.images.map((img: any) => 
        typeof img === 'string' ? img : img.url || img
      ).filter((url: string) => url && url.startsWith('http'));
    }
    // Fallback: use tryon_image_url and image_url if no images array
    if (images.length === 0) {
      if (product.tryon_image_url && typeof product.tryon_image_url === 'string') {
        images.push(product.tryon_image_url);
      }
      if (product.image_url && typeof product.image_url === 'string' && product.image_url !== product.tryon_image_url) {
        images.push(product.image_url as string);
      }
    }

    const responsePayload = {
      success: true,
      available: true,
      widgetToken: storeContext.widgetToken,
      product: {
        id: product.id,
        name: product.product_name,
        tryon_image_url: product.tryon_image_url || product.image_url,
        tier: product.tier || 3,
        sizes: product.sizes || [],
        measurements: product.measurements || {},
        images: images, // Array of image URLs for carousel (Tier 1/2)
      },
    };

    console.log(`[Plugin] check-product response being sent:`, JSON.stringify(responsePayload, null, 2));
    res.json(responsePayload);
  } catch (err: any) {
    console.error('[Plugin] check-product error:', err);
    sendPluginError(res, err);
  }
});

// ──────────────────────────────────────────────
// POST /plugin/embed-tryon-2d
// Accepts multipart FormData: storeId, currentUrl, userImage, garmentType, userId
// Returns a session ID and result image placeholder.
// ──────────────────────────────────────────────
router.post('/embed-tryon-2d', upload.single('userImage'), async (req: Request, res: Response) => {
  try {
    const storeId = req.body.storeId || req.headers['x-store-id'];
    const currentUrl = req.body.currentUrl || req.headers['x-current-url'];
    const productId = req.body.product_id;
    const imageUrl = req.body.image_url;
    const userId = req.body.userId;
    const file = (req as any).file;

    console.log('[Plugin][2D] ── Request received ──');
    console.log('[Plugin][2D] storeId:', storeId);
    console.log('[Plugin][2D] currentUrl:', currentUrl);
    console.log('[Plugin][2D] product_id:', productId);
    console.log('[Plugin][2D] image_url:', imageUrl);
    console.log('[Plugin][2D] userId:', userId);
    console.log('[Plugin][2D] file:', file ? `${file.originalname} (${file.size} bytes, ${file.mimetype})` : 'none');
    console.log('[Plugin][2D] body keys:', Object.keys(req.body));

    if (!storeId || !currentUrl) {
      console.log('[Plugin][2D] REJECTED: missing storeId or currentUrl');
      return res.status(400).json({ success: false, error: 'storeId and currentUrl required' });
    }

    const storeContext = await resolveStoreContext(req, storeId, currentUrl);
    const storeUUID = storeContext.storeUUID;

    console.log('[Plugin][2D] Store resolved:', storeUUID);

    // Look up the product by URL
    const supabase = getSupabase();
    let product: any = null;

    try {
      const url = new URL(currentUrl);
      const { data } = await supabase
        .from('inventory')
        .select('id, product_name, tryon_image_url, image_url')
        .eq('store_id', storeUUID)
        .like('product_link', `%${url.pathname}%`)
        .maybeSingle();
      product = data;
      console.log('[Plugin][2D] Product lookup by URL:', product ? `found id=${product.id}` : 'not found');
    } catch (urlErr: any) {
      console.warn('[Plugin][2D] URL parse/lookup failed:', urlErr.message);
    }

    // Fallback: look up by product_id if URL match failed
    if (!product && productId) {
      const { data } = await supabase
        .from('inventory')
        .select('id, product_name, tryon_image_url, image_url')
        .eq('store_id', storeUUID)
        .eq('id', productId)
        .maybeSingle();
      product = data;
      console.log('[Plugin][2D] Product lookup by ID:', product ? `found id=${product.id}` : 'not found');
    }

    // Use image_url from the request body as a final fallback
    const resultImage = product?.tryon_image_url || product?.image_url || imageUrl || '';

    const sessionId = `tryon-2d-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    console.log(`[Plugin][2D] session=${sessionId} product=${product?.id || 'none'} resultImage=${resultImage ? 'yes' : 'empty'}`);

    res.json({
      success: true,
      sessionId,
      resultImage,
      widgetToken: storeContext.widgetToken,
      product: product
        ? { id: product.id, name: product.product_name }
        : null,
    });
  } catch (err: any) {
    console.error('[Plugin][2D] Unhandled error:', err);
    sendPluginError(res, err);
  }
});

// ──────────────────────────────────────────────
// POST /plugin/embed-tryon-3d
// Starts a 3D try-on generation (stub – returns operationName for polling).
// GET /plugin/embed-tryon-3d?operationName=...
// Polls for 3D video result.
// ──────────────────────────────────────────────
router.post('/embed-tryon-3d', upload.single('userImage'), async (req: Request, res: Response) => {
  try {
    const storeId = req.body.storeId || req.headers['x-store-id'];
    const currentUrl = req.body.currentUrl || req.headers['x-current-url'];

    console.log('[Plugin][3D] Request received, storeId:', storeId, 'currentUrl:', currentUrl);

    const storeContext = await resolveStoreContext(req, storeId, currentUrl);

    const operationName = `tryon-3d-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    console.log(`[Plugin][3D] operation started: ${operationName} store=${storeContext.storeUUID}`);

    res.json({ success: true, operationName, widgetToken: storeContext.widgetToken });
  } catch (err: any) {
    console.error('[Plugin][3D] error:', err);
    sendPluginError(res, err);
  }
});

router.get('/embed-tryon-3d', async (req: Request, res: Response) => {
  try {
    const operationName = req.query.operationName as string;
    if (!operationName) {
      return res.status(400).json({ done: false, error: 'operationName required' });
    }

    // Stub: in production, look up async job status. For now, immediately "complete" with a placeholder.
    console.log(`[Plugin] 3D poll: ${operationName}`);

    res.json({
      done: true,
      videoUrl: '', // Would be the generated 3D video URL
      operationName,
    });
  } catch (err: any) {
    console.error('[Plugin] embed-tryon-3d poll error:', err);
    res.status(500).json({ done: false, error: 'Internal server error' });
  }
});

// ──────────────────────────────────────────────
// GET /plugin/store-status?storeId=...
// ──────────────────────────────────────────────
router.get('/store-status', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const storeId = req.query.storeId as string;

    const storeContext = await resolveStoreContext(req, storeId, req.get('Origin') || req.get('Referer'));
    const storeUUID = storeContext.storeUUID;

    const { data: store, error } = await supabase
      .from('stores')
      .select(
        'id, store_name, store_id, subscription_name, subscription_start_at, subscription_end_at, tryons_quota, tryons_used',
      )
      .eq('id', storeUUID)
      .maybeSingle();

    if (error || !store) {
      return res.json({ success: false, error: 'Store not found' });
    }

    const quota = typeof store.tryons_quota === 'number' ? store.tryons_quota : 0;
    const used = typeof store.tryons_used === 'number' ? store.tryons_used : 0;
    const remaining = Math.max(0, quota - used);
    let active = false;
    if (store.subscription_end_at) {
      active = new Date(store.subscription_end_at) > new Date();
    } else if (store.subscription_name === 'FREE' || store.subscription_name == null) {
      active = remaining > 0;
    } else {
      active = true;
    }

    console.log(`[Plugin] store-status: ${store.store_id} plan=${store.subscription_name} used=${used}/${quota} active=${active}`);

    res.json({
      success: true,
      widgetToken: storeContext.widgetToken,
      store: {
        id: store.id,
        store_id: store.store_id,
        store_name: store.store_name,
        subscription_name: store.subscription_name,
        subscription_start_at: store.subscription_start_at,
        subscription_end_at: store.subscription_end_at,
        subscription_active: active,
        tryons_quota: store.tryons_quota,
        tryons_used: store.tryons_used,
        tryons_remaining: Math.max(0, store.tryons_quota - store.tryons_used),
      },
    });
  } catch (err: any) {
    console.error('[Plugin] store-status error:', err);
    sendPluginError(res, err);
  }
});

// ──────────────────────────────────────────────
// GET /plugin/list-stores (fallback)
// ──────────────────────────────────────────────
router.get('/list-stores', async (_req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const { data: stores, error } = await supabase
      .from('stores')
      .select(
        'id, store_name, store_id, subscription_name, subscription_start_at, subscription_end_at, tryons_quota, tryons_used',
      )
      .limit(100);

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    res.json({ success: true, stores: stores || [] });
  } catch (err: any) {
    console.error('[Plugin] list-stores error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ──────────────────────────────────────────────
// POST /plugin/consume-tryon
// Body: { storeId, tryonType }
// ──────────────────────────────────────────────
router.post('/consume-tryon', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const { storeId, tryonType } = req.body;

    const storeContext = await resolveStoreContext(req, storeId, req.body.currentUrl || req.get('Origin') || req.get('Referer'));
    const storeUUID = storeContext.storeUUID;

    // Check remaining quota
    const { data: store } = await supabase
      .from('stores')
      .select('tryons_quota, tryons_used')
      .eq('id', storeUUID)
      .single();

    if (store && store.tryons_used >= store.tryons_quota) {
      return res.status(403).json({ success: false, error: 'Try-on quota exceeded' });
    }

    const { error: rpcError } = await supabase.rpc('increment_tryons_used', {
      store_uuid: storeUUID,
    });

    if (rpcError) {
      console.warn('[Plugin] consume-tryon RPC failed:', rpcError.message);
      // Fallback: manual increment
      await supabase
        .from('stores')
        .update({ tryons_used: (store?.tryons_used ?? 0) + 1 })
        .eq('id', storeUUID);
    }

    console.log(`[Plugin] consume-tryon: store=${storeId} type=${tryonType}`);

    res.json({ success: true, message: 'Try-on consumed', widgetToken: storeContext.widgetToken });
  } catch (err: any) {
    console.error('[Plugin] consume-tryon error:', err);
    sendPluginError(res, err);
  }
});

// ──────────────────────────────────────────────
// POST /plugin/tryon-analytics
// Reuses the track-tryon logic
// Body: { storeId, tryonType, currentUrl, userId, productId }
// ──────────────────────────────────────────────
router.post('/tryon-analytics', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const { storeId, tryonType, userId, productId, currentUrl } = req.body;
    const storeContext = await resolveStoreContext(req, storeId, currentUrl || req.get('Origin') || req.get('Referer'));
    const storeUUID = storeContext.storeUUID;

    const safeUserId = isValidUUID(userId) ? userId : null;
    const safeProductId = isValidUUID(productId) ? productId : null;

    if (userId && !safeUserId) {
      console.warn(`[Plugin] tryon-analytics: userId "${userId}" is not a UUID — setting to null`);
    }
    if (productId && !safeProductId) {
      console.warn(`[Plugin] tryon-analytics: productId "${productId}" is not a UUID — setting to null`);
    }

    const record = {
      store_id: storeUUID,
      product_id: safeProductId,
      user_id: safeUserId,
      tryon_type: tryonType || 'unknown',
      redirect_status: false,
    };

    const { error } = await supabase
      .from('tryon_analytics')
      .insert([record]);

    if (error) {
      console.error('[Plugin] tryon-analytics insert error:', error.message);
      return res.status(500).json({ success: false, error: error.message });
    }

    console.log(`[Plugin] analytics: store=${storeUUID} type=${tryonType} product=${safeProductId} user=${safeUserId}`);

    res.json({ success: true, message: 'Analytics recorded', widgetToken: storeContext.widgetToken });
  } catch (err: any) {
    console.error('[Plugin] tryon-analytics error:', err);
    sendPluginError(res, err);
  }
});

// ──────────────────────────────────────────────
// POST /plugin/track-conversion
// Body: { user_id, store_id, product_id, status, add_to_cart }
// ──────────────────────────────────────────────
router.post('/track-conversion', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const { user_id, store_id, product_id, status, add_to_cart } = req.body;

    const storeContext = await resolveStoreContext(req, store_id, req.body.currentUrl || req.get('Origin') || req.get('Referer'));
    const storeUUID = storeContext.storeUUID;

    const safeUserId = isValidUUID(user_id) ? user_id : null;

    if (user_id && !safeUserId) {
      console.warn(`[Plugin] track-conversion: user_id "${user_id}" is not a UUID — setting to null`);
    }

    const record = {
      store_id: storeUUID,
      user_id: safeUserId,
      product_id: product_id || null,
      add_to_cart: add_to_cart === true,
      status: status || 'unknown',
    };

    const { error } = await supabase
      .from('conversions')
      .insert([record]);

    if (error) {
      console.error('[Plugin] track-conversion insert error:', error.message);
      return res.status(500).json({ success: false, error: error.message });
    }

    console.log(`[Plugin] conversion: store=${storeUUID} product=${product_id} cart=${add_to_cart}`);

    res.json({ success: true, message: 'Conversion recorded', widgetToken: storeContext.widgetToken });
  } catch (err: any) {
    console.error('[Plugin] track-conversion error:', err);
    sendPluginError(res, err);
  }
});

// ──────────────────────────────────────────────
// POST /plugin/update-profile
// Body: user data including measurements
// ──────────────────────────────────────────────
router.post('/update-profile', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const data = req.body;

    // Accept userId or id (frontend sends userId)
    const userId = data.userId || data.id;
    const email = data.email;
    const token = data.token || req.get('Authorization')?.replace(/^Bearer\s+/i, '');

    if (!userId && !email) {
      return res.status(400).json({ success: false, error: 'userId or email required' });
    }

    if (token) {
      try {
        const decoded = jwt.verify(String(token), getJwtSecret()) as { userId?: string; email?: string };
        if ((userId && decoded.userId && decoded.userId !== userId) || (email && decoded.email && decoded.email !== email)) {
          return res.status(403).json({ success: false, error: 'Token does not match profile user' });
        }
      } catch {
        return res.status(401).json({ success: false, error: 'Profile token expired or invalid' });
      }
    } else if (process.env.STRICT_USER_AUTH === 'true') {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const updateFields: Record<string, unknown> = {};
    const allowedFields = [
      'name', 'phone', 'gender', 'height', 'weight', 'chest', 'waist', 'hips',
      'shoulder_width', 'arm_length', 'inseam', 'neck_circumference',
      'thigh_circumference', 'body_type', 'skin_tone',
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined && data[field] !== null) {
        updateFields[field] = data[field];
      }
    }
    // skin_tone_hex is sent from frontend, map to skin_tone column
    if (data.skin_tone_hex) {
      updateFields.skin_tone = data.skin_tone_hex;
    }

    if (Object.keys(updateFields).length === 0) {
      return res.json({ success: true, message: 'No fields to update' });
    }

    let query = supabase.from('users').update(updateFields);
    if (isValidUUID(userId)) {
      query = query.eq('id', userId);
    } else if (email) {
      query = query.eq('email', email);
    } else {
      console.warn(`[Plugin] update-profile: userId "${userId}" is not UUID, no email fallback`);
      return res.status(400).json({ success: false, error: 'Valid userId (UUID) or email required' });
    }

    const { error } = await query;

    if (error) {
      console.error('[Plugin] update-profile error:', error.message);
      return res.status(500).json({ success: false, error: error.message });
    }

    console.log(`[Plugin] profile updated for ${userId || email}: ${Object.keys(updateFields).join(', ')}`);

    res.json({ success: true, message: 'Profile updated' });
  } catch (err: any) {
    console.error('[Plugin] update-profile error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ──────────────────────────────────────────────
// POST /plugin/size-recommendation
// Body: { storeId, productId, userId, currentUrl }
// ──────────────────────────────────────────────
router.post('/size-recommendation', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const { storeId, productId, userId, currentUrl, measurements } = req.body;

    console.log('[Plugin][SizeRec] ── Request received ──');
    console.log('[Plugin][SizeRec] storeId:', storeId);
    console.log('[Plugin][SizeRec] productId:', productId);
    console.log('[Plugin][SizeRec] userId:', userId);
    console.log('[Plugin][SizeRec] currentUrl:', currentUrl);
    console.log('[Plugin][SizeRec] inline measurements:', measurements ? JSON.stringify(measurements) : 'none');

    if (!productId) {
      console.log('[Plugin][SizeRec] REJECTED: missing productId');
      return res.status(400).json({ success: false, error: 'productId required' });
    }

    const storeContext = storeId ? await resolveStoreContext(req, storeId, currentUrl) : null;

    // Try to find product by UUID first, then by any other match
    let product: any = null;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId);

    if (isUUID) {
      let productQuery = supabase
        .from('inventory')
        .select('id, product_name, sizes, measurements')
        .eq('id', productId);
      if (storeContext) productQuery = productQuery.eq('store_id', storeContext.storeUUID);
      const { data } = await productQuery.maybeSingle();
      product = data;
      console.log('[Plugin][SizeRec] Lookup by UUID:', product ? `found "${product.product_name}"` : 'not found');
    }

    // Fallback: try matching by WooCommerce numeric ID in product_link or other heuristic
    if (!product && storeId && currentUrl) {
      try {
        const storeContext = await resolveStoreContext(req, storeId, currentUrl);
        const url = new URL(currentUrl);
        const { data } = await supabase
          .from('inventory')
          .select('id, product_name, sizes, measurements')
          .eq('store_id', storeContext.storeUUID)
          .like('product_link', `%${url.pathname}%`)
          .maybeSingle();
        product = data;
        console.log('[Plugin][SizeRec] Fallback lookup by URL:', product ? `found "${product.product_name}"` : 'not found');
      } catch (urlErr: any) {
        console.warn('[Plugin][SizeRec] URL fallback failed:', urlErr.message);
      }
    }

    if (!product) {
      console.log('[Plugin][SizeRec] REJECTED: product not found for id=', productId);
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    console.log('[Plugin][SizeRec] Product found:', product.id, '"' + product.product_name + '"');
    console.log('[Plugin][SizeRec] Product sizes:', JSON.stringify(product.sizes));
    console.log('[Plugin][SizeRec] Product measurements:', product.measurements ? 'present' : 'none');

    // Fetch user measurements from DB
    let userMeasurements: Record<string, number> = {};
    if (userId) {
      const { data: user } = await supabase
        .from('users')
        .select('height, weight, chest, waist, hips, shoulder_width, arm_length, inseam')
        .eq('id', userId)
        .maybeSingle();

      if (user) {
        userMeasurements = {
          height: user.height,
          chest: user.chest,
          waist: user.waist,
          hips: user.hips,
          shoulder: user.shoulder_width,
          sleeve: user.arm_length,
          inseam: user.inseam,
        };
        console.log('[Plugin][SizeRec] User measurements from DB:', JSON.stringify(userMeasurements));
      } else {
        console.log('[Plugin][SizeRec] No user measurements found in DB for userId:', userId);
      }
    }

    // Override with inline measurements if provided
    if (measurements && typeof measurements === 'object') {
      Object.assign(userMeasurements, measurements);
      console.log('[Plugin][SizeRec] Merged with inline measurements:', JSON.stringify(userMeasurements));
    }

    const availableSizes = resolveAvailableSizes(product.sizes, product.measurements);
    const hasProductMeasurements =
      product.measurements &&
      typeof product.measurements === 'object' &&
      Object.keys(product.measurements).length > 0;
    const cleanMeasurements = cleanUserMeasurements(userMeasurements);
    const sizeChart = hasProductMeasurements ? buildSizeChart(product.measurements, availableSizes) : [];

    console.log('[Plugin][SizeRec] Data readiness:', {
      availableSizesCount: availableSizes.length,
      hasProductMeasurements,
      sizeChartCount: sizeChart.length,
      userMeasurementKeys: Object.keys(cleanMeasurements),
    });

    // If user has no measurements, return a generic suggestion
    if (!cleanMeasurements.chest && !cleanMeasurements.waist) {
      const genericFit = availableSizes[Math.floor(availableSizes.length / 2)] || 'M';
      console.log('[Plugin][SizeRec] No user measurements — returning generic:', genericFit);
      return res.json({
        success: true,
        widgetToken: storeContext?.widgetToken,
        recommendation: {
          bestFit: genericFit,
          alternatives: availableSizes.filter((size) => size !== genericFit).slice(0, 2),
          confidence: 30,
          source: 'generic',
          userMeasurements: cleanMeasurements,
          sizeChart,
          fitFeel: {},
          sizeUpDownInfo: buildSizeUpDownInfo(genericFit, availableSizes.filter((size) => size !== genericFit).slice(0, 2)),
          detailedInsights: {
            whyBestFit: 'Add your measurements during onboarding for a more accurate recommendation.',
          },
        },
      });
    }

    let result;
    if (hasProductMeasurements) {
      // Import the logic inline to avoid circular dependency issues
      const { recommendFromProductMeasurements } = await import('./recommendations.ts');
      result = recommendFromProductMeasurements(cleanMeasurements, product.measurements, availableSizes);
    } else {
      const { recommendFromGeneric } = await import('./recommendations.ts');
      result = recommendFromGeneric(cleanMeasurements, availableSizes);
    }

    const confidenceNum = result.confidence === 'high' ? 85 : result.confidence === 'medium' ? 65 : 40;
    const recommendedMeasurements = hasProductMeasurements
      ? findSizeMeasurements(product.measurements, result.recommended)
      : {};
    const hasRecommendedMeasurements = Object.keys(recommendedMeasurements).length > 0;
    const fitFeel = hasProductMeasurements
      ? buildFitFeel(cleanMeasurements, product.measurements, result.recommended)
      : {};

    console.log(`[Plugin] size-rec: product=${productId} => ${result.recommended} (${result.confidence}/${confidenceNum}%) source=${result.source}`);
    if (!hasRecommendedMeasurements && hasProductMeasurements) {
      console.warn(
        `[Plugin][SizeRec] Recommended size ${result.recommended} has no direct measurement row. sizeChartCount=${sizeChart.length}`,
      );
    }
    if (Object.keys(fitFeel).length === 0) {
      console.log('[Plugin][SizeRec] No fitFeel insights generated for this request.');
    }

    res.json({
      success: true,
      widgetToken: storeContext?.widgetToken,
      recommendation: {
        bestFit: result.recommended,
        alternatives: result.alternatives,
        confidence: confidenceNum,
        source: result.source,
        userMeasurements: cleanMeasurements,
        sizeChart,
        fitFeel,
        sizeUpDownInfo: buildSizeUpDownInfo(result.recommended, result.alternatives),
        detailedInsights: {
          whyBestFit: `Based on your measurements, ${result.recommended} is the best match using ${result.source === 'product_specific' ? 'product-specific sizing data' : 'standard size charts'}.`,
        },
      },
    });
  } catch (err: any) {
    console.error('[Plugin] size-recommendation error:', err);
    sendPluginError(res, err);
  }
});

// ──────────────────────────────────────────────
// POST /plugin/complete-look
// ──────────────────────────────────────────────
router.post('/complete-look', async (req: Request, res: Response) => {
  try {
    const { storeId, productId, currentUrl, limit } = req.body;
    const storeContext = await resolveStoreContext(req, storeId, currentUrl || req.get('Origin') || req.get('Referer'));
    const storeUUID = storeContext.storeUUID;
    const safeLimit = Math.max(1, Math.min(8, Number.isFinite(Number(limit)) ? Number(limit) : 4));

    const supabase = getSupabase();
    const { data: rows, error } = await supabase
      .from('inventory')
      .select('id, product_name, image_url, tryon_image_url, product_link, price, sizes, brand, shopify_product_id, woocommerce_product_id, images, updated_at')
      .eq('store_id', storeUUID)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .limit(Math.min(safeLimit + 8, 16));

    if (error) {
      console.error('[Plugin] complete-look error:', error.message);
      return res.status(500).json({ success: false, error: 'DB error' });
    }

    const payload = buildCompleteLookPayload((rows || []) as CompleteLookProductRow[], productId, safeLimit, storeContext.widgetToken);
    console.log(`[Plugin] complete-look: store=${storeContext.storeId} returned ${payload.items.length} items`);
    res.json(payload);
  } catch (err: any) {
    console.error('[Plugin] complete-look error:', err);
    sendPluginError(res, err);
  }
});

// ──────────────────────────────────────────────
// POST /api/detect-skin-tone (mounted at /api in index.ts, not under /plugin)
// Stub — real implementation would use image analysis.
// ──────────────────────────────────────────────
router.post('/detect-skin-tone', upload.single('image'), (_req: Request, res: Response) => {
  console.log('[Plugin] detect-skin-tone: stub response');
  res.json({
    success: true,
    skinTone: '#C68642',
    hexColor: '#C68642',
    label: 'Medium',
    message: 'Skin tone detection stub — connect a real provider for production.',
  });
});

// ──────────────────────────────────────────────
// GET fallbacks for consume-tryon and tryon-analytics
// (the Liquid falls back to GET when POST returns 405)
// ──────────────────────────────────────────────
router.get('/consume-tryon', async (req: Request, res: Response) => {
  const { storeId, tryonType } = req.query as Record<string, string>;
  const storeContext = await resolveStoreContext(req, storeId, req.get('Origin') || req.get('Referer'));
  const storeUUID = storeContext.storeUUID;
  const supabase = getSupabase();
  const { error } = await supabase.rpc('increment_tryons_used', { p_store_id: storeUUID }).single();
  if (error) console.warn('[Plugin] consume-tryon GET rpc:', error.message);
  console.log(`[Plugin] consume-tryon (GET): store=${storeId} type=${tryonType || '?'}`);
  res.json({ success: true, widgetToken: storeContext.widgetToken });
});

router.get('/tryon-analytics', async (req: Request, res: Response) => {
  console.log('[Plugin] tryon-analytics (GET):', req.query);
  res.json({ success: true, message: 'analytics received (GET fallback)' });
});

// ──────────────────────────────────────────────
// DEBUG ENDPOINT: /api/debug/check-product
// Direct database query for testing product lookup
// ──────────────────────────────────────────────
router.post('/debug/check-product', async (req: Request, res: Response) => {
  try {
    const { storeId, wooProductId } = req.body;
    console.log('[DEBUG] check-product: storeId=', storeId, 'wooProductId=', wooProductId, 'type=', typeof wooProductId);

    if (!storeId) {
      return res.status(400).json({ error: 'storeId required' });
    }

    const supabase = getSupabase();

    // Step 1: Resolve store UUID
    console.log('[DEBUG] Resolving store_id to UUID...');
    const storeUUID = await lookupStoreUUID(storeId);
    if (!storeUUID) {
      return res.status(404).json({ error: 'Store not found', storeId });
    }
    console.log('[DEBUG] Store UUID resolved to:', storeUUID);

    // Step 2: Check store exists and get product count
    const { data: storeData, error: storeError } = await supabase
      .from('stores')
      .select('id, store_id')
      .eq('id', storeUUID)
      .single();
    console.log('[DEBUG] Store lookup:', { storeData, storeError: storeError?.message });

    // Step 3: Check if ANY products exist for this store
    const { data: allProducts, error: allError } = await supabase
      .from('inventory')
      .select('id, product_name, woocommerce_product_id, store_id')
      .eq('store_id', storeUUID);
    console.log('[DEBUG] All products for store:', { count: allProducts?.length || 0, error: allError?.message });
    if (allProducts) {
      allProducts.forEach((p: any) => {
        console.log(`[DEBUG]   - id=${p.id}, name=${p.product_name}, woocommerce_product_id=${p.woocommerce_product_id} (type: ${typeof p.woocommerce_product_id}), store_id=${p.store_id}`);
      });
    }

    // Step 4: Specific query for woocommerce_product_id
    if (wooProductId != null) {
      const wooNum = Number(wooProductId);
      console.log(`[DEBUG] Looking for woocommerce_product_id: input=${wooProductId}, parsed=${wooNum}, isFinite=${Number.isFinite(wooNum)}`);

      const { data: wooProduct, error: wooError } = await supabase
        .from('inventory')
        .select('*')
        .eq('store_id', storeUUID)
        .eq('woocommerce_product_id', wooNum)
        .single();

      console.log(`[DEBUG] WooCommerce ID lookup result:`, { 
        found: !!wooProduct,
        error: wooError?.message,
        data: wooProduct
      });

      return res.json({
        debug: 'Check backend logs for detailed information',
        storeId,
        storeUUID,
        wooProductId,
        wooProductIdType: typeof wooProductId,
        wooProductIdParsed: wooNum,
        result: {
          found: !!wooProduct,
          product: wooProduct,
          error: wooError?.message,
        },
        allProducts: allProducts?.map((p: any) => ({
          id: p.id,
          name: p.product_name,
          woocommerce_product_id: p.woocommerce_product_id,
          store_id: p.store_id,
        })) || [],
      });
    }

    res.json({
      debug: 'No wooProductId provided',
      storeId,
      storeUUID,
      allProducts: allProducts?.map((p: any) => ({
        id: p.id,
        name: p.product_name,
        woocommerce_product_id: p.woocommerce_product_id,
        store_id: p.store_id,
      })) || [],
    });
  } catch (err: any) {
    console.error('[DEBUG] check-product error:', err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

export default router;
