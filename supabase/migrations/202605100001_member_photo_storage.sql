-- Member profile image storage for Shajara.
-- Run after the production hardening migration.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'member-photos',
  'member-photos',
  TRUE,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Member photos are publicly readable" ON storage.objects;
CREATE POLICY "Member photos are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'member-photos');

DROP POLICY IF EXISTS "Family editors can upload member photos" ON storage.objects;
CREATE POLICY "Family editors can upload member photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'member-photos'
    AND public.is_family_editor((storage.foldername(name))[1]::uuid)
  );

DROP POLICY IF EXISTS "Family editors can update member photos" ON storage.objects;
CREATE POLICY "Family editors can update member photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'member-photos'
    AND public.is_family_editor((storage.foldername(name))[1]::uuid)
  )
  WITH CHECK (
    bucket_id = 'member-photos'
    AND public.is_family_editor((storage.foldername(name))[1]::uuid)
  );

DROP POLICY IF EXISTS "Family admins can delete member photos" ON storage.objects;
CREATE POLICY "Family admins can delete member photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'member-photos'
    AND public.is_family_admin((storage.foldername(name))[1]::uuid)
  );
