import express from 'express';
import type { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSupabase } from '../services/supabase.ts';
import { getJwtSecret, requireAuth, type AuthenticatedRequest } from '../middleware/auth.ts';
import {
  deleteShopifyProductFromInventory,
  exchangeShopifyOAuthCode,
  pullAllShopifyProductsAndSync,
  registerShopifyProductWebhooks,
  resolveStoreIdByShopDomain,
  syncShopifyProductToInventory,
  type ShopifyRestProduct,
} from '../services/shopifySync.ts';
import {
  getShopifyThemeInstallAssets,
  injectStyliqueSectionIntoTheme,
  parseStoredThemeInjectionStatus,
  type ThemeInjectionStatusPayload,
} from '../services/shopifyThemeInjector.ts';

const router: Router = express.Router();

const SALT_ROUNDS = 10;
const setupTokens = new Map<string, { storeId: string; password: string; expiresAt: number }>();

const DEFAULT_SCOPES =
  process.env.SHOPIFY_SCOPES || 'read_products,write_products,read_themes,write_themes';

const VALID_EXTENSION_INSTALL_METHODS = new Set(['theme_app_block', 'theme_app_embed', 'manual_section']);
const MAX_HEARTBEAT_FIELD_LENGTH = 500;
const ORIGINAL_WIDGET_DEFAULT_BACKEND = 'https://stylique-api.onrender.com';
const ORIGINAL_WIDGET_DEFAULT_LOGO = 'https://cdn.shopify.com/s/files/1/0633/5057/1167/files/shopify_Logo.png?v=1766183139';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SHOPIFY_WIDGET_SOURCE_PATH = path.resolve(__dirname, '../../../shopify/Shopify_new_tryon_upload_first.liquid');
const SHOPIFY_WIDGET_CSS_PATH = path.resolve(__dirname, '../../../shopify/assets/stylique.css');

let cachedOriginalWidgetTemplate: string | null = null;
let cachedOriginalWidgetCss: string | null = null;

interface ThemeConfigPayload {
  backendUrl: string;
  storeId: string;
  sectionTitle: string;
  sectionDescription: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  borderRadius: number;
}

interface ProductBootstrapPayload {
  id: number | string | null;
  title: string;
  price: number | string | null;
  priceFormatted: string;
  url: string;
  featuredImage: string;
  variants: any[];
  images: string[];
  selectedVariantId: number | string | null;
}

function sanitizeSupabaseEqValue(value: string): string {
  return value.replace(/[(),]/g, '').slice(0, MAX_HEARTBEAT_FIELD_LENGTH);
}

function readCachedWidgetSource(filePath: string, kind: 'template' | 'css'): string {
  if (process.env.NODE_ENV === 'development') {
    return readFileSync(filePath, 'utf8');
  }

  if (kind === 'template') {
    if (!cachedOriginalWidgetTemplate) {
      cachedOriginalWidgetTemplate = readFileSync(filePath, 'utf8');
    }
    return cachedOriginalWidgetTemplate;
  }

  if (!cachedOriginalWidgetCss) {
    cachedOriginalWidgetCss = readFileSync(filePath, 'utf8');
  }
  return cachedOriginalWidgetCss;
}

function parseEncodedJson<T>(value: unknown): T | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    try {
      return JSON.parse(decodeURIComponent(value)) as T;
    } catch {
      return null;
    }
  }
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeScriptString(value: unknown): string {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${')
    .replace(/<\/script/gi, '<\\/script');
}

function normalizeWidgetThemeConfig(
  shopDomain: string,
  rawThemeConfig: Partial<ThemeConfigPayload> | null,
  backendOverride?: string | null,
): ThemeConfigPayload {
  const borderRadiusCandidate = Number(rawThemeConfig?.borderRadius);
  return {
    backendUrl: String(backendOverride || rawThemeConfig?.backendUrl || ORIGINAL_WIDGET_DEFAULT_BACKEND).replace(/\/$/, ''),
    storeId: String(rawThemeConfig?.storeId || shopDomain).trim() || shopDomain,
    sectionTitle: String(rawThemeConfig?.sectionTitle || 'Virtual Try-On Experience'),
    sectionDescription: String(
      rawThemeConfig?.sectionDescription
        || 'See how this item looks on you with our advanced AI-powered virtual try-on technology',
    ),
    logoUrl: String(rawThemeConfig?.logoUrl || ORIGINAL_WIDGET_DEFAULT_LOGO),
    primaryColor: String(rawThemeConfig?.primaryColor || '#667eea'),
    secondaryColor: String(rawThemeConfig?.secondaryColor || '#764ba2'),
    textColor: String(rawThemeConfig?.textColor || '#333333'),
    borderRadius: Number.isFinite(borderRadiusCandidate) ? Math.max(0, Math.min(20, borderRadiusCandidate)) : 8,
  };
}

function normalizeImageUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (typeof entry === 'string') return entry.trim();
      if (entry && typeof entry === 'object') {
        const candidate = (entry as any).url || (entry as any).src;
        return typeof candidate === 'string' ? candidate.trim() : '';
      }
      return '';
    })
    .filter(Boolean)
    .slice(0, 32);
}

function normalizeWidgetProductBootstrap(
  productId: string,
  rawBootstrap: Partial<ProductBootstrapPayload> | null,
): ProductBootstrapPayload {
  const parsedId = rawBootstrap?.id ?? productId;
  const images = normalizeImageUrls(rawBootstrap?.images || []);
  const featuredImage = String(rawBootstrap?.featuredImage || images[0] || '');
  return {
    id: parsedId,
    title: String(rawBootstrap?.title || 'Product'),
    price: rawBootstrap?.price ?? null,
    priceFormatted: String(rawBootstrap?.priceFormatted || ''),
    url: String(rawBootstrap?.url || ''),
    featuredImage,
    variants: Array.isArray(rawBootstrap?.variants) ? rawBootstrap?.variants : [],
    images,
    selectedVariantId: rawBootstrap?.selectedVariantId ?? null,
  };
}

function jsLiteral(value: unknown): string {
  return JSON.stringify(value ?? null);
}

function replaceAllExact(source: string, replacements: Array<[string, string]>): string {
  let output = source;
  for (const [search, replacement] of replacements) {
    output = output.split(search).join(replacement);
  }
  return output;
}

function buildProductInfoImageMarkup(product: ProductBootstrapPayload): string {
  if (!product.featuredImage) return '';
  return `<img src="${escapeHtml(product.featuredImage)}" alt="${escapeHtml(product.title)}">`;
}

function buildTier3ImageMarkup(product: ProductBootstrapPayload): string {
  if (product.featuredImage) {
    return `
              <img
                id="stylique-tier3-product-image"
                src="${escapeHtml(product.featuredImage)}"
                alt="${escapeHtml(product.title)}">`;
  }

  return `
              <div class="stylique-tier3-image-placeholder">
                <span>${escapeHtml((product.title || 'Product').slice(0, 1))}</span>
              </div>`;
}

function renderOriginalShopifyWidgetHtml(params: {
  shopDomain: string;
  productId: string;
  blockId: string;
  installMethod: string;
  themeConfig: ThemeConfigPayload;
  product: ProductBootstrapPayload;
}): string {
  const template = readCachedWidgetSource(SHOPIFY_WIDGET_SOURCE_PATH, 'template');
  const css = readCachedWidgetSource(SHOPIFY_WIDGET_CSS_PATH, 'css');
  const theme = params.themeConfig;
  const product = params.product;
  const shopDomain = params.shopDomain;
  const selectedVariantId = product.selectedVariantId ?? (product.variants[0]?.id ?? null);
  const shopifyProductImagesJson = jsLiteral(product.images);
  const variantsJson = jsLiteral(product.variants);
  const bootstrapScript = `
<style data-stylique-original-css>
${css}
</style>
<script data-stylique-bootstrap>
  window.StyliqueConfig = {
    shop: ${jsLiteral(shopDomain)},
    productId: ${jsLiteral(product.id ?? params.productId)},
    backendUrl: ${jsLiteral(theme.backendUrl)},
    storeId: ${jsLiteral(theme.storeId)},
    currentUrl: window.location.href,
    installMethod: ${jsLiteral(params.installMethod || 'theme_app_block')},
    blockId: ${jsLiteral(params.blockId || '')}
  };
  window.__styliqueThemeConfig = ${jsLiteral(theme)};
  window.__styliqueProductBootstrap = ${jsLiteral(product)};
  window.styliqueSection = Object.assign({}, window.styliqueSection || {}, {
    storeId: ${jsLiteral(theme.storeId)},
    currentUrl: window.location.href,
    domain: ${jsLiteral(shopDomain)}
  });
  setTimeout(function () {
    if (window.__styliqueThemeExtensionHeartbeatSent) return;
    window.__styliqueThemeExtensionHeartbeatSent = true;
    fetch(${jsLiteral(`${theme.backendUrl}/api/shopify/widget/heartbeat`)}, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeId: ${jsLiteral(theme.storeId)},
        shopDomain: ${jsLiteral(shopDomain)},
        productId: ${jsLiteral(product.id ?? params.productId)},
        installMethod: ${jsLiteral(params.installMethod || 'theme_app_block')},
        extensionVersion: ${jsLiteral(process.env.SHOPIFY_EXTENSION_VERSION || '0.1.0')},
        currentUrl: window.location.href
      })
    }).catch(function () {});
  }, 0);
</script>`;

  let html = template;

  html = html.replace(/\{\% schema \%\}[\s\S]*?\{\% endschema \%\}/g, '');
  html = html.replace(/\{\{ 'stylique\.css' \| asset_url \| stylesheet_tag \}\}/g, '');
  html = html.replace(
    /\{\% assign _stylique_backend =[\s\S]*?\{\% endif \%\}\s*\{\% assign _stylique_store_id =[\s\S]*?\{\% endif \%\}/,
    '',
  );

  html = html.replace(
    /\{\% if product\.featured_media \%\}\s*<img src="\{\{ product\.featured_media \| img_url: '300x300' \}\}" alt="\{\{ product\.title \}\}">\s*\{\% endif \%\}/,
    buildProductInfoImageMarkup(product),
  );
  html = html.replace(
    /\{\% if product\.featured_media \%\}[\s\S]*?\{\% else \%\}[\s\S]*?\{\% endif \%\}/,
    buildTier3ImageMarkup(product),
  );

  html = html.replace(
    /window\.styliqueSection\.shopifyProductImages = \[\];\s*\{\% if product and product\.images \%\}\s*window\.styliqueSection\.shopifyProductImages = \{\{ product\.images \| map: 'src' \| json \}\};\s*console\.log\('\[Stylique\] Shopify product images captured:', window\.styliqueSection\.shopifyProductImages\.length, 'images'\);\s*\{\% endif \%\}/,
    `window.styliqueSection.shopifyProductImages = window.__styliqueProductBootstrap.images || [];
    console.log('[Stylique] Shopify product images captured:', window.styliqueSection.shopifyProductImages.length, 'images');`,
  );

  html = html.replace(
    `document.addEventListener('DOMContentLoaded', function () {`,
    `function __styliqueDomReadyInit() {`,
  );
  html = html.replace(
    `  });

  // ===== ONBOARDING FUNCTIONS =====`,
    `  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', __styliqueDomReadyInit, { once: true });
  } else {
    __styliqueDomReadyInit();
  }

  // ===== ONBOARDING FUNCTIONS =====`,
  );

  html = replaceAllExact(html, [
    [`{% if section.settings.logo_image %}{{ section.settings.logo_image | img_url: '40x40' }}{% else %}{{ section.settings.logo_url }}{% endif %}`, escapeHtml(theme.logoUrl)],
    [`{% if section.settings.logo_image %}{{ section.settings.logo_image | img_url: '60x60' }}{% else %}{{ section.settings.logo_url }}{% endif %}`, escapeHtml(theme.logoUrl)],
    [`{% if section.settings.logo_image %}{{ section.settings.logo_image | img_url: '50x50' }}{% else %}{{ section.settings.logo_url }}{% endif %}`, escapeHtml(theme.logoUrl)],
    [`{{ section.settings.primary_color }}`, escapeHtml(theme.primaryColor)],
    [`{{ section.settings.secondary_color }}`, escapeHtml(theme.secondaryColor)],
    [`{{ section.settings.text_color }}`, escapeHtml(theme.textColor)],
    [`{{ section.settings.border_radius | plus: 8 }}`, String(theme.borderRadius + 8)],
    [`{{ section.settings.border_radius }}`, String(theme.borderRadius)],
    [`var STYLIQUE_API_BASE = {{ _stylique_backend | json }};`, `var STYLIQUE_API_BASE = window.StyliqueConfig.backendUrl;`],
    [`console.log('[Stylique] Store ID:', {{ _stylique_store_id | json }});`, `console.log('[Stylique] Store ID:', window.StyliqueConfig.storeId);`],
    [`storeId: {{ _stylique_store_id | json }},`, `storeId: window.StyliqueConfig.storeId,`],
    [`domain: window.location.hostname,`, `domain: window.StyliqueConfig.shop || window.location.hostname,`],
    [`shopifyProductId: {% if product %}{{ product.id }}{% else %}null{% endif %}`, `shopifyProductId: window.__styliqueProductBootstrap.id || null`],
    [`const title = product.title || product.product_name || {{ product.title | json }};`, `const title = product.title || product.product_name || window.__styliqueProductBootstrap.title || 'Product';`],
    [`let variantId = {{ product.selected_or_first_available_variant.id }};`, `let variantId = window.__styliqueProductBootstrap.selectedVariantId || null;`],
    [`const variants = {{ product.variants | json }};`, `const variants = window.__styliqueProductBootstrap.variants || [];`],
    [`trackConversion({{ product.id }});`, `trackConversion(window.__styliqueProductBootstrap.id);`],
    [`const productTitle = product.title || {{ product.title | json }} || 'Product';`, `const productTitle = product.title || window.__styliqueProductBootstrap.title || 'Product';`],
    [`|| {{ product.featured_image | image_url: width: 200 | json }};`, `|| ${jsLiteral(product.featuredImage)};`],
    [`const productUrl = product.url || {{ product.url | json }};`, `const productUrl = product.url || window.__styliqueProductBootstrap.url || '';`],
    [`const productTitle = product.title || '{{ product.title | escape }}';`, `const productTitle = product.title || window.__styliqueProductBootstrap.title || 'Product';`],
    [`const productImage = product.featured_image || '{{ product.featured_image | image_url: width: 200 }}';`, `const productImage = product.featured_image || window.__styliqueProductBootstrap.featuredImage || '';`],
    [`const productUrl = product.url || '{{ product.url }}';`, `const productUrl = product.url || window.__styliqueProductBootstrap.url || '';`],
    [`const currentPageProductId = "{{ product.id }}";`, `const currentPageProductId = String(window.__styliqueProductBootstrap.id || '');`],
    [`{{ product.images | map: 'src' | json }}`, shopifyProductImagesJson],
    [`{{ product.variants | json }}`, variantsJson],
    [`{{ product.selected_or_first_available_variant.id }}`, String(selectedVariantId ?? 'null')],
    [`{{ product.price | money }}`, escapeHtml(product.priceFormatted)],
    [`{{ product.title | default: 'Product' | slice: 0, 1 }}`, escapeHtml((product.title || 'Product').slice(0, 1))],
    [`{{ product.title | escape }}`, escapeHtml(product.title)],
    [`{{ product.title | json }}`, jsLiteral(product.title)],
    [`{{ product.title }}`, escapeHtml(product.title)],
    [`{{ product.featured_media | img_url: '300x300' }}`, escapeHtml(product.featuredImage)],
    [`{{ product.featured_media | img_url: '700x700' }}`, escapeHtml(product.featuredImage)],
    [`{{ product.featured_image | image_url: width: 200 | json }}`, jsLiteral(product.featuredImage)],
    [`{{ product.featured_image | image_url: width: 200 }}`, escapeHtml(product.featuredImage)],
    [`{{ product.url | json }}`, jsLiteral(product.url)],
    [`{{ product.url }}`, escapeHtml(product.url)],
    [`{{ product.id }}`, String(product.id ?? params.productId)],
    [`{{ shop.permanent_domain }}`, escapeHtml(shopDomain)],
  ]);

  html = html.replace(/\{\%[\s\S]*?\%\}/g, '');
  html = html.replace(/\{\{[\s\S]*?\}\}/g, '');
  html = html.replace(`</script>`, `</script>`);

  return `${bootstrapScript}\n${html}`;
}

function themeInjectionStatusJson(payload: ThemeInjectionStatusPayload): string {
  return JSON.stringify(payload).slice(0, 2000);
}

function missingScopeStatus(shopDomain: string, missingScopes: string[]): ThemeInjectionStatusPayload {
  return {
    code: 'missing_theme_scope',
    done: false,
    message: 'Store connected, but the Shopify app is missing theme permissions for automatic widget setup.',
    details: `Missing Shopify OAuth scopes: ${missingScopes.join(', ')}. Reinstall the app after SHOPIFY_SCOPES and the Shopify app configuration include read_themes and write_themes.`,
    shopDomain,
    timestamp: new Date().toISOString(),
  };
}

function normalizeShopParam(shop: string): string | null {
  const host = shop
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .split('/')[0];
  if (!host) return null;
  const s = host.replace(/\.+$/, '');
  if (!s) return null;
  if (s.endsWith('.myshopify.com')) return s;
  if (!s.includes('.')) return `${s}.myshopify.com`;
  return s;
}

function redirectUri(): string {
  return (
    process.env.SHOPIFY_REDIRECT_URI ||
    `${process.env.PUBLIC_API_URL || `http://localhost:${process.env.PORT || 5000}`}/api/shopify/callback`
  );
}

function webhookBaseUrl(): string {
  return (process.env.PUBLIC_API_URL || process.env.SHOPIFY_WEBHOOK_BASE_URL || '').replace(/\/$/, '') ||
    `http://localhost:${process.env.PORT || 5000}`;
}

function createSetupToken(storeId: string, password: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  setupTokens.set(token, {
    storeId,
    password,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });
  return token;
}

function successRedirectUrl(storeUuid: string, storeId: string, setupToken?: string): string {
  const base = process.env.FRONTEND_URL || 'http://localhost:3000';
  const token = jwt.sign({ storeId: storeUuid, store_id: storeId }, getJwtSecret(), { expiresIn: '7d' });
  let url = `${base.replace(/\/$/, '')}/?shopify=connected&token=${encodeURIComponent(token)}&store_id=${encodeURIComponent(storeId)}`;
  if (setupToken) url += `&setup_token=${encodeURIComponent(setupToken)}`;
  return url;
}

function errorRedirectUrl(message: string): string {
  const base = process.env.FRONTEND_URL || 'http://localhost:3000';
  return `${base.replace(/\/$/, '')}/?shopify=error&reason=${encodeURIComponent(message)}`;
}

interface OAuthStatePayload {
  shop: string;
  linkStoreId?: string;
}

function signOAuthState(payload: OAuthStatePayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '15m' });
}

function verifyOAuthState(token: string): OAuthStatePayload {
  const decoded = jwt.verify(token, getJwtSecret()) as OAuthStatePayload;
  if (!decoded?.shop) throw new Error('Invalid state');
  return decoded;
}

function optionalAuthStoreId(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const t = header.slice(7);
      const d = jwt.verify(t, getJwtSecret()) as { storeId?: string };
      return d.storeId;
    } catch {
      return undefined;
    }
  }
  const q = req.query.token as string | undefined;
  if (q) {
    try {
      const d = jwt.verify(q, getJwtSecret()) as { storeId?: string };
      return d.storeId;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

// GET /api/shopify/oauth — redirect to Shopify authorize URL
router.get('/shopify/oauth', (req: Request, res: Response) => {
  const apiKey = process.env.SHOPIFY_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'SHOPIFY_API_KEY is not configured' });
  }

  const shopRaw = req.query.shop as string | undefined;
  if (!shopRaw) {
    return res.status(400).json({ error: 'Missing query: shop (e.g. your-store.myshopify.com)' });
  }

  const shop = normalizeShopParam(shopRaw);
  if (!shop || !shop.endsWith('.myshopify.com')) {
    return res.status(400).json({ error: 'Invalid shop. Use your-store.myshopify.com' });
  }

  const linkStoreId = optionalAuthStoreId(req);
  const statePayload: OAuthStatePayload = { shop };
  if (linkStoreId) statePayload.linkStoreId = linkStoreId;
  const state = signOAuthState(statePayload);
  const rd = redirectUri();
  const authorizeUrl =
    `https://${shop}/admin/oauth/authorize?` +
    `client_id=${encodeURIComponent(apiKey)}` +
    `&scope=${encodeURIComponent(DEFAULT_SCOPES)}` +
    `&redirect_uri=${encodeURIComponent(rd)}` +
    `&state=${encodeURIComponent(state)}`;

  console.log('[Shopify OAuth] Scopes requested:', DEFAULT_SCOPES);
  console.log('[Shopify OAuth] Redirect URI:', rd);
  console.log('[Shopify OAuth] Authorize URL:', authorizeUrl);
  console.log('[Shopify OAuth] Redirecting to authorize for shop:', shop, linkStoreId ? `(link store ${linkStoreId})` : '');
  res.redirect(302, authorizeUrl);
});

// GET /api/shopify/setup-credentials?token=...
router.get('/shopify/setup-credentials', (req: Request, res: Response) => {
  const token = req.query.token as string | undefined;
  if (!token) {
    return res.status(400).json({ success: false, error: 'Missing setup token' });
  }

  const entry = setupTokens.get(token);
  setupTokens.delete(token);

  if (!entry || entry.expiresAt < Date.now()) {
    return res.status(404).json({ success: false, error: 'Setup token expired or already used' });
  }

  return res.json({
    success: true,
    storeId: entry.storeId,
    password: entry.password,
  });
});

// POST /api/shopify/widget/heartbeat — public storefront signal that the widget loaded
router.post('/shopify/widget/heartbeat', async (req: Request, res: Response) => {
  try {
    const {
      storeId,
      shopDomain,
      productId,
      productHandle,
      installMethod,
      extensionVersion,
      currentUrl,
    } = req.body || {};

    const safeStoreId = typeof storeId === 'string' ? storeId.trim().slice(0, MAX_HEARTBEAT_FIELD_LENGTH) : '';
    const safeShopDomain = typeof shopDomain === 'string' ? normalizeShopParam(shopDomain) : null;
    const safeInstallMethod = typeof installMethod === 'string' ? installMethod.trim() : '';
    const safeVersion = typeof extensionVersion === 'string'
      ? extensionVersion.trim().slice(0, 80)
      : '';

    if (!safeStoreId && !safeShopDomain) {
      return res.status(400).json({ success: false, error: 'storeId or shopDomain required' });
    }

    if (!VALID_EXTENSION_INSTALL_METHODS.has(safeInstallMethod)) {
      return res.status(400).json({ success: false, error: 'invalid installMethod' });
    }

    const supabase = getSupabase();
    const lookupValue = sanitizeSupabaseEqValue(safeStoreId || safeShopDomain || '');
    const { data: rows, error } = await supabase
      .from('stores')
      .select('id, store_id, shopify_shop_domain')
      .or(`store_id.eq.${lookupValue},shopify_shop_domain.eq.${lookupValue}`)
      .limit(1);
    const store = rows?.[0];
    if (error || !store) {
      return res.status(404).json({ success: false, error: 'store not found' });
    }

    const statusParts = [
      `Widget heartbeat received via ${safeInstallMethod}`,
      safeVersion ? `version=${safeVersion}` : null,
      productId ? `productId=${String(productId).slice(0, 120)}` : null,
      productHandle ? `handle=${String(productHandle).slice(0, 120)}` : null,
      currentUrl ? `url=${String(currentUrl).slice(0, 180)}` : null,
    ].filter(Boolean);

    await supabase
      .from('stores')
      .update({
        shopify_extension_last_seen_at: new Date().toISOString(),
        shopify_extension_install_method: safeInstallMethod,
        shopify_extension_version: safeVersion || null,
        shopify_extension_setup_status: statusParts.join(' | '),
      })
      .eq('id', store.id);

    return res.json({ success: true });
  } catch (e: any) {
    console.error('[Shopify Widget Heartbeat] Failed:', e.message);
    return res.status(500).json({ success: false, error: 'heartbeat failed' });
  }
});

// GET /api/shopify/widget — serve the original Shopify widget for the theme app block loader
router.get('/shopify/widget', async (req: Request, res: Response) => {
  try {
    const shopDomain = typeof req.query.shop === 'string' ? normalizeShopParam(req.query.shop) : null;
    const productId = typeof req.query.productId === 'string' ? req.query.productId.trim() : '';
    const installMethodRaw = typeof req.query.installMethod === 'string' ? req.query.installMethod.trim() : '';
    const blockId = typeof req.query.blockId === 'string' ? req.query.blockId.trim().slice(0, 120) : '';
    const installMethod = VALID_EXTENSION_INSTALL_METHODS.has(installMethodRaw)
      ? installMethodRaw
      : 'theme_app_block';

    if (!shopDomain) {
      return res.status(400).json({ success: false, error: 'invalid shop' });
    }

    if (!productId) {
      return res.status(400).json({ success: false, error: 'missing productId' });
    }

    const themeConfig = normalizeWidgetThemeConfig(
      shopDomain,
      parseEncodedJson<Partial<ThemeConfigPayload>>(req.query.themeConfig),
      typeof req.query.backendUrl === 'string' ? req.query.backendUrl : null,
    );
    const product = normalizeWidgetProductBootstrap(
      productId,
      parseEncodedJson<Partial<ProductBootstrapPayload>>(req.query.productBootstrap),
    );

    const html = renderOriginalShopifyWidgetHtml({
      shopDomain,
      productId,
      blockId,
      installMethod,
      themeConfig,
      product,
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch (error: any) {
    console.error('[Shopify Widget] Failed to render original widget:', error.message);
    return res.status(500).json({ success: false, error: 'widget_render_failed' });
  }
});

// GET /api/shopify/callback — exchange code, save token, pull products, register webhooks
router.get('/shopify/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string | undefined;
  const shop = req.query.shop as string | undefined;
  const state = req.query.state as string | undefined;

  if (!code || !shop || !state) {
    return res.redirect(302, errorRedirectUrl('missing_code_or_shop'));
  }

  const normalizedShop = normalizeShopParam(shop);
  if (!normalizedShop) {
    return res.redirect(302, errorRedirectUrl('invalid_shop'));
  }

  let statePayload: OAuthStatePayload;
  try {
    statePayload = verifyOAuthState(state);
  } catch {
    return res.redirect(302, errorRedirectUrl('invalid_state'));
  }

  if (statePayload.shop !== normalizedShop) {
    return res.redirect(302, errorRedirectUrl('shop_mismatch'));
  }

  let access_token: string;
  let missingOAuthScopes: string[] = [];
  try {
    const exchanged = await exchangeShopifyOAuthCode(normalizedShop, code);
    access_token = exchanged.access_token;
    console.log('[Shopify OAuth] Token exchanged for', normalizedShop);
    console.log('[Shopify OAuth] Granted scopes:', exchanged.scope);
    
    const grantedSet = new Set(exchanged.scope.split(',').map((s: string) => s.trim()));
    // Shopify: write_X implies read_X, so normalise before checking
    const effectiveScopes = new Set(grantedSet);
    if (effectiveScopes.has('write_products')) effectiveScopes.add('read_products');
    if (effectiveScopes.has('write_themes')) effectiveScopes.add('read_themes');
    const requiredScopes = ['read_products', 'write_products', 'read_themes', 'write_themes'];
    const missing = requiredScopes.filter(s => !effectiveScopes.has(s));
    missingOAuthScopes = missing;
    if (missing.length > 0) {
      console.warn('[Shopify OAuth] WARNING: Missing scopes:', missing.join(', '));
      console.warn('[Shopify OAuth] Granted only:', exchanged.scope);
      console.warn('[Shopify OAuth] The app may not have these scopes configured in the Shopify Partner Dashboard.');
    } else {
      console.log('[Shopify OAuth] All required scopes present (granted:', exchanged.scope, ')');
    }
  } catch (e: any) {
    console.error('[Shopify OAuth] Token exchange failed:', e.message);
    return res.redirect(302, errorRedirectUrl(e.message || 'token_exchange_failed'));
  }

  const supabase = getSupabase();
  let storeUuid: string | null = null;
  let generatedPassword: string | undefined;

  // Generate a human-readable password for the merchant. It is returned once
  // through a setup token, never through logs or URL query strings.
  const plainPassword = crypto.randomBytes(6).toString('hex'); // 12-char hex
  const hashedPassword = await bcrypt.hash(plainPassword, SALT_ROUNDS);
  console.log(`[Shopify OAuth] Generated one-time setup credentials for store: ${normalizedShop}`);

  // Credentials are delivered through a short-lived setup token.

  if (statePayload.linkStoreId) {
    const { data: row, error } = await supabase
      .from('stores')
      .select('id')
      .eq('id', statePayload.linkStoreId)
      .maybeSingle();
    if (error || !row) {
      return res.redirect(302, errorRedirectUrl('store_not_found'));
    }
    const { error: upErr } = await supabase
      .from('stores')
      .update({
        shopify_access_token: access_token,
        shopify_shop_domain: normalizedShop,
        password_hash: hashedPassword,
        shopify_theme_injection_done: false,
        shopify_theme_injection_status: null,
      })
      .eq('id', row.id);
    if (upErr) {
      console.error('[Shopify OAuth] Failed to save token:', upErr.message);
      return res.redirect(302, errorRedirectUrl('db_update_failed'));
    }
    storeUuid = row.id;
    generatedPassword = plainPassword;
    console.log('[Shopify OAuth] Linked Shopify to existing store', storeUuid);
  } else {
    const { data: existing } = await supabase
      .from('stores')
      .select('id')
      .eq('store_id', normalizedShop)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('stores')
        .update({
          shopify_access_token: access_token,
          shopify_shop_domain: normalizedShop,
          password_hash: hashedPassword,
          shopify_theme_injection_done: false,
          shopify_theme_injection_status: null,
        })
        .eq('id', existing.id);
      storeUuid = existing.id;
      generatedPassword = plainPassword;
      console.log('[Shopify OAuth] Updated existing store by store_id match');
    } else {
      const name = normalizedShop.replace('.myshopify.com', '');
      const { data: created, error: insErr } = await supabase
        .from('stores')
        .insert({
          store_name: name,
          store_id: normalizedShop,
          password_hash: hashedPassword,
          shopify_access_token: access_token,
          shopify_shop_domain: normalizedShop,
          subscription_name: 'FREE',
          tryons_quota: 100,
          tryons_used: 0,
        })
        .select('id')
        .single();
      if (insErr || !created) {
        console.error('[Shopify OAuth] Create store failed:', insErr?.message);
        return res.redirect(302, errorRedirectUrl('create_store_failed'));
      }
      storeUuid = created.id;
      generatedPassword = plainPassword;
      console.log('[Shopify OAuth] Created new store for Shopify shop');
    }
  }

  try {
    await pullAllShopifyProductsAndSync(normalizedShop, access_token, storeUuid!);
  } catch (e: any) {
    console.error('[Shopify OAuth] Product pull error:', e.message);
  }

  try {
    await registerShopifyProductWebhooks(normalizedShop, access_token, webhookBaseUrl());
  } catch (e: any) {
    console.error('[Shopify OAuth] Webhook registration error:', e.message);
  }

  const missingThemeScopes = missingOAuthScopes.filter(scope => scope.includes('theme'));
  if (missingThemeScopes.length > 0) {
    const status = missingScopeStatus(normalizedShop, missingThemeScopes);
    await supabase
      .from('stores')
      .update({
        shopify_theme_injection_done: false,
        shopify_theme_injection_status: themeInjectionStatusJson(status),
      })
      .eq('id', storeUuid!);
    console.warn('[Shopify OAuth] Theme injection skipped because theme scopes are missing:', missingThemeScopes.join(', '));
  } else {
    try {
      await injectStyliqueSectionIntoTheme(normalizedShop, access_token, storeUuid!);
    } catch (e: any) {
      console.error('[Shopify OAuth] Theme injection error (non-fatal):', e.message);
    }
  }

  const setupToken = generatedPassword ? createSetupToken(normalizedShop, generatedPassword) : undefined;
  res.redirect(302, successRedirectUrl(storeUuid!, normalizedShop, setupToken));
});

// POST /api/shopify/theme-injection/retry — dashboard-authenticated retry after scopes/exemption are fixed
router.post('/shopify/theme-injection/retry', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authStoreId = req.storeAuth?.storeId;
    if (!authStoreId) {
      return res.status(401).json({ success: false, code: 'unauthorized', message: 'Authentication required' });
    }

    const supabase = getSupabase();
    const { data: store, error } = await supabase
      .from('stores')
      .select('id, shopify_shop_domain, shopify_access_token, shopify_theme_injection_done, shopify_theme_injection_status')
      .eq('id', authStoreId)
      .maybeSingle();

    if (error || !store) {
      return res.status(404).json({ success: false, code: 'store_not_found', message: 'Store not found' });
    }

    if (!store.shopify_shop_domain || !store.shopify_access_token) {
      return res.status(400).json({
        success: false,
        code: 'shopify_not_connected',
        message: 'This store is not connected to Shopify yet.',
      });
    }

    if (store.shopify_theme_injection_done === true) {
      const parsed = parseStoredThemeInjectionStatus(store.shopify_theme_injection_status, true);
      return res.status(200).json({
        success: true,
        code: parsed?.code || 'success',
        message: parsed?.message || 'Widget is already installed.',
        status: parsed,
      });
    }

    const status = await injectStyliqueSectionIntoTheme(
      store.shopify_shop_domain,
      store.shopify_access_token,
      store.id,
    );

    const { data: refreshed } = await supabase
      .from('stores')
      .select('shopify_theme_injection_done, shopify_theme_injection_status')
      .eq('id', store.id)
      .maybeSingle();

    const parsed = parseStoredThemeInjectionStatus(
      refreshed?.shopify_theme_injection_status ?? null,
      refreshed?.shopify_theme_injection_done ?? status?.done ?? false,
    ) || status;

    return res.status(200).json({
      success: parsed?.done === true,
      code: parsed?.code || 'unknown_error',
      message: parsed?.message || 'Theme injection retry finished.',
      status: parsed,
    });
  } catch (e: any) {
    console.error('[Shopify Theme Retry] Failed:', e.message);
    return res.status(500).json({
      success: false,
      code: 'unknown_error',
      message: 'Theme injection retry failed.',
    });
  }
});

// GET /api/shopify/theme-injection/assets — dashboard helper for manual install copy/paste
router.get('/shopify/theme-injection/assets', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.storeAuth?.storeId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const assets = getShopifyThemeInstallAssets();
    return res.status(200).json({
      success: true,
      sectionKey: assets.sectionKey,
      cssAssetKey: assets.cssAssetKey,
      sectionLiquid: assets.sectionLiquid,
      css: assets.css,
    });
  } catch (e: any) {
    console.error('[Shopify Theme Assets] Failed:', e.message);
    return res.status(500).json({
      success: false,
      code: 'source_asset_missing',
      error: 'Unable to load Shopify widget source assets.',
    });
  }
});

function verifyShopifyWebhookHmac(rawBody: Buffer, hmacHeader: string | undefined): boolean {
  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret || !hmacHeader) return false;
  const digest = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
  try {
    const a = Buffer.from(digest, 'utf8');
    const b = Buffer.from(hmacHeader, 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// POST /api/webhooks/shopify — registered in index.ts BEFORE express.json() with express.raw()
export async function shopifyWebhookHandler(req: Request, res: Response): Promise<void> {
  const buf = req.body as Buffer;
  const hmac = req.get('X-Shopify-Hmac-Sha256');
  if (!verifyShopifyWebhookHmac(buf, hmac)) {
    console.warn('[Shopify Webhook] HMAC verification failed');
    res.status(401).send('Unauthorized');
    return;
  }

  const shopDomain = req.get('X-Shopify-Shop-Domain');
  if (!shopDomain) {
    res.status(400).send('Missing shop domain');
    return;
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(buf.toString('utf8')) as Record<string, unknown>;
  } catch {
    res.status(400).send('Invalid JSON');
    return;
  }

  const topic = req.get('X-Shopify-Topic') || '';

  try {
    if (topic === 'products/delete') {
      const id = Number(body.id);
      if (Number.isFinite(id)) {
        await deleteShopifyProductFromInventory(shopDomain, id);
      }
    } else if (topic === 'products/create' || topic === 'products/update') {
      const product = body as unknown as ShopifyRestProduct;
      if (product?.id && product.handle) {
        const storeUuid = await resolveStoreIdByShopDomain(shopDomain);
        if (!storeUuid) {
          console.warn('[Shopify Webhook] No store for shop', shopDomain);
          res.status(404).send('Store not found');
          return;
        }
        
        // Fetch access token for metafield retrieval
        const supabase = getSupabase();
        const { data: store } = await supabase
          .from('stores')
          .select('shopify_access_token')
          .eq('id', storeUuid)
          .single();
        
        const accessToken = store?.shopify_access_token || undefined;
        await syncShopifyProductToInventory(storeUuid, shopDomain, product, accessToken);
      }
    } else {
      console.log('[Shopify Webhook] Ignoring topic:', topic);
    }
  } catch (e: any) {
    console.error('[Shopify Webhook] Handler error:', e.message);
    res.status(500).send('Error');
    return;
  }

  res.status(200).send('OK');
}

export default router;
