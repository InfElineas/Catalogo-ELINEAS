CREATE POLICY "Authenticated users can view gestor roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (role = 'gestor');
