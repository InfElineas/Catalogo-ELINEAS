ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS gestor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

UPDATE public.clients
SET gestor_id = created_by
WHERE gestor_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_clients_gestor_id ON public.clients(gestor_id);

DROP POLICY IF EXISTS "Gestors can do all on clients" ON public.clients;

CREATE POLICY "Gestors can view assigned clients"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'gestor')
    AND (gestor_id = auth.uid() OR created_by = auth.uid())
  );

CREATE POLICY "Gestors can insert assigned clients"
  ON public.clients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'gestor')
    AND created_by = auth.uid()
    AND (gestor_id = auth.uid() OR gestor_id IS NULL)
  );

CREATE POLICY "Gestors can update assigned clients"
  ON public.clients
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'gestor')
    AND (gestor_id = auth.uid() OR created_by = auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'gestor')
    AND (gestor_id = auth.uid() OR created_by = auth.uid())
  );

CREATE POLICY "Gestors can delete assigned clients"
  ON public.clients
  FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'gestor')
    AND (gestor_id = auth.uid() OR created_by = auth.uid())
  );
