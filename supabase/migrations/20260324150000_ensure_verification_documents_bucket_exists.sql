-- Ensure verification-documents storage bucket exists for Phase 2 proof uploads/previews
-- Fixes runtime: {"statusCode":"404","error":"Bucket not found","message":"Bucket not found"}

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'verification-documents',
  'verification-documents',
  true,
  52428800,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
)
ON CONFLICT (id)
DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Users can upload their own verification documents" ON storage.objects;
CREATE POLICY "Users can upload their own verification documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'verification-documents'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can view their own verification documents" ON storage.objects;
CREATE POLICY "Users can view their own verification documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'verification-documents'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "Admins can view all verification documents" ON storage.objects;
CREATE POLICY "Admins can view all verification documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'verification-documents'
    AND public.is_admin(auth.uid())
  );
