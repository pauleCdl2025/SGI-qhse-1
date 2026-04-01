-- Fix RLS policies for Inventaire (assets + asset_location_events)
-- Purpose: allow INSERT/UPDATE for users having a matching role in public.profiles.

DO $$
BEGIN
  -- Ensure required tables exist
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'assets'
  ) THEN
    ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'asset_location_events'
  ) THEN
    ALTER TABLE public.asset_location_events ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop/replace policies on assets
DROP POLICY IF EXISTS "Authenticated users can view assets" ON public.assets;
DROP POLICY IF EXISTS "Privileged users can manage assets" ON public.assets;

CREATE POLICY "Authenticated users can view assets" ON public.assets
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Privileged users can manage assets" ON public.assets
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE public.profiles.id::text = auth.uid()::text
      AND public.profiles.role::text IN (
        'superadmin',
        'superviseur_qhse',
        'superviseur_technicien',
        'technicien',
        'biomedical',
        'administrateur_reseau'
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE public.profiles.id::text = auth.uid()::text
      AND public.profiles.role::text IN (
        'superadmin',
        'superviseur_qhse',
        'superviseur_technicien',
        'technicien',
        'biomedical',
        'administrateur_reseau'
      )
  )
);

-- Drop/replace policies on location events
DROP POLICY IF EXISTS "Authenticated users can view asset location events" ON public.asset_location_events;
DROP POLICY IF EXISTS "Privileged users can insert location events" ON public.asset_location_events;

CREATE POLICY "Authenticated users can view asset location events" ON public.asset_location_events
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Privileged users can insert location events" ON public.asset_location_events
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE public.profiles.id::text = auth.uid()::text
      AND public.profiles.role::text IN (
        'superadmin',
        'superviseur_qhse',
        'superviseur_technicien',
        'technicien',
        'biomedical',
        'administrateur_reseau'
      )
  )
);

