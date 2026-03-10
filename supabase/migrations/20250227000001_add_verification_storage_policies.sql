-- Create storage policies for verification-photos bucket

-- Policy 1: Users can upload their own verification photos
CREATE POLICY "Users can upload their own verification photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'verification-photos' 
  AND (storage.foldername(name))[1] = 'verification-photos'
  AND (auth.uid())::text = (regexp_match(name, 'verification_([a-f0-9-]+)_'))[1]
);

-- Policy 2: Users can view their own verification photos
CREATE POLICY "Users can view their own verification photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'verification-photos'
  AND (storage.foldername(name))[1] = 'verification-photos'
  AND (auth.uid())::text = (regexp_match(name, 'verification_([a-f0-9-]+)_'))[1]
);

-- Policy 3: Users can update their own verification photos
CREATE POLICY "Users can update their own verification photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'verification-photos'
  AND (storage.foldername(name))[1] = 'verification-photos'
  AND (auth.uid())::text = (regexp_match(name, 'verification_([a-f0-9-]+)_'))[1]
);

-- Policy 4: Users can delete their own verification photos
CREATE POLICY "Users can delete their own verification photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'verification-photos'
  AND (storage.foldername(name))[1] = 'verification-photos'
  AND (auth.uid())::text = (regexp_match(name, 'verification_([a-f0-9-]+)_'))[1]
);

-- Policy 5: Admins can view all verification photos
CREATE POLICY "Admins can view all verification photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'verification-photos'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
