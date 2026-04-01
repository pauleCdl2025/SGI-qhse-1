-- Ensure audits.created_by has a server-side default
-- so inserts from authenticated clients do not fail when created_by is omitted.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'audits'
      AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.audits
      ALTER COLUMN created_by SET DEFAULT auth.uid();
  END IF;
END $$;

