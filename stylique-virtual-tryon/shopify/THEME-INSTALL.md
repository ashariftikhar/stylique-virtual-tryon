# Install Stylique try-on section on a Shopify theme

## 1. Add the section file

1. In Shopify admin go to **Online Store → Themes → … → Edit code**.
2. Under **Sections**, click **Add a new section**.
3. Name it `stylique-virtual-try-on` (filename becomes `stylique-virtual-try-on.liquid`).
4. Delete the default content, then paste the full contents of  
   `shopify/Shopify_new_tryon_upload_first.liquid` from this repo and **Save**.

## 2. Show it on product pages

1. Under **Templates**, open `product.json` (Online Store 2.0). If you only have `product.liquid`, use the theme editor **Customize** on a product page and add the section there, or migrate to JSON templates per Shopify docs.
2. In the product template, click **Add section** and choose **Stylique Virtual Try-On**.
3. Place it where you want (often below product media or description). **Save**.

## 3. Section settings (required for your stack)

| Setting | Value |
|--------|--------|
| **Stylique API base URL** | Your public backend URL with **no trailing slash**, e.g. `https://xxxx.ngrok-free.dev` (same idea as `PUBLIC_API_URL` in `backend/.env`). |
| **Stylique store ID** | Leave **empty** to use `shop.permanent_domain` automatically (`your-store.myshopify.com`), or set explicitly to match **`stores.store_id`** in Supabase (after Shopify OAuth this is usually the `.myshopify.com` domain). |

After changing the API URL, **hard-refresh** the storefront (or preview) so the browser loads new script.

## 4. Checklist if the widget does not appear

- **CORS**: The backend allows `*.myshopify.com` (and ngrok hosts in development). Restart the API after pulling latest `index.ts`.
- **Routes**: Storefront script calls `/api/plugin/...`. The backend mounts the plugin router at both `/plugin` and `/api/plugin`.
- **Product in inventory**: On a product page the section sends `shopifyProductId`. The API matches **`inventory.shopify_product_id`** for your store UUID. Run OAuth product pull or webhooks so rows exist.
- **Theme password / preview**: Use the theme editor preview or a logged-in customer session if the section is hidden by other CSS or app embed rules.

## 5. Optional: Shopify CLI

If you use a local theme folder:

```bash
shopify theme push --path ./path-to-theme
```

Copy `stylique-virtual-try-on.liquid` into that theme’s `sections/` directory first.
