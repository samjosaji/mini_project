-- Run this SQL in your Supabase SQL Editor to create the favorites and notifications tables

-- 1. Favorites Table
CREATE TABLE public.favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(customer_id, vendor_id)
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers can view own favorites" ON public.favorites FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Customers can add favorites" ON public.favorites FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Customers can remove favorites" ON public.favorites FOR DELETE USING (auth.uid() = customer_id);
CREATE POLICY "Vendors can see who favorited them" ON public.favorites FOR SELECT USING (auth.uid() = vendor_id);

-- 2. Notifications Table
CREATE TABLE public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'new_product',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Anyone can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Customers can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = customer_id);
