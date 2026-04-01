# Shopify Theme Installation Guide

This guide covers installing the Stylique Virtual Try-On widget on a Shopify store.

---

## Prerequisites

- A Shopify store (Online Store 2.0 theme recommended)
- A running Stylique backend with a public HTTPS URL
- Shopify app credentials (`SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`) configured on the backend

---

## Part 1: Shopify OAuth (Connect Your Store)

### Step 1: Configure Backend Environment

Ensure these variables are set in your backend `.env`:

```
SHOPIFY_API_KEY=your-shopify-app-client-id
SHOPIFY_API_SECRET=your-shopify-app-client-secret
SHOPIFY_SCOPES=read_products,write_products,read_themes,write_themes
SHOPIFY_REDIRECT_URI=https://your-backend.com/api/shopify/callback
PUBLIC_API_URL=https://your-backend.com
```

> **Note:** The `read_themes,write_themes` scopes are required for automatic theme injection. Without them, the widget must be installed manually (see Part 3).

### Step 2: Configure Shopify App Settings

In the Shopify Partner Dashboard (or custom app settings):

1. Set the **App URL** to `https://your-backend.com/api/shopify/oauth`
2. Add `https://your-backend.com/api/shopify/callback` to **Allowed redirection URL(s)**
3. Ensure the app has `read_products`, `write_products`, `read_themes`, and `write_themes` scopes

### Step 3: Initiate OAuth

Navigate to:

```
https://your-backend.com/api/shopify/oauth?shop=your-store.myshopify.com
```

This redirects you to Shopify's authorization screen. Click **Install app**.

### Step 4: Verify Connection

After authorization, you are redirected to the store panel. The app automatically:

1. **Stores the access token** in Supabase
2. **Syncs all products** from the store into the `inventory` table
3. **Registers webhooks** for real-time product create/update/delete
4. **Injects the try-on widget** into the store's active theme (see below)

Check:

- Backend logs should show `[Shopify OAuth] Token exchanged for ...`
- Backend logs should show `[ThemeInjector] SUCCESS` (or a specific error if injection failed)
- Supabase `stores` table should have `shopify_access_token`, `shopify_shop_domain`, and `shopify_theme_injection_done = true` populated
- Products should be synced (check `inventory` table)

---

## Part 2: Automatic Theme Injection (Default)

After a successful OAuth connection, the app **automatically** installs the Stylique widget into the store's active theme. No manual steps are required for most themes.

### What happens automatically

1. The app finds the store's **main (published) theme** via the Shopify Admin API
2. It uploads the `stylique-virtual-try-on.liquid` section file into the theme's `sections/` folder
3. It modifies the product template to include the section:
   - **Online Store 2.0 themes** (most modern themes): Adds a section reference to `templates/product.json`
   - **Legacy themes**: Injects `{% section 'stylique-virtual-try-on' %}` into `templates/product.liquid`

### Verifying injection

1. Open a product page on the store — the Stylique widget should appear
2. In Supabase, check `stores.shopify_theme_injection_done` is `true`
3. In Supabase, check `stores.shopify_theme_injection_status` for details

### Idempotency

- The injection only runs once per store (tracked by the `shopify_theme_injection_done` flag)
- If the section file or template reference already exists, it is not duplicated
- Re-running OAuth for the same store skips injection if already done

### If injection fails

Injection failures are **non-fatal** — the OAuth flow still completes, products still sync, and webhooks are still registered. The merchant can install manually (see Part 3 below). The error details are stored in `stores.shopify_theme_injection_status`.

Common failure reasons:
- The Shopify app does not have `read_themes` / `write_themes` scopes (add `read_themes,write_themes` to `SHOPIFY_SCOPES`)
- The theme has an unusual structure (no `product.json` or `product.liquid`)
- The Liquid source file is not found on the backend server

---

## Part 3: Manual Installation (Fallback)

If automatic injection fails or you need to customize placement, follow these manual steps.

### Step 1: Open Theme Code Editor

1. Go to **Shopify Admin → Online Store → Themes**
2. Click **Actions → Edit code** on your active theme

### Step 2: Create the Section File

> Skip this step if the auto-injector already uploaded the section (check for `sections/stylique-virtual-try-on.liquid` in the theme code editor).

1. In the sidebar, find **Sections** and click **Add a new section**
2. Name it `stylique-virtual-try-on` (Shopify adds `.liquid` automatically)
3. Delete any boilerplate content
4. Copy the entire contents of `shopify/Shopify_new_tryon_upload_first.liquid` and paste it in
5. Click **Save**

### Step 3: Add Section to Product Template

**Option A: Theme Customizer (Recommended)**

1. Go to **Online Store → Themes → Customize**
2. Navigate to a **product page** using the page selector dropdown
3. Click **Add section** in the template
4. Find **Stylique Virtual Try-On** and add it
5. Position it where you want (typically below the product form)
6. Save

**Option B: Edit product.json directly**

1. In the code editor, open `templates/product.json`
2. Add a section entry:

```json
{
  "sections": {
    "stylique-virtual-try-on": {
      "type": "stylique-virtual-try-on",
      "settings": {}
    }
  },
  "order": ["...", "stylique-virtual-try-on"]
}
```

### Step 4: Configure Section Settings (Optional)

In the Theme Customizer, click on the Stylique section to configure:

| Setting | What to Enter |
|---------|---------------|
| **Stylique API base URL** | Your backend's public HTTPS URL, no trailing slash (e.g. `https://api.stylique.com`). Leave blank for production default. |
| **Stylique store ID** | Leave blank to auto-detect from `shop.permanent_domain`, or enter the exact `store_id` from Supabase |
| **Section Title** | Custom title (default: "Virtual Try-On Experience") |
| **Logo** | Upload your brand logo or provide a URL |
| **Colors** | Customize primary/secondary colors to match your theme |

### Step 5: Save and Test

1. Click **Save** in the customizer
2. Open a product page on your store
3. You should see the Stylique try-on widget
4. The widget will:
   - Check API connectivity
   - Show the login form if the shopper is not authenticated
   - Show the try-on interface after login

---

## Troubleshooting

### Widget shows "Service Temporarily Unavailable"

1. **Check the backend is running** — visit `https://your-backend.com/api/ping` in your browser
2. **Check CORS** — the backend must allow origins matching `*.myshopify.com` and `*.shopifypreview.com`
3. **Check the API URL** — ensure no trailing slash, and it matches `PUBLIC_API_URL`
4. **Check browser console** — look for `[Stylique probe]` log entries

### Products not showing as "available" in the widget

1. Verify products are in the `inventory` table in Supabase
2. Confirm `shopify_product_id` is populated for each product
3. Check that the product's `product_link` matches the current page URL
4. Re-save a product in Shopify admin to trigger a webhook sync

### CORS errors in console

The backend CORS configuration must allow:
- `*.myshopify.com`
- `*.shopifypreview.com`
- The `ngrok-skip-browser-warning` header (for development with ngrok)

### OAuth redirect fails

1. Verify `SHOPIFY_REDIRECT_URI` matches exactly what's in the Shopify app settings
2. Ensure `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET` are correct
3. Check backend logs for specific error messages

---

## Development with ngrok

For local development:

1. Run `ngrok http 5000`
2. Update `.env` with:
   - `PUBLIC_API_URL=https://your-ngrok-url.ngrok-free.dev`
   - `SHOPIFY_REDIRECT_URI=https://your-ngrok-url.ngrok-free.dev/api/shopify/callback`
3. Update the Shopify app's redirect URL to match
4. Set `backend_url` in the Liquid section settings to the ngrok URL
5. The widget automatically adds `ngrok-skip-browser-warning: true` to requests

---

## Section Settings Reference

| Setting | ID | Type | Default |
|---------|----|------|---------|
| API Base URL | `backend_url` | text | (blank → production default) |
| Store ID | `store_id` | text | (blank → shop domain) |
| Section Title | `section_title` | text | "Virtual Try-On Experience" |
| Section Description | `section_description` | textarea | AI try-on blurb |
| Logo Image | `logo_image` | image_picker | — |
| Logo URL | `logo_url` | text | CDN fallback |
| Floating Button | `show_floating_button` | checkbox | true |
| Button Position | `floating_button_position` | select | bottom-right |
| Bottom Offset | `floating_button_bottom_offset` | range (0–100) | 20px |
| Side Offset | `floating_button_side_offset` | range (0–100) | 20px |
| Primary Color | `primary_color` | color | #667eea |
| Secondary Color | `secondary_color` | color | #764ba2 |
| Text Color | `text_color` | color | #333333 |
| Border Radius | `border_radius` | range (0–20) | 8px |
