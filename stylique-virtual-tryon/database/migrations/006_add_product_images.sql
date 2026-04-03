-- Migration: Add product images array to inventory table
-- Stores all product images (or top 5+ for carousel display)

ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS images jsonb NULL DEFAULT '[]'::jsonb;

-- Create index for potential filtering
CREATE INDEX IF NOT EXISTS idx_inventory_images ON public.inventory USING GIN (images);
