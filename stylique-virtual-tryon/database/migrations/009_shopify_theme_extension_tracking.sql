-- Shopify Theme App Extension tracking
-- Tracks whether the storefront app block/embed actually loaded after merchant setup.

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS shopify_extension_last_seen_at timestamp with time zone NULL,
  ADD COLUMN IF NOT EXISTS shopify_extension_install_method text NULL,
  ADD COLUMN IF NOT EXISTS shopify_extension_version text NULL,
  ADD COLUMN IF NOT EXISTS shopify_extension_setup_status text NULL;

COMMENT ON COLUMN public.stores.shopify_extension_last_seen_at IS
  'Last time a Shopify Theme App Extension widget heartbeat was received from the storefront';
COMMENT ON COLUMN public.stores.shopify_extension_install_method IS
  'Latest Shopify widget install method reported by heartbeat: theme_app_block, theme_app_embed, or manual_section';
COMMENT ON COLUMN public.stores.shopify_extension_version IS
  'Theme App Extension/widget runtime version reported by the storefront';
COMMENT ON COLUMN public.stores.shopify_extension_setup_status IS
  'Human-readable setup status for Shopify Theme App Extension installation';
