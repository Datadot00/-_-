-- Store public A/B vote design images outside the projects row.
-- The object path is scoped to the authenticated creator:
--   <auth.uid()>/votes/<random-id>-<option>.<extension>

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-vote-assets',
  'project-vote-assets',
  TRUE,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']::TEXT[]
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read project vote assets" ON storage.objects;
DROP POLICY IF EXISTS "Qualified creators upload project vote assets" ON storage.objects;
DROP POLICY IF EXISTS "Creators delete own project vote assets" ON storage.objects;

CREATE POLICY "Public read project vote assets"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'project-vote-assets');

CREATE POLICY "Qualified creators upload project vote assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-vote-assets'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT
  AND EXISTS (
    SELECT 1
    FROM public.users AS profile
    WHERE profile.id = (SELECT auth.uid())
      AND profile.has_passed_gating
  )
);

CREATE POLICY "Creators delete own project vote assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-vote-assets'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT
);

