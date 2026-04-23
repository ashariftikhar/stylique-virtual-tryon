# Shopify Theme App Extension Setup Guide

This guide explains exactly how to set up, deploy, test, and hand off the Stylique Shopify Theme App Extension.

The goal is simple:

1. Keep the existing Stylique Shopify OAuth backend as the source of truth.
2. Use Shopify Theme App Extension as the preferred storefront widget install method.
3. Keep the old Liquid/manual injector as a fallback only.

The extension lives here:

```text
stylique-virtual-tryon/shopify-app/
```

The actual theme extension lives here:

```text
stylique-virtual-tryon/shopify-app/extensions/stylique-virtual-tryon/
```

---

## 1. What This Extension Does

The extension contains two merchant-facing pieces:

| Piece | Handle | Purpose |
| --- | --- | --- |
| Product app block | `stylique-tryon` | Adds the Stylique widget to product pages from the Shopify theme editor |
| App embed | `stylique-embed` | Optional global helper for tracking and fallback floating button behavior |

The app block is the recommended path. It gives merchants exact placement on the product page and avoids direct theme-file mutation.

The app embed is optional. It is useful when the merchant wants global tracking/helper behavior or a product-page fallback button.

---

## 2. Important Architecture Notes

The extension does not replace Shopify OAuth.

OAuth still does this:

1. Connects the Shopify store.
2. Stores the Shopify access token in Supabase.
3. Syncs products into Stylique inventory.
4. Registers Shopify product webhooks.
5. Redirects the merchant to the Stylique store panel.

The theme extension only controls storefront widget placement.

This separation is important because:

1. The extension never exposes Shopify Admin tokens to the storefront.
2. Product sync still happens through the backend.
3. Theme setup becomes cleaner and safer for merchants.
4. The legacy Liquid/manual install remains available if a theme does not support app blocks.

---

## 3. Files Added For The Extension

```text
shopify-app/
  package.json
  README.md
  shopify.app.toml.example
  .gitignore
  extensions/
    stylique-virtual-tryon/
      shopify.extension.toml
      blocks/
        stylique-tryon.liquid
        stylique-embed.liquid
      assets/
        stylique-widget.js
        stylique-widget.css
        stylique-logo.png
      locales/
        en.default.json
```

Important backend and panel files:

```text
backend/src/routes/shopify.ts
backend/src/routes/store.ts
storepanel/src/app/(dashboard)/page.tsx
storepanel/src/types/api.ts
database/migrations/009_shopify_theme_extension_tracking.sql
```

---

## 4. Required Accounts And Access

Before starting, make sure you have:

1. Shopify Partner Dashboard access.
2. Access to the same Shopify app used by the Stylique backend OAuth flow.
3. A Shopify development store for testing.
4. Render or production backend access.
5. Supabase SQL editor access.
6. Vercel or store panel deployment access.
7. Node.js installed locally.
8. Shopify CLI installed locally (or installable via npm).

---

## 5. Backend Prerequisites

The backend must already be deployed and reachable by HTTPS.

Example production backend:

```text
https://stylique-api.onrender.com
```

Confirm these existing backend variables are correct:

```env
SHOPIFY_API_KEY=your-shopify-app-client-id
SHOPIFY_API_SECRET=your-shopify-app-client-secret
SHOPIFY_SCOPES=read_products,write_products,read_themes,write_themes
SHOPIFY_REDIRECT_URI=https://your-backend.com/api/shopify/callback
PUBLIC_API_URL=https://your-backend.com
FRONTEND_URL=https://your-store-panel.com
```

The theme extension itself does not need `write_themes`, but the legacy auto-injector does. Keep those scopes during rollout so the old fallback still works where allowed.

---

## 6. Apply The Database Migration

Before deploying the updated backend/store panel, apply this migration in Supabase:

```text
database/migrations/009_shopify_theme_extension_tracking.sql
```

It adds these columns to `stores`:

```sql
shopify_extension_last_seen_at
shopify_extension_install_method
shopify_extension_version
shopify_extension_setup_status
```

Why this matters:

1. The storefront extension sends a heartbeat when it loads.
2. The backend stores the heartbeat on the store row.
3. The store panel shows whether the extension is active, when it was last seen, and how it was installed.

If this migration is not applied, the updated backend can fail when selecting or updating these fields.

---

## 7. Configure Backend Environment For Extension Links

Add these variables to the backend deployment environment:

```env
SHOPIFY_EXTENSION_APP_API_KEY=your-shopify-app-api-key
SHOPIFY_EXTENSION_BLOCK_HANDLE=stylique-tryon
SHOPIFY_EXTENSION_EMBED_HANDLE=stylique-embed
SHOPIFY_EXTENSION_VERSION=0.1.0
```

Notes:

1. `SHOPIFY_EXTENSION_APP_API_KEY` should match `SHOPIFY_API_KEY`.
2. If `SHOPIFY_EXTENSION_APP_API_KEY` is missing, the backend falls back to `SHOPIFY_API_KEY`.
3. Keep the handles exactly as shown unless you rename the Liquid block files.

The store panel uses these values to generate links like:

```text
https://{shop}/admin/themes/current/editor?template=product&addAppBlockId={api_key}/stylique-tryon&target=mainSection
```

And:

```text
https://{shop}/admin/themes/current/editor?context=apps&template=product&activateAppId={api_key}/stylique-embed
```

---

## 8. Install Shopify CLI

Shopify CLI was not installed on the local machine during implementation, so this step must be done before validation/deploy.

Recommended local install from the `shopify-app` folder:

```powershell
cd C:\Users\SL\OneDrive\Desktop\stylique-phase1\stylique-virtual-tryon\shopify-app
npm install
```

This installs the local `@shopify/cli` dependency from `package.json`.

Check it works:

```powershell
npm run shopify -- version
```

If you prefer a global install, install Shopify CLI globally and verify:

```powershell
shopify version
```

Use one style consistently. For this repo, the local npm script is safer because it keeps the CLI version consistent for the project.

---

## 9. Connect The Shopify CLI Project To The Existing Shopify App

Go to the Shopify app wrapper:

```powershell
cd C:\Users\SL\OneDrive\Desktop\stylique-phase1\stylique-virtual-tryon\shopify-app
```

Create the private config file:

```powershell
Copy-Item .\shopify.app.toml.example .\shopify.app.toml
```

Open:

```text
shopify.app.toml
```

Set:

```toml
client_id = "your-shopify-app-api-key"
name = "Stylique Virtual Try-On"
application_url = "https://stylique-api.onrender.com/api/shopify/oauth"
embedded = false
```

Set the auth redirect URL:

```toml
[auth]
redirect_urls = [
  "https://stylique-api.onrender.com/api/shopify/callback"
]
```

Set scopes:

```toml
[access_scopes]
scopes = "read_products,write_products,read_themes,write_themes"
```

Important:

1. Do not commit `shopify.app.toml`.
2. It is ignored by `.gitignore`.
3. `shopify.app.toml.example` is safe to commit.
4. The `client_id` must be the same app used by backend OAuth.

---

## 10. Confirm Extension Handles

These files define the handles used in deep links:

```text
blocks/stylique-tryon.liquid
blocks/stylique-embed.liquid
```

The handles are:

```text
stylique-tryon
stylique-embed
```

Do not rename those files unless you also update:

```env
SHOPIFY_EXTENSION_BLOCK_HANDLE
SHOPIFY_EXTENSION_EMBED_HANDLE
```

---

## 11. Validate File Size Limits Before Deploy

Shopify enforces theme app extension size limits. Run this PowerShell check:

```powershell
$ext="C:\Users\SL\OneDrive\Desktop\stylique-phase1\stylique-virtual-tryon\shopify-app\extensions\stylique-virtual-tryon"
$liquid=(Get-ChildItem -Path $ext -Recurse -Filter "*.liquid" | Measure-Object -Property Length -Sum).Sum
$total=(Get-ChildItem -Path $ext -Recurse -File | Measure-Object -Property Length -Sum).Sum
Write-Output "Liquid bytes: $liquid"
Write-Output "Total extension bytes: $total"
```

Expected current result:

```text
Liquid bytes: 8490
Total extension bytes: 280751
```

Safe limits:

1. Liquid across all extension files must stay under `100 KB`.
2. Total extension files must stay under `10 MB`.

This is why the huge legacy Liquid widget was not copied directly into the extension.

---

## 12. Run Local Code Verification

From repo root:

```powershell
cd C:\Users\SL\OneDrive\Desktop\stylique-phase1
```

Backend build:

```powershell
cd .\stylique-virtual-tryon\backend
npm run build
```

Store panel build:

```powershell
cd ..\storepanel
npm run build
```

Extension JS syntax:

```powershell
cd ..\shopify-app
node --check .\extensions\stylique-virtual-tryon\assets\stylique-widget.js
```

Git whitespace check:

```powershell
cd ..\..
git diff --check
```

All of these passed during implementation.

---

## 13. Preview The Extension On A Development Store

From:

```powershell
cd C:\Users\SL\OneDrive\Desktop\stylique-phase1\stylique-virtual-tryon\shopify-app
```

Run:

```powershell
npm run dev
```

The Shopify CLI will ask you to:

1. Log in to Shopify.
2. Select the Partner organization.
3. Select the existing Stylique Shopify app.
4. Select a development store.

Use a development store where the Stylique app is installed or can be installed through OAuth.

During preview:

1. Open the theme editor preview link Shopify CLI provides.
2. Go to a product template.
3. Add the `Stylique Virtual Try-On` app block.
4. Save or preview.
5. Open a product page.
6. Confirm the widget appears once.

If you enable the app embed:

1. Open Theme Settings.
2. Open App embeds.
3. Enable Stylique.
4. Save.
5. Confirm it does not duplicate the app block.

---

## 14. Deploy The Extension To Shopify

From:

```powershell
cd C:\Users\SL\OneDrive\Desktop\stylique-phase1\stylique-virtual-tryon\shopify-app
```

Run:

```powershell
npm run deploy
```

Follow Shopify CLI prompts carefully:

1. Select the correct Partner organization.
2. Select the same Shopify app used by backend OAuth.
3. Confirm the extension deployment.

After deploy, the extension becomes available to stores that install that Shopify app.

Important:

1. Deploying the extension does not automatically place it on a merchant theme.
2. Merchants still add the app block from the theme editor.
3. The store panel deep links make that easier.

---

## 15. Deploy Backend And Store Panel

After the migration is applied and env vars are added:

1. Deploy the backend.
2. Deploy the store panel.
3. Confirm backend startup succeeds.
4. Confirm the store panel loads without inventory/config errors.

Backend health checks:

```text
GET https://your-backend.com/health
```

Store config check from an authenticated store panel session:

```text
GET /api/store/{store_id}/config
```

Expected store config includes:

```json
{
  "shopifyExtension": {
    "recommended": true,
    "appApiKey": "...",
    "blockHandle": "stylique-tryon",
    "embedHandle": "stylique-embed",
    "version": "0.1.0",
    "links": {
      "addAppBlockMain": "...",
      "addAppBlockApps": "...",
      "activateEmbed": "..."
    }
  }
}
```

---

## 16. Merchant Setup Flow

This is the flow you should give to a merchant or client tester.

### Step 1: Install/connect Shopify

Open:

```text
https://your-backend.com/api/shopify/oauth?shop=merchant-store.myshopify.com
```

Merchant approves the app.

Expected result:

1. Store is created/updated in Supabase.
2. Products sync.
3. Webhooks register.
4. Merchant lands in Stylique store panel.

### Step 2: Open Theme App Extension install section

In the store panel, look for:

```text
Recommended: Theme App Extension
```

### Step 3: Add the product app block

Click:

```text
Add App Block
```

Shopify opens the theme editor on the product template.

Merchant should:

1. Confirm the Stylique block is added.
2. Move it near the product form or desired placement.
3. Save the theme.

### Step 4: Optional app embed

Click:

```text
Enable Embed
```

Merchant should:

1. Confirm the app embed is enabled.
2. Save the theme.

The embed is optional. Use it if you want fallback floating button behavior or global helper/tracking.

### Step 5: Verify heartbeat

Open a live product page.

Then return to the store panel.

Expected:

```text
Theme App Extension detected
Last seen: {date/time}
Install method: theme_app_block
```

If the app embed fallback is the thing that loaded, install method can show:

```text
theme_app_embed
```

---

## 17. Full Functional Test Checklist

Use this checklist on every development store before client handoff.

### Store connection

- Shopify OAuth completes.
- Store panel opens after OAuth.
- Products appear in inventory.
- Product create/update/delete webhooks are registered.
- No Shopify access token appears in browser source or console.

### App block

- `Add App Block` link opens the Shopify theme editor.
- Product template is selected.
- Stylique app block can be added.
- Theme can be saved.
- Product page shows exactly one Stylique button/widget.
- Widget opens on desktop.
- Widget opens on mobile.

### App embed

- `Enable Embed` link opens App embeds.
- Embed can be enabled and saved.
- If app block is present, embed does not duplicate the widget.
- If app block is absent and fallback is enabled, product page can show the fallback floating button.
- Embed does nothing harmful on collection, home, or non-product pages.

### Login and upload

- Logged-out upload click shows login screen.
- Send OTP works.
- Verify OTP logs in.
- Logout clears stale upload/result state.
- Upload opens only after login.

### Try-on result

- Tier 1/2 products run try-on.
- Result image displays with `object-fit: contain`.
- Try Again works.
- Download works.
- Add to Cart works.
- Fit details open and close correctly.

### Tier 3

- Tier 3 size-advisor flow appears.
- Mobile layout is readable at 375px, 390px, 430px, and 768px.
- Complete the Look carousel does not overflow.
- Recommended-size Add to Cart works when variant matching exists.
- Friendly fallback appears when variant matching fails.

### Tracking

- Widget heartbeat updates `shopify_extension_last_seen_at`.
- Native Add to Cart conversion tracking fires once.
- Try-on conversion tracking fires after successful add-to-cart.

---

## 18. Backend Heartbeat Endpoint

The extension calls:

```text
POST /api/shopify/widget/heartbeat
```

Payload:

```json
{
  "storeId": "optional-store-id",
  "shopDomain": "merchant-store.myshopify.com",
  "productId": "1234567890",
  "productHandle": "example-shirt",
  "installMethod": "theme_app_block",
  "extensionVersion": "0.1.0",
  "currentUrl": "https://merchant-store.myshopify.com/products/example-shirt"
}
```

Allowed `installMethod` values:

```text
theme_app_block
theme_app_embed
manual_section
```

Expected response:

```json
{
  "success": true
}
```

The endpoint intentionally accepts no secrets and returns no sensitive data.

---

## 19. Troubleshooting

### Problem: Shopify CLI is not recognized

Symptom:

```text
shopify : The term 'shopify' is not recognized
```

Fix:

```powershell
cd C:\Users\SL\OneDrive\Desktop\stylique-phase1\stylique-virtual-tryon\shopify-app
npm install
npm run shopify -- version
```

Or install Shopify CLI globally, then run:

```powershell
shopify version
```

### Problem: Store panel does not show app block links

Check backend env:

```env
SHOPIFY_EXTENSION_APP_API_KEY
SHOPIFY_EXTENSION_BLOCK_HANDLE
SHOPIFY_EXTENSION_EMBED_HANDLE
```

Also confirm the store has:

```text
shopify_shop_domain
```

in Supabase.

### Problem: App block link opens but block is not added

Use the fallback link:

```text
target=newAppsSection
```

Or manually:

1. Open Shopify Admin.
2. Go to Online Store > Themes > Customize.
3. Open a product template.
4. Click Add block or Add app block.
5. Choose Stylique Virtual Try-On.
6. Save.

### Problem: App block is not visible in the theme editor

Check:

1. Extension was deployed to the correct Shopify app.
2. Merchant installed the same app connected to the extension.
3. Store is using an Online Store 2.0 theme.
4. Product template supports app blocks.
5. The deployed block handle is still `stylique-tryon`.

### Problem: Widget appears twice

Likely causes:

1. Legacy manual section is still installed and app block was added too.
2. App embed fallback is enabled while app block is also present.

Fix:

1. Remove the old manual `stylique-virtual-try-on` section from the product template.
2. Keep only the app block.
3. Keep app embed enabled only if needed.

The new extension runtime has duplicate-mount protection, but old legacy snippets can still create a second independent widget.

### Problem: Store panel does not show heartbeat

Check browser Network tab on product page:

```text
POST /api/shopify/widget/heartbeat
```

If it is missing:

1. Confirm app block or embed is actually saved on the live theme.
2. Confirm product page is not password-protected in a way that blocks testing.
3. Confirm backend URL setting in the app block is correct.

If it returns an error:

1. Confirm `shopDomain` is a `.myshopify.com` domain.
2. Confirm store exists in Supabase.
3. Confirm migration `009` was applied.

### Problem: OTP login fails

This is not caused by the theme extension.

Check backend OTP setup:

```env
SENDGRID_API_KEY
OTP_FROM_EMAIL
SENDGRID_FROM_EMAIL
ALLOW_DEV_OTP_LOGIN
```

For local testing only, dev OTP can be enabled:

```env
ALLOW_DEV_OTP_LOGIN=true
NODE_ENV=development
```

Production should use a real email provider.

### Problem: Product data is missing in widget

Check:

1. Product exists in Shopify.
2. Product synced to Supabase inventory.
3. App block is on a product template, not a collection or home template.
4. Backend `/api/plugin/check-product` returns success for the Shopify product.

### Problem: Add to Cart fails

Check:

1. Product has at least one available Shopify variant.
2. Recommended size maps to an actual Shopify variant option.
3. Browser Network tab shows `/cart/add.js`.
4. Shopify theme has not overridden cart behavior in a way that blocks AJAX cart adds.

---

## 20. Client Handoff Checklist

Before saying the setup is ready for a client:

- Migration `009` is applied in Supabase.
- Backend deployed with extension env vars.
- Store panel deployed.
- Shopify CLI extension deployed to the correct Shopify app.
- Development store tested with app block.
- Development store tested with app embed.
- Legacy manual section removed or confirmed not duplicated.
- Store panel heartbeat appears after product page load.
- OTP login works.
- Try-on works.
- Add to Cart works.
- Mobile product page works.
- No uncaught browser console errors.

---

## 21. Rollout Recommendation

Use this rollout sequence:

1. Test on one development store with Dawn.
2. Test on one Horizon-based theme.
3. Test on one real client-like theme.
4. Deploy backend and panel.
5. Deploy extension.
6. Ask the first client to use app block install.
7. Keep manual fallback available for edge cases.
8. After 2-3 successful stores, make Theme App Extension the default setup in all client docs.

---

## 22. References

These Shopify docs were checked while preparing this guide:

1. Shopify CLI for apps: https://shopify.dev/docs/apps/build/cli-for-apps
2. Theme app extension configuration: https://shopify.dev/docs/apps/build/online-store/theme-app-extensions/configuration
3. App block deep links: https://shopify.dev/docs/apps/build/online-store/theme-app-extensions/configuration#deep-linking
4. App embed deep links: https://shopify.dev/docs/apps/build/online-store/theme-app-extensions/configuration#app-embed-block-deep-linking-url
5. Theme app extension size limits: https://shopify.dev/docs/apps/build/online-store/theme-app-extensions/configuration#file-and-content-size-limits

