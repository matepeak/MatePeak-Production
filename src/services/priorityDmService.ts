import { supabase } from "@/integrations/supabase/client";

export interface PriorityDmThread {
  id: string;
  booking_id: string | null;
  requester_id: string;
  requester_role: "student" | "mentor";
  mentor_id: string;
  requester_name: string;
  requester_email: string;
  requester_phone: string | null;
  share_contact_info: boolean;
  message_text: string;
  mentor_reply_text: string | null;
  status: "submitted" | "answered" | "read_by_requester" | "deleted";
  submitted_at: string;
  answered_at: string | null;
  read_at: string | null;
  delete_after: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function createPriorityDm(params: {
  mentorId: string;
  messageText: string;
  shareContactInfo: boolean;
  bookingId: string;
}) {
  const { data, error } = await supabase.rpc("create_priority_dm", {
    p_mentor_id: params.mentorId,
    p_message_text: params.messageText,
    p_share_contact_info: params.shareContactInfo,
    p_booking_id: params.bookingId,
  });

  if (error) {
    return { success: false, error: error.message, data: null as PriorityDmThread | null };
  }

  return { success: true, error: null as string | null, data: data as PriorityDmThread };
}

export async function replyPriorityDm(threadId: string, replyText: string) {
  const { data, error } = await supabase.rpc("reply_priority_dm", {
    p_thread_id: threadId,
    p_reply_text: replyText,
  });

  if (error) {
    return { success: false, error: error.message, data: null as PriorityDmThread | null };
  }

  return { success: true, error: null as string | null, data: data as PriorityDmThread };
}

export async function markPriorityDmRead(threadId: string) {
  const { data, error } = await supabase.rpc("mark_priority_dm_read", {
    p_thread_id: threadId,
  });

  if (error) {
    return { success: false, error: error.message, data: null as PriorityDmThread | null };
  }

  return { success: true, error: null as string | null, data: data as PriorityDmThread };
}

export async function listMentorPriorityDmPending() {
  const { data, error } = await supabase.rpc("list_mentor_priority_dm_pending");

  if (error) {
    return { success: false, error: error.message, data: [] as PriorityDmThread[] };
  }

  return { success: true, error: null as string | null, data: (data || []) as PriorityDmThread[] };
}

export async function listRequesterPriorityDm() {
  const { data, error } = await supabase.rpc("list_requester_priority_dm");

  if (error) {
    return { success: false, error: error.message, data: [] as PriorityDmThread[] };
  }

  return { success: true, error: null as string | null, data: (data || []) as PriorityDmThread[] };
}
