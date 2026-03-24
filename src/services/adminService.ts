import { supabase } from '@/integrations/supabase/client';

export interface AdminActionResponse {
  success: boolean;
  message: string;
  error?: string;
  data?: any;
}

interface WithdrawalEmailContext {
  mentorEmail?: string | null;
  mentorName?: string | null;
  amount?: number | null;
  requestedAt?: string | null;
  transactionRef?: string | null;
  notes?: string | null;
  rejectionReason?: string | null;
}

const formatAmountINR = (amount?: number | null) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(Number(amount || 0));
};

const buildApprovalEmailHtml = (
  withdrawalId: string,
  context: WithdrawalEmailContext
) => {
  const mentorName = context.mentorName || 'Mentor';
  const amount = formatAmountINR(context.amount);
  const requestedAt = context.requestedAt
    ? new Date(context.requestedAt).toLocaleString('en-IN')
    : '-';
  const approvedAt = new Date().toLocaleString('en-IN');
  const decisionNote = context.notes?.trim() || 'Approved after admin review.';

  return `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 640px; margin: 0 auto; color: #111827; line-height: 1.6;">
      <h2 style="margin: 0 0 12px; color: #111827;">Withdrawal Request Approved</h2>
      <p style="margin: 0 0 14px;">Hi ${mentorName},</p>
      <p style="margin: 0 0 18px;">Your withdrawal request has been approved by the admin team.</p>

      <table style="width: 100%; border-collapse: collapse; margin: 0 0 18px;">
        <tr><td style="padding: 8px 10px; border: 1px solid #e5e7eb;"><strong>Request ID</strong></td><td style="padding: 8px 10px; border: 1px solid #e5e7eb;">${withdrawalId}</td></tr>
        <tr><td style="padding: 8px 10px; border: 1px solid #e5e7eb;"><strong>Amount</strong></td><td style="padding: 8px 10px; border: 1px solid #e5e7eb;">${amount}</td></tr>
        <tr><td style="padding: 8px 10px; border: 1px solid #e5e7eb;"><strong>Requested On</strong></td><td style="padding: 8px 10px; border: 1px solid #e5e7eb;">${requestedAt}</td></tr>
        <tr><td style="padding: 8px 10px; border: 1px solid #e5e7eb;"><strong>Approved On</strong></td><td style="padding: 8px 10px; border: 1px solid #e5e7eb;">${approvedAt}</td></tr>
        <tr><td style="padding: 8px 10px; border: 1px solid #e5e7eb;"><strong>Transaction Reference</strong></td><td style="padding: 8px 10px; border: 1px solid #e5e7eb;">${context.transactionRef || '-'}</td></tr>
      </table>

      <p style="margin: 0 0 8px;"><strong>Admin Note:</strong></p>
      <p style="margin: 0 0 18px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px;">${decisionNote}</p>

      <p style="margin: 0; color: #6b7280; font-size: 13px;">This is an automated email from MatePeak.</p>
    </div>
  `;
};

const buildRejectionEmailHtml = (
  withdrawalId: string,
  context: WithdrawalEmailContext
) => {
  const mentorName = context.mentorName || 'Mentor';
  const amount = formatAmountINR(context.amount);
  const requestedAt = context.requestedAt
    ? new Date(context.requestedAt).toLocaleString('en-IN')
    : '-';
  const rejectedAt = new Date().toLocaleString('en-IN');
  const rejectionReason = context.rejectionReason?.trim() || 'Rejected by admin review.';

  return `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 640px; margin: 0 auto; color: #111827; line-height: 1.6;">
      <h2 style="margin: 0 0 12px; color: #b91c1c;">Withdrawal Request Rejected</h2>
      <p style="margin: 0 0 14px;">Hi ${mentorName},</p>
      <p style="margin: 0 0 18px;">Your withdrawal request has been rejected by the admin team. The reserved amount has been restored to your wallet.</p>

      <table style="width: 100%; border-collapse: collapse; margin: 0 0 18px;">
        <tr><td style="padding: 8px 10px; border: 1px solid #e5e7eb;"><strong>Request ID</strong></td><td style="padding: 8px 10px; border: 1px solid #e5e7eb;">${withdrawalId}</td></tr>
        <tr><td style="padding: 8px 10px; border: 1px solid #e5e7eb;"><strong>Amount</strong></td><td style="padding: 8px 10px; border: 1px solid #e5e7eb;">${amount}</td></tr>
        <tr><td style="padding: 8px 10px; border: 1px solid #e5e7eb;"><strong>Requested On</strong></td><td style="padding: 8px 10px; border: 1px solid #e5e7eb;">${requestedAt}</td></tr>
        <tr><td style="padding: 8px 10px; border: 1px solid #e5e7eb;"><strong>Rejected On</strong></td><td style="padding: 8px 10px; border: 1px solid #e5e7eb;">${rejectedAt}</td></tr>
      </table>

      <p style="margin: 0 0 8px;"><strong>Reason:</strong></p>
      <p style="margin: 0 0 18px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 10px;">${rejectionReason}</p>

      <p style="margin: 0; color: #6b7280; font-size: 13px;">This is an automated email from MatePeak.</p>
    </div>
  `;
};

const sendWithdrawalDecisionEmail = async (
  type: 'approved' | 'rejected',
  withdrawalId: string,
  context: WithdrawalEmailContext
) => {
  const mentorEmail = String(context.mentorEmail || '').trim();
  if (!mentorEmail) return;

  const subject =
    type === 'approved'
      ? `Withdrawal Approved - ${formatAmountINR(context.amount)}`
      : `Withdrawal Rejected - ${formatAmountINR(context.amount)}`;
  const html =
    type === 'approved'
      ? buildApprovalEmailHtml(withdrawalId, context)
      : buildRejectionEmailHtml(withdrawalId, context);

  try {
    await supabase.functions.invoke('send-email', {
      body: {
        to: mentorEmail,
        subject,
        html,
      },
    });
  } catch (emailError) {
    console.error('Failed to send withdrawal decision email:', emailError);
  }
};

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

export async function setPhase2MaxAttempts(
  mentorProfileId: string,
  maxAttempts: number,
  notes?: string
): Promise<AdminActionResponse> {
  try {
    const { data, error } = await supabase.rpc('admin_set_phase2_max_attempts', {
      mentor_profile_id: mentorProfileId,
      max_attempts: maxAttempts,
      notes: notes || null,
    });

    if (error) throw error;

    return {
      success: true,
      message: data?.message || 'Max attempts updated successfully',
      data,
    };
  } catch (error: any) {
    console.error('Error updating phase 2 max attempts:', error);
    return {
      success: false,
      message: 'Failed to update max attempts',
      error: error.message,
    };
  }
}

// =====================================================
// WITHDRAWAL MANAGEMENT
// =====================================================

export async function approveWithdrawal(
  withdrawalId: string,
  transactionRef?: string,
  notes?: string,
  emailContext?: WithdrawalEmailContext
): Promise<AdminActionResponse> {
  try {
    const { data, error } = await supabase.rpc('admin_approve_withdrawal', {
      withdrawal_id: withdrawalId,
      transaction_ref: transactionRef || null,
      notes: notes || null
    });

    if (error) throw error;

    await sendWithdrawalDecisionEmail('approved', withdrawalId, {
      ...emailContext,
      transactionRef: transactionRef || null,
      notes: notes || null,
    });

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
  reason: string,
  emailContext?: WithdrawalEmailContext
): Promise<AdminActionResponse> {
  try {
    const { data, error } = await supabase.rpc('admin_reject_withdrawal', {
      withdrawal_id: withdrawalId,
      rejection_reason: reason
    });

    if (error) throw error;

    await sendWithdrawalDecisionEmail('rejected', withdrawalId, {
      ...emailContext,
      rejectionReason: reason,
    });

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
    const pendingFilter = 'verification_status.eq.under_review,phase2_review_status.eq.under_review,profile_status.eq.pending_review';

    const primary = await supabase
      .from('expert_profiles')
      .select(`
        *,
        profiles (
          email,
          full_name,
          avatar_url
        )
      `)
      .or(pendingFilter)
      .eq('is_verified', false)
      .order('created_at', { ascending: false });

    if (!primary.error) {
      return { data: primary.data, error: null };
    }

    const fallback = await supabase
      .from('expert_profiles')
      .select('*')
      .or('verification_status.eq.under_review,profile_status.eq.pending_review')
      .eq('is_verified', false)
      .order('created_at', { ascending: false });

    if (fallback.error) throw fallback.error;

    const rows = fallback.data || [];
    const userIds = Array.from(new Set(rows.map((row: any) => row.user_id).filter(Boolean)));

    let profileMap = new Map<string, { email: string | null; full_name: string | null; avatar_url: string | null }>();
    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id,email,full_name,avatar_url')
        .in('id', userIds);

      if (!profilesError && profiles) {
        profileMap = new Map(
          profiles.map((profile: any) => [
            profile.id,
            {
              email: profile.email ?? null,
              full_name: profile.full_name ?? null,
              avatar_url: profile.avatar_url ?? null,
            },
          ])
        );
      }
    }

    const enrichedRows = rows.map((row: any) => ({
      ...row,
      profiles: profileMap.get(row.user_id) || null,
    }));

    return { data: enrichedRows, error: null };
  } catch (error: any) {
    console.error('Error fetching pending verifications:', error);
    return { data: null, error };
  }
}

export async function getPendingWithdrawals() {
  try {
    const { data: withdrawals, error } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .order('requested_at', { ascending: false });

    if (error) throw error;

    const mentorIds = Array.from(
      new Set((withdrawals || []).map((item: any) => item.mentor_id).filter(Boolean)),
    );

    let profilesById = new Map<string, { email: string | null; full_name: string | null }>();
    let payoutAccountsByMentorId = new Map<string, any>();
    let legacyPayoutProfilesByMentorId = new Map<string, any>();
    let paymentProfilesByMentorId = new Map<string, any>();
    if (mentorIds.length > 0) {
      const { data: profileRows, error: profilesError } = await supabase
        .from('profiles')
        .select('id,email,full_name')
        .in('id', mentorIds);

      if (profilesError) throw profilesError;

      const { data: payoutRows, error: payoutError } = await supabase
        .from('mentor_payout_accounts')
        .select('mentor_id,payout_method,account_holder_name,account_number,ifsc_code,bank_name,upi_id,is_active,updated_at')
        .in('mentor_id', mentorIds)
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      const payoutRowsSafe = payoutError ? [] : payoutRows || [];

      const { data: legacyPayoutRows, error: legacyPayoutError } = await supabase
        .from('mentor_payout_profiles')
        .select('mentor_id,payout_method,account_holder_name,account_number,ifsc_code,upi_id,is_active,updated_at')
        .in('mentor_id', mentorIds)
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      const legacyPayoutRowsSafe = legacyPayoutError ? [] : legacyPayoutRows || [];

      const { data: paymentProfileRows, error: paymentProfileError } = await supabase
        .from('mentor_payment_profiles')
        .select('mentor_id,payout_method,account_holder_name,account_number,ifsc_code,upi_id,is_active,updated_at')
        .in('mentor_id', mentorIds)
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      const paymentProfileRowsSafe = paymentProfileError ? [] : paymentProfileRows || [];

      profilesById = new Map(
        (profileRows || []).map((profile: any) => [
          profile.id,
          {
            email: profile.email || null,
            full_name: profile.full_name || null,
          },
        ]),
      );

      for (const payoutRow of payoutRowsSafe) {
        if (!payoutAccountsByMentorId.has(payoutRow.mentor_id)) {
          payoutAccountsByMentorId.set(payoutRow.mentor_id, payoutRow);
        }
      }

      for (const legacyPayoutRow of legacyPayoutRowsSafe) {
        if (!legacyPayoutProfilesByMentorId.has(legacyPayoutRow.mentor_id)) {
          legacyPayoutProfilesByMentorId.set(legacyPayoutRow.mentor_id, legacyPayoutRow);
        }
      }

      for (const paymentProfileRow of paymentProfileRowsSafe) {
        if (!paymentProfilesByMentorId.has(paymentProfileRow.mentor_id)) {
          paymentProfilesByMentorId.set(paymentProfileRow.mentor_id, paymentProfileRow);
        }
      }
    }

    const data = (withdrawals || []).map((withdrawal: any) => ({
      ...withdrawal,
      profiles: profilesById.get(withdrawal.mentor_id) || {
        email: null,
        full_name: null,
      },
      payout_account: payoutAccountsByMentorId.get(withdrawal.mentor_id) || null,
      payout_profile: legacyPayoutProfilesByMentorId.get(withdrawal.mentor_id) || null,
      payment_profile: paymentProfilesByMentorId.get(withdrawal.mentor_id) || null,
    }));

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
