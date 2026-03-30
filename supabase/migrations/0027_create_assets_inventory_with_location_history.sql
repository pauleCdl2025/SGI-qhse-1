-- Module Inventaire: assets + historique de localisation
-- Objectif: stocker la localisation actuelle de chaque appareil et tracer chaque déplacement.

-- 1) Tables
CREATE TABLE IF NOT EXISTS public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'autre', -- biomedical | reseau | informatique | mobilier | autre
  brand TEXT NULL,
  model TEXT NULL,
  serial_number TEXT NULL,
  tag_code TEXT NULL, -- code inventaire / QR / étiquette
  is_fixed BOOLEAN NOT NULL DEFAULT TRUE,
  current_location TEXT NULL,
  status TEXT NOT NULL DEFAULT 'operationnel', -- operationnel | en_maintenance | hors_service | retire
  notes TEXT NULL,
  created_by UUID NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS assets_tag_code_unique ON public.assets(tag_code) WHERE tag_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS assets_category_idx ON public.assets(category);
CREATE INDEX IF NOT EXISTS assets_status_idx ON public.assets(status);
CREATE INDEX IF NOT EXISTS assets_location_idx ON public.assets(current_location);

CREATE TABLE IF NOT EXISTS public.asset_location_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  from_location TEXT NULL,
  to_location TEXT NULL,
  moved_by UUID NULL DEFAULT auth.uid(),
  moved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT NULL
);

CREATE INDEX IF NOT EXISTS asset_location_events_asset_idx ON public.asset_location_events(asset_id, moved_at DESC);

-- 2) Trigger pour updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS assets_set_updated_at ON public.assets;
CREATE TRIGGER assets_set_updated_at
BEFORE UPDATE ON public.assets
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) Trigger pour tracer automatiquement les changements de localisation
CREATE OR REPLACE FUNCTION public.log_asset_location_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.asset_location_events(asset_id, from_location, to_location, moved_by, moved_at, reason)
    VALUES (NEW.id, NULL, NEW.current_location, auth.uid(), NOW(), 'Création');
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF (OLD.current_location IS DISTINCT FROM NEW.current_location) THEN
      INSERT INTO public.asset_location_events(asset_id, from_location, to_location, moved_by, moved_at, reason)
      VALUES (NEW.id, OLD.current_location, NEW.current_location, auth.uid(), NOW(), 'Déplacement');
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS assets_log_location_change ON public.assets;
CREATE TRIGGER assets_log_location_change
AFTER INSERT OR UPDATE OF current_location ON public.assets
FOR EACH ROW EXECUTE FUNCTION public.log_asset_location_change();

-- 4) RLS
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_location_events ENABLE ROW LEVEL SECURITY;

-- Lecture: tout utilisateur authentifié peut consulter
DROP POLICY IF EXISTS "Authenticated users can view assets" ON public.assets;
CREATE POLICY "Authenticated users can view assets" ON public.assets
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can view asset location events" ON public.asset_location_events;
CREATE POLICY "Authenticated users can view asset location events" ON public.asset_location_events
FOR SELECT TO authenticated USING (true);

-- Écriture: rôles habilités
DROP POLICY IF EXISTS "Privileged users can manage assets" ON public.assets;
CREATE POLICY "Privileged users can manage assets" ON public.assets
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id::text = auth.uid()::text
      AND role IN ('superadmin', 'superviseur_qhse', 'biomedical', 'administrateur_reseau')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id::text = auth.uid()::text
      AND role IN ('superadmin', 'superviseur_qhse', 'biomedical', 'administrateur_reseau')
  )
);

-- Insertion manuelle d'événements (optionnel): mêmes rôles
DROP POLICY IF EXISTS "Privileged users can insert location events" ON public.asset_location_events;
CREATE POLICY "Privileged users can insert location events" ON public.asset_location_events
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id::text = auth.uid()::text
      AND role IN ('superadmin', 'superviseur_qhse', 'biomedical', 'administrateur_reseau')
  )
);

