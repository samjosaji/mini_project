-- Enable RLS Updates for Admins

-- 1. Allow admins to update the `users` table
CREATE POLICY "Admins can update users"
ON public.users
FOR UPDATE
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);

-- 2. Allow admins to update the `vendors` table
CREATE POLICY "Admins can update vendors"
ON public.vendors
FOR UPDATE
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);

-- 3. Allow admins to update the `products` table
CREATE POLICY "Admins can update products"
ON public.products
FOR UPDATE
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);
