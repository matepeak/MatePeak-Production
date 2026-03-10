import { supabase } from '@/integrations/supabase/client';

export interface AdminActionResponse {
  success: boolean;
  message: string;
  error?: string;
  data?: any;
}

// =====================================================
// USER SUSPENSION
// =====================================================

export async function suspendUser(
  userId: string, 
  reason?: string
): Promise<AdminActionResponse> {
  try {
    const { data, error } = await supabase.rpc('admin_suspend_user', {
      target_user_id: userId,
      reason: reason || null
    });

    if (error) throw error;

    return {
      success: true,
      message: data?.message || 'User suspended successfully',
      data
    };
  } catch (error: any) {
    console.error('Error suspending user:', error);
    return {
      success: false,
      message: 'Failed to suspend user',
      error: error.message
    };
  }
}

export async function unsuspendUser(userId: string): Promise<AdminActionResponse> {
  try {
    const { data, error } = await supabase.rpc('admin_unsuspend_user', {
      target_user_id: userId
    });

    if (error) throw error;

    return {
      success: true,
      message: data?.message || 'User unsuspended successfully',
      data
    };
  } catch (error: any) {
    console.error('Error unsuspending user:', error);
    return {
      success: false,
      message: 'Failed to unsuspend user',
      error: error.message
    };
  }
}

// =====================================================
// MENTOR VERIFICATION
// =====================================================

export async function verifyMentor(
  mentorProfileId: string,
  notes?: string
): Promise<AdminActionResponse> {
  try {
    const { data, error } = await supabase.rpc('admin_verify_mentor', {
      mentor_profile_id: mentorProfileId,
      verification_notes: notes || null
    });

    if (error) throw error;

    return {
      success: true,
      message: data?.message || 'Mentor verified successfully',
      data
    };
  } catch (error: any) {
    console.error('Error verifying mentor:', error);
    return {
      success: false,
      message: 'Failed to verify mentor',
      error: error.message
    };
  }
}

export async function rejectMentor(
  mentorProfileId: string,
  reason: string
): Promise<AdminActionResponse> {
  try {
    const { data, error } = await supabase.rpc('admin_reject_mentor', {
      mentor_profile_id: mentorProfileId,
      rejection_reason: reason
    });

    if (error) throw error;

    return {
      success: true,
      message: data?.message || 'Mentor verification rejected',
      data
    };
  } catch (error: any) {
    console.error('Error rejecting mentor:', error);
    return {
      success: false,
      message: 'Failed to reject mentor',
      error: error.message
    };
  }
}

// =====================================================
// WITHDRAWAL MANAGEMENT
// =====================================================

export async function approveWithdrawal(
  withdrawalId: string,
  transactionRef?: string,
  notes?: string
): Promise<AdminActionResponse> {
  try {
    const { data, error } = await supabase.rpc('admin_approve_withdrawal', {
      withdrawal_id: withdrawalId,
      transaction_ref: transactionRef || null,
      notes: notes || null
    });

    if (error) throw error;

    return {
      success: true,
      message: data?.message || 'Withdrawal approved successfully',
      data
    };
  } catch (error: any) {
    console.error('Error approving withdrawal:', error);
    return {
      success: false,
      message: 'Failed to approve withdrawal',
      error: error.message
    };
  }
}

export async function rejectWithdrawal(
  withdrawalId: string,
  reason: string
): Promise<AdminActionResponse> {
  try {
    const { data, error } = await supabase.rpc('admin_reject_withdrawal', {
      withdrawal_id: withdrawalId,
      rejection_reason: reason
    });

    if (error) throw error;

    return {
      success: true,
      message: data?.message || 'Withdrawal rejected successfully',
      data
    };
  } catch (error: any) {
    console.error('Error rejecting withdrawal:', error);
    return {
      success: false,
      message: 'Failed to reject withdrawal',
      error: error.message
    };
  }
}

// =====================================================
// REVIEW MODERATION
// =====================================================

export async function moderateReview(
  reviewId: string,
  action: 'hide' | 'delete',
  reason?: string
): Promise<AdminActionResponse> {
  try {
    const { data, error } = await supabase.rpc('admin_moderate_review', {
      review_id: reviewId,
      action: action,
      reason: reason || null
    });

    if (error) throw error;

    return {
      success: true,
      message: data?.message || `Review ${action}d successfully`,
      data
    };
  } catch (error: any) {
    console.error('Error moderating review:', error);
    return {
      success: false,
      message: `Failed to ${action} review`,
      error: error.message
    };
  }
}

// =====================================================
// ADMIN DATA FETCHING
// =====================================================

export async function getPendingMentorVerifications() {
  try {
    const { data, error } = await supabase
      .from('expert_profiles')
      .select(`
        *,
        profiles!expert_profiles_user_id_fkey (
          email,
          full_name,
          avatar_url
        )
      `)
      .in('profile_status', ['pending_review', 'draft'])
      .eq('is_verified', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    console.error('Error fetching pending verifications:', error);
    return { data: null, error };
  }
}

export async function getPendingWithdrawals() {
  try {
    const { data, error } = await supabase
      .from('withdrawal_requests')
      .select(`
        *,
        profiles!withdrawal_requests_mentor_id_fkey (
          email,
          full_name
        )
      `)
      .eq('status', 'pending')
      .order('requested_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    console.error('Error fetching pending withdrawals:', error);
    return { data: null, error };
  }
}

export async function getFlaggedReviews() {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        profiles!reviews_user_id_fkey (
          email,
          full_name
        ),
        expert_profiles!reviews_expert_id_fkey (
          user_id,
          profiles!expert_profiles_user_id_fkey (
            full_name
          )
        )
      `)
      .eq('is_flagged', true)
      .eq('is_hidden', false)
      .order('flagged_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    console.error('Error fetching flagged reviews:', error);
    return { data: null, error };
  }
}

export async function getAdminActions(limit: number = 50) {
  try {
    const { data, error } = await supabase
      .from('admin_actions')
      .select(`
        *,
        profiles!admin_actions_admin_id_fkey (
          email,
          full_name
        ),
        target_profiles:profiles!admin_actions_target_user_id_fkey (
          email,
          full_name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    console.error('Error fetching admin actions:', error);
    return { data: null, error };
  }
}

export async function getSuspendedUsers() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_suspended', true)
      .order('suspended_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    console.error('Error fetching suspended users:', error);
    return { data: null, error };
  }
}
