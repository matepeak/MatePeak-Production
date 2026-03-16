import { supabase } from "@/integrations/supabase/client";

export interface SignupData {
  name: string;
  email: string;
  password: string;
  role: 'student' | 'mentor';
}

export interface LoginData {
  email: string;
  password: string;
}

/**
 * Sign up a new user
 * Supabase automatically hashes passwords and generates JWT tokens
 */
export async function signup(data: SignupData) {
  const { name, email, password, role } = data;
  
  try {
    const { data: authData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          role: role
        },
        emailRedirectTo: `${window.location.origin}/`
      }
    });
    
    if (error) {
      console.error('Signup error:', error);
      
      // Handle specific error cases
      if (error.message.includes('fetch')) {
        return { success: false, error: 'Network error. Please check your internet connection.' };
      } else if (error.message.includes('User already registered')) {
        return { success: false, error: 'An account with this email already exists.' };
      } else {
        return { success: false, error: error.message };
      }
    }
    
    return { 
      success: true, 
      message: 'Signup successful! Please check your email to verify your account.',
      data: authData 
    };
  } catch (error: any) {
    console.error('Unexpected signup error:', error);
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return { success: false, error: 'Unable to connect to the server. Please check your internet connection.' };
    }
    
    return { 
      success: false, 
      error: error.message || 'An unexpected error occurred during signup.' 
    };
  }
}

/**
 * Log in an existing user
 * Returns JWT token automatically stored in localStorage
 */
export async function login(data: LoginData) {
  const { email, password } = data;
  
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) {
    console.error('Login error:', error);
    return { success: false, error: error.message };
  }
  
  return { 
    success: true, 
    message: 'Login successful!',
    data: authData 
  };
}

/**
 * Log out current user
 */
export async function logout() {
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    console.error('Logout error:', error);
    return { success: false, error: error.message };
  }
  
  return { success: true, message: 'Logged out successfully' };
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    console.error('Get user error:', error);
    return { success: false, error: error.message, user: null };
  }
  
  return { success: true, user };
}

/**
 * Get current session
 */
export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error('Get session error:', error);
    return { success: false, error: error.message, session: null };
  }
  
  return { success: true, session };
}

/**
 * Delete user account and all associated data
 * This is a permanent action that cannot be undone
 */
export async function deleteAccount() {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Get user error:', userError);
      return { success: false, error: 'User not authenticated' };
    }

    const userId = user.id;

    // Delete profile picture from storage if exists
    try {
      const fileName = `${userId}/profile-picture.jpg`;
      await supabase.storage
        .from("profile-pictures")
        .remove([fileName]);
    } catch (storageError) {
      console.warn('Profile picture deletion error (non-critical):', storageError);
    }

    // Delete mentor-related data in order (respecting foreign key constraints)
    // 1. Delete session messages
    await supabase
      .from('session_messages')
      .delete()
      .eq('mentor_id', userId);

    // 2. Delete student notes
    await supabase
      .from('student_notes')
      .delete()
      .eq('mentor_id', userId);

    // 3. Delete reviews
    await supabase
      .from('reviews')
      .delete()
      .eq('mentor_id', userId);

    // 4. Delete withdrawal requests
    await supabase
      .from('withdrawal_requests')
      .delete()
      .eq('mentor_id', userId);

    // 5. Delete wallet
    await supabase
      .from('mentor_wallets')
      .delete()
      .eq('mentor_id', userId);

    // 6. Delete custom time requests
    await supabase
      .from('custom_time_requests')
      .delete()
      .eq('mentor_id', userId);

    // 7. Delete bookings (sessions)
    await supabase
      .from('bookings')
      .delete()
      .eq('mentor_id', userId);

    // 8. Delete notification preferences
    await supabase
      .from('notification_preferences')
      .delete()
      .eq('user_id', userId);

    // 9. Delete notifications
    await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId);

    // 10. Delete expert profile
    const { error: profileError } = await supabase
      .from('expert_profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      console.error('Profile deletion error:', profileError);
      return { success: false, error: 'Failed to delete profile data' };
    }

    // 11. Delete from profiles table
    const { error: profilesError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profilesError) {
      console.error('Profiles table deletion error:', profilesError);
      // Continue anyway as this might not exist
    }

    // 12. Finally, delete the auth user (this must be last)
    // Note: Supabase admin API is required to delete users from auth.users
    // For now, we'll use the RPC function or handle this on the backend
    const { error: deleteError } = await supabase.rpc('delete_user_account', {
      user_id: userId
    });

    if (deleteError) {
      // If RPC doesn't exist, we can still sign out the user
      // The admin can manually delete from auth.users or set up a trigger
      console.warn('Auth deletion error:', deleteError);
      
      // Sign out the user anyway
      await supabase.auth.signOut();
      
      return { 
        success: true, 
        message: 'Account data deleted successfully. Please contact support to complete auth deletion.',
        partial: true
      };
    }

    // Sign out after successful deletion
    await supabase.auth.signOut();
    
    return { 
      success: true, 
      message: 'Your account has been permanently deleted.' 
    };
  } catch (error: any) {
    console.error('Unexpected account deletion error:', error);
    return { 
      success: false, 
      error: error.message || 'An unexpected error occurred during account deletion.' 
    };
  }
}
