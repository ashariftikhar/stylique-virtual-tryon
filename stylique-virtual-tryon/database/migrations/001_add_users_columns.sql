-- Migration: Add missing columns to users table for OTP auth, profile, and measurements
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

-- Add UNIQUE constraint on email (required for user lookup)
ALTER TABLE public.users ADD CONSTRAINT users_email_key UNIQUE (email);

-- OTP authentication columns
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS otp_code text NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS otp_expires_at timestamp with time zone NULL;

-- Profile fields
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS name text NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone text NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS gender text NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_hash text NULL;

-- Body measurements
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS height numeric NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS weight numeric NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS chest numeric NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS waist numeric NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS hips numeric NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS shoulder_width numeric NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS arm_length numeric NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS inseam numeric NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS neck_circumference numeric NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS thigh_circumference numeric NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS body_type text NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS skin_tone text NULL;

-- Also add missing columns to inventory (tier, tryon_image_url, shopify_product_id)
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS tier integer NULL DEFAULT 3;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS tryon_image_url text NULL;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS shopify_product_id text NULL;

-- Add updated_at to users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NULL DEFAULT now();
