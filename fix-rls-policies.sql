-- Fix RLS Policies for Expert Profiles
-- This allows anonymous users (your app) to READ mentor profiles
-- Run this in Supabase SQL Editor

-- 1. Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON expert_profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON expert_profiles;
DROP POLICY IF EXISTS "Allow public read access" ON expert_profiles;

-- 2. Create a permissive SELECT policy for anonymous users
CREATE POLICY "Allow anonymous read access to expert profiles"
ON expert_profiles
FOR SELECT
TO anon, authenticated
USING (true);

-- 3. Verify the policy was created
SELECT 
  policyname,
  cmd,
  roles,
  qual
FROM pg_policies 
WHERE tablename = 'expert_profiles' 
  AND cmd = 'SELECT';

-- 4. Test that it works
SET ROLE anon;
SELECT COUNT(*) as visible_mentors FROM expert_profiles;
RESET ROLE;

-- Expected result: Should see all mentors
