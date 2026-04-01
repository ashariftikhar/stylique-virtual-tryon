# WordPress / WooCommerce Plugin Installation Guide

This guide covers installing and configuring the Stylique Virtual Try-On plugin on a WordPress + WooCommerce site.

---

## Prerequisites

- WordPress 5.0+
- WooCommerce plugin installed and activated (required — the plugin will not load without it)
- A running Stylique backend with a public HTTPS URL
- Your Stylique Store ID (from the Stylique dashboard or Supabase)

---

## Step 1: Install the Plugin

### Option A: Upload via WordPress Admin

1. Download the plugin folder `wordpress-stylique-virtual-tryon` from the project repository
2. Compress the inner `wordpress-stylique-virtual-tryon` folder into a `.zip` file
3. In WordPress Admin, go to **Plugins → Add New → Upload Plugin**
4. Choose the `.zip` file and click **Install Now**
5. Click **Activate Plugin**

### Option B: Manual Upload via FTP/File Manager

1. Upload the `wordpress-stylique-virtual-tryon` folder to `wp-content/plugins/`
2. In WordPress Admin, go to **Plugins → Installed Plugins**
3. Find **Stylique Virtual Try-On** and click **Activate**

---

## Step 2: Configure Plugin Settings

1. Go to **Settings → Stylique Try-On** in the WordPress admin menu
2. Fill in the following settings:

| Setting | Description | Example |
|---------|-------------|---------|
| **Store ID** | Your unique store identifier from the Stylique dashboard. Must match the `store_id` in Supabase. | `my-fashion-store` |
| **Backend API URL** | The public HTTPS URL of your Stylique backend. No trailing slash. | `https://api.stylique.com` |
| **Primary Color** | Brand color for the widget UI | `#642FD7` |
| **Secondary Color** | Accent color for the widget UI | `#F4536F` |

3. Click **Save Changes**

---

## Step 3: Verify Product Sync

Once the plugin is active and configured, products sync automatically when you save/update them in WooCommerce.

### Trigger a Full Sync

To sync all existing products, re-save each product (or bulk update):

1. Go to **Products → All Products**
2. Select all products → **Bulk Actions → Edit → Apply**
3. Click **Update** without changing anything

Each published product will be POSTed to `{backend_url}/api/sync/woocommerce`.

### Verify Sync Worked

1. **WordPress admin notices** — After saving a product, a success/failure notice appears briefly at the top of the editor
2. **Backend logs** — Look for `[WooCommerce] Product synced: Product Name`
3. **Supabase** — Check the `inventory` table for rows with matching `woocommerce_product_id`

### What Gets Synced

| WooCommerce Field | Inventory Column |
|-------------------|-----------------|
| Product title | `product_name` |
| Description | `description` |
| Price | `price` |
| Permalink | `product_link` |
| Featured image + gallery | `image_url` + image processing |
| Variations / attributes | `sizes` array |
| Post ID | `woocommerce_product_id` |

---

## Step 4: Test the Widget

1. Navigate to any single product page on your store's frontend
2. The Stylique widget appears **below the Add to Cart button**
3. Test the following:
   - The login form (email → OTP verification)
   - Product availability check (should show "available" for synced products)
   - Photo upload and 2D try-on
   - Size recommendation

---

## How It Works

### Widget Placement

The widget is automatically injected on **single WooCommerce product pages** using the `woocommerce_after_add_to_cart_form` hook (priority 30). No shortcode or block is needed.

### Frontend API Calls

The widget JavaScript communicates with the Stylique backend via:
- `/plugin/auth` — User authentication (OTP)
- `/plugin/check-product` — Product availability and tier
- `/plugin/store-status` — Store subscription and quota
- `/plugin/embed-tryon-2d` — 2D virtual try-on
- `/plugin/size-recommendation` — AI size recommendation
- `/plugin/track-conversion` — Conversion tracking

### Product Sync Triggers

The plugin hooks into multiple WooCommerce events to ensure products sync reliably:
- `woocommerce_new_product` — New product created
- `woocommerce_update_product` — Product updated
- `save_post_product` — Post save for product type
- `wp_insert_post` — Fallback post insertion

Sync is deferred to the `shutdown` hook (priority 99) to ensure all WooCommerce metadata (including gallery images) is saved before the API call.

### Deduplication

The plugin tracks which products have been synced in the current request to avoid duplicate API calls. Each product is synced at most once per page load.

---

## Troubleshooting

### Widget doesn't appear

1. **WooCommerce active?** — The plugin requires WooCommerce. Check Plugins page.
2. **Single product page?** — The widget only renders on `is_product()` pages.
3. **Theme compatibility** — Some themes remove the `woocommerce_after_add_to_cart_form` hook. Check your theme's `single-product.php` template.
4. **JavaScript errors** — Open browser console (F12) and look for errors.

### "Service Temporarily Unavailable"

1. **Check Backend URL** — Ensure it's correct in Settings → Stylique Try-On, with no trailing slash
2. **Check CORS** — The backend must allow your WordPress domain
3. **Check HTTPS** — Both the backend and your WordPress site should use HTTPS in production

### Products not syncing

1. **Store ID set?** — The plugin skips sync if Store ID is empty
2. **Product published?** — Only published products are synced (drafts, revisions, and autosaves are skipped)
3. **Backend reachable?** — The plugin makes a server-side HTTP POST with a 15-second timeout. Check that your server can reach the backend URL.
4. **Check the admin notice** — After saving a product, look for a success/error notice at the top of the page

### Sync timeout

The plugin has a 15-second timeout for the sync HTTP call. If your backend is slow or behind a cold-start serverless function, the first sync may time out. Retry by re-saving the product.

---

## Plugin Files Reference

```
wordpress-stylique-virtual-tryon/
├── stylique-virtual-tryon.php          # Main plugin file (hooks, settings, sync)
├── templates/
│   └── tryon-container.php             # HTML template for the widget UI
├── assets/
│   ├── css/
│   │   └── tryon-style.css             # Widget styles (glass UI, modals, responsive)
│   └── js/
│       ├── tryon-script.js             # Main widget JavaScript (auth, try-on, analytics)
│       └── tryon-backend-integration.js # Optional backend data bridge
```

## Settings Reference

| Option Key | Description | Default |
|------------|-------------|---------|
| `stylique_store_id` | Store identifier | (empty) |
| `stylique_backend_url` | Backend API URL | `http://localhost:5000` |
| `stylique_primary_color` | Primary brand color | `#642FD7` |
| `stylique_secondary_color` | Secondary brand color | `#F4536F` |
