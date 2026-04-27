# Stylique Virtual Try-On Platform

Stylique Phase 1 is a B2B ecommerce integration package for Shopify and WooCommerce stores. It provides automated product sync, image readiness scoring, tier-based storefront widget routing, size recommendation UI, same-store product-card recommendations, and a merchant Storepanel.

## Final Project State

This repository contains the full Phase 1 handoff code:

- Backend API: Node.js, Express, TypeScript, Supabase, Shopify OAuth/webhooks, WooCommerce sync, plugin APIs, image processing, size recommendation, Complete the Look, analytics, and conversion endpoints.
- Storepanel: Next.js merchant dashboard for login/register, inventory management, image quality scores, tier overrides, analytics, conversions, settings, and product upload.
- Shopify storefront widget: backend-rendered Liquid widget served by Render from `stylique-virtual-tryon/shopify`.
- Shopify Theme App Extension: optional helper/fallback app extension in `stylique-virtual-tryon/shopify-app`; deploy separately with Shopify CLI if needed.
- WooCommerce plugin: WordPress plugin source in `stylique-virtual-tryon/wordpress-stylique-virtual-tryon/wordpress-stylique-virtual-tryon`.
- Database: Supabase schema and migrations in `stylique-virtual-tryon/database`.
- Documentation: platform setup, API, database, deployment, Shopify, WordPress, Storepanel, and testing guides in `stylique-virtual-tryon/docs` and `PROJECT_CONTEXT`.

## Important Integration Boundaries

Phase 1 provides the integration layer and widget UI. It does not build a new AI garment-generation system from scratch.

- 2D try-on: the current backend endpoint returns the selected/primary product image as the result placeholder. The endpoint payload and frontend result handling are ready for the client's developers to connect their existing AI garment-on-body system.
- 3D try-on: the button, eligibility gating, backend start endpoint, polling flow, and frontend video container are integration-ready. The client's 3D service should accept the user image and product image, return a video URL, and the backend should return that URL to the existing frontend polling flow.
- Complete the Look: implemented as same-store synced product-card recommendations. It is not AI outfit generation.
- Skin tone detection: currently a compatible stub response and can be replaced with a real provider later if the client requires it.

## Repository Structure

```text
stylique-virtual-tryon/
  backend/                         Express API and integration layer
  database/                        FINAL_SCHEMA.sql, schema.sql, and migrations
  docs/                            API, deployment, platform, and testing docs
  shopify/                         Authoritative Render-served Shopify widget assets
  shopify-app/                     Optional Shopify Theme App Extension
  storepanel/                      Next.js merchant dashboard
  wordpress-stylique-virtual-tryon/ WooCommerce plugin source and package review zip
PROJECT_CONTEXT/                   Agreement, status, handoff, and planning docs
_archive/                          Approved review/archive files, not active source
render.yaml                        Render deployment blueprint
```

## Backend Deployment on Render

Deploy the backend service from:

```bash
stylique-virtual-tryon/backend
```

Build/start commands:

```bash
npm install
npm run build
npm start
```

Required production environment variables:

```text
PORT=5000
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
JWT_SECRET=strong-random-secret
FRONTEND_URL=https://your-storepanel-domain
PUBLIC_API_URL=https://your-backend-domain
SHOPIFY_API_KEY=...
SHOPIFY_API_SECRET=...
SHOPIFY_REDIRECT_URI=https://your-backend-domain/api/shopify/callback
SHOPIFY_SCOPES=read_products,write_products,read_themes,write_themes
SYNC_API_SECRET=...
STRICT_STOREFRONT_AUTH=false
```

Recommended production settings:

```text
ALLOW_DEV_OTP_LOGIN=false
ALLOW_LOG_ONLY_OTP_LOGIN=false
```

Optional services:

```text
SENDGRID_API_KEY=...
OTP_FROM_EMAIL=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=eu-west-1
```

`STRICT_STOREFRONT_AUTH=true` can be enabled after confirming all live widgets pass signed widget token context correctly.

## Storepanel Deployment

Deploy Storepanel from:

```bash
stylique-virtual-tryon/storepanel
```

Build/start commands:

```bash
npm install
npm run build
npm start
```

Required environment variables:

```text
NEXT_PUBLIC_BACKEND_URL=https://your-backend-domain
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Shopify Deployment Notes

There are two Shopify surfaces:

1. Backend-rendered widget, used by the Render backend route `/api/shopify/widget`:
   - `stylique-virtual-tryon/shopify/Shopify_new_tryon_upload_first.liquid`
   - `stylique-virtual-tryon/shopify/assets/stylique.css`

2. Shopify Theme App Extension helper/fallback, deployed separately through Shopify CLI:
   - `stylique-virtual-tryon/shopify-app/extensions/stylique-virtual-tryon`

Render deployment updates the backend-rendered widget. It does not deploy the Theme App Extension to Shopify.

## WooCommerce Deployment Notes

Plugin source:

```text
stylique-virtual-tryon/wordpress-stylique-virtual-tryon/wordpress-stylique-virtual-tryon
```

Install by copying that folder into `wp-content/plugins/`, activating **Stylique Virtual Try-On**, and configuring:

- Store ID
- Backend API URL
- Sync secret
- Optional brand colors/logo

The existing zip remains for review. Regenerate the zip after final sign-off if it will be used for delivery.

## Database

Preferred final schema reference:

```text
stylique-virtual-tryon/database/FINAL_SCHEMA.sql
```

Incremental migrations remain in:

```text
stylique-virtual-tryon/database/migrations
```

`database/schema.sql` is kept for review and should not be deleted until confirmed against `FINAL_SCHEMA.sql`.

## Verification Commands

Backend:

```bash
cd stylique-virtual-tryon/backend
npm run build
npm test
```

Storepanel:

```bash
cd stylique-virtual-tryon/storepanel
npm run build
```

Widget JavaScript:

```bash
node --check stylique-virtual-tryon/shopify-app/extensions/stylique-virtual-tryon/assets/stylique-widget.js
node --check stylique-virtual-tryon/wordpress-stylique-virtual-tryon/wordpress-stylique-virtual-tryon/assets/js/carousel.js
```

Manual smoke tests before final client sign-off:

- Shopify OAuth install and product sync.
- WooCommerce plugin activation and product sync.
- Shopify widget open/close, login, size recommendation, 2D result, Complete the Look, add-to-cart/conversion tracking.
- WooCommerce widget open/close, login, tier routing, size recommendation, 2D result, Complete the Look, add-to-cart/conversion tracking.
- Storepanel login, inventory, quality scores, tier override, analytics, conversions, settings.

## Cleanup Notes

Approved temporary/debug files were deleted. Review-only historical files were moved to `_archive/` and are not active source. Do not delete `_archive/` until the client confirms it is no longer needed.

## License

GPL-2.0+
