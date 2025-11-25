-- Migration: Add address and contact fields to contractors table
-- Description: Adds address, city, state, zip, and contact_name to contractors table for PDF generation
-- Date: 2025-11-24

-- Add columns if they don't exist
ALTER TABLE public.contractors ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.contractors ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.contractors ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.contractors ADD COLUMN IF NOT EXISTS zip TEXT;
ALTER TABLE public.contractors ADD COLUMN IF NOT EXISTS contact_name TEXT;

-- Add comments
COMMENT ON COLUMN public.contractors.address IS 'Street address for G703 form';
COMMENT ON COLUMN public.contractors.city IS 'City for G703 form';
COMMENT ON COLUMN public.contractors.state IS 'State for G703 form';
COMMENT ON COLUMN public.contractors.zip IS 'Zip code for G703 form';
COMMENT ON COLUMN public.contractors.contact_name IS 'Officer name for G703 form';

