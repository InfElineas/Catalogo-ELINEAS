-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('gestor', 'cliente');

-- Create enum for catalog status
CREATE TYPE public.catalog_status AS ENUM ('draft', 'published', 'archived');

-- Create enum for client status
CREATE TYPE public.client_status AS ENUM ('active', 'pending', 'inactive');

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- USER ROLES TABLE
-- ============================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Gestors can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'gestor'));

-- ============================================
-- CLIENTS TABLE
-- ============================================
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  status client_status NOT NULL DEFAULT 'pending',
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_access TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestors can do all on clients"
  ON public.clients FOR ALL
  USING (public.has_role(auth.uid(), 'gestor'));

CREATE POLICY "Clients can view their own record"
  ON public.clients FOR SELECT
  USING (user_id = auth.uid());

-- ============================================
-- CATALOGS TABLE
-- ============================================
CREATE TABLE public.catalogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  status catalog_status NOT NULL DEFAULT 'draft',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE public.catalogs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestors can do all on catalogs"
  ON public.catalogs FOR ALL
  USING (public.has_role(auth.uid(), 'gestor'));

-- ============================================
-- CATALOG VERSIONS TABLE
-- ============================================
CREATE TABLE public.catalog_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_id UUID NOT NULL REFERENCES public.catalogs(id) ON DELETE CASCADE,
  version_number INT NOT NULL DEFAULT 1,
  status catalog_status NOT NULL DEFAULT 'draft',
  notes TEXT,
  source_file_url TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  UNIQUE (catalog_id, version_number)
);

ALTER TABLE public.catalog_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestors can do all on catalog_versions"
  ON public.catalog_versions FOR ALL
  USING (public.has_role(auth.uid(), 'gestor'));

-- ============================================
-- CATALOG ITEMS TABLE
-- ============================================
CREATE TABLE public.catalog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES public.catalog_versions(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  price_usd DECIMAL(12, 2) NOT NULL,
  category TEXT,
  category_f1 TEXT,
  category_f2 TEXT,
  category_f3 TEXT,
  supplier TEXT,
  warehouse TEXT,
  store_id TEXT,
  store_name TEXT,
  image_url TEXT,
  image_filter TEXT,
  is_selected BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  extra_prices JSONB DEFAULT '{}',
  flags JSONB DEFAULT '{}',
  ad_fields JSONB DEFAULT '{}',
  states JSONB DEFAULT '{}',
  attributes JSONB DEFAULT '{}',
  external_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestors can do all on catalog_items"
  ON public.catalog_items FOR ALL
  USING (public.has_role(auth.uid(), 'gestor'));

-- ============================================
-- CATALOG CLIENTS (assignment table)
-- ============================================
CREATE TABLE public.catalog_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_id UUID NOT NULL REFERENCES public.catalogs(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (catalog_id, client_id)
);

ALTER TABLE public.catalog_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestors can do all on catalog_clients"
  ON public.catalog_clients FOR ALL
  USING (public.has_role(auth.uid(), 'gestor'));

CREATE POLICY "Clients can view their assignments"
  ON public.catalog_clients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = catalog_clients.client_id
        AND clients.user_id = auth.uid()
    )
  );

-- Add policy for clients to view their assigned catalogs
CREATE POLICY "Clients can view their assigned catalogs"
  ON public.catalogs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.catalog_clients cc
      JOIN public.clients c ON cc.client_id = c.id
      WHERE cc.catalog_id = catalogs.id
        AND c.user_id = auth.uid()
    )
  );

-- Add policy for clients to view versions of assigned catalogs
CREATE POLICY "Clients can view versions of assigned catalogs"
  ON public.catalog_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.catalog_clients cc
      JOIN public.clients c ON cc.client_id = c.id
      WHERE cc.catalog_id = catalog_versions.catalog_id
        AND c.user_id = auth.uid()
    )
  );

-- Add policy for clients to view items of assigned catalogs
CREATE POLICY "Clients can view items of assigned catalogs"
  ON public.catalog_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.catalog_versions cv
      JOIN public.catalog_clients cc ON cc.catalog_id = cv.catalog_id
      JOIN public.clients c ON cc.client_id = c.id
      WHERE cv.id = catalog_items.version_id
        AND c.user_id = auth.uid()
    )
  );

-- ============================================
-- APP CONFIG TABLE
-- ============================================
CREATE TABLE public.app_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}',
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestors can do all on app_config"
  ON public.app_config FOR ALL
  USING (public.has_role(auth.uid(), 'gestor'));

CREATE POLICY "Anyone can read app_config"
  ON public.app_config FOR SELECT
  USING (true);

-- ============================================
-- TRIGGERS FOR updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_catalogs_updated_at
  BEFORE UPDATE ON public.catalogs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_catalog_items_updated_at
  BEFORE UPDATE ON public.catalog_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- FUNCTION TO CREATE PROFILE ON SIGNUP
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_catalogs_status ON public.catalogs(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_catalogs_created_by ON public.catalogs(created_by);
CREATE INDEX idx_catalog_items_version_id ON public.catalog_items(version_id);
CREATE INDEX idx_catalog_items_code ON public.catalog_items(code);
CREATE INDEX idx_catalog_items_active ON public.catalog_items(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_status ON public.clients(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_user_id ON public.clients(user_id);
CREATE INDEX idx_catalog_clients_catalog ON public.catalog_clients(catalog_id);
CREATE INDEX idx_catalog_clients_client ON public.catalog_clients(client_id);

-- ============================================
-- DEFAULT APP CONFIG
-- ============================================
INSERT INTO public.app_config (key, value) VALUES
  ('general', '{"company_name": "Mi Empresa", "currency": "USD", "language": "es"}'),
  ('pdf', '{"include_images": false, "page_size": "letter", "orientation": "portrait"}'),
  ('import', '{"auto_detect_headers": true, "skip_empty_rows": true}');