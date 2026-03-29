-- 1. Create Categories Table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  icon TEXT DEFAULT 'category',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Note: In older PostgreSQL versions, ADD COLUMN IF NOT EXISTS requires PG 14+. Supabase supports this or newer.
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'category';

-- Enable Row Level Security (RLS) for categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Safely create policies (Drop first if they exist to avoid relation already exists errors in policies)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Anyone can view categories." ON public.categories;
    DROP POLICY IF EXISTS "Anyone can insert categories." ON public.categories;
    DROP POLICY IF EXISTS "Anyone can update categories." ON public.categories;
    DROP POLICY IF EXISTS "Anyone can delete categories." ON public.categories;
EXCEPTION
    WHEN undefined_object THEN
        NULL;
END $$;

-- Policies for categories table
CREATE POLICY "Anyone can view categories." ON public.categories FOR SELECT USING (true);
CREATE POLICY "Anyone can insert categories." ON public.categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update categories." ON public.categories FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete categories." ON public.categories FOR DELETE USING (true);

-- Insert default categories safely
INSERT INTO public.categories (name, icon) VALUES
('Food', 'restaurant'),
('Fruits', 'apple'),
('Vegetables', 'grass'),
('Craft', 'palette'),
('Bakery', 'breakfast-dining'),
('Beverages', 'local-bar')
ON CONFLICT (name) DO UPDATE SET icon = EXCLUDED.icon;
