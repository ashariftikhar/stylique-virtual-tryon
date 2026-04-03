-- Migration: Add quality_score column to inventory table
-- Stores the 0-100 quality score of the best selected image for try-on

ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS quality_score integer NULL DEFAULT 0;

-- Create index for potential filtering
CREATE INDEX IF NOT EXISTS idx_inventory_quality_score ON public.inventory(quality_score);
