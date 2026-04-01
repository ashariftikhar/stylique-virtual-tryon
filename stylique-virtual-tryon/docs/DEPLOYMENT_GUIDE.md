# Deployment Guide

This guide covers deploying all components of Stylique Phase 1 to production.

---

## Architecture

```
┌────────────────┐     ┌───────────────┐     ┌──────────────┐
│  Backend API   │     │  Store Panel   │     │  Supabase    │
│  (Express/TS)  │◄───►│  (Next.js)     │     │  (Postgres)  │
│  Port 5000     │     │  Port 3000     │     │              │
└───────┬────────┘     └───────────────┘     └──────────────┘
        │
   ┌────┼────┐
   │    │    │
Shopify WooCommerce  AWS Rekognition
```

---

## 1. Database Setup (Supabase)

### Create Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your **Project URL** and **Service Role Key** (found in Settings → API)

### Run Migrations

Execute the following SQL files **in order** in the Supabase SQL Editor:

| Step | File | Description |
|------|------|-------------|
| 1 | `database/schema.sql` | Creates all tables, types, triggers, indexes |
| 2 | `database/migrations/001_add_users_columns.sql` | Adds user profile, OTP, measurements columns; adds `tier`, `tryon_image_url`, `shopify_product_id` to inventory |
| 3 | `database/migrations/002_shopify_oauth.sql` | Adds `shopify_access_token` and `shopify_shop_domain` to stores |
| 4 | `database/migrations/003_inventory_woocommerce_product_id.sql` | Adds `woocommerce_product_id` to inventory |
| 5 | `database/migrations/004_shopify_theme_injection.sql` | Adds theme injection tracking to stores |

### Verify Tables

After running migrations, you should have these tables:
- `stores` — Store accounts and subscriptions
- `inventory` — Products with images, tiers, sync data
- `users` — End-user (shopper) profiles
- `size_templates` — Size chart templates
- `tryon_analytics` — Try-on event tracking
- `conversions` — Add-to-cart / purchase tracking

---

## 2. Backend Deployment

### Environment Variables

Create a `.env` file (or set environment variables in your hosting platform):

```env
# Server
PORT=5000

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# Authentication
JWT_SECRET=generate-a-random-64-char-string

# Frontend URL (for OAuth redirects)
FRONTEND_URL=https://your-storepanel.vercel.app

# Public API URL (used for Shopify webhook registration)
PUBLIC_API_URL=https://your-backend.com

# AWS Rekognition (optional — mock scoring used when absent)
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_REGION=us-east-1

# Shopify OAuth
SHOPIFY_API_KEY=your-shopify-app-client-id
SHOPIFY_API_SECRET=your-shopify-app-client-secret
SHOPIFY_SCOPES=read_products,write_products,read_themes,write_themes
SHOPIFY_REDIRECT_URI=https://your-backend.com/api/shopify/callback
```

### Option A: Deploy to a VPS / VM

```bash
# Clone and install
git clone <repo-url>
cd stylique-virtual-tryon/backend
npm install

# Build (optional for ts-node)
npx tsc

# Start with process manager
npm install -g pm2
pm2 start src/index.ts --interpreter ts-node --name stylique-api
pm2 save
```

### Option B: Deploy to Railway / Render / Fly.io

1. Connect your Git repository
2. Set the **root directory** to `stylique-virtual-tryon/backend`
3. Set **build command** to `npm install`
4. Set **start command** to `npx ts-node src/index.ts`
5. Add all environment variables from above
6. Deploy

### Verify Deployment

```bash
curl https://your-backend.com/api/health
# Should return: {"status":"OK","message":"Stylique API is running",...}
```

---

## 3. Store Panel Deployment (Next.js)

### Environment Variables

```env
NEXT_PUBLIC_BACKEND_URL=https://your-backend.com
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Deploy to Vercel (Recommended)

1. Import the Git repository in [Vercel](https://vercel.com)
2. Set the **root directory** to `stylique-virtual-tryon/storepanel`
3. Framework: **Next.js** (auto-detected)
4. Add environment variables:
   - `NEXT_PUBLIC_BACKEND_URL` = your backend URL
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key
5. Click **Deploy**

### Deploy Manually

```bash
cd stylique-virtual-tryon/storepanel
npm install
npm run build
npm start
```

### Verify Deployment

Navigate to `https://your-storepanel.vercel.app/login` — the login page should appear.

---

## 4. Shopify App Configuration

### In the Shopify Partner Dashboard

1. Create a custom app (or use an existing one)
2. Set:
   - **App URL:** `https://your-backend.com/api/shopify/oauth`
   - **Allowed redirection URLs:** `https://your-backend.com/api/shopify/callback`
   - **Scopes:** `read_products`, `write_products`, `read_themes`, `write_themes`
3. Copy the **Client ID** → `SHOPIFY_API_KEY`
4. Copy the **Client Secret** → `SHOPIFY_API_SECRET`

### Install on a Store

```
https://your-backend.com/api/shopify/oauth?shop=store-name.myshopify.com
```

---

## 5. WordPress Plugin Deployment

1. Copy the `wordpress-stylique-virtual-tryon` folder to the store's `wp-content/plugins/`
2. Activate in WordPress Admin → Plugins
3. Configure in Settings → Stylique Try-On:
   - **Store ID:** matches `stores.store_id` in Supabase
   - **Backend URL:** `https://your-backend.com`

---

## 6. CORS Configuration

The backend automatically allows these origins:
- `http://localhost:3000` and `http://localhost:3001` (development)
- `*.myshopify.com` (Shopify storefronts)
- `*.shopifypreview.com` (Shopify theme preview)
- `*.ngrok-free.dev` (ngrok tunnels for development)
- The `FRONTEND_URL` environment variable

For additional domains, update the CORS logic in `backend/src/index.ts`.

---

## 7. AWS Rekognition Setup (Optional)

If AWS credentials are not provided, the image processing pipeline uses mock scoring (rule-based heuristics). For production quality:

1. Create an IAM user with `AmazonRekognitionReadOnlyAccess` policy
2. Generate access keys
3. Set `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_REGION` in the backend environment
4. Recommended region: `us-east-1` (best Rekognition support)

---

## 8. SSL / HTTPS

All production deployments **must** use HTTPS:
- Backend API — required for Shopify OAuth and webhooks
- Store Panel — required for secure cookies
- Shopify sends webhooks only to HTTPS endpoints

---

## 9. Production Checklist

- [ ] Supabase project created and all migrations run
- [ ] Backend deployed with all environment variables
- [ ] `GET /api/health` returns OK
- [ ] Store Panel deployed with `NEXT_PUBLIC_BACKEND_URL` set
- [ ] Login page loads at `/login`
- [ ] Shopify app configured with correct URLs
- [ ] OAuth flow completes successfully
- [ ] Products sync from Shopify after OAuth
- [ ] Shopify Liquid section installed and configured
- [ ] Widget loads on Shopify product pages
- [ ] WordPress plugin installed and configured (if applicable)
- [ ] Products sync from WooCommerce on save
- [ ] Widget loads on WooCommerce product pages
- [ ] AWS Rekognition credentials set (or mock scoring accepted)
- [ ] HTTPS enabled on all endpoints
