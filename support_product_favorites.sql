-- Support Product Favorites
-- This script adds product_id to the favorites table and updates constraints

-- 1. Add product_id column
ALTER TABLE public.favorites ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE CASCADE;

-- 2. Make vendor_id nullable (though usually every product has a vendor, 
-- keep it for better indexing/organization if product_id is null)
ALTER TABLE public.favorites ALTER COLUMN vendor_id DROP NOT NULL;

-- 3. Update unique constraint
-- A customer can favorite a vendor OR a specific product once.
-- We drop the old UNIQUE(customer_id, vendor_id) constraint.
ALTER TABLE public.favorites DROP CONSTRAINT IF EXISTS favorites_customer_id_vendor_id_key;

-- 4. Create a new unique index that treats NULLs correctly for our use case.
-- We want UNIQUE(customer_id, vendor_id) WHERE product_id IS NULL
-- and UNIQUE(customer_id, product_id) WHERE product_id IS NOT NULL.
CREATE UNIQUE INDEX IF NOT EXISTS favorites_vendor_unique_idx ON public.favorites (customer_id, vendor_id) WHERE product_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS favorites_product_unique_idx ON public.favorites (customer_id, product_id) WHERE product_id IS NOT NULL;
