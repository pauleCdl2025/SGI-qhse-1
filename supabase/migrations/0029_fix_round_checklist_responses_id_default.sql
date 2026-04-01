-- Ensure round_checklist_responses.id is generated server-side
-- This prevents NOT NULL violations when the client does not send an id.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'round_checklist_responses'
      AND column_name = 'id'
  ) THEN
    ALTER TABLE public.round_checklist_responses
      ALTER COLUMN id SET DEFAULT gen_random_uuid();
  END IF;
END $$;

