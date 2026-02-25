/**
 * Test script to verify mentor fetching from Supabase
 * Run this in browser console or as a standalone test
 */

import { supabase } from './src/integrations/supabase/client';

async function testMentorFetch() {
  console.log('🧪 Testing Supabase mentor fetch...');
  console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
  
  try {
    // Test 1: Check connection
    console.log('\n📡 Test 1: Checking Supabase connection...');
    const { data: { session } } = await supabase.auth.getSession();
    console.log('✅ Connection OK. Session:', session ? 'Active' : 'No session');

    // Test 2: Count total expert_profiles
    console.log('\n📊 Test 2: Counting expert_profiles...');
    const { count, error: countError } = await supabase
      .from('expert_profiles')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Error counting profiles:', countError);
      return;
    }
    console.log(`✅ Found ${count} expert profiles in database`);

    // Test 3: Fetch first 5 mentors (no filters)
    console.log('\n🔍 Test 3: Fetching first 5 mentors...');
    const { data: mentors, error: fetchError } = await supabase
      .from('expert_profiles')
      .select('id, full_name, category, created_at')
      .limit(5);
    
    if (fetchError) {
      console.error('❌ Error fetching mentors:', fetchError);
      return;
    }
    console.log('✅ Fetched mentors:', mentors);

    // Test 4: Check RLS policies
    console.log('\n🔒 Test 4: Checking RLS policies...');
    console.log('If count is 0 but you know there are mentors, RLS might be blocking reads');
    console.log('Solution: Enable SELECT policy for public (anon) users on expert_profiles table');

    // Test 5: Check specific columns exist
    if (mentors && mentors.length > 0) {
      console.log('\n📋 Test 5: First mentor structure:');
      console.log('Columns:', Object.keys(mentors[0]));
    }

    return {
      success: true,
      totalMentors: count,
      sampleMentors: mentors
    };

  } catch (error) {
    console.error('💥 Test failed with error:', error);
    return {
      success: false,
      error
    };
  }
}

// Run test
testMentorFetch();
