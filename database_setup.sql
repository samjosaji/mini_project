-- 1. Create Users Table
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('customer', 'vendor', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security (RLS) for users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policies for users table
CREATE POLICY "Users can view their own profile." ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON public.users FOR UPDATE USING (auth.uid() = id);
-- Note: Everyone needs to be able to read vendor basic info, but we'll handle that via a clear separation or specific policy later if needed.
CREATE POLICY "Anyone can view basic user/vendor info" ON public.users FOR SELECT USING (true);


-- 2. Create Vendors Table (Extends users if role is 'vendor')
CREATE TABLE public.vendors (
  id UUID REFERENCES public.users(id) ON DELETE CASCADE PRIMARY KEY,
  shop_name TEXT NOT NULL,
  description TEXT,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  address TEXT,
  rating NUMERIC(3, 2) DEFAULT 0.0,
  reviews_count INTEGER DEFAULT 0,
  is_open BOOLEAN DEFAULT false,
  cover_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS for vendors
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view vendors." ON public.vendors FOR SELECT USING (true);
CREATE POLICY "Vendors can update their own shop." ON public.vendors FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Vendors can insert their own shop." ON public.vendors FOR INSERT WITH CHECK (auth.uid() = id);


-- 3. Create Products Table
CREATE TABLE public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL,
  category TEXT NOT NULL,
  stock INTEGER DEFAULT 0,
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  is_trending BOOLEAN DEFAULT false,
  rating NUMERIC(3, 2) DEFAULT 0.0,
  reviews_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS for products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view products." ON public.products FOR SELECT USING (true);
CREATE POLICY "Vendors can insert their own products." ON public.products FOR INSERT WITH CHECK (auth.uid() = vendor_id);
CREATE POLICY "Vendors can update their own products." ON public.products FOR UPDATE USING (auth.uid() = vendor_id);
CREATE POLICY "Vendors can delete their own products." ON public.products FOR DELETE USING (auth.uid() = vendor_id);


-- 4. Create Trigger to automatically create a User and Vendor record when a new account is registered via Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Insert into public.users
  INSERT INTO public.users (id, email, first_name, last_name, role)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'first_name', 
    new.raw_user_meta_data->>'last_name', 
    new.raw_user_meta_data->>'role'
  );

  -- If role is vendor, also insert into public.vendors
  IF new.raw_user_meta_data->>'role' = 'vendor' THEN
    INSERT INTO public.vendors (id, shop_name)
    VALUES (
      new.id,
      new.raw_user_meta_data->>'shop_name'
    );
  END IF;

  RETURN new;
END;
$$;

-- Trigger the function every time a user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
