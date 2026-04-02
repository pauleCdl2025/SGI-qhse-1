-- Network module: equipment + subscriptions tables for Supabase/PostgreSQL

-- 1) Tables
CREATE TABLE IF NOT EXISTS public.network_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('routeur', 'switch', 'point_acces', 'serveur', 'firewall', 'autre')),
  brand TEXT NULL,
  model TEXT NULL,
  serial_number TEXT NULL,
  ip_address TEXT NULL,
  mac_address TEXT NULL,
  location TEXT NULL,
  status TEXT NOT NULL DEFAULT 'operationnel' CHECK (status IN ('operationnel', 'en_maintenance', 'hors_service')),
  installation_date DATE NULL,
  warranty_expiry DATE NULL,
  notes TEXT NULL,
  created_by UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT network_equipment_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.network_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL,
  provider TEXT NOT NULL,
  subscription_type TEXT NOT NULL CHECK (subscription_type IN ('internet', 'telephonie', 'cloud', 'securite', 'autre')),
  monthly_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  start_date DATE NOT NULL,
  renewal_date DATE NOT NULL,
  contract_number TEXT NULL,
  contact_person TEXT NULL,
  contact_phone TEXT NULL,
  contact_email TEXT NULL,
  status TEXT NOT NULL DEFAULT 'actif' CHECK (status IN ('actif', 'suspendu', 'expire', 'resilie')),
  notes TEXT NULL,
  created_by UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT network_subscriptions_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT
);

-- 2) Indexes
CREATE INDEX IF NOT EXISTS idx_network_equipment_status ON public.network_equipment(status);
CREATE INDEX IF NOT EXISTS idx_network_equipment_type ON public.network_equipment(type);
CREATE INDEX IF NOT EXISTS idx_network_subscriptions_status ON public.network_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_network_subscriptions_renewal_date ON public.network_subscriptions(renewal_date);

-- 3) updated_at trigger reuse
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS network_equipment_set_updated_at ON public.network_equipment;
CREATE TRIGGER network_equipment_set_updated_at
BEFORE UPDATE ON public.network_equipment
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS network_subscriptions_set_updated_at ON public.network_subscriptions;
CREATE TRIGGER network_subscriptions_set_updated_at
BEFORE UPDATE ON public.network_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) RLS
ALTER TABLE public.network_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_subscriptions ENABLE ROW LEVEL SECURITY;

-- Read for authenticated users
DROP POLICY IF EXISTS "Authenticated users can view network equipment" ON public.network_equipment;
CREATE POLICY "Authenticated users can view network equipment" ON public.network_equipment
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can view network subscriptions" ON public.network_subscriptions;
CREATE POLICY "Authenticated users can view network subscriptions" ON public.network_subscriptions
FOR SELECT TO authenticated USING (true);

-- Manage for privileged network roles
DROP POLICY IF EXISTS "Privileged users can manage network equipment" ON public.network_equipment;
CREATE POLICY "Privileged users can manage network equipment" ON public.network_equipment
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id::text = auth.uid()::text
      AND role IN ('superadmin', 'superviseur_qhse', 'superviseur_technicien', 'technicien', 'technicien_polyvalent', 'biomedical', 'administrateur_reseau')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id::text = auth.uid()::text
      AND role IN ('superadmin', 'superviseur_qhse', 'superviseur_technicien', 'technicien', 'technicien_polyvalent', 'biomedical', 'administrateur_reseau')
  )
);

DROP POLICY IF EXISTS "Privileged users can manage network subscriptions" ON public.network_subscriptions;
CREATE POLICY "Privileged users can manage network subscriptions" ON public.network_subscriptions
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id::text = auth.uid()::text
      AND role IN ('superadmin', 'superviseur_qhse', 'superviseur_technicien', 'technicien', 'technicien_polyvalent', 'biomedical', 'administrateur_reseau')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id::text = auth.uid()::text
      AND role IN ('superadmin', 'superviseur_qhse', 'superviseur_technicien', 'technicien', 'technicien_polyvalent', 'biomedical', 'administrateur_reseau')
  )
);
