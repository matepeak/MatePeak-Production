-- Add new columns to expert_profiles table
-- NOTE (March 2026): The 'chatAdvice' service type referenced in this file has been renamed to 'priorityDm'
-- See migration 20260317000100_rename_chatadvice_to_prioritydm.sql for the rename operation.
ALTER TABLE public.expert_profiles 
ADD COLUMN IF NOT EXISTS service_pricing jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS profile_picture_url text;

-- Migrate existing pricing data to new structure
UPDATE public.expert_profiles
SET service_pricing = jsonb_build_object(
  'oneOnOneSession', jsonb_build_object(
    'enabled', COALESCE(ispaid, false),
    'price', COALESCE(pricing, 0),
    'hasFreeDemo', false
  ),
  'chatAdvice', jsonb_build_object(
    'enabled', false,
    'price', 0,
    'hasFreeDemo', false
  ),
  'digitalProducts', jsonb_build_object(
    'enabled', false,
    'price', 0
  ),
  'notes', jsonb_build_object(
    'enabled', false,
    'price', 0
  )
)
WHERE service_pricing = '{}'::jsonb OR service_pricing IS NULL;

-- Add comments
COMMENT ON COLUMN public.expert_profiles.service_pricing IS 'Service-specific pricing structure with enabled/price/hasFreeDemo flags';
COMMENT ON COLUMN public.expert_profiles.profile_picture_url IS 'URL to mentor profile picture in storage';

-- Create storage bucket for profile pictures
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-pictures', 
  'profile-pictures', 
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for profile-pictures bucket
CREATE POLICY "Users can upload their own profile picture"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'profile-pictures' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own profile picture"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'profile-pictures' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own profile picture"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'profile-pictures' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Public can view profile pictures"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'profile-pictures');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_expert_profiles_service_pricing 
ON public.expert_profiles USING GIN (service_pricing);
