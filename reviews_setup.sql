-- Run this SQL in your Supabase SQL Editor to create the reviews table and triggers
-- This replaces mock ratings with a live system

-- 1. Create Reviews Table
CREATE TABLE public.reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reviews." ON public.reviews 
  FOR SELECT USING (true);

CREATE POLICY "Customers can insert their own reviews." ON public.reviews 
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can update their own reviews." ON public.reviews 
  FOR UPDATE USING (auth.uid() = customer_id);

-- 3. Trigger to automatically update product/vendor rating and counts
CREATE OR REPLACE FUNCTION public.update_ratings_on_review()
RETURNS TRIGGER AS $$
DECLARE
    v_vendor_id UUID;
BEGIN
    -- Get vendor_id for the product
    SELECT vendor_id INTO v_vendor_id FROM public.products WHERE id = NEW.product_id;

    -- Update Product stats
    UPDATE public.products
    SET 
        rating = (SELECT COALESCE(AVG(rating), 0) FROM public.reviews WHERE product_id = NEW.product_id),
        reviews_count = (SELECT COUNT(*) FROM public.reviews WHERE product_id = NEW.product_id)
    WHERE id = NEW.product_id;

    -- Update Vendor stats
    -- Note: Vendor rating is the average of all their products' ratings
    UPDATE public.vendors
    SET 
        rating = (SELECT COALESCE(AVG(rating), 0) FROM public.products WHERE vendor_id = v_vendor_id),
        reviews_count = (SELECT COALESCE(SUM(reviews_count), 0) FROM public.products WHERE vendor_id = v_vendor_id)
    WHERE id = v_vendor_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_review_added
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW EXECUTE PROCEDURE public.update_ratings_on_review();
