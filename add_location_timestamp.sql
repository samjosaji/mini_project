-- Add last_location_update column to vendors table
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS last_location_update TIMESTAMP WITH TIME ZONE;
