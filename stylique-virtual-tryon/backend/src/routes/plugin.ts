import express from 'express';
import type { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { getSupabase } from '../services/supabase.ts';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const router: Router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'stylique-dev-secret-change-me';

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function resolveStoreId(storeId: string) {
  return storeId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
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

const inventorySelect =
  'id, product_name, tryon_image_url, image_url, tier, sizes, product_link, images';

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
 */
async function findInventoryForCheckProduct(
  storeUUID: string,
  currentUrl: string,
  wooProductId?: number | string | null,
  shopifyProductId?: number | string | null,
): Promise<Record<string, unknown> | null> {
  const supabase = getSupabase();

  const shopifyStr =
    shopifyProductId != null && String(shopifyProductId).trim() !== ''
      ? String(shopifyProductId).trim()
      : null;

  if (shopifyStr) {
    const { data, error } = await supabase
      .from('inventory')
      .select(inventorySelect)
      .eq('store_id', storeUUID)
      .eq('shopify_product_id', shopifyStr)
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      console.log(`[Plugin] check-product: matched by shopify_product_id=${shopifyStr}`);
      return data as Record<string, unknown>;
    }
    if (error && !/shopify_product_id|schema|column/i.test(error.message)) {
      console.warn('[Plugin] check-product shopify id lookup:', error.message);
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
      if (Number.isFinite(wooNum) && wooNum > 0) {
        const { data, error } = await supabase
          .from('inventory')
          .select(inventorySelect)
          .eq('store_id', storeUUID)
          .eq('woocommerce_product_id', wooNum)
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          console.log(`[Plugin] check-product: matched by woocommerce_product_id=${wooNum} (numeric match)`);
          return data as Record<string, unknown>;
        }
        if (error && !/woocommerce_product_id|schema|column/i.test(error.message)) {
          console.warn('[Plugin] check-product woo id lookup:', error.message);
        }
      }
    } catch {
      /* column may not exist yet — fall through to URL matching */
      console.log('[Plugin] check-product: woocommerce_product_id column not found or error during lookup');
    }
  }

  const paths = productPathCandidates(currentUrl);
  for (const p of paths) {
    if (!p || p === '/') continue;
    const { data, error } = await supabase
      .from('inventory')
      .select(inventorySelect)
      .eq('store_id', storeUUID)
      .ilike('product_link', `%${p}%`)
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      console.log(`[Plugin] check-product: matched by product_link ilike path fragment=${p}`);
      return data as Record<string, unknown>;
    }
  }

  try {
    const url = new URL(currentUrl);
    const segments = url.pathname.split('/').filter(Boolean);
    const slug = segments[segments.length - 1];
    if (slug && slug.length > 0) {
      const { data, error } = await supabase
        .from('inventory')
        .select(inventorySelect)
        .eq('store_id', storeUUID)
        .ilike('product_link', `%/${slug}%`)
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        console.log(`[Plugin] check-product: matched by slug ilike /${slug}/`);
        return data as Record<string, unknown>;
      }
    }
  } catch {
    /* invalid URL already handled above */
  }

  return null;
}

function isValidUUID(v: unknown): boolean {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

function generateOTP(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
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
    const supabase = getSupabase();
    const { email, action, otp } = req.body;

    if (!email || !action) {
      return res.status(400).json({ success: false, error: 'email and action required' });
    }

    if (action === 'send_otp') {
      const code = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      console.log(`[Plugin Auth] send_otp: email=${email} code=${code} expires=${expiresAt.toISOString()}`);

      // Ensure user row exists in DB
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (!existingUser) {
        const { error: insertErr } = await supabase
          .from('users')
          .insert({ email });
        if (insertErr) {
          console.error(`[Plugin Auth] Could not create user row: ${insertErr.message}`);
          return res.status(500).json({ success: false, error: 'Failed to create user' });
        }
        console.log(`[Plugin Auth] Created user row for ${email}`);
      }

      // Store OTP in database only
      const { error: updateErr } = await supabase
        .from('users')
        .update({ otp_code: code, otp_expires_at: expiresAt.toISOString() })
        .eq('email', email);

      if (updateErr) {
        console.error(`[Plugin Auth] Failed to store OTP in DB: ${updateErr.message}`);
        return res.status(500).json({ success: false, error: 'Failed to send OTP' });
      }

      console.log(`[Plugin Auth] OTP stored in DB for ${email}: code=${code}`);

      // In production, send email via SendGrid / SES / etc.
      console.log(`[Plugin Auth] OTP for ${email}: ${code}  (dev-mode, would email in production)`);

      return res.json({ success: true, message: 'OTP sent' });
    }

    if (action === 'verify_otp') {
      if (!otp) {
        return res.status(400).json({ success: false, error: 'otp required' });
      }

      const normalizedEmail = email.toLowerCase();
      const receivedCode = String(otp).trim();

      console.log(`[Plugin Auth] verify_otp: email=${email} received_otp=${receivedCode}`);

      // Check OTP from database only
      const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (!user) {
        console.log(`[Plugin Auth] User not found for email: ${email}`);
        return res.status(401).json({ success: false, error: 'Invalid or expired code' });
      }

      if (!user.otp_code) {
        console.log(`[Plugin Auth] No OTP found for user ${email}`);
        return res.status(401).json({ success: false, error: 'Invalid or expired code' });
      }

      const storedCode = String(user.otp_code);
      const expiresAt = user.otp_expires_at ? new Date(user.otp_expires_at) : null;
      const isExpired = !expiresAt || expiresAt <= new Date();

      console.log(`[Plugin Auth] DB OTP verification:`);
      console.log(`  stored_code  = "${storedCode}"`);
      console.log(`  received_code= "${receivedCode}"`);
      console.log(`  codes_match  = ${storedCode === receivedCode}`);
      console.log(`  is_expired   = ${isExpired}`);

      if (storedCode !== receivedCode) {
        console.log(`[Plugin Auth] REJECTED: code mismatch for ${email}`);
        return res.status(401).json({ success: false, error: 'Invalid or expired code' });
      }

      if (isExpired) {
        console.log(`[Plugin Auth] REJECTED: code expired for ${email}`);
        return res.status(401).json({ success: false, error: 'Invalid or expired code' });
      }

      // OTP verified - clear it from database
      await supabase
        .from('users')
        .update({ otp_code: null, otp_expires_at: null })
        .eq('id', user.id);

      console.log(`[Plugin Auth] OTP VERIFIED for ${email}`);

      const isNewUser = !user.name && !user.height;

      const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });

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
      decoded = jwt.verify(token, JWT_SECRET) as { userId?: string; email?: string };
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

    const storeUUID = await lookupStoreUUID(storeId);
    if (!storeUUID) {
      return res.json({ success: false, available: false, error: 'Store not found' });
    }

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

    res.json({
      success: true,
      available: true,
      product: {
        id: product.id,
        name: product.product_name,
        tryon_image_url: product.tryon_image_url || product.image_url,
        tier: product.tier || 3,
        sizes: product.sizes || [],
        images: images, // Array of image URLs for carousel (Tier 1/2)
      },
    });
  } catch (err: any) {
    console.error('[Plugin] check-product error:', err);
    res.status(500).json({ available: false, error: 'Internal server error' });
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

    const storeUUID = await lookupStoreUUID(storeId as string);
    if (!storeUUID) {
      console.log('[Plugin][2D] REJECTED: store not found for', storeId);
      return res.status(404).json({ success: false, error: 'Store not found' });
    }

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
      product: product
        ? { id: product.id, name: product.product_name }
        : null,
    });
  } catch (err: any) {
    console.error('[Plugin][2D] Unhandled error:', err);
    res.status(500).json({ success: false, error: err.message || 'Internal server error' });
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

    if (!storeId) {
      return res.status(400).json({ success: false, error: 'storeId required' });
    }

    const operationName = `tryon-3d-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    console.log(`[Plugin][3D] operation started: ${operationName}`);

    res.json({ success: true, operationName });
  } catch (err: any) {
    console.error('[Plugin][3D] error:', err);
    res.status(500).json({ success: false, error: err.message || 'Internal server error' });
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

    if (!storeId) {
      return res.status(400).json({ success: false, error: 'storeId required' });
    }

    const storeUUID = await lookupStoreUUID(storeId);
    if (!storeUUID) {
      return res.json({ success: false, error: 'Store not found' });
    }

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
    res.status(500).json({ success: false, error: 'Internal server error' });
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

    if (!storeId) {
      return res.status(400).json({ success: false, error: 'storeId required' });
    }

    const storeUUID = await lookupStoreUUID(storeId);
    if (!storeUUID) {
      return res.status(404).json({ success: false, error: 'Store not found' });
    }

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

    res.json({ success: true, message: 'Try-on consumed' });
  } catch (err: any) {
    console.error('[Plugin] consume-tryon error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
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
    const { storeId, tryonType, userId, productId } = req.body;

    if (!storeId) {
      return res.status(400).json({ success: false, error: 'storeId required' });
    }

    const storeUUID = await lookupStoreUUID(storeId);
    if (!storeUUID) {
      return res.status(404).json({ success: false, error: 'Store not found' });
    }

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

    res.json({ success: true, message: 'Analytics recorded' });
  } catch (err: any) {
    console.error('[Plugin] tryon-analytics error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
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

    if (!store_id) {
      return res.status(400).json({ success: false, error: 'store_id required' });
    }

    const storeUUID = await lookupStoreUUID(store_id);
    if (!storeUUID) {
      return res.status(404).json({ success: false, error: 'Store not found' });
    }

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

    res.json({ success: true, message: 'Conversion recorded' });
  } catch (err: any) {
    console.error('[Plugin] track-conversion error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
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

    if (!userId && !email) {
      return res.status(400).json({ success: false, error: 'userId or email required' });
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

    // Try to find product by UUID first, then by any other match
    let product: any = null;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId);

    if (isUUID) {
      const { data } = await supabase
        .from('inventory')
        .select('id, product_name, sizes, measurements')
        .eq('id', productId)
        .maybeSingle();
      product = data;
      console.log('[Plugin][SizeRec] Lookup by UUID:', product ? `found "${product.product_name}"` : 'not found');
    }

    // Fallback: try matching by WooCommerce numeric ID in product_link or other heuristic
    if (!product && storeId && currentUrl) {
      try {
        const storeUUID = await lookupStoreUUID(storeId);
        if (storeUUID) {
          const url = new URL(currentUrl);
          const { data } = await supabase
            .from('inventory')
            .select('id, product_name, sizes, measurements')
            .eq('store_id', storeUUID)
            .like('product_link', `%${url.pathname}%`)
            .maybeSingle();
          product = data;
          console.log('[Plugin][SizeRec] Fallback lookup by URL:', product ? `found "${product.product_name}"` : 'not found');
        }
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

    // If user has no measurements, return a generic suggestion
    if (!userMeasurements.chest && !userMeasurements.waist) {
      const genericFit = product.sizes?.[Math.floor((product.sizes.length || 1) / 2)] || 'M';
      console.log('[Plugin][SizeRec] No user measurements — returning generic:', genericFit);
      return res.json({
        success: true,
        recommendation: {
          bestFit: genericFit,
          confidence: 30,
          detailedInsights: {
            whyBestFit: 'Add your measurements during onboarding for a more accurate recommendation.',
          },
        },
      });
    }

    // Use the recommendation logic from recommendations module
    const availableSizes = product.sizes || ['S', 'M', 'L', 'XL'];
    const hasProductMeasurements =
      product.measurements &&
      typeof product.measurements === 'object' &&
      Object.keys(product.measurements).length > 0;

    let result;
    if (hasProductMeasurements) {
      // Import the logic inline to avoid circular dependency issues
      const { recommendFromProductMeasurements } = await import('./recommendations.ts');
      result = recommendFromProductMeasurements(userMeasurements, product.measurements, availableSizes);
    } else {
      const { recommendFromGeneric } = await import('./recommendations.ts');
      result = recommendFromGeneric(userMeasurements, availableSizes);
    }

    const confidenceNum = result.confidence === 'high' ? 85 : result.confidence === 'medium' ? 65 : 40;

    console.log(`[Plugin] size-rec: product=${productId} => ${result.recommended} (${result.confidence})`);

    res.json({
      success: true,
      recommendation: {
        bestFit: result.recommended,
        alternatives: result.alternatives,
        confidence: confidenceNum,
        source: result.source,
        detailedInsights: {
          whyBestFit: `Based on your measurements, ${result.recommended} is the best match using ${result.source === 'product_specific' ? 'product-specific sizing data' : 'standard size charts'}.`,
        },
      },
    });
  } catch (err: any) {
    console.error('[Plugin] size-recommendation error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ──────────────────────────────────────────────
// POST /plugin/complete-look
// ──────────────────────────────────────────────
router.post('/complete-look', async (req: Request, res: Response) => {
  try {
    const { storeId, productId } = req.body;
    if (!storeId) {
      return res.status(400).json({ success: false, error: 'storeId required' });
    }

    const storeUUID = await lookupStoreUUID(storeId);
    if (!storeUUID) {
      return res.status(404).json({ success: false, error: 'Store not found' });
    }

    const supabase = getSupabase();
    let query = supabase
      .from('inventory')
      .select('id, product_name, image_url, tryon_image_url, product_link, price, sizes')
      .eq('store_id', storeUUID);
    if (productId && isValidUUID(productId)) {
      query = query.neq('id', productId);
    }
    const { data: items, error } = await query.limit(6);

    if (error) {
      console.error('[Plugin] complete-look error:', error.message);
      return res.status(500).json({ success: false, error: 'DB error' });
    }

    console.log(`[Plugin] complete-look: store=${storeId} returned ${items?.length ?? 0} items`);
    res.json({ success: true, items: items || [] });
  } catch (err: any) {
    console.error('[Plugin] complete-look error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
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
  if (!storeId) return res.status(400).json({ success: false, error: 'storeId required' });
  const storeUUID = await lookupStoreUUID(storeId);
  if (!storeUUID) return res.status(404).json({ success: false, error: 'Store not found' });
  const supabase = getSupabase();
  const { error } = await supabase.rpc('increment_tryons_used', { p_store_id: storeUUID }).single();
  if (error) console.warn('[Plugin] consume-tryon GET rpc:', error.message);
  console.log(`[Plugin] consume-tryon (GET): store=${storeId} type=${tryonType || '?'}`);
  res.json({ success: true });
});

router.get('/tryon-analytics', async (req: Request, res: Response) => {
  console.log('[Plugin] tryon-analytics (GET):', req.query);
  res.json({ success: true, message: 'analytics received (GET fallback)' });
});

export default router;
