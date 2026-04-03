-- Fix: incidents.statut CHECK constraint mismatch with frontend values
-- Frontend uses: nouveau, attente, cours, traite, resolu
-- Some DB variants used: en_cours instead of cours

ALTER TABLE public.incidents
  DROP CONSTRAINT IF EXISTS incidents_statut_check;

ALTER TABLE public.incidents
  ADD CONSTRAINT incidents_statut_check
  CHECK (statut IN (
    'nouveau',
    'attente',
    'cours',
    'en_cours',
    'traite',
    'resolu'
  ));

