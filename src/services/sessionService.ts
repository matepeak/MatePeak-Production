import { supabase } from "@/integrations/supabase/client";

export interface BookSessionData {
  mentor_id: string;
  session_time: string;  // ISO 8601 format
  duration: number;      // minutes
  session_type: string;
  message?: string;
}

export interface ManageSessionData {
  session_id: string;
  action: 'confirm' | 'complete' | 'cancel';
  payment_status?: 'paid' | 'refunded';
  cancellation_reason?: string;
}

/**
 * Book a new session with a mentor
 * Uses edge function to check availability
 */
export async function bookSession(data: BookSessionData) {
  const { data: result, error } = await supabase.functions.invoke('book-session', {
    body: data
  });
  
  if (error) {
    console.error('Booking error:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to book session',
      data: null 
    };
  }
  
  return result;
}

/**
 * Get all sessions for the current user
 * Students see their bookings, Mentors see received bookings
 */
export async function getMySessions() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { success: false, error: 'Not authenticated', data: [] };
  }
  
  // Check if user is mentor
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  
  let query = supabase
    .from('bookings')
    .select(`
      *,
      expert:expert_profiles(id, full_name, category, pricing),
      student:profiles!bookings_user_id_fkey(full_name, email, avatar_url)
    `);
  
  if (profile?.role === 'mentor') {
    query = query.eq('expert_id', user.id);
  } else {
    query = query.eq('user_id', user.id);
  }
  
  const { data, error } = await query.order('session_time', { ascending: false });
  
  if (error) {
    console.error('Error fetching sessions:', error);
    return { success: false, error: error.message, data: [] };
  }
  
  return { success: true, data };
}

/**
 * Get a single session by ID
 */
export async function getSessionById(sessionId: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      expert:expert_profiles(id, full_name, category, pricing, bio),
      student:profiles!bookings_user_id_fkey(full_name, email, avatar_url)
    `)
    .eq('id', sessionId)
    .single();
  
  if (error) {
    console.error('Error fetching session:', error);
    return { success: false, error: error.message, data: null };
  }
  
  return { success: true, data };
}

/**
 * Manage session status (confirm, complete, cancel)
 * Uses edge function for complex logic
 */
export async function manageSession(data: ManageSessionData) {
  const { data: result, error } = await supabase.functions.invoke('manage-session', {
    body: data
  });
  
  if (error) {
    console.error('Session management error:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to update session',
      data: null 
    };
  }
  
  return result;
}

/**
 * Confirm a session (mentor only)
 */
export async function confirmSession(sessionId: string) {
  return await manageSession({
    session_id: sessionId,
    action: 'confirm'
  });
}

/**
 * Complete a session and mark as paid (mentor only)
 */
export async function completeSession(sessionId: string, paymentStatus: 'paid' | 'refunded' = 'paid') {
  return await manageSession({
    session_id: sessionId,
    action: 'complete',
    payment_status: paymentStatus
  });
}

/**
 * Cancel a session (student or mentor)
 */
export async function cancelSession(sessionId: string) {
  return await manageSession({
    session_id: sessionId,
    action: 'cancel'
  });
}

export async function cancelSessionWithReason(
  sessionId: string,
  cancellationReason?: string
) {
  return await manageSession({
    session_id: sessionId,
    action: 'cancel',
    cancellation_reason: cancellationReason,
  });
}
