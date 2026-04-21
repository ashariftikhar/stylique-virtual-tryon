ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS woocommerce_site_url text NULL,
  ADD COLUMN IF NOT EXISTS woocommerce_sync_secret_hash text NULL,
  ADD COLUMN IF NOT EXISTS woocommerce_connected_at timestamp with time zone NULL,
  ADD COLUMN IF NOT EXISTS woocommerce_last_sync_at timestamp with time zone NULL,
  ADD COLUMN IF NOT EXISTS woocommerce_last_sync_status text NULL;

CREATE INDEX IF NOT EXISTS idx_stores_woocommerce_site_url
  ON public.stores (woocommerce_site_url)
  WHERE woocommerce_site_url IS NOT NULL;

COMMENT ON COLUMN public.stores.woocommerce_site_url IS 'WooCommerce site origin connected through the WordPress plugin';
COMMENT ON COLUMN public.stores.woocommerce_sync_secret_hash IS 'Bcrypt hash of the per-store WordPress plugin sync secret';
COMMENT ON COLUMN public.stores.woocommerce_connected_at IS 'Timestamp when the WooCommerce plugin last connected this store';
COMMENT ON COLUMN public.stores.woocommerce_last_sync_at IS 'Timestamp of the last WooCommerce product sync attempt';
COMMENT ON COLUMN public.stores.woocommerce_last_sync_status IS 'Human-readable status from the last WooCommerce connection or sync attempt';
