/**
 * Shopify Theme Injector
 *
 * After OAuth, automatically uploads the Stylique Liquid section into the
 * merchant's active theme and wires it into the product template so the
 * try-on widget appears without any manual theme editing.
 *
 * Both REST Asset PUT and GraphQL themeFilesUpsert require a Shopify-granted
 * exemption for write_themes.  We attempt both, and when neither succeeds we
 * store clear manual-install instructions (with a deep link to the theme
 * code editor) so the merchant can paste the section themselves.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSupabase } from './supabase.ts';

const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || '2025-01';
const SECTION_KEY = 'sections/stylique-virtual-try-on.liquid';
const CSS_ASSET_KEY = 'assets/stylique.css';
const SECTION_ID = 'stylique-virtual-try-on';
const PRODUCT_TEMPLATE_JSON = 'templates/product.json';
const PRODUCT_TEMPLATE_LIQUID = 'templates/product.liquid';

const TAG = '[ThemeInjector]';

export type ThemeInjectionCode =
  | 'success'
  | 'blocked_by_shopify_theme_write'
  | 'missing_theme_scope'
  | 'theme_not_found'
  | 'asset_upload_failed'
  | 'template_write_failed'
  | 'source_asset_missing'
  | 'unknown_error';

export interface ThemeInjectionStatusPayload {
  code: ThemeInjectionCode;
  done: boolean;
  message: string;
  details?: string | undefined;
  themeId?: number | undefined;
  themeName?: string | undefined;
  shopDomain?: string | undefined;
  links?: {
    themes?: string | undefined;
    customizer?: string | undefined;
    codeEditor?: string | undefined;
  } | undefined;
  failedAssets?: string[] | undefined;
  uploadedAssets?: string[] | undefined;
  timestamp: string;
}

const __filename_esm = fileURLToPath(import.meta.url);
const __dirname_esm = path.dirname(__filename_esm);

// ---------------------------------------------------------------------------
// REST helpers
// ---------------------------------------------------------------------------

function shopifyAdminUrl(shop: string, endpoint: string): string {
  return `https://${shop}/admin/api/${SHOPIFY_API_VERSION}${endpoint}`;
}

function shopifyGraphqlUrl(shop: string): string {
  return `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;
}

async function shopifyGet(shop: string, token: string, endpoint: string) {
  const url = shopifyAdminUrl(shop, endpoint);
  console.log(`${TAG} GET ${url}`);
  const res = await fetch(url, {
    headers: { 'X-Shopify-Access-Token': token, Accept: 'application/json' },
  });
  let json: unknown = {};
  try {
    const text = await res.text();
    json = text ? JSON.parse(text) : {};
  } catch {
    console.warn(`${TAG} shopifyGet: failed to parse JSON from ${endpoint}`);
  }
  if (!res.ok) {
    console.warn(`${TAG} GET ${endpoint} → ${res.status} ${res.statusText}`);
  }
  return { res, json };
}

async function shopifyPut(shop: string, token: string, endpoint: string, body: unknown) {
  const url = shopifyAdminUrl(shop, endpoint);
  const payload = JSON.stringify(body);
  console.log(`${TAG} PUT ${url} (${payload.length} bytes)`);
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'X-Shopify-Access-Token': token,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: payload,
  });
  let json: unknown = {};
  let rawText = '';
  try {
    rawText = await res.text();
    json = rawText ? JSON.parse(rawText) : {};
  } catch {
    console.warn(`${TAG} shopifyPut: failed to parse JSON — raw: ${rawText.slice(0, 300)}`);
  }
  if (!res.ok) {
    console.warn(`${TAG} PUT ${endpoint} → ${res.status} ${res.statusText} — body: ${rawText.slice(0, 500)}`);
  }
  return { res, json };
}

// ---------------------------------------------------------------------------
// GraphQL helpers
// ---------------------------------------------------------------------------

async function shopifyGraphql(shop: string, token: string, query: string, variables: Record<string, unknown>) {
  const url = shopifyGraphqlUrl(shop);
  console.log(`${TAG} POST ${url} (GraphQL)`);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': token,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  let json: any = {};
  let rawText = '';
  try {
    rawText = await res.text();
    json = rawText ? JSON.parse(rawText) : {};
  } catch {
    console.warn(`${TAG} GraphQL: failed to parse JSON — raw: ${rawText.slice(0, 300)}`);
  }
  if (!res.ok) {
    console.warn(`${TAG} GraphQL → ${res.status} ${res.statusText} — body: ${rawText.slice(0, 500)}`);
  }
  return { res, json };
}

const UPSERT_MUTATION = `
mutation themeFilesUpsert($files: [OnlineStoreThemeFilesUpsertFileInput!]!, $themeId: ID!) {
  themeFilesUpsert(files: $files, themeId: $themeId) {
    upsertedThemeFiles {
      filename
    }
    userErrors {
      field
      message
    }
  }
}`;

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Read the Liquid source file from disk
// ---------------------------------------------------------------------------

let _liquidContentCache: string | null = null;
let _cssContentCache: string | null = null;

export function readLiquidSectionContent(): string {
  if (_liquidContentCache) return _liquidContentCache;

  const candidates = [
    path.resolve(__dirname_esm, '..', '..', '..', 'shopify', 'Shopify_new_tryon_upload_first.liquid'),
    path.resolve(__dirname_esm, '..', '..', 'shopify', 'Shopify_new_tryon_upload_first.liquid'),
    path.resolve(process.cwd(), 'shopify', 'Shopify_new_tryon_upload_first.liquid'),
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
  const err = new Error(`Cannot find Shopify_new_tryon_upload_first.liquid in any expected location`);
  (err as any).themeInjectionCode = 'source_asset_missing';
  throw err;
}

export function readCssAssetContent(): string {
  if (_cssContentCache) return _cssContentCache;

  const candidates = [
    path.resolve(__dirname_esm, '..', '..', '..', 'shopify', 'assets', 'stylique.css'),
    path.resolve(__dirname_esm, '..', '..', 'shopify', 'assets', 'stylique.css'),
    path.resolve(process.cwd(), 'shopify', 'assets', 'stylique.css'),
    path.resolve(process.cwd(), '..', 'shopify', 'assets', 'stylique.css'),
  ];

  console.log(`${TAG} Searching for CSS asset. CWD: ${process.cwd()}, __dirname_esm: ${__dirname_esm}`);

  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        _cssContentCache = fs.readFileSync(p, 'utf-8');
        console.log(`${TAG} CSS asset loaded from ${p} (${_cssContentCache.length} chars)`);
        return _cssContentCache;
      }
    } catch {
      // try next
    }
  }

  console.error(`${TAG} CSS asset not found. Tried: ${candidates.join(', ')}`);
  const err = new Error(`Cannot find shopify/assets/stylique.css in any expected location`);
  (err as any).themeInjectionCode = 'source_asset_missing';
  throw err;
}

export function getShopifyThemeInstallAssets() {
  return {
    sectionKey: SECTION_KEY,
    cssAssetKey: CSS_ASSET_KEY,
    sectionLiquid: readLiquidSectionContent(),
    css: readCssAssetContent(),
  };
}

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

function themeAdminLinks(shop: string, themeId: number) {
  return {
    themes: `https://${shop}/admin/themes`,
    customizer: `https://${shop}/admin/themes/${themeId}/editor`,
    codeEditor: `https://${shop}/admin/themes/${themeId}`,
  };
}

function serializeStatus(payload: ThemeInjectionStatusPayload | string): string {
  if (typeof payload === 'string') return payload.slice(0, 2000);
  const compact: ThemeInjectionStatusPayload = {
    ...payload,
    details: payload.details ? payload.details.slice(0, 1000) : undefined,
  };
  return JSON.stringify(compact);
}

export function parseStoredThemeInjectionStatus(
  rawStatus: string | null | undefined,
  done: boolean,
): ThemeInjectionStatusPayload | null {
  if (!rawStatus) return null;
  try {
    const parsed = JSON.parse(rawStatus) as Partial<ThemeInjectionStatusPayload>;
    if (parsed && typeof parsed === 'object' && parsed.code && parsed.message) {
      return {
        code: parsed.code as ThemeInjectionCode,
        done: parsed.done ?? done,
        message: parsed.message,
        details: parsed.details,
        themeId: parsed.themeId,
        themeName: parsed.themeName,
        shopDomain: parsed.shopDomain,
        links: parsed.links,
        failedAssets: parsed.failedAssets,
        uploadedAssets: parsed.uploadedAssets,
        timestamp: parsed.timestamp || new Date().toISOString(),
      };
    }
  } catch {
    // Older rows contain a plain text status. Preserve it as details.
  }

  return {
    code: done ? 'success' : 'unknown_error',
    done,
    message: done ? 'Widget installed.' : 'Widget setup needs attention.',
    details: rawStatus,
    timestamp: new Date().toISOString(),
  };
}

async function markInjectionResult(
  storeUuid: string,
  done: boolean,
  status: ThemeInjectionStatusPayload | string,
) {
  const supabase = getSupabase();
  await supabase
    .from('stores')
    .update({
      shopify_theme_injection_done: done,
      shopify_theme_injection_status: serializeStatus(status),
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
    const err = new Error(
      'Missing read_themes scope. Re-install the app with SHOPIFY_SCOPES including read_themes,write_themes'
    );
    (err as any).themeInjectionCode = 'missing_theme_scope';
    throw err;
  }
  if (!res.ok) {
    throw new Error(`Failed to list themes: HTTP ${res.status} – ${JSON.stringify(json).slice(0, 300)}`);
  }
  const themes: ShopifyTheme[] = (json as any).themes || [];
  const main = themes.find((t) => t.role === 'main');
  if (!main) {
    const err = new Error('No theme with role=main found');
    (err as any).themeInjectionCode = 'theme_not_found';
    throw err;
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
  try {
    const { res } = await shopifyGet(shop, token, endpoint);
    return res.ok;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Step 3: Upload the Liquid section (REST → GraphQL fallback)
// ---------------------------------------------------------------------------

async function uploadSectionViaRest(
  shop: string,
  token: string,
  themeId: number,
  key: string,
  content: string,
  label: string,
): Promise<boolean> {
  console.log(`${TAG} Attempting REST PUT for section upload…`);
  console.log(`${TAG} Uploading ${label} to ${key}`);
  const { res, json } = await shopifyPut(shop, token, `/themes/${themeId}/assets.json`, {
    asset: { key, value: content },
  });

  if (res.ok) {
    console.log(`${TAG} REST PUT succeeded — section uploaded to theme ${themeId}`);
    return true;
  }

  const errMsg = (json as any)?.errors || JSON.stringify(json).slice(0, 500);
  console.warn(`${TAG} REST PUT failed (HTTP ${res.status}): ${errMsg}`);
  return false;
}

async function uploadSectionViaGraphql(
  shop: string,
  token: string,
  themeId: number,
  key: string,
  content: string,
  label: string,
): Promise<boolean> {
  console.log(`${TAG} Attempting GraphQL themeFilesUpsert for section upload…`);
  const gid = `gid://shopify/OnlineStoreTheme/${themeId}`;
  const { res, json } = await shopifyGraphql(shop, token, UPSERT_MUTATION, {
    themeId: gid,
    files: [{
      filename: key,
      body: { type: 'TEXT', value: content },
    }],
  });

  if (!res.ok) {
    console.warn(`${TAG} GraphQL HTTP error: ${res.status}`);
    return false;
  }

  const topLevelErrors = (json as any)?.errors;
  if (Array.isArray(topLevelErrors) && topLevelErrors.length > 0) {
    console.warn(`${TAG} GraphQL top-level errors for ${key}:`, JSON.stringify(topLevelErrors).slice(0, 1000));
    return false;
  }

  const userErrors = (json as any)?.data?.themeFilesUpsert?.userErrors;
  if (userErrors && userErrors.length > 0) {
    console.warn(`${TAG} GraphQL userErrors:`, JSON.stringify(userErrors));
    return false;
  }

  const upserted = (json as any)?.data?.themeFilesUpsert?.upsertedThemeFiles;
  if (upserted && upserted.length > 0) {
    console.log(`${TAG} GraphQL themeFilesUpsert succeeded — files: ${JSON.stringify(upserted)}`);
    return true;
  }

  console.warn(`${TAG} GraphQL themeFilesUpsert: no upsertedThemeFiles in response`);
  console.warn(`${TAG} GraphQL response shape for ${key}: ${JSON.stringify(json).slice(0, 1000)}`);
  return false;
}

async function uploadSectionAsset(
  shop: string,
  token: string,
  themeId: number,
  key?: string,
  content?: string,
  label?: string,
): Promise<'rest' | 'graphql' | 'failed'> {
  if (!key || !content || !label) {
    const result = await uploadRequiredThemeAssets(shop, token, themeId);
    return result.failed.length > 0 ? 'failed' : 'rest';
  }

  // Try REST first
  if (await uploadSectionViaRest(shop, token, themeId, key, content, label)) {
    return 'rest';
  }

  await delay(500);

  // Fallback to GraphQL
  if (await uploadSectionViaGraphql(shop, token, themeId, key, content, label)) {
    return 'graphql';
  }

  return 'failed';
}

async function uploadRequiredThemeAssets(
  shop: string,
  token: string,
  themeId: number,
): Promise<{ failed: string[]; uploaded: string[] }> {
  const assets = [
    {
      key: SECTION_KEY,
      label: 'Liquid section',
      content: readLiquidSectionContent(),
    },
    {
      key: CSS_ASSET_KEY,
      label: 'CSS theme asset',
      content: readCssAssetContent(),
    },
  ];

  const failed: string[] = [];
  const uploaded: string[] = [];

  for (const asset of assets) {
    const result = await uploadSectionAsset(shop, token, themeId, asset.key, asset.content, asset.label);
    if (result === 'failed') {
      failed.push(asset.key);
    } else {
      uploaded.push(`${asset.key} via ${result}`);
    }
    await delay(300);
  }

  return { failed, uploaded };
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
): Promise<boolean> {
  // Try REST
  const { res: restRes } = await shopifyPut(shop, token, `/themes/${themeId}/assets.json`, {
    asset: { key, value },
  });
  if (restRes.ok) return true;

  console.warn(`${TAG} REST PUT for ${key} failed (${restRes.status}), trying GraphQL…`);
  await delay(300);

  // Fallback to GraphQL
  const gid = `gid://shopify/OnlineStoreTheme/${themeId}`;
  const { res: gqlRes, json: gqlJson } = await shopifyGraphql(shop, token, UPSERT_MUTATION, {
    themeId: gid,
    files: [{ filename: key, body: { type: 'TEXT', value } }],
  });

  if (!gqlRes.ok) {
    console.warn(`${TAG} GraphQL PUT for ${key} also failed (${gqlRes.status})`);
    return false;
  }

  const topLevelErrors = (gqlJson as any)?.errors;
  if (Array.isArray(topLevelErrors) && topLevelErrors.length > 0) {
    console.warn(`${TAG} GraphQL top-level errors for ${key}:`, JSON.stringify(topLevelErrors).slice(0, 1000));
    return false;
  }

  const userErrors = (gqlJson as any)?.data?.themeFilesUpsert?.userErrors;
  if (userErrors && userErrors.length > 0) {
    console.warn(`${TAG} GraphQL userErrors for ${key}:`, JSON.stringify(userErrors));
    return false;
  }

  const upserted = (gqlJson as any)?.data?.themeFilesUpsert?.upsertedThemeFiles;
  if (Array.isArray(upserted) && upserted.length > 0) {
    console.log(`${TAG} GraphQL upsert succeeded for ${key}`);
    return true;
  }

  console.warn(`${TAG} GraphQL PUT for ${key}: no upsertedThemeFiles in response`);
  console.warn(`${TAG} GraphQL response shape for ${key}: ${JSON.stringify(gqlJson).slice(0, 1000)}`);
  return false;
}

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
  const ok = await putThemeAsset(shop, token, themeId, PRODUCT_TEMPLATE_JSON, updated);
  if (!ok) {
    console.warn(`${TAG} Failed to write product.json — asset write blocked`);
    return false;
  }
  console.log(`${TAG} Section added to product.json`);
  return true;
}

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
  const sectionTag = `{% section '${SECTION_ID}' %}`;

  if (!raw) {
    console.warn(`${TAG} product.liquid exists but is empty — writing section tag`);
    const ok = await putThemeAsset(shop, token, themeId, PRODUCT_TEMPLATE_LIQUID, sectionTag);
    return ok;
  }

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

  const ok = await putThemeAsset(shop, token, themeId, PRODUCT_TEMPLATE_LIQUID, content);
  if (!ok) {
    console.warn(`${TAG} Failed to write product.liquid — asset write blocked`);
    return false;
  }
  console.log(`${TAG} Section tag injected into product.liquid`);
  return true;
}

// ---------------------------------------------------------------------------
// Manual-install instructions builder
// ---------------------------------------------------------------------------

function buildManualInstallInstructions(shop: string, themeId: number, themeName: string): string {
  const editorUrl = `https://${shop}/admin/themes/${themeId}`;
  const customizerUrl = `https://${shop}/admin/themes/${themeId}/editor`;
  return [
    `Automatic theme injection could not complete (Shopify requires an exemption for programmatic theme writes).`,
    ``,
    `To add the Stylique Virtual Try-On widget manually:`,
    ``,
    `Option A — Theme Customizer (recommended for OS 2.0 themes):`,
    `  1. Go to: ${customizerUrl}`,
    `  2. Navigate to a Product page template`,
    `  3. Click "Add section" → search for "Stylique Virtual Try-On"`,
    `  4. Position it where you want the try-on button to appear`,
    `  5. Save`,
    ``,
    `Option B — Code Editor (all themes):`,
    `  1. Go to: ${editorUrl}`,
    `  2. Under "sections/", create a new file: stylique-virtual-try-on.liquid`,
    `  3. Paste the Stylique section code (available in your store panel under Settings)`,
    `  4. Under "assets/", create a new file: stylique.css`,
    `  5. Paste the Stylique CSS asset code`,
    `  6. Open templates/product.json (or product.liquid) and add the section reference`,
    `  7. Save`,
    ``,
    `Theme: "${themeName}" (ID: ${themeId})`,
    `Timestamp: ${new Date().toISOString()}`,
  ].join('\n');
}

function buildThemeStatus(
  code: ThemeInjectionCode,
  done: boolean,
  message: string,
  shopDomain: string,
  theme?: Pick<ShopifyTheme, 'id' | 'name'>,
  extra: Partial<ThemeInjectionStatusPayload> = {},
): ThemeInjectionStatusPayload {
  return {
    code,
    done,
    message,
    shopDomain,
    themeId: theme?.id,
    themeName: theme?.name,
    links: theme ? themeAdminLinks(shopDomain, theme.id) : undefined,
    timestamp: new Date().toISOString(),
    ...extra,
  };
}

function classifyInjectionError(err: any): ThemeInjectionCode {
  if (err?.themeInjectionCode) return err.themeInjectionCode as ThemeInjectionCode;
  const message = String(err?.message || '').toLowerCase();
  if (message.includes('read_themes') || message.includes('write_themes') || message.includes('scope')) {
    return 'missing_theme_scope';
  }
  if (message.includes('no theme') || message.includes('role=main')) return 'theme_not_found';
  if (message.includes('cannot find shopify') || message.includes('cannot find theme') || message.includes('liquid')) {
    return 'source_asset_missing';
  }
  return 'unknown_error';
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function injectStyliqueSectionIntoTheme(
  shopDomain: string,
  accessToken: string,
  storeUuid: string,
): Promise<ThemeInjectionStatusPayload | null> {
  console.log(`${TAG} Starting theme injection for ${shopDomain} (store=${storeUuid})`);
  console.log(`${TAG} Using Shopify API version: ${SHOPIFY_API_VERSION}`);

  if (await isAlreadyInjected(storeUuid)) {
    console.log(`${TAG} Already injected for store ${storeUuid} — skipping`);
    return buildThemeStatus(
      'success',
      true,
      'Widget is already marked as installed for this store.',
      shopDomain,
    );
  }

  try {
    // Step 1: Find the main theme
    console.log(`${TAG} [Step 1] Finding main theme…`);
    const theme = await getMainTheme(shopDomain, accessToken);
    console.log(`${TAG} Main theme: "${theme.name}" (id=${theme.id})`);

    await delay(300);

    // Step 2: Upload both files used by the Shopify section. The section
    // references {{ 'stylique.css' | asset_url }}, so uploading the Liquid
    // without the CSS asset leaves the widget installed but unthemed.
    console.log(`${TAG} [Step 2] Uploading required theme assets (section + CSS)…`);
    await delay(300);
    const uploadResult = await uploadRequiredThemeAssets(shopDomain, accessToken, theme.id);

    if (uploadResult.failed.length > 0) {
      console.warn(`${TAG} [Step 2] Theme asset upload failed for: ${uploadResult.failed.join(', ')}`);
      console.warn(`${TAG} This usually means the app needs a Shopify "write_themes" exemption.`);
      console.warn(`${TAG} Request it at: https://docs.google.com/forms/d/e/1FAIpQLSfZTB1vxFC5d1-GPdqYunWRGUoDcOheHQzfK2RoEFEHrknt5g/viewform`);

      const status = buildThemeStatus(
        'blocked_by_shopify_theme_write',
        false,
        'Store connected, but Shopify blocked automatic theme-file writes. Manual widget setup is available.',
        shopDomain,
        theme,
        {
          details: [
            buildManualInstallInstructions(shopDomain, theme.id, theme.name),
            ``,
            `Automatic upload failed for: ${uploadResult.failed.join(', ')}`,
          ].join('\n'),
          failedAssets: uploadResult.failed,
          uploadedAssets: uploadResult.uploaded,
        },
      );
      await markInjectionResult(storeUuid, false, status);
      return status;
    }

    console.log(`${TAG} Theme assets uploaded: ${uploadResult.uploaded.join(', ')}`);

    // Step 3: Wire into product template
    console.log(`${TAG} [Step 3] Wiring into product template…`);
    await delay(300);

    const jsonDone = await wireIntoJsonTemplate(shopDomain, accessToken, theme.id);
    if (jsonDone) {
      const status = buildThemeStatus(
        'success',
        true,
        `Section and CSS asset injected into theme "${theme.name}" using product.json.`,
        shopDomain,
        theme,
      );
      await markInjectionResult(storeUuid, true, status);
      console.log(`${TAG} SUCCESS (JSON template)`);
      return status;
    }

    console.log(`${TAG} [Step 4b] JSON template not available, trying Liquid template…`);
    await delay(300);

    const liquidDone = await wireIntoLiquidTemplate(shopDomain, accessToken, theme.id);
    if (liquidDone) {
      const status = buildThemeStatus(
        'success',
        true,
        `Section and CSS asset injected into theme "${theme.name}" using product.liquid.`,
        shopDomain,
        theme,
      );
      await markInjectionResult(storeUuid, true, status);
      console.log(`${TAG} SUCCESS (Liquid template)`);
      return status;
    }

    // Asset writes blocked — section was uploaded but template wiring failed
    const status = buildThemeStatus(
      'template_write_failed',
      false,
      'Store connected, but Stylique could not add the widget to the product template automatically.',
      shopDomain,
      theme,
      { details: buildManualInstallInstructions(shopDomain, theme.id, theme.name) },
    );
    await markInjectionResult(storeUuid, false, status);
    console.warn(`${TAG} Section uploaded but template wiring failed — manual install needed`);

    return status;
  } catch (err: any) {
    console.error(`${TAG} Injection error: ${err.message}`);
    console.error(`${TAG} Stack:`, err.stack);

    const code = classifyInjectionError(err);
    const status = buildThemeStatus(
      code,
      false,
      code === 'missing_theme_scope'
        ? 'Store connected, but the Shopify app is missing theme permissions.'
        : code === 'source_asset_missing'
          ? 'Store connected, but the backend could not find the Shopify widget source files.'
          : code === 'theme_not_found'
            ? 'Store connected, but no published Shopify theme was found.'
            : 'Store connected, but automatic widget setup could not complete.',
      shopDomain,
      undefined,
      {
        details: `Injection failed: ${err.message}. The merchant can install the widget manually via the theme editor.`,
      },
    );
    await markInjectionResult(storeUuid, false, status).catch(() => {});
    return status;
  }
}
