-- Allow authenticated users to view gestor profiles for contact purposes
CREATE POLICY "Authenticated users can view gestor profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(id, 'gestor'));
