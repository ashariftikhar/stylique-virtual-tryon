# Stylique Virtual Try-On Platform

AI-powered virtual try-on and size recommendation software for Shopify, WooCommerce, and merchant dashboard workflows.

## Project Overview

Stylique Phase 1 currently includes:

- **Backend API**: Node.js, Express, TypeScript, Supabase, Shopify OAuth/webhooks, WooCommerce sync, inventory, analytics, image scoring, and plugin APIs.
- **Store Panel**: Next.js merchant dashboard for login, product upload, inventory management, analytics, conversions, and Shopify OAuth onboarding.
- **Shopify Integration**: Liquid theme assets plus OAuth-based store linking and product sync support.
- **WordPress Plugin**: WooCommerce product-page widget, admin settings, product sync hooks, and static frontend assets.
- **Database**: Supabase PostgreSQL schema and migrations in `stylique-virtual-tryon/database`.

## Project Structure

```text
stylique-virtual-tryon/
  backend/                         Express API
  database/                        Supabase schema and migrations
  storepanel/                      Next.js merchant dashboard
  wordpress-stylique-virtual-tryon/ WooCommerce plugin
  shopify/                         Shopify Liquid and theme assets
  docs/                            Project documentation
```

## Required Production Configuration

Set these before deploying production services:

- `JWT_SECRET`: required in production. The backend fails startup if it is missing.
- `SYNC_API_SECRET` or `STYLIQUE_SYNC_SECRET`: shared secret for platform sync endpoints.
- `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`: database access for backend routes.
- `SENDGRID_API_KEY` and `OTP_FROM_EMAIL` or `SENDGRID_FROM_EMAIL`: OTP email delivery.
- `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, and `SHOPIFY_REDIRECT_URI`: Shopify OAuth and webhook verification.
- `FRONTEND_URL` and `PUBLIC_API_URL`: public store panel and API URLs.

For WordPress product sync, configure the same shared sync secret in **Settings -> Stylique Try-On -> Sync Secret**.

## Local Development

Backend:

```bash
cd stylique-virtual-tryon/backend
npm install
npm run dev
```

Store panel:

```bash
cd stylique-virtual-tryon/storepanel
npm install
npm run dev
```

Database:

- Review and apply the SQL files in `stylique-virtual-tryon/database` to your Supabase project.

WordPress:

- Copy `stylique-virtual-tryon/wordpress-stylique-virtual-tryon/wordpress-stylique-virtual-tryon` into `wp-content/plugins/`.
- Activate **Stylique Virtual Try-On** from WordPress admin.
- Configure Store ID, Backend API URL, and Sync Secret.

Shopify:

- Use the files under `stylique-virtual-tryon/shopify` for the theme integration.
- Use the backend Shopify OAuth route to connect stores and register webhooks.

## Verification

Useful checks before handing off changes:

```bash
npm --prefix stylique-virtual-tryon/backend run build
npm --prefix stylique-virtual-tryon/storepanel run build
node --check stylique-virtual-tryon/wordpress-stylique-virtual-tryon/wordpress-stylique-virtual-tryon/assets/js/widget-modal.js
```

Use `php -l` or WP-CLI in a local WordPress environment to validate plugin activation and PHP syntax.

## Documentation

See `stylique-virtual-tryon/docs/README.md` for API, architecture, and setup notes.

## License

GPL-2.0+
