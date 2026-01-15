-- Fix RLS policies for security issues

-- 1. Drop the problematic public access policy for app_config
DROP POLICY IF EXISTS "Anyone can read app_config" ON public.app_config;

-- 2. Create a policy that only allows authenticated users to read app_config
CREATE POLICY "Authenticated users can read app_config" 
ON public.app_config 
FOR SELECT 
TO authenticated
USING (true);

-- 3. Add explicit policy for gestors to read profiles (for client management)
CREATE POLICY "Gestors can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'gestor'));

-- 4. Ensure user_roles has proper insert policy for signup process
-- First drop if exists to avoid conflicts
DROP POLICY IF EXISTS "Users can insert their own role on signup" ON public.user_roles;

-- Create policy to allow users to insert their own role during signup
CREATE POLICY "Users can insert their own role on signup" 
ON public.user_roles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 5. Create a trigger to automatically create profile on signup if not exists
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Create trigger if not exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();