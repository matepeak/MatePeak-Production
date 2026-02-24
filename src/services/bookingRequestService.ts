import { supabase } from "@/integrations/supabase/client";

export interface BookingRequest {
  id: string;
  mentee_id: string;
  mentor_id: string;
  requested_date: string;
  requested_start_time: string;
  requested_end_time: string;
  message?: string;
  status: string;
  mentor_response?: string;
  created_at: string;
  mentor?: {
    id: string;
    full_name: string;
    username?: string;
    profile_picture_url?: string;
    headline?: string;
    expertise?: string[];
  };
}

export interface CreateBookingRequestData {
  mentor_id: string;
  requested_date: string;
  requested_start_time: string;
  requested_end_time: string;
  message?: string;
}

/**
 * Fetch all booking requests for a student
 */
export async function fetchBookingRequests(
  menteeId: string
): Promise<BookingRequest[]> {
  try {
    // Fetch requests without join for reliability
    const { data: plainData, error: reqError } = await supabase
      .from("booking_requests")
      .select("*")
      .eq("mentee_id", menteeId)
      .order("created_at", { ascending: false });

    if (reqError) {
      console.error("❌ Error fetching booking requests:", reqError);
      throw reqError;
    }

    const current = plainData || [];

    // Try fetching from legacy table if present and merge results
    const legacy = await fetchLegacyTimeRequests(menteeId);
    const allRequests = [...current, ...legacy];

    // Attach mentor details from expert_profiles, fallback to profiles
    const mentorIds = Array.from(new Set(allRequests.map((r: any) => r.mentor_id).filter(Boolean)));
    const mentorMap = new Map<string, any>();

    console.log("🔍 TimeRequest Debug - Mentor IDs to fetch:", mentorIds);

    if (mentorIds.length > 0) {
      // First try expert_profiles for richer mentor info
      const { data: experts, error: expertsErr } = await supabase
        .from("expert_profiles")
        .select("id, full_name, username, profile_picture_url, headline, expertise_tags")
        .in("id", mentorIds);

      console.log("🔍 Expert profiles fetched:", experts);
      console.log("🔍 Expert profiles error:", expertsErr);

      if (!expertsErr && experts) {
        experts.forEach((m: any) => {
          console.log(`🔍 Expert ${m.full_name}: profile_picture_url =`, m.profile_picture_url);
          mentorMap.set(m.id, {
            ...m,
            expertise: m.expertise_tags // Map expertise_tags to expertise for interface compatibility
          });
        });
      }

      // Fill gaps from profiles where expert_profiles missing
      const missingIds = mentorIds.filter((id) => !mentorMap.has(id));
      console.log("🔍 Missing mentor IDs (not in expert_profiles):", missingIds);
      
      if (missingIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", missingIds);
        
        console.log("🔍 Profiles fallback data:", profiles);
        
        (profiles || []).forEach((p: any) => {
          console.log(`🔍 Profile ${p.full_name}: avatar_url =`, p.avatar_url);
          mentorMap.set(p.id, {
            id: p.id,
            full_name: p.full_name,
            profile_picture_url: p.avatar_url,
            headline: undefined,
            expertise: undefined,
          });
        });
      }
      
      // CRITICAL FIX: Also get avatar_url from profiles for ALL mentors to supplement missing images
      const { data: allProfiles } = await supabase
        .from("profiles")
        .select("id, avatar_url")
        .in("id", mentorIds);
      
      console.log("🔍 All profiles for avatar_url supplement:", allProfiles);
      
      (allProfiles || []).forEach((p: any) => {
        const existing = mentorMap.get(p.id);
        if (existing && !existing.profile_picture_url && p.avatar_url) {
          console.log(`🔍 Supplementing ${existing.full_name} with avatar_url:`, p.avatar_url);
          existing.profile_picture_url = p.avatar_url;
        }
      });
    }

    console.log("🔍 Final mentorMap:", Array.from(mentorMap.values()));

    // Return requests with attached mentor details
    return allRequests.map((r: any) => ({ ...r, mentor: mentorMap.get(r.mentor_id) }));
  } catch (error) {
    console.error("Error in fetchBookingRequests:", error);
    return [];
  }
}

/**
 * Legacy fallback: fetch from custom_time_requests if that table exists
 * and normalize to BookingRequest shape with minimal fields
 */
async function fetchLegacyTimeRequests(menteeId: string): Promise<BookingRequest[]> {
  try {
    const { data, error } = await supabase
      .from("custom_time_requests")
      .select("*")
      .eq("mentee_id", menteeId)
      .order("created_at", { ascending: false });

    if (error) {
      // If table doesn't exist or access denied, just return empty
      console.warn("Legacy time requests unavailable:", error.message);
      return [];
    }

    const rows = (data || []) as any[];
    return rows.map((r) => ({
      id: r.id,
      mentee_id: r.mentee_id,
      mentor_id: r.mentor_id,
      requested_date: r.requested_date || r.date || new Date().toISOString().split("T")[0],
      requested_start_time: r.requested_start_time || r.start_time || "00:00",
      requested_end_time: r.requested_end_time || r.end_time || "00:00",
      message: r.message || "",
      status: r.status || "pending",
      mentor_response: r.mentor_response || undefined,
      created_at: r.created_at || new Date().toISOString(),
      mentor: undefined,
    }));
  } catch (err) {
    console.warn("Legacy fetch error:", err);
    return [];
  }
}

/**
 * Create a new booking request
 */
export async function createBookingRequest(
  data: CreateBookingRequestData
): Promise<{ success: boolean; data?: BookingRequest; error?: string }> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: "You must be logged in to create a time request",
      };
    }

    // Validate required fields
    if (
      !data.mentor_id ||
      !data.requested_date ||
      !data.requested_start_time ||
      !data.requested_end_time
    ) {
      return {
        success: false,
        error: "Missing required fields",
      };
    }

    // Validate date is not in the past
    const requestedDate = new Date(data.requested_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (requestedDate < today) {
      return {
        success: false,
        error: "Cannot request sessions in the past",
      };
    }

    // Validate time range
    const startMinutes = parseTime(data.requested_start_time);
    const endMinutes = parseTime(data.requested_end_time);

    if (startMinutes >= endMinutes) {
      return {
        success: false,
        error: "End time must be after start time",
      };
    }

    const durationMinutes = endMinutes - startMinutes;
    if (durationMinutes < 15) {
      return {
        success: false,
        error: "Session must be at least 15 minutes",
      };
    }

    if (durationMinutes > 240) {
      return {
        success: false,
        error: "Session cannot exceed 4 hours",
      };
    }

    // Create the booking request
    const { data: request, error } = await supabase
      .from("booking_requests")
      .insert({
        mentee_id: user.id,
        mentor_id: data.mentor_id,
        requested_date: data.requested_date,
        requested_start_time: data.requested_start_time,
        requested_end_time: data.requested_end_time,
        message: data.message || "",
        status: "pending",
      })
      .select(
        `
        *,
        mentor:expert_profiles!mentor_id (
          id,
          full_name,
          username,
          profile_picture_url,
          headline,
          expertise_tags
        )
      `
      )
      .single();

    if (error) {
      console.error("❌ Error creating booking request:", error);
      return {
        success: false,
        error: error.message || "Failed to create time request",
      };
    }

    return {
      success: true,
      data: request,
    };
  } catch (error: any) {
    console.error("Error in createBookingRequest:", error);
    return {
      success: false,
      error: error.message || "An unexpected error occurred",
    };
  }
}

/**
 * Delete a booking request (only if pending)
 */
export async function deleteBookingRequest(
  requestId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: "Not authenticated",
      };
    }

    // First verify the request belongs to the user and is pending
    const { data: request, error: fetchError } = await supabase
      .from("booking_requests")
      .select("id, status, mentee_id")
      .eq("id", requestId)
      .single();

    if (fetchError) {
      return {
        success: false,
        error: "Request not found",
      };
    }

    if (request.mentee_id !== user.id) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    if (request.status !== "pending") {
      return {
        success: false,
        error: "Can only delete pending requests",
      };
    }

    // Delete the request
    const { error } = await supabase
      .from("booking_requests")
      .delete()
      .eq("id", requestId)
      .eq("mentee_id", user.id);

    if (error) {
      console.error("❌ Error deleting booking request:", error);
      return {
        success: false,
        error: error.message || "Failed to delete request",
      };
    }

    return {
      success: true,
    };
  } catch (error: any) {
    console.error("Error in deleteBookingRequest:", error);
    return {
      success: false,
      error: error.message || "An unexpected error occurred",
    };
  }
}

/**
 * Fetch available mentors for time requests (mentors the student has booked before)
 */
export async function fetchAvailableMentors(studentId: string) {
  try {
    const { data, error } = await supabase
      .from("bookings")
      .select(
        `
        expert_id,
        expert:expert_profiles!expert_id (
          id,
          full_name,
          username,
          profile_picture_url,
          headline,
          expertise
        )
      `
      )
      .eq("student_id", studentId);

    if (error) {
      console.error("❌ Error fetching available mentors:", error);
      throw error;
    }

    // Get unique mentors
    const mentorMap = new Map();
    (data || []).forEach((booking) => {
      if (booking.expert && !mentorMap.has(booking.expert_id)) {
        mentorMap.set(booking.expert_id, booking.expert);
      }
    });

    return Array.from(mentorMap.values());
  } catch (error) {
    console.error("Error in fetchAvailableMentors:", error);
    return [];
  }
}

/**
 * Helper: Parse time string to minutes
 */
function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}
