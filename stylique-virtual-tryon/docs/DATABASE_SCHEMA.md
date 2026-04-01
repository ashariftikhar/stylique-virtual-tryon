# Database Schema Documentation

**Database:** PostgreSQL (via Supabase)

---

## Tables

### `stores`

Store accounts for merchants.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `store_name` | varchar(255) | NO | — | Display name |
| `store_id` | varchar(100) | NO | — | Unique slug identifier |
| `password_hash` | varchar(255) | NO | — | bcrypt hash |
| `email` | varchar(255) | YES | — | Contact email |
| `phone` | varchar(50) | YES | — | Contact phone |
| `address` | text | YES | — | Address |
| `created_at` | timestamptz | YES | `now()` | Creation date |
| `updated_at` | timestamptz | YES | `now()` | Auto-updated |
| `subscription_name` | enum | YES | — | FREE, BASIC, PREMIUM, ENTERPRISE |
| `subscription_start_at` | timestamptz | YES | — | Subscription start |
| `subscription_end_at` | timestamptz | YES | — | Subscription end |
| `tryons_quota` | integer | NO | 0 | Total try-on allowance |
| `tryons_used` | integer | NO | 0 | Try-ons consumed |
| `shopify_access_token` | text | YES | — | Shopify Admin API token |
| `shopify_shop_domain` | text | YES | — | e.g. `store.myshopify.com` |
| `shopify_theme_injection_done` | boolean | NO | false | True after Liquid section successfully injected |
| `shopify_theme_injection_status` | text | YES | — | Last injection attempt details |

**Constraints:** `store_id` UNIQUE, `tryons_used <= tryons_quota`, both >= 0.

---

### `inventory`

Synced products from Shopify, WooCommerce, or manual upload.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `store_id` | uuid | NO | — | FK → stores(id), CASCADE |
| `product_name` | varchar(255) | NO | — | Product title |
| `description` | text | YES | — | Product description |
| `category` | varchar(100) | YES | — | Product category |
| `brand` | varchar(100) | YES | — | Brand name |
| `price` | numeric(10,2) | YES | — | Price |
| `image_url` | text | YES | — | Original product image |
| `tryon_image_url` | text | YES | — | Best image for try-on (from processing) |
| `tier` | integer | YES | 3 | Tier assignment (1, 2, or 3) |
| `sizes` | jsonb | NO | `'{}'` | Available sizes array |
| `measurements` | jsonb | NO | `'{}'` | Size measurements |
| `product_link` | text | YES | — | URL on the store |
| `shopify_product_id` | text | YES | — | Shopify product ID |
| `woocommerce_product_id` | text | YES | — | WooCommerce post ID |
| `colour` | varchar | NO | `'NULL'` | Colour |
| `fabric_type` | varchar(50) | YES | `'MEDIUM_STRETCH'` | Fabric type |
| `season` | varchar(50) | YES | `'ALL_SEASON'` | Season |
| `activity` | varchar(50) | YES | `'CASUAL'` | Activity type |
| `occasion` | varchar(50) | YES | `'WEEKEND_CASUAL'` | Occasion |
| `gender` | enum | NO | `'UNSPECIFIED'` | MALE, FEMALE, UNISEX, UNSPECIFIED |
| `3d_front_image` | text | YES | — | 3D front view |
| `3d_back_image` | text | YES | — | 3D back view |
| `created_at` | timestamptz | YES | `now()` | Creation date |
| `updated_at` | timestamptz | YES | `now()` | Auto-updated |

---

### `users`

End-user (shopper) profiles for the try-on widget.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `email` | text | YES | — | UNIQUE email |
| `name` | text | YES | — | Display name |
| `phone` | text | YES | — | Phone number |
| `gender` | text | YES | — | Gender |
| `password_hash` | text | YES | — | Password hash |
| `otp_code` | text | YES | — | Current OTP |
| `otp_expires_at` | timestamptz | YES | — | OTP expiry |
| `height` | numeric | YES | — | Height |
| `weight` | numeric | YES | — | Weight (kg) |
| `chest` | numeric | YES | — | Chest (inches) |
| `waist` | numeric | YES | — | Waist (inches) |
| `hips` | numeric | YES | — | Hips (inches) |
| `shoulder_width` | numeric | YES | — | Shoulder width |
| `arm_length` | numeric | YES | — | Arm length |
| `inseam` | numeric | YES | — | Inseam |
| `neck_circumference` | numeric | YES | — | Neck |
| `thigh_circumference` | numeric | YES | — | Thigh |
| `body_type` | text | YES | — | slim, moderate, fat |
| `skin_tone` | text | YES | — | Hex color code |
| `created_at` | timestamptz | YES | `now()` | Creation date |
| `updated_at` | timestamptz | YES | `now()` | Auto-updated |

---

### `size_templates`

Size chart templates per store.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `store_id` | uuid | NO | — | FK → stores(id), CASCADE |
| `template_name` | varchar(255) | NO | — | Template name |
| `category` | varchar(100) | YES | — | Category |
| `size_name` | varchar(50) | NO | — | Size label (S, M, L, etc.) |
| `measurements` | jsonb | NO | `'{}'` | Measurement specs |
| `created_at` | timestamptz | YES | `now()` | |
| `updated_at` | timestamptz | YES | `now()` | |

---

### `tryon_analytics`

Try-on event tracking.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `store_id` | uuid | NO | — | FK → stores(id), CASCADE |
| `product_id` | uuid | YES | — | FK → inventory(id), SET NULL |
| `user_id` | uuid | YES | — | FK → users(id), SET NULL |
| `tryon_type` | varchar(50) | NO | — | "2d", "3d", "virtual" |
| `created_at` | timestamptz | YES | `now()` | Event time |
| `redirect_status` | boolean | NO | false | Did user proceed to purchase? |

---

### `conversions`

Add-to-cart and purchase tracking.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | bigint | NO | IDENTITY | Primary key |
| `created_at` | timestamptz | NO | `now()` | Event time |
| `user_id` | uuid | NO | — | User who converted |
| `store_id` | text | YES | — | Store identifier |
| `product_id` | text | YES | — | Product identifier |
| `add_to_cart` | boolean | YES | true | Was item added to cart? |
| `status` | text | YES | `'Logged In'` | Status label |

---

## Migration Order

Run in Supabase SQL Editor, in this order:

1. `database/schema.sql` — Base tables and types
2. `database/migrations/001_add_users_columns.sql` — User profile fields, inventory tier/tryon columns
3. `database/migrations/002_shopify_oauth.sql` — Shopify token storage on stores
4. `database/migrations/003_inventory_woocommerce_product_id.sql` — WooCommerce product ID
5. `database/migrations/004_shopify_theme_injection.sql` — Theme injection tracking on stores

Each migration uses `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` and is safe to re-run.
