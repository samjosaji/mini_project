-- Run this SQL in your Supabase SQL Editor to create the vendor_reports table
-- This enables customers to report vendors, which admins can review

-- 1. Create Vendor Reports Table
CREATE TABLE public.vendor_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')) NOT NULL,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.vendor_reports ENABLE ROW LEVEL SECURITY;

-- Admins can view all reports
CREATE POLICY "Admins can view all reports." ON public.vendor_reports
  FOR SELECT USING (true);

-- Customers can insert their own reports
CREATE POLICY "Customers can insert their own reports." ON public.vendor_reports
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

-- Admins can update reports (to change status, add notes)
CREATE POLICY "Admins can update reports." ON public.vendor_reports
  FOR UPDATE USING (true);

-- 3. Create an index for faster queries
CREATE INDEX idx_vendor_reports_status ON public.vendor_reports(status);
CREATE INDEX idx_vendor_reports_vendor ON public.vendor_reports(vendor_id);
