# 🔴 URGENT: Mentors Not Loading - Fix Guide

## Problem
Mentors are not being fetched from Supabase database.

## Most Likely Cause: RLS (Row Level Security) Policies

The #1 reason mentors don't show up is **restrictive RLS policies** that block public read access.

---

## Quick Fix (Run in Supabase SQL Editor)

### Option 1: SQL Script (Recommended)
```sql
-- Enable public read access to expert_profiles
CREATE POLICY "Enable public read access to expert profiles"
ON expert_profiles
FOR SELECT
TO public
USING (true);
```

Run this in: **Supabase Dashboard → SQL Editor → New Query**

### Option 2: Using Supabase Dashboard
1. Go to **Authentication → Policies**
2. Find `expert_profiles` table
3. Click **New Policy**
4. Select **"Enable read access for all users"**
5. Policy Type: `SELECT`
6. Target Roles: `public` (includes anonymous)
7. USING expression: `true`
8. Save

---

## Diagnosis Steps

### Step 1: Check if mentors exist in database
```sql
-- Run in Supabase SQL Editor
SELECT COUNT(*) as total_mentors FROM expert_profiles;
SELECT id, full_name, category, created_at FROM expert_profiles LIMIT 5;
```

**Expected**: Should return count > 0 and show mentor names

**If returns 0**: Either no mentors exist OR RLS is blocking

---

### Step 2: Check RLS status
```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'expert_profiles';
```

**Result**: `rowsecurity = true` means RLS is enabled

---

### Step 3: Check existing policies
```sql
-- See all policies on expert_profiles
SELECT policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'expert_profiles';
```

**Look for**: A policy with `cmd = SELECT` and `roles = {public}` or `{anon}`

**If missing**: That's your problem! Run the fix from Option 1 above.

---

### Step 4: Test from browser console

Open browser console on your app and run:
```javascript
// Test if Supabase connection works
const { data, error } = await supabase
  .from('expert_profiles')
  .select('id, full_name')
  .limit(5);

console.log('Data:', data);
console.log('Error:', error);
```

**Expected**: `data` contains mentors, `error` is null

**If error**: Check the error message - it often says "permission denied"

---

## Complete Fix Script

Run this complete script in Supabase SQL Editor:

```sql
-- ============================================
-- FIX MENTOR FETCHING - COMPLETE SCRIPT
-- ============================================

-- 1. Enable RLS (if not already enabled)
ALTER TABLE expert_profiles ENABLE ROW LEVEL SECURITY;

-- 2. Drop old conflicting policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON expert_profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON expert_profiles;
DROP POLICY IF EXISTS "Allow public read access" ON expert_profiles;

-- 3. Create PUBLIC READ policy (allows anonymous users to view mentors)
CREATE POLICY "Public can view expert profiles"
ON expert_profiles
FOR SELECT
TO public
USING (true);

-- 4. Create MENTOR INSERT policy (mentors can create their profile)
DROP POLICY IF EXISTS "Mentors can insert their own profile" ON expert_profiles;
CREATE POLICY "Mentors can insert their own profile"
ON expert_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- 5. Create MENTOR UPDATE policy (mentors can edit their own profile)
DROP POLICY IF EXISTS "Mentors can update their own profile" ON expert_profiles;
CREATE POLICY "Mentors can update their own profile"
ON expert_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 6. Create MENTOR DELETE policy (mentors can delete their own profile)
DROP POLICY IF EXISTS "Mentors can delete their own profile" ON expert_profiles;
CREATE POLICY "Mentors can delete their own profile"
ON expert_profiles
FOR DELETE
TO authenticated
USING (auth.uid() = id);

-- 7. Verify policies are set correctly
SELECT 
  policyname, 
  CASE cmd 
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    ELSE cmd::text
  END as operation,
  roles,
  permissive as permissive_policy
FROM pg_policies
WHERE tablename = 'expert_profiles'
ORDER BY cmd;

-- 8. Test query (should return mentors)
SELECT 
  COUNT(*) as total_mentors,
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as recent_mentors
FROM expert_profiles;

-- 9. Show sample mentors
SELECT 
  id, 
  full_name, 
  category::text as categories,
  created_at
FROM expert_profiles
ORDER BY created_at DESC
LIMIT 10;
```

---

## Related Tables

Also check these related tables have public read access:

### profiles table
```sql
CREATE POLICY "Public can view profiles"
ON profiles
FOR SELECT
TO public
USING (true);
```

### reviews table (for ratings)
```sql
CREATE POLICY "Public can view reviews"
ON reviews
FOR SELECT
TO public
USING (true);
```

---

## Verification Checklist

After running the fix, verify:

- [ ] SQL script ran without errors
- [ ] Policy named "Public can view expert profiles" exists
- [ ] Policy has `FOR SELECT TO public USING (true)`
- [ ] `SELECT COUNT(*) FROM expert_profiles` returns > 0
- [ ] Browser console test returns mentor data
- [ ] App shows mentors on /explore page
- [ ] MentorCard components render correctly

---

## If Still Not Working

### Check 1: Are there mentors in the database?
```sql
SELECT COUNT(*) FROM expert_profiles;
```
If 0, you need to seed data or create mentor profiles via onboarding.

### Check 2: Network issues?
- Open browser DevTools → Network tab
- Reload /explore page
- Look for request to Supabase (hnevrdlcqhmsfubakljg.supabase.co)
- Check response status (should be 200)
- Check response body (should contain mentor data)

### Check 3: Frontend errors?
- Open browser console
- Look for red error messages
- Common errors:
  - "Failed to fetch" = network issue
  - "permission denied" = RLS issue
  - "relation does not exist" = table name wrong

### Check 4: Authentication state?
Some queries might require authentication. Test:
```javascript
// Check auth state
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session);
```

---

## Quick Test After Fix

1. **Backend Test** (Supabase SQL Editor):
```sql
SELECT id, full_name FROM expert_profiles LIMIT 3;
```

2. **Frontend Test** (Browser console on app):
```javascript
const test = await supabase.from('expert_profiles').select('*').limit(3);
console.log(test);
```

3. **App UI Test**:
- Go to `/explore` page
- Should see mentor cards
- Should see mentor names, categories, pricing

---

## Emergency Contact

If mentors still not showing:
1. Check Supabase Dashboard → Table Editor → expert_profiles (should have rows)
2. Check Supabase Dashboard → Logs (for any errors)
3. Export current policies: Run diagnosis scripts above
4. Share error messages from browser console

---

## Prevention

Add this check to your deployment script:
```sql
-- Verify mentor visibility after each deploy
DO $$
DECLARE
  mentor_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO mentor_count FROM expert_profiles;
  
  IF mentor_count = 0 THEN
    RAISE WARNING 'No mentors found in database!';
  ELSE
    RAISE NOTICE 'Found % mentors', mentor_count;
  END IF;
END $$;
```

---

## Status: ⚠️ NEEDS IMMEDIATE ATTENTION

The mentor fetching issue prevents core functionality. Fix RLS policies ASAP.

**Time to fix**: 2-5 minutes  
**Impact**: Critical - app unusable without mentors  
**Risk**: Low - only affects read access, no security risk
