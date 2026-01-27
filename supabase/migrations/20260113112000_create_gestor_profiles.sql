CREATE TABLE IF NOT EXISTS public.gestor_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  sales_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gestor_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestors can manage their gestor profile"
  ON public.gestor_profiles
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view gestor profiles"
  ON public.gestor_profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE TRIGGER update_gestor_profiles_updated_at
  BEFORE UPDATE ON public.gestor_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
