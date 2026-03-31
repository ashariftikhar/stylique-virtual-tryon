-- Shopify OAuth + Admin API
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS shopify_access_token text NULL,
  ADD COLUMN IF NOT EXISTS shopify_shop_domain text NULL;

COMMENT ON COLUMN public.stores.shopify_access_token IS 'Shopify Admin API offline access token (sharded_app) — treat as secret';
COMMENT ON COLUMN public.stores.shopify_shop_domain IS 'Shopify permanent domain e.g. mystore.myshopify.com — used for webhook + API routing';

CREATE INDEX IF NOT EXISTS idx_stores_shopify_shop_domain
  ON public.stores (shopify_shop_domain)
  WHERE shopify_shop_domain IS NOT NULL;
