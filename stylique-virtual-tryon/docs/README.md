# Stylique Phase 1 — Documentation

Complete documentation for the Stylique Virtual Try-On Phase 1 delivery.

## Contents

| Document | Description |
|----------|-------------|
| [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) | All backend API endpoints with request/response examples |
| [SHOPIFY_INSTALLATION.md](./SHOPIFY_INSTALLATION.md) | Shopify theme section installation and OAuth setup |
| [SHOPIFY_THEME_APP_EXTENSION_SETUP.md](./SHOPIFY_THEME_APP_EXTENSION_SETUP.md) | Exact Shopify Theme App Extension setup, deploy, merchant install, and QA guide |
| [WORDPRESS_INSTALLATION.md](./WORDPRESS_INSTALLATION.md) | WooCommerce plugin installation and configuration |
| [STORE_PANEL_GUIDE.md](./STORE_PANEL_GUIDE.md) | Store panel dashboard user guide |
| [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) | Environment variables, hosting, database migrations |
| [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md) | Final verification checklist for delivery |
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | Database tables, columns, and migration order |

## Architecture Overview

```
┌─────────────┐   ┌──────────────┐   ┌───────────────┐
│  Shopify     │   │  WooCommerce │   │  Store Panel  │
│  Theme       │   │  Plugin      │   │  (Next.js)    │
│  (Liquid)    │   │  (PHP)       │   │               │
└──────┬───────┘   └──────┬───────┘   └──────┬────────┘
       │                  │                  │
       │     HTTPS API    │                  │
       └──────────────────┼──────────────────┘
                          │
                ┌─────────▼──────────┐
                │  Backend (Express) │
                │  Node.js + TS      │
                └─────────┬──────────┘
                          │
              ┌───────────┼───────────┐
              │           │           │
        ┌─────▼─────┐ ┌──▼────┐ ┌───▼────────┐
        │ Supabase  │ │ AWS   │ │ Shopify    │
        │ (Postgres)│ │ Rekog │ │ Admin API  │
        └───────────┘ └───────┘ └────────────┘
```

## Quick Start

1. Run database migrations (see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md))
2. Deploy backend with environment variables
3. Deploy store panel (Next.js)
4. Install Shopify section or WooCommerce plugin
5. Verify with [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md)

## Shopify Theme App Extension

The preferred Shopify storefront install now lives in `shopify-app/extensions/stylique-virtual-tryon`. Deploy it with Shopify CLI, then use the store panel deep links to add the Stylique app block or enable the optional app embed. The older Liquid section/manual injector remains available as fallback.

For exact developer, deployment, merchant setup, and troubleshooting steps, follow [SHOPIFY_THEME_APP_EXTENSION_SETUP.md](./SHOPIFY_THEME_APP_EXTENSION_SETUP.md).

## Try-On Result Image Guidance

For the most premium widget result layout, generate try-on output images in one consistent portrait ratio across the store. Preferred ratios are `4:5` or `3:4`, sized so the full body fits comfortably inside the result container.

The widget displays generated try-on results with `object-fit: contain` so the shopper's body is not cropped. Product thumbnails and Complete the Look recommendation cards can use `object-fit: cover` because those small cards look cleaner when the garment fills the frame.
