-- Ensure QHSE tables generate IDs server-side (Postgres/Supabase)
-- and set sensible defaults for audit columns tied to auth.uid().

DO $$
DECLARE
  trainings_id_type text;
  participations_id_type text;
  competencies_id_type text;
BEGIN
  -- trainings.id default
  SELECT c.data_type INTO trainings_id_type
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'trainings' AND c.column_name = 'id';

  IF trainings_id_type IS NOT NULL THEN
    IF trainings_id_type = 'uuid' THEN
      EXECUTE 'ALTER TABLE public.trainings ALTER COLUMN id SET DEFAULT gen_random_uuid()';
    ELSE
      EXECUTE 'ALTER TABLE public.trainings ALTER COLUMN id SET DEFAULT gen_random_uuid()::text';
    END IF;
  END IF;

  -- trainings.created_by default (if column exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = 'trainings' AND c.column_name = 'created_by'
  ) THEN
    EXECUTE 'ALTER TABLE public.trainings ALTER COLUMN created_by SET DEFAULT auth.uid()';
  END IF;

  -- training_participations.id default
  SELECT c.data_type INTO participations_id_type
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'training_participations' AND c.column_name = 'id';

  IF participations_id_type IS NOT NULL THEN
    IF participations_id_type = 'uuid' THEN
      EXECUTE 'ALTER TABLE public.training_participations ALTER COLUMN id SET DEFAULT gen_random_uuid()';
    ELSE
      EXECUTE 'ALTER TABLE public.training_participations ALTER COLUMN id SET DEFAULT gen_random_uuid()::text';
    END IF;
  END IF;

  -- training_participations.registered_by default (if column exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = 'training_participations' AND c.column_name = 'registered_by'
  ) THEN
    EXECUTE 'ALTER TABLE public.training_participations ALTER COLUMN registered_by SET DEFAULT auth.uid()';
  END IF;

  -- competencies.id default
  SELECT c.data_type INTO competencies_id_type
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'competencies' AND c.column_name = 'id';

  IF competencies_id_type IS NOT NULL THEN
    IF competencies_id_type = 'uuid' THEN
      EXECUTE 'ALTER TABLE public.competencies ALTER COLUMN id SET DEFAULT gen_random_uuid()';
    ELSE
      EXECUTE 'ALTER TABLE public.competencies ALTER COLUMN id SET DEFAULT gen_random_uuid()::text';
    END IF;
  END IF;

  -- competencies.created_by default (if column exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = 'competencies' AND c.column_name = 'created_by'
  ) THEN
    EXECUTE 'ALTER TABLE public.competencies ALTER COLUMN created_by SET DEFAULT auth.uid()';
  END IF;
END $$;

