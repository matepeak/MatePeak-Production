-- Fix RLS policies for verification_documents to prevent "argument of AND must not return a set" error
-- Replace IN (subquery) with EXISTS for better performance and correctness

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own verification submissions" ON verification_documents;
DROP POLICY IF EXISTS "Users can create their own verification submissions" ON verification_documents;
DROP POLICY IF EXISTS "Admins can view all verification submissions" ON verification_documents;
DROP POLICY IF EXISTS "Admins can update verification submissions" ON verification_documents;

-- Recreate policies with EXISTS instead of IN
CREATE POLICY "Users can view their own verification submissions"
  ON verification_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM expert_profiles 
      WHERE expert_profiles.id = verification_documents.expert_profile_id 
      AND expert_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own verification submissions"
  ON verification_documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM expert_profiles 
      WHERE expert_profiles.id = expert_profile_id 
      AND expert_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all verification submissions"
  ON verification_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update verification submissions"
  ON verification_documents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Add helpful comment
COMMENT ON TABLE verification_documents IS 'Tracks ID document verification submissions for Phase 2 optional verification';
