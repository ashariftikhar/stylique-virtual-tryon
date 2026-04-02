/**
 * Shopify Theme Injector
 *
 * After OAuth, automatically uploads the Stylique Liquid section into the
 * merchant's active theme and wires it into the product template so the
 * try-on widget appears without any manual theme editing.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSupabase } from './supabase.ts';

const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-10';
const SECTION_KEY = 'sections/stylique-virtual-try-on.liquid';
const SECTION_ID = 'stylique-virtual-try-on';
const PRODUCT_TEMPLATE_JSON = 'templates/product.json';
const PRODUCT_TEMPLATE_LIQUID = 'templates/product.liquid';

const TAG = '[ThemeInjector]';

const __filename_esm = fileURLToPath(import.meta.url);
const __dirname_esm = path.dirname(__filename_esm);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shopifyAdminUrl(shop: string, endpoint: string): string {
  return `https://${shop}/admin/api/${SHOPIFY_API_VERSION}${endpoint}`;
}

async function shopifyGet(shop: string, token: string, endpoint: string) {
  const res = await fetch(shopifyAdminUrl(shop, endpoint), {
    headers: { 'X-Shopify-Access-Token': token, Accept: 'application/json' },
  });
  let json: unknown = {};
  try {
    const text = await res.text();
    json = text ? JSON.parse(text) : {};
  } catch {
    console.warn(`${TAG} shopifyGet: failed to parse JSON from ${endpoint}`);
  }
  return { res, json };
}

async function shopifyPut(shop: string, token: string, endpoint: string, body: unknown) {
  const res = await fetch(shopifyAdminUrl(shop, endpoint), {
    method: 'PUT',
    headers: {
      'X-Shopify-Access-Token': token,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
  let json: unknown = {};
  try {
    const text = await res.text();
    json = text ? JSON.parse(text) : {};
  } catch {
    console.warn(`${TAG} shopifyPut: failed to parse JSON from ${endpoint}`);
  }
  return { res, json };
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Read the Liquid source file from disk
// ---------------------------------------------------------------------------

let _liquidContentCache: string | null = null;

function readLiquidSectionContent(): string {
  if (_liquidContentCache) return _liquidContentCache;

  const candidates = [
    // ESM-compatible __dirname (works with tsx on Render)
    path.resolve(__dirname_esm, '..', '..', '..', 'shopify', 'Shopify_new_tryon_upload_first.liquid'),
    path.resolve(__dirname_esm, '..', '..', 'shopify', 'Shopify_new_tryon_upload_first.liquid'),
    // CWD-based (works when cwd is the backend folder)
    path.resolve(process.cwd(), 'shopify', 'Shopify_new_tryon_upload_first.liquid'),
    path.resolve(process.cwd(), '..', 'shopify', 'Shopify_new_tryon_upload_first.liquid'),
    // Render-specific: rootDir is stylique-virtual-tryon/backend
    path.resolve(process.cwd(), '..', 'shopify', 'Shopify_new_tryon_upload_first.liquid'),
  ];

  console.log(`${TAG} Searching for Liquid file. CWD: ${process.cwd()}, __dirname_esm: ${__dirname_esm}`);

  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        _liquidContentCache = fs.readFileSync(p, 'utf-8');
        console.log(`${TAG} Liquid source loaded from ${p} (${_liquidContentCache.length} chars)`);
        return _liquidContentCache;
      }
    } catch {
      // try next
    }
  }

  console.error(`${TAG} Liquid file not found. Tried: ${candidates.join(', ')}`);
  throw new Error(`${TAG} Cannot find Shopify_new_tryon_upload_first.liquid in any expected location`);
}

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

async function markInjectionResult(storeUuid: string, done: boolean, status: string) {
  const supabase = getSupabase();
  await supabase
    .from('stores')
    .update({
      shopify_theme_injection_done: done,
      shopify_theme_injection_status: status.slice(0, 2000),
    })
    .eq('id', storeUuid);
}

async function isAlreadyInjected(storeUuid: string): Promise<boolean> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('stores')
    .select('shopify_theme_injection_done')
    .eq('id', storeUuid)
    .maybeSingle();
  return data?.shopify_theme_injection_done === true;
}

// ---------------------------------------------------------------------------
// Step 1: Find the main (published) theme
// ---------------------------------------------------------------------------

interface ShopifyTheme {
  id: number;
  name: string;
  role: string;
}

async function getMainTheme(shop: string, token: string): Promise<ShopifyTheme> {
  const { res, json } = await shopifyGet(shop, token, '/themes.json');
  if (res.status === 403) {
    throw new Error(
      'Missing read_themes scope. Re-install the app with SHOPIFY_SCOPES=read_products,write_products,read_themes,write_themes'
    );
  }
  if (!res.ok) {
    throw new Error(`Failed to list themes: HTTP ${res.status} – ${JSON.stringify(json).slice(0, 300)}`);
  }
  const themes: ShopifyTheme[] = (json as any).themes || [];
  const main = themes.find((t) => t.role === 'main');
  if (!main) {
    throw new Error('No theme with role=main found');
  }
  return main;
}

// ---------------------------------------------------------------------------
// Step 2: Check if section already exists in theme
// ---------------------------------------------------------------------------

async function sectionExistsInTheme(
  shop: string,
  token: string,
  themeId: number,
): Promise<boolean> {
  const endpoint = `/themes/${themeId}/assets.json?asset[key]=${encodeURIComponent(SECTION_KEY)}`;
  const { res } = await shopifyGet(shop, token, endpoint);
  return res.ok;
}

// ---------------------------------------------------------------------------
// Step 3: Upload the Liquid section
// ---------------------------------------------------------------------------

async function uploadSectionAsset(
  shop: string,
  token: string,
  themeId: number,
): Promise<void> {
  const content = readLiquidSectionContent();

  const { res, json } = await shopifyPut(shop, token, `/themes/${themeId}/assets.json`, {
    asset: {
      key: SECTION_KEY,
      value: content,
    },
  });

  if (!res.ok) {
    const errMsg = (json as any)?.errors || JSON.stringify(json).slice(0, 500);
    throw new Error(`Upload section failed (HTTP ${res.status}): ${errMsg}`);
  }

  console.log(`${TAG} Section asset uploaded to theme ${themeId}`);
}

// ---------------------------------------------------------------------------
// Step 4: Wire section into the product template
// ---------------------------------------------------------------------------

async function getThemeAsset(
  shop: string,
  token: string,
  themeId: number,
  key: string,
): Promise<{ value: string } | null> {
  const endpoint = `/themes/${themeId}/assets.json?asset[key]=${encodeURIComponent(key)}`;
  const { res, json } = await shopifyGet(shop, token, endpoint);
  if (!res.ok) {
    console.log(`${TAG} getThemeAsset(${key}): HTTP ${res.status}`);
    return null;
  }
  const asset = (json as any)?.asset;
  if (!asset || typeof asset.value !== 'string') {
    console.warn(`${TAG} getThemeAsset(${key}): asset exists but value is missing or not a string`);
    return null;
  }
  return asset;
}

async function putThemeAsset(
  shop: string,
  token: string,
  themeId: number,
  key: string,
  value: string,
): Promise<void> {
  const { res, json } = await shopifyPut(shop, token, `/themes/${themeId}/assets.json`, {
    asset: { key, value },
  });
  if (!res.ok) {
    const errMsg = (json as any)?.errors || JSON.stringify(json).slice(0, 500);
    throw new Error(`Put asset ${key} failed (HTTP ${res.status}): ${errMsg}`);
  }
}

/**
 * OS 2.0 JSON template: add a section reference to templates/product.json
 */
async function wireIntoJsonTemplate(
  shop: string,
  token: string,
  themeId: number,
): Promise<boolean> {
  const asset = await getThemeAsset(shop, token, themeId, PRODUCT_TEMPLATE_JSON);
  if (!asset) {
    console.log(`${TAG} product.json not found — not an OS 2.0 theme or asset missing`);
    return false;
  }

  const raw = (asset.value || '').trim();
  if (!raw) {
    console.warn(`${TAG} product.json exists but is empty — skipping JSON wiring`);
    return false;
  }

  let template: any;
  try {
    template = JSON.parse(raw);
  } catch (e: any) {
    console.warn(`${TAG} product.json is not valid JSON (${e.message}) — skipping`);
    return false;
  }

  if (!template || typeof template !== 'object') {
    console.warn(`${TAG} product.json parsed but is not an object — skipping`);
    return false;
  }

  // Some themes use a wrapper layout; ensure sections object exists
  if (!template.sections || typeof template.sections !== 'object') {
    console.warn(`${TAG} product.json has no sections object — creating one`);
    template.sections = {};
  }

  if (template.sections[SECTION_ID]) {
    console.log(`${TAG} Section already referenced in product.json — no changes needed`);
    return true;
  }

  template.sections[SECTION_ID] = {
    type: SECTION_ID,
    settings: {},
  };

  if (Array.isArray(template.order) && !template.order.includes(SECTION_ID)) {
    template.order.push(SECTION_ID);
  }

  const updated = JSON.stringify(template, null, 2);
  await putThemeAsset(shop, token, themeId, PRODUCT_TEMPLATE_JSON, updated);
  console.log(`${TAG} Section added to product.json`);
  return true;
}

/**
 * Legacy Liquid template: inject {% section %} tag into templates/product.liquid
 */
async function wireIntoLiquidTemplate(
  shop: string,
  token: string,
  themeId: number,
): Promise<boolean> {
  const asset = await getThemeAsset(shop, token, themeId, PRODUCT_TEMPLATE_LIQUID);
  if (!asset) {
    console.log(`${TAG} product.liquid not found — not a legacy Liquid theme`);
    return false;
  }

  const raw = (asset.value || '').trim();
  if (!raw) {
    console.warn(`${TAG} product.liquid exists but is empty — appending section tag`);
    const sectionTag = `{% section '${SECTION_ID}' %}`;
    await putThemeAsset(shop, token, themeId, PRODUCT_TEMPLATE_LIQUID, sectionTag);
    return true;
  }

  const sectionTag = `{% section '${SECTION_ID}' %}`;

  if (raw.includes(sectionTag) || raw.includes(`section '${SECTION_ID}'`)) {
    console.log(`${TAG} Section tag already present in product.liquid`);
    return true;
  }

  let content = raw;
  const lastDivClose = content.lastIndexOf('</div>');
  if (lastDivClose > 0) {
    content =
      content.slice(0, lastDivClose) +
      `\n  ${sectionTag}\n` +
      content.slice(lastDivClose);
  } else {
    content += `\n${sectionTag}\n`;
  }

  await putThemeAsset(shop, token, themeId, PRODUCT_TEMPLATE_LIQUID, content);
  console.log(`${TAG} Section tag injected into product.liquid`);
  return true;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function injectStyliqueSectionIntoTheme(
  shopDomain: string,
  accessToken: string,
  storeUuid: string,
): Promise<void> {
  console.log(`${TAG} Starting theme injection for ${shopDomain} (store=${storeUuid})`);

  // Idempotency: skip if already done
  if (await isAlreadyInjected(storeUuid)) {
    console.log(`${TAG} Already injected for store ${storeUuid} — skipping`);
    return;
  }

  try {
    // Step 1: Find the main theme
    const theme = await getMainTheme(shopDomain, accessToken);
    console.log(`${TAG} Main theme: "${theme.name}" (id=${theme.id})`);

    // Small delay to stay well within Shopify rate limits
    await delay(300);

    // Step 2: Check if section asset already exists
    const exists = await sectionExistsInTheme(shopDomain, accessToken, theme.id);
    if (exists) {
      console.log(`${TAG} Section asset already exists in theme — checking template wiring`);
    } else {
      // Step 3: Upload the section
      await delay(300);
      await uploadSectionAsset(shopDomain, accessToken, theme.id);
    }

    // Step 4: Wire into product template
    await delay(300);

    const jsonDone = await wireIntoJsonTemplate(shopDomain, accessToken, theme.id);
    if (jsonDone) {
      const msg = `Section injected into theme "${theme.name}" (product.json). ` +
        `Theme ID: ${theme.id}. Timestamp: ${new Date().toISOString()}`;
      await markInjectionResult(storeUuid, true, msg);
      console.log(`${TAG} SUCCESS (JSON template)`);
      return;
    }

    await delay(300);

    const liquidDone = await wireIntoLiquidTemplate(shopDomain, accessToken, theme.id);
    if (liquidDone) {
      const msg = `Section injected into theme "${theme.name}" (product.liquid). ` +
        `Theme ID: ${theme.id}. Timestamp: ${new Date().toISOString()}`;
      await markInjectionResult(storeUuid, true, msg);
      console.log(`${TAG} SUCCESS (Liquid template)`);
      return;
    }

    // Neither template found — section is uploaded but not wired
    const msg = `Section uploaded to theme "${theme.name}" but no product template found ` +
      `(neither product.json nor product.liquid). Merchant must add it manually via the ` +
      `theme customizer. Theme ID: ${theme.id}. Timestamp: ${new Date().toISOString()}`;
    await markInjectionResult(storeUuid, false, msg);
    console.warn(`${TAG} ${msg}`);

  } catch (err: any) {
    const msg = `Injection failed: ${err.message}. ` +
      `The merchant can install manually. Timestamp: ${new Date().toISOString()}`;
    console.error(`${TAG} ${msg}`);
    await markInjectionResult(storeUuid, false, msg).catch(() => {});
  }
}
