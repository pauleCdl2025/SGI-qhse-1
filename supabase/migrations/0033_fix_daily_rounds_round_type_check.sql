-- Fix ronde réseau: autoriser round_type = 'reseau'

-- daily_rounds
ALTER TABLE IF EXISTS public.daily_rounds
  DROP CONSTRAINT IF EXISTS daily_rounds_round_type_check;

ALTER TABLE IF EXISTS public.daily_rounds
  ADD CONSTRAINT daily_rounds_round_type_check
  CHECK (round_type IN ('biomedical', 'technicien_polyvalent', 'reseau'));

-- round_checklist_templates (garder la même liste de types)
ALTER TABLE IF EXISTS public.round_checklist_templates
  DROP CONSTRAINT IF EXISTS round_checklist_templates_round_type_check;

ALTER TABLE IF EXISTS public.round_checklist_templates
  ADD CONSTRAINT round_checklist_templates_round_type_check
  CHECK (round_type IN ('biomedical', 'technicien_polyvalent', 'reseau'));

