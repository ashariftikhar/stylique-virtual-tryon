-- Migration: Track Shopify theme auto-injection status
-- Run in Supabase SQL Editor after 003.

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS shopify_theme_injection_done boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS shopify_theme_injection_status text NULL;

COMMENT ON COLUMN public.stores.shopify_theme_injection_done
  IS 'True after the Liquid section was successfully injected into the Shopify theme';
COMMENT ON COLUMN public.stores.shopify_theme_injection_status
  IS 'Human-readable log of the last injection attempt (success message or error details)';
