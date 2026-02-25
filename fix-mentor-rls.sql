-- Fix RLS policies to allow public read access to expert_profiles
-- This is the most common reason why mentors don't show up

-- 1. Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'expert_profiles';

-- 2. Drop existing policies (if any are too restrictive)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON expert_profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON expert_profiles;
DROP POLICY IF EXISTS "Allow public read access" ON expert_profiles;

-- 3. Create proper SELECT policy for public access (anonymous users)
CREATE POLICY "Enable public read access to expert profiles"
ON expert_profiles
FOR SELECT
TO public
USING (true);

-- 4. Keep the existing mentor-only policies for INSERT/UPDATE/DELETE
-- Mentors can insert their own profile
CREATE POLICY "Mentors can insert their own profile" 
ON expert_profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);

-- Mentors can update their own profile
CREATE POLICY "Mentors can update their own profile" 
ON expert_profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Mentors can delete their own profile
CREATE POLICY "Mentors can delete their own profile" 
ON expert_profiles 
FOR DELETE 
TO authenticated
USING (auth.uid() = id);

-- 5. Verify policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'expert_profiles';

-- 6. Test query (should return mentors now)
SELECT COUNT(*) as total_mentors FROM expert_profiles;
SELECT id, full_name, category FROM expert_profiles LIMIT 5;
