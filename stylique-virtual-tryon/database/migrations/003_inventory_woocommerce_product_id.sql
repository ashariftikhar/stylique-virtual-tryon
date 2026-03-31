-- WooCommerce post ID for reliable check-product when permalink variants differ
ALTER TABLE public.inventory
  ADD COLUMN IF NOT EXISTS woocommerce_product_id text NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_woo_product
  ON public.inventory (store_id, woocommerce_product_id)
  WHERE woocommerce_product_id IS NOT NULL;

COMMENT ON COLUMN public.inventory.woocommerce_product_id IS 'WooCommerce product post ID (string) for plugin lookup';
