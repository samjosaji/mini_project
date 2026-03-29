-- =====================================================
-- Category Requests Table (Vendor Suggestions)
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Create the category_requests table
CREATE TABLE IF NOT EXISTS public.category_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  requested_by UUID NOT NULL,
  vendor_name TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Enable RLS
ALTER TABLE public.category_requests ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if any
DO $$
BEGIN
    DROP POLICY IF EXISTS "Anyone can view category_requests." ON public.category_requests;
    DROP POLICY IF EXISTS "Anyone can insert category_requests." ON public.category_requests;
    DROP POLICY IF EXISTS "Anyone can update category_requests." ON public.category_requests;
    DROP POLICY IF EXISTS "Anyone can delete category_requests." ON public.category_requests;
EXCEPTION
    WHEN undefined_object THEN
        NULL;
END $$;

-- 4. RLS Policies
CREATE POLICY "Anyone can view category_requests." ON public.category_requests FOR SELECT USING (true);
CREATE POLICY "Anyone can insert category_requests." ON public.category_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update category_requests." ON public.category_requests FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete category_requests." ON public.category_requests FOR DELETE USING (true);
