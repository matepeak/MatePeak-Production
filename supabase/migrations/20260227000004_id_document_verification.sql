-- ID Document Verification System (Phase 2 Feature)
-- This migration adds support for optional identity verification via document upload

-- Add verification columns to expert_profiles
ALTER TABLE expert_profiles
ADD COLUMN IF NOT EXISTS verification_method TEXT DEFAULT 'document',
ADD COLUMN IF NOT EXISTS id_document_url TEXT,
ADD COLUMN IF NOT EXISTS selfie_photo_url TEXT,
ADD COLUMN IF NOT EXISTS verification_submitted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS verification_reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS verification_reviewed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS verification_rejection_reason TEXT;

-- Create verification_documents table for tracking submissions
CREATE TABLE IF NOT EXISTS verification_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expert_profile_id UUID NOT NULL REFERENCES expert_profiles(id) ON DELETE CASCADE,
  id_document_url TEXT NOT NULL,
  selfie_photo_url TEXT NOT NULL,
  document_type TEXT CHECK (document_type IN ('passport', 'drivers_license', 'national_id', 'other')),
  submission_notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for admin review queue
CREATE INDEX IF NOT EXISTS idx_verification_docs_status ON verification_documents(status, created_at);
CREATE INDEX IF NOT EXISTS idx_verification_docs_expert ON verification_documents(expert_profile_id);

-- Enable RLS
ALTER TABLE verification_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for verification_documents
DROP POLICY IF EXISTS "Users can view their own verification submissions" ON verification_documents;
CREATE POLICY "Users can view their own verification submissions"
  ON verification_documents FOR SELECT
  USING (expert_profile_id IN (
    SELECT id FROM expert_profiles WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can create their own verification submissions" ON verification_documents;
CREATE POLICY "Users can create their own verification submissions"
  ON verification_documents FOR INSERT
  WITH CHECK (expert_profile_id IN (
    SELECT id FROM expert_profiles WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Admins can view all verification submissions" ON verification_documents;
CREATE POLICY "Admins can view all verification submissions"
  ON verification_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update verification submissions" ON verification_documents;
CREATE POLICY "Admins can update verification submissions"
  ON verification_documents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create function to update expert profile after verification approval
CREATE OR REPLACE FUNCTION handle_verification_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    UPDATE expert_profiles
    SET 
      verification_status = 'verified',
      verification_method = 'document',
      verification_reviewed_at = NEW.reviewed_at,
      verification_reviewed_by = NEW.reviewed_by,
      is_verified = TRUE
    WHERE id = NEW.expert_profile_id;
  ELSIF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    UPDATE expert_profiles
    SET 
      verification_status = 'failed',
      verification_rejection_reason = NEW.rejection_reason,
      verification_reviewed_at = NEW.reviewed_at,
      verification_reviewed_by = NEW.reviewed_by
    WHERE id = NEW.expert_profile_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for verification approval
DROP TRIGGER IF EXISTS on_verification_status_change ON verification_documents;
CREATE TRIGGER on_verification_status_change
  AFTER UPDATE ON verification_documents
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION handle_verification_approval();

-- Create storage bucket for verification documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-documents', 'verification-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for verification documents
DROP POLICY IF EXISTS "Users can upload their own verification documents" ON storage.objects;
CREATE POLICY "Users can upload their own verification documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'verification-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can view their own verification documents" ON storage.objects;
CREATE POLICY "Users can view their own verification documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'verification-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Admins can view all verification documents" ON storage.objects;
CREATE POLICY "Admins can view all verification documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'verification-documents' AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

COMMENT ON TABLE verification_documents IS 'Stores identity verification document submissions for mentor verification (Phase 2 feature)';
COMMENT ON COLUMN expert_profiles.verification_method IS 'Method used for verification: document (ID upload)';
COMMENT ON COLUMN expert_profiles.id_document_url IS 'URL to uploaded government ID photo';
COMMENT ON COLUMN expert_profiles.selfie_photo_url IS 'URL to uploaded selfie photo';
COMMENT ON COLUMN expert_profiles.verification_submitted_at IS 'When verification documents were submitted';
COMMENT ON COLUMN expert_profiles.verification_reviewed_at IS 'When verification was reviewed by admin';
COMMENT ON COLUMN expert_profiles.verification_reviewed_by IS 'Admin user who reviewed the verification';
COMMENT ON COLUMN expert_profiles.verification_rejection_reason IS 'Reason for verification rejection (if rejected)';
