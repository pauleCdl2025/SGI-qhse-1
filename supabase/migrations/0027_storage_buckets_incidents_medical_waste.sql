-- Buckets Supabase Storage utilisés par l'app (incidents, déchets médicaux).
-- Sans ces buckets, l'API renvoie "Bucket not found".

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'incidents',
    'incidents',
    true,
    52428800,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
  ),
  (
    'medical-waste',
    'medical-waste',
    true,
    52428800,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
  )
ON CONFLICT (id) DO NOTHING;

-- Politiques storage.objects (RLS activé par défaut sur Supabase Storage)

DROP POLICY IF EXISTS "incidents_select_public" ON storage.objects;
DROP POLICY IF EXISTS "incidents_insert_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "incidents_update_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "incidents_delete_authenticated" ON storage.objects;

CREATE POLICY "incidents_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'incidents');

CREATE POLICY "incidents_insert_authenticated"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'incidents');

CREATE POLICY "incidents_update_authenticated"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'incidents')
  WITH CHECK (bucket_id = 'incidents');

CREATE POLICY "incidents_delete_authenticated"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'incidents');

DROP POLICY IF EXISTS "medical_waste_select_public" ON storage.objects;
DROP POLICY IF EXISTS "medical_waste_insert_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "medical_waste_update_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "medical_waste_delete_authenticated" ON storage.objects;

CREATE POLICY "medical_waste_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'medical-waste');

CREATE POLICY "medical_waste_insert_authenticated"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'medical-waste');

CREATE POLICY "medical_waste_update_authenticated"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'medical-waste')
  WITH CHECK (bucket_id = 'medical-waste');

CREATE POLICY "medical_waste_delete_authenticated"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'medical-waste');
