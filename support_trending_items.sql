-- 1. Add columns to track popularity metrics
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS favorite_count INTEGER DEFAULT 0;

-- 2. Create an RPC function to safely increment the view count atomically
CREATE OR REPLACE FUNCTION increment_view_count(row_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.products
  SET view_count = view_count + 1
  WHERE id = row_id;
END;
$$;

-- 3. Create an RPC function to safely increment the favorite count atomically
CREATE OR REPLACE FUNCTION increment_favorite_count(row_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.products
  SET favorite_count = favorite_count + 1
  WHERE id = row_id;
END;
$$;

-- 4. Create an RPC function to safely decrement the favorite count atomically
CREATE OR REPLACE FUNCTION decrement_favorite_count(row_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.products
  SET favorite_count = GREATEST(0, favorite_count - 1)
  WHERE id = row_id;
END;
$$;
