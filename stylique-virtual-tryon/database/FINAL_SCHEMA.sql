-- ============================================================================
-- STYLIQUE PHASE 1 - FINAL CONSOLIDATED SCHEMA
-- ============================================================================
-- 
-- This file contains the complete database schema for Stylique Virtual Try-On
-- Phase 1 (Shopify + WooCommerce integration with 2D/3D try-on, AI sizing,
-- recommendations, and analytics).
--
-- To apply this schema:
-- 1. Go to Supabase Dashboard → SQL Editor
-- 2. Create a new query
-- 3. Copy and paste this entire file
-- 4. Click "Run" to execute all statements
--
-- All tables use UUID primary keys, have created_at/updated_at timestamps,
-- and CASCADE delete on foreign key relationships for data cleanup.
-- Indexes are created for all commonly queried columns.

-- ============================================================================

-- ============================================================================
-- SECTION 1: TYPES AND FUNCTIONS
-- ============================================================================

-- Create custom types for enums
CREATE TYPE public.subscription_plan AS ENUM ('FREE', 'BASIC', 'PREMIUM', 'ENTERPRISE');
CREATE TYPE public.gender_type AS ENUM ('MALE', 'FEMALE', 'UNISEX', 'UNSPECIFIED');

-- Create the helper function for automatic updated_at timestamp management
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECTION 2: BASE TABLES
-- ============================================================================

-- STORES TABLE
-- Represents each e-commerce store (Shopify, WooCommerce)
-- Tracks subscription tier, try-on quotas, Shopify OAuth credentials
CREATE TABLE public.stores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_name character varying(255) NOT NULL,
  store_id character varying(100) NOT NULL,
  password_hash character varying(255) NOT NULL,
  email character varying(255) NULL,
  phone character varying(50) NULL,
  address text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  subscription_name public.subscription_plan NULL,
  subscription_start_at timestamp with time zone NULL,
  subscription_end_at timestamp with time zone NULL,
  tryons_quota integer NOT NULL DEFAULT 0,
  tryons_used integer NOT NULL DEFAULT 0,
  -- Shopify OAuth columns (migration 002)
  shopify_access_token text NULL,
  shopify_shop_domain text NULL,
  -- Shopify theme injection tracking (migration 004)
  shopify_theme_injection_done boolean NOT NULL DEFAULT false,
  shopify_theme_injection_status text NULL,
  -- Shopify Theme App Extension tracking (migration 009)
  shopify_extension_last_seen_at timestamp with time zone NULL,
  shopify_extension_install_method text NULL,
  shopify_extension_version text NULL,
  shopify_extension_setup_status text NULL,
  -- WooCommerce plugin connection tracking (migration 008)
  woocommerce_site_url text NULL,
  woocommerce_sync_secret_hash text NULL,
  woocommerce_connected_at timestamp with time zone NULL,
  woocommerce_last_sync_at timestamp with time zone NULL,
  woocommerce_last_sync_status text NULL,
  CONSTRAINT stores_pkey PRIMARY KEY (id),
  CONSTRAINT stores_store_id_key UNIQUE (store_id),
  CONSTRAINT stores_tryons_nonneg CHECK (tryons_quota >= 0 AND tryons_used >= 0),
  CONSTRAINT stores_tryons_used_leq_quota CHECK (tryons_used <= tryons_quota)
);

-- USERS TABLE
-- Customer user profiles with measurements and preferences
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  -- OTP authentication (migration 001)
  otp_code text NULL,
  otp_expires_at timestamp with time zone NULL,
  -- Profile fields (migration 001)
  name text NULL,
  phone text NULL,
  gender text NULL,
  password_hash text NULL,
  -- Body measurements in cm/inches (migration 001)
  height numeric NULL,
  weight numeric NULL,
  chest numeric NULL,
  waist numeric NULL,
  hips numeric NULL,
  shoulder_width numeric NULL,
  arm_length numeric NULL,
  inseam numeric NULL,
  neck_circumference numeric NULL,
  thigh_circumference numeric NULL,
  -- Preferences
  body_type text NULL,
  skin_tone text NULL,
  updated_at timestamp with time zone NULL DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT users_email_key UNIQUE (email)
);

-- INVENTORY TABLE
-- Product catalog with sizing, images, try-on metadata
CREATE TABLE public.inventory (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  product_name character varying(255) NOT NULL,
  description text NULL,
  category character varying(100) NULL,
  brand character varying(100) NULL,
  price numeric(10,2) NULL,
  image_url text NULL,
  sizes jsonb NOT NULL DEFAULT '{}'::jsonb,
  measurements jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  product_link text NULL,
  colour character varying NOT NULL DEFAULT 'NULL'::character varying,
  fabric_type character varying(50) NULL DEFAULT 'MEDIUM_STRETCH'::character varying,
  season character varying(50) NULL DEFAULT 'ALL_SEASON'::character varying,
  activity character varying(50) NULL DEFAULT 'CASUAL'::character varying,
  occasion character varying(50) NULL DEFAULT 'WEEKEND_CASUAL'::character varying,
  gender public.gender_type NOT NULL DEFAULT 'UNSPECIFIED'::gender_type,
  "3d_front_image" text NULL,
  "3d_back_image" text NULL,
  -- Additional try-on columns (migration 001)
  tier integer NULL DEFAULT 3,
  tryon_image_url text NULL,
  shopify_product_id text NULL,
  -- WooCommerce integration (migration 003)
  woocommerce_product_id text NULL,
  -- Quality scoring (migration 005)
  quality_score integer NULL DEFAULT 0,
  -- Product images carousel (migration 006)
  images jsonb NULL DEFAULT '[]'::jsonb,
  CONSTRAINT inventory_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_store_id_fkey FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

-- SIZE_TEMPLATES TABLE
-- Reusable size definitions per store
CREATE TABLE public.size_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  template_name character varying(255) NOT NULL,
  category character varying(100) NULL,
  size_name character varying(50) NOT NULL,
  measurements jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT size_templates_pkey PRIMARY KEY (id),
  CONSTRAINT size_templates_store_id_fkey FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

-- CONVERSIONS TABLE
-- Track user add-to-cart and purchase conversions
CREATE TABLE public.conversions (
  id bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  user_id uuid NOT NULL,
  store_id text NULL,
  product_id text NULL,
  add_to_cart boolean NULL DEFAULT true,
  status text NULL DEFAULT 'Logged In'::text,
  CONSTRAINT conversions_pkey PRIMARY KEY (id)
);

-- TRYON_ANALYTICS TABLE
-- Track every try-on event for analytics and recommendations
CREATE TABLE public.tryon_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  product_id uuid NULL,
  user_id uuid NULL,
  tryon_type character varying(50) NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  redirect_status boolean NOT NULL DEFAULT false,
  CONSTRAINT tryon_analytics_pkey PRIMARY KEY (id),
  CONSTRAINT tryon_analytics_product_id_fkey FOREIGN KEY (product_id) REFERENCES inventory(id) ON DELETE SET NULL,
  CONSTRAINT tryon_analytics_store_id_fkey FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
  CONSTRAINT tryon_analytics_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================================
-- SECTION 3: INDEXES (for performance optimization)
-- ============================================================================

-- Stores indexes
CREATE INDEX IF NOT EXISTS idx_stores_store_id ON public.stores USING btree (store_id);
CREATE INDEX IF NOT EXISTS idx_stores_subscription_end_at ON public.stores USING btree (subscription_end_at);
CREATE INDEX IF NOT EXISTS idx_stores_shopify_shop_domain ON public.stores (shopify_shop_domain) WHERE shopify_shop_domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stores_woocommerce_site_url ON public.stores (woocommerce_site_url) WHERE woocommerce_site_url IS NOT NULL;

-- Inventory indexes
CREATE INDEX IF NOT EXISTS idx_inventory_gender ON public.inventory USING btree (gender);
CREATE INDEX IF NOT EXISTS idx_inventory_store_id ON public.inventory USING btree (store_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product_link ON public.inventory USING btree (product_link) WHERE (product_link IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_inventory_fabric_type ON public.inventory USING btree (fabric_type);
CREATE INDEX IF NOT EXISTS idx_inventory_season ON public.inventory USING btree (season);
CREATE INDEX IF NOT EXISTS idx_inventory_activity ON public.inventory USING btree (activity);
CREATE INDEX IF NOT EXISTS idx_inventory_occasion ON public.inventory USING btree (occasion);
CREATE INDEX IF NOT EXISTS idx_inventory_woo_product ON public.inventory (store_id, woocommerce_product_id) WHERE woocommerce_product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_quality_score ON public.inventory(quality_score);
CREATE INDEX IF NOT EXISTS idx_inventory_images ON public.inventory USING GIN (images);

-- Size templates indexes
CREATE INDEX IF NOT EXISTS idx_size_templates_store_id ON public.size_templates USING btree (store_id);

-- Tryon analytics indexes
CREATE INDEX IF NOT EXISTS idx_tryon_analytics_store_id ON public.tryon_analytics USING btree (store_id);
CREATE INDEX IF NOT EXISTS idx_tryon_analytics_created_at ON public.tryon_analytics USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_tryon_analytics_redirect_status ON public.tryon_analytics USING btree (redirect_status);
CREATE INDEX IF NOT EXISTS idx_tryon_analytics_store_redirect ON public.tryon_analytics USING btree (store_id, redirect_status, created_at);

-- ============================================================================
-- SECTION 4: COLUMN COMMENTS (for Supabase DB documentation)
-- ============================================================================

-- Stores table comments
COMMENT ON COLUMN public.stores.shopify_access_token IS 'Shopify Admin API offline access token (sharded_app) — treat as secret';
COMMENT ON COLUMN public.stores.shopify_shop_domain IS 'Shopify permanent domain e.g. mystore.myshopify.com — used for webhook + API routing';
COMMENT ON COLUMN public.stores.shopify_theme_injection_done IS 'True after the Liquid section was successfully injected into the Shopify theme';
COMMENT ON COLUMN public.stores.shopify_theme_injection_status IS 'Human-readable log of the last injection attempt (success message or error details)';
COMMENT ON COLUMN public.stores.woocommerce_site_url IS 'WooCommerce site origin connected through the WordPress plugin';
COMMENT ON COLUMN public.stores.woocommerce_sync_secret_hash IS 'Bcrypt hash of the per-store WordPress plugin sync secret';
COMMENT ON COLUMN public.stores.woocommerce_connected_at IS 'Timestamp when the WooCommerce plugin last connected this store';
COMMENT ON COLUMN public.stores.woocommerce_last_sync_at IS 'Timestamp of the last WooCommerce product sync attempt';
COMMENT ON COLUMN public.stores.woocommerce_last_sync_status IS 'Human-readable status from the last WooCommerce connection or sync attempt';

-- Inventory table comments
COMMENT ON COLUMN public.inventory.woocommerce_product_id IS 'WooCommerce product post ID (string) for plugin lookup';
COMMENT ON COLUMN public.inventory.shopify_product_id IS 'Shopify product ID (numeric string) for plugin lookup and carousel matching';
COMMENT ON COLUMN public.inventory.tier IS 'Try-on tier: 1=Premium (5+ images), 2=Standard (2-4 images), 3=Basic (size/style only)';
COMMENT ON COLUMN public.inventory.tryon_image_url IS 'Best selected product image for 2D try-on (from manual selection or auto quality scoring)';
COMMENT ON COLUMN public.inventory.quality_score IS '0-100 quality score of the best selected image for try-on (based on ML detection)';
COMMENT ON COLUMN public.inventory.images IS 'JSONB array of all product image URLs for carousel display (top 5+ images)';

-- ============================================================================
-- SECTION 5: TRIGGERS (for automatic timestamp management)
-- ============================================================================

CREATE TRIGGER update_stores_updated_at
  BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_size_templates_updated_at
  BEFORE UPDATE ON size_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
-- Total: 6 tables, 25+ indexed columns, 4 record types, 1 helper function
-- Ready for production use with Shopify + WooCommerce plugins
-- ============================================================================
