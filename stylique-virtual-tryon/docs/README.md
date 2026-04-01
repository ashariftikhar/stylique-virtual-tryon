# Stylique Phase 1 — Documentation

Complete documentation for the Stylique Virtual Try-On Phase 1 delivery.

## Contents

| Document | Description |
|----------|-------------|
| [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) | All backend API endpoints with request/response examples |
| [SHOPIFY_INSTALLATION.md](./SHOPIFY_INSTALLATION.md) | Shopify theme section installation and OAuth setup |
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
