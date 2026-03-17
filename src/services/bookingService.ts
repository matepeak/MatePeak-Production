import { supabase } from "@/integrations/supabase/client";
import { generateMeetingLink } from "./meetingService";
import { enforceRateLimit } from "@/services/rateLimitService";
import { normalizeServiceType } from "@/config/serviceConfig";

/**
 * BOOKING SLOT AVAILABILITY SYSTEM
 *
 * How it works:
 * 1. When a user CONFIRMS a booking, that time slot is blocked for other users
 * 2. Only CONFIRMED bookings block availability slots
 * 3. When a booking is CANCELLED before the session:
 *    - The time slot immediately becomes available again (if still valid/future)
 *    - Other users can book that slot
 * 4. Pending bookings DO NOT block slots
 * 5. Declined bookings DO NOT block slots
 *
 * This ensures:
 * - No double-booking of confirmed sessions
 * - Cancelled slots are automatically recycled
 * - Users always see up-to-date availability
 */

export interface CreateBookingData {
  expert_id: string;
  session_type: string;
  service_key?: string;
  scheduled_date: string; // YYYY-MM-DD format
  scheduled_time: string; // HH:MM format
  duration: number; // minutes
  message?: string;
  total_amount: number;
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  add_recording?: boolean;
  digital_product_link?: string;
}

export interface AvailabilitySlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  specific_date: string | null;
}

export interface TimeSlot {
  time: string;
  available: boolean;
  booked?: boolean;
}

function resolveServicePricingByType(
  servicePricing: Record<string, any> | undefined,
  sessionType: string,
  serviceKey?: string
) {
  if (!servicePricing) return null;

  // Exact lookup by the selected service key when provided.
  if (serviceKey && servicePricing[serviceKey]) {
    return servicePricing[serviceKey];
  }

  // Primary lookup for canonical keys.
  if (servicePricing[sessionType]) {
    return servicePricing[sessionType];
  }

  const targetType = normalizeServiceType(sessionType) || sessionType;

  // Fallback lookup for legacy keys that normalize to the same type.
  const byNormalizedKey = Object.entries(servicePricing).find(([key]) => {
    const normalizedKeyType = normalizeServiceType(key) || key;
    return normalizedKeyType === targetType;
  });

  if (byNormalizedKey) {
    return byNormalizedKey[1];
  }

  // Fallback lookup for custom keys storing canonical type in value.type.
  const matchedEntry = Object.values(servicePricing).find((entry: any) => {
    const entryType = normalizeServiceType(entry?.type || "") || entry?.type;
    return entryType === targetType;
  });

  return matchedEntry || null;
}

function isServiceEnabled(value: any): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
}

/**
 * Validate and calculate booking price server-side
 */
async function validateBookingPrice(
  expertId: string,
  sessionType: string,
  duration: number,
  addRecording: boolean = false,
  serviceKey?: string
): Promise<{ success: boolean; price?: number; error?: string }> {
  try {
    // Fetch mentor's service pricing from database
    const { data: profile, error } = await supabase
      .from("expert_profiles")
      .select("service_pricing")
      .eq("id", expertId)
      .single();

    if (error || !profile) {
      return {
        success: false,
        error: "Mentor not found",
      };
    }

    const servicePricing = resolveServicePricingByType(
      profile.service_pricing,
      sessionType,
      serviceKey
    );

    if (!servicePricing || !isServiceEnabled(servicePricing.enabled)) {
      return {
        success: false,
        error: "This service is not available",
      };
    }

    // Calculate expected price
    let basePrice = servicePricing.price || 0;

    // For oneOnOneSession, price might vary by duration
    // Currently using same price regardless of duration
    // You can add duration-based pricing logic here

    // Add recording price if applicable
    const RECORDING_PRICE = 300;
    const recordingFee =
      addRecording && sessionType === "oneOnOneSession" ? RECORDING_PRICE : 0;

    const totalPrice = basePrice + recordingFee;

    return {
      success: true,
      price: totalPrice,
    };
  } catch (error: any) {
    console.error("Price validation error:", error);
    return {
      success: false,
      error: "Failed to validate price",
    };
  }
}

/**
 * Create a new booking
 */
export async function createBooking(data: CreateBookingData) {
  try {
    // 1. Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: "You must be logged in to book a session",
        data: null,
      };
    }

    // 2. RATE LIMITING - Prevent spam bookings
    try {
      await enforceRateLimit("booking_create", user.id);
    } catch (error: any) {
      return {
        success: false,
        error:
          error.message || "Too many booking requests. Please try again later.",
        data: null,
      };
    }

    // 2. Validate required fields
    if (
      !data.expert_id ||
      !data.session_type ||
      !data.scheduled_date ||
      !data.scheduled_time
    ) {
      return {
        success: false,
        error: "Missing required booking information",
        data: null,
      };
    }

    // 3. Validate date is not in the past
    const bookingDate = new Date(data.scheduled_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (bookingDate < today) {
      return {
        success: false,
        error: "Cannot book sessions in the past",
        data: null,
      };
    }

    // 4. Validate duration (only for video sessions)
    if (data.session_type === "oneOnOneSession") {
      if (data.duration < 15 || data.duration > 240) {
        return {
          success: false,
          error: "Session duration must be between 15 and 240 minutes",
          data: null,
        };
      }
    }

    // 5. SERVER-SIDE PRICE VALIDATION
    const priceValidation = await validateBookingPrice(
      data.expert_id,
      data.session_type,
      data.duration,
      data.add_recording,
      data.service_key
    );

    if (!priceValidation.success) {
      return {
        success: false,
        error: priceValidation.error || "Price validation failed",
        data: null,
      };
    }

    const serverCalculatedPrice = priceValidation.price!;

    // Check if client-sent price matches server calculation
    const priceDifference = Math.abs(data.total_amount - serverCalculatedPrice);
    if (priceDifference > 0.01) {
      console.warn(
        `Price mismatch: Client sent ${data.total_amount}, Server calculated ${serverCalculatedPrice}`
      );
      // Use server-calculated price
      data.total_amount = serverCalculatedPrice;
    }

    // 6. Validate email format if provided
    if (data.user_email && !isValidEmail(data.user_email)) {
      return {
        success: false,
        error: "Invalid email format",
        data: null,
      };
    }

    // 7. Sanitize inputs
    const sanitizedMessage = sanitizeInput(data.message || "");
    const sanitizedName = sanitizeInput(data.user_name || "");
    const sanitizedPhone = sanitizeInput(data.user_phone || "");

    // For digital products, snapshot the current configured product link on the booking.
    let digitalProductLink: string | null = null;
    if (data.session_type === "digitalProducts") {
      const linkResult = await getDigitalProductLink(
        data.expert_id,
        data.service_key
      );
      if (!linkResult.success || !linkResult.productLink) {
        return {
          success: false,
          error:
            linkResult.error ||
            "This mentor has not configured a digital product link yet.",
          data: null,
        };
      }
      digitalProductLink = linkResult.productLink;
    }

    // 8. Check booking conflicts only for scheduled one-on-one sessions.
    if (data.session_type === "oneOnOneSession") {
      const conflictCheck = await checkBookingConflict(
        data.expert_id,
        data.scheduled_date,
        data.scheduled_time,
        data.duration
      );

      if (!conflictCheck.success) {
        return {
          success: false,
          error: conflictCheck.error || "Booking conflict detected",
          data: null,
        };
      }
    }

    // 9. Create booking record with server-validated price
    // During BETA: All bookings are FREE and auto-confirmed
    const { data: booking, error } = await supabase
      .from("bookings")
      .insert({
        user_id: user.id,
        expert_id: data.expert_id,
        session_type: data.session_type,
        scheduled_date: data.scheduled_date,
        scheduled_time: data.scheduled_time,
        duration: data.duration,
        message: sanitizedMessage,
        total_amount: serverCalculatedPrice, // Keep original price for records
        status: "confirmed", // AUTO-CONFIRM during beta (was 'pending')
        user_name: sanitizedName,
        user_email: data.user_email,
        user_phone: sanitizedPhone,
        price_verified: true,
        payment_status: "free", // Use 'free' for beta bookings without payment
        meeting_link: null,
        meeting_provider: null,
        meeting_id: null,
        digital_product_link: digitalProductLink,
      })
      .select()
      .single();

    if (error) {
      console.error("Booking creation error:", error);
      return {
        success: false,
        error: error.message || "Failed to create booking",
        data: null,
      };
    }

    // 10. Generate meeting link only for oneOnOneSession bookings
    if (data.session_type === "oneOnOneSession") {
      try {
        // Fetch mentor name for meeting room
        const { data: mentorProfile } = await supabase
          .from("expert_profiles")
          .select("full_name, username")
          .eq("id", data.expert_id)
          .single();

        const mentorName =
          mentorProfile?.full_name || mentorProfile?.username || "mentor";

        // Generate Jitsi meeting link (free, no API key needed)
        const meetingConfig = generateMeetingLink(
          booking.id,
          mentorName,
          data.session_type,
          "jitsi"
        );

        // Update booking with meeting link
        const { error: updateError } = await supabase
          .from("bookings")
          .update({
            meeting_link: meetingConfig.meetingLink,
            meeting_provider: meetingConfig.provider,
            meeting_id: meetingConfig.meetingId,
          })
          .eq("id", booking.id);

        if (updateError) {
          console.error("Failed to add meeting link:", updateError);
          // Don't fail the booking, just log the error
        } else {
          // Add meeting link to returned booking data
          booking.meeting_link = meetingConfig.meetingLink;
          booking.meeting_provider = meetingConfig.provider;
          booking.meeting_id = meetingConfig.meetingId;
        }
      } catch (meetingError) {
        console.error("Meeting link generation error:", meetingError);
        // Don't fail the booking if meeting link generation fails
      }
    }

    return {
      success: true,
      data: booking,
      message: "Booking created successfully",
    };
  } catch (error: any) {
    console.error("Booking service error:", error);
    return {
      success: false,
      error: error.message || "An unexpected error occurred",
      data: null,
    };
  }
}

/**
 * Helper: Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Helper: Sanitize input to prevent XSS
 */
function sanitizeInput(input: string): string {
  if (!input) return "";
  // Remove HTML tags and trim
  return input
    .replace(/<[^>]*>/g, "")
    .trim()
    .substring(0, 1000);
}

async function getDigitalProductLink(
  expertId: string,
  serviceKey?: string
): Promise<{ success: boolean; productLink?: string; error?: string }> {
  try {
    const { data: profile, error } = await supabase
      .from("expert_profiles")
      .select("service_pricing")
      .eq("id", expertId)
      .single();

    if (error || !profile) {
      return { success: false, error: "Mentor profile not found" };
    }

    const digitalConfig = resolveServicePricingByType(
      profile.service_pricing,
      "digitalProducts",
      serviceKey
    );
    if (!digitalConfig || !isServiceEnabled(digitalConfig.enabled)) {
      return {
        success: false,
        error: "Digital product service is not enabled for this mentor",
      };
    }

    const rawLink =
      digitalConfig.productLink ||
      digitalConfig.product_url ||
      digitalConfig.product_link ||
      "";
    const productLink = String(rawLink).trim();

    if (!isValidHttpsUrl(productLink)) {
      return {
        success: false,
        error: "Mentor digital product link is invalid or missing",
      };
    }

    return { success: true, productLink };
  } catch (error: any) {
    console.error("Error fetching digital product link:", error);
    return { success: false, error: "Failed to resolve digital product link" };
  }
}

function isValidHttpsUrl(value: string): boolean {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Helper: Check for booking conflicts
 * Only confirmed bookings create conflicts - pending, cancelled, or declined don't block slots
 */
async function checkBookingConflict(
  expertId: string,
  date: string,
  time: string,
  duration: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: existingBookings, error } = await supabase
      .from("bookings")
      .select("scheduled_time, duration")
      .eq("expert_id", expertId)
      .eq("scheduled_date", date)
      .eq("status", "confirmed"); // Only confirmed bookings block slots

    if (error) {
      return { success: false, error: "Failed to check availability" };
    }

    if (!existingBookings || existingBookings.length === 0) {
      return { success: true };
    }

    // Check for time conflicts
    const requestedStart = parseTime(time);
    const requestedEnd = requestedStart + duration;

    for (const booking of existingBookings) {
      const bookedStart = parseTime(booking.scheduled_time);
      const bookedEnd = bookedStart + booking.duration;

      // Check overlap
      if (requestedStart < bookedEnd && requestedEnd > bookedStart) {
        return {
          success: false,
          error:
            "This time slot is already booked. Please choose another time.",
        };
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error("Conflict check error:", error);
    return { success: false, error: "Failed to verify availability" };
  }
}

/**
 * Get mentor's availability slots for a specific date range
 */
export async function getMentorAvailability(
  mentorId: string,
  startDate: string,
  endDate: string
) {
  try {
    // Fetch recurring availability
    const { data: recurringSlots, error: recurringError } = await supabase
      .from("availability_slots")
      .select("*")
      .eq("expert_id", mentorId)
      .eq("is_recurring", true);

    if (recurringError) throw recurringError;

    // Fetch specific date slots
    const { data: specificSlots, error: specificError } = await supabase
      .from("availability_slots")
      .select("*")
      .eq("expert_id", mentorId)
      .eq("is_recurring", false)
      .gte("specific_date", startDate)
      .lte("specific_date", endDate);

    if (specificError) throw specificError;

    // Fetch blocked dates
    const { data: blockedDates, error: blockedError } = await supabase
      .from("blocked_dates")
      .select("*")
      .eq("expert_id", mentorId)
      .gte("date", startDate)
      .lte("date", endDate);

    if (blockedError) throw blockedError;

    return {
      success: true,
      data: {
        recurringSlots: recurringSlots || [],
        specificSlots: specificSlots || [],
        blockedDates: blockedDates || [],
      },
    };
  } catch (error: any) {
    console.error("Error fetching availability:", error);
    return {
      success: false,
      error: error.message || "Failed to fetch availability",
      data: null,
    };
  }
}

/**
 * Get booked time slots for a mentor on a specific date
 * Only includes confirmed bookings - cancelled and declined bookings free up the slot
 */
export async function getBookedSlots(mentorId: string, date: string) {
  try {
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("scheduled_time, duration")
      .eq("expert_id", mentorId)
      .eq("scheduled_date", date)
      .eq("status", "confirmed"); // Only confirmed bookings block slots

    if (error) throw error;

    return {
      success: true,
      data: bookings || [],
    };
  } catch (error: any) {
    console.error("Error fetching booked slots:", error);
    return {
      success: false,
      error: error.message || "Failed to fetch booked slots",
      data: [],
    };
  }
}

/**
 * Generate available time slots for a specific date
 * Takes into account mentor's availability and existing bookings
 *
 * SLOT AVAILABILITY RULES:
 * - Only CONFIRMED bookings block time slots
 * - Pending bookings DO NOT block slots (can be overbooked until confirmed)
 * - Cancelled bookings immediately free up the slot
 * - Declined bookings free up the slot
 * - Past time slots (if date is today) are automatically filtered out
 */
export async function getAvailableTimeSlots(
  mentorId: string,
  date: Date,
  duration: number = 60
): Promise<{ success: boolean; data: TimeSlot[]; error?: string }> {
  try {
    const dateStr = date.toISOString().split("T")[0];
    const dayOfWeek = date.getDay();

    // Check if selected date is today
    const today = new Date();
    const isToday = dateStr === today.toISOString().split("T")[0];
    const currentTimeInMinutes = isToday
      ? today.getHours() * 60 + today.getMinutes()
      : 0;

    // Get mentor's availability
    const availabilityResult = await getMentorAvailability(
      mentorId,
      dateStr,
      dateStr
    );

    if (!availabilityResult.success || !availabilityResult.data) {
      return {
        success: false,
        data: [],
        error: "Failed to fetch availability",
      };
    }

    const { recurringSlots, specificSlots, blockedDates } =
      availabilityResult.data;

    // Check if date is blocked
    const isBlocked = blockedDates.some((blocked) => blocked.date === dateStr);
    if (isBlocked) {
      return {
        success: true,
        data: [],
      };
    }

    // Get booked slots
    const bookedResult = await getBookedSlots(mentorId, dateStr);
    const bookedSlots = bookedResult.data || [];

    // Find applicable availability slots
    const applicableSlots = [
      ...recurringSlots.filter((slot) => slot.day_of_week === dayOfWeek),
      ...specificSlots.filter((slot) => slot.specific_date === dateStr),
    ];

    if (applicableSlots.length === 0) {
      return {
        success: true,
        data: [],
      };
    }

    // Generate time slots
    const timeSlots: TimeSlot[] = [];
    const slotInterval = 30; // 30-minute intervals

    for (const slot of applicableSlots) {
      const startTime = parseTime(slot.start_time);
      const endTime = parseTime(slot.end_time);

      let currentTime = startTime;

      while (currentTime + duration <= endTime) {
        const timeStr = formatTime(currentTime);

        // Skip past time slots if it's today
        if (isToday && currentTime <= currentTimeInMinutes) {
          currentTime += slotInterval;
          continue;
        }

        const isBooked = isTimeBooked(timeStr, duration, bookedSlots);

        timeSlots.push({
          time: timeStr,
          available: !isBooked,
          booked: isBooked,
        });

        currentTime += slotInterval;
      }
    }

    // Sort and remove duplicates
    const uniqueSlots = Array.from(
      new Map(timeSlots.map((slot) => [slot.time, slot])).values()
    ).sort((a, b) => a.time.localeCompare(b.time));

    return {
      success: true,
      data: uniqueSlots,
    };
  } catch (error: any) {
    console.error("Error generating time slots:", error);
    return {
      success: false,
      data: [],
      error: error.message || "Failed to generate time slots",
    };
  }
}

/**
 * Helper function to parse time string (HH:MM) to minutes
 */
function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Helper function to format minutes to time string (HH:MM)
 */
function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins
    .toString()
    .padStart(2, "0")}`;
}

/**
 * Check if a time slot conflicts with any booked slots
 */
function isTimeBooked(
  time: string,
  duration: number,
  bookedSlots: Array<{ scheduled_time: string; duration: number }>
): boolean {
  const slotStart = parseTime(time);
  const slotEnd = slotStart + duration;

  return bookedSlots.some((booked) => {
    const bookedStart = parseTime(booked.scheduled_time);
    const bookedEnd = bookedStart + booked.duration;

    // Check if there's any overlap
    return slotStart < bookedEnd && slotEnd > bookedStart;
  });
}

/**
 * Get user's bookings
 */
export async function getUserBookings() {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: "Not authenticated",
        data: [],
      };
    }

    const { data, error } = await supabase
      .from("bookings")
      .select(
        `
        *,
        expert:expert_profiles(
          id,
          full_name,
          category,
          profile_picture_url,
          username
        )
      `
      )
      .eq("user_id", user.id)
      .order("scheduled_date", { ascending: false })
      .order("scheduled_time", { ascending: false });

    if (error) throw error;

    return {
      success: true,
      data: data || [],
    };
  } catch (error: any) {
    console.error("Error fetching user bookings:", error);
    return {
      success: false,
      error: error.message || "Failed to fetch bookings",
      data: [],
    };
  }
}

/**
 * Get mentor's bookings
 */
export async function getMentorBookings() {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: "Not authenticated",
        data: [],
      };
    }

    // Get expert profile ID
    const { data: profile, error: profileError } = await supabase
      .from("expert_profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return {
        success: false,
        error: "Mentor profile not found",
        data: [],
      };
    }

    const { data, error } = await supabase
      .from("bookings")
      .select(
        `
        *,
        student:profiles!bookings_user_id_fkey(
          full_name,
          email,
          avatar_url
        )
      `
      )
      .eq("expert_id", profile.id)
      .order("scheduled_date", { ascending: false })
      .order("scheduled_time", { ascending: false });

    if (error) throw error;

    return {
      success: true,
      data: data || [],
    };
  } catch (error: any) {
    console.error("Error fetching mentor bookings:", error);
    return {
      success: false,
      error: error.message || "Failed to fetch bookings",
      data: [],
    };
  }
}

/**
 * Cancel a booking
 */
export async function cancelBooking(bookingId: string) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: "Not authenticated",
        data: null,
      };
    }

    const { data, error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data,
      message: "Booking cancelled successfully",
    };
  } catch (error: any) {
    console.error("Error cancelling booking:", error);
    return {
      success: false,
      error: error.message || "Failed to cancel booking",
      data: null,
    };
  }
}

/**
 * Student Dashboard specific functions
 */

export interface StudentBooking {
  id: string;
  student_id: string;
  expert_id: string;
  session_date: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  duration: number;
  message?: string;
  total_amount: number;
  meeting_link?: string;
  digital_product_link?: string;
  expert?: {
    id: string;
    full_name: string;
    username?: string;
    profile_picture_url?: string;
    headline?: string;
  };
}

export interface BookingStats {
  totalSessions: number;
  upcomingSessions: number;
  completedSessions: number;
  totalHours: number;
}

/**
 * Fetch student bookings with filters
 */
export async function fetchStudentBookings(
  studentId: string,
  filters?: {
    status?: string;
    searchQuery?: string;
  }
): Promise<StudentBooking[]> {
  try {
    let query = supabase
      .from("bookings")
      .select(
        `
        *,
        expert:expert_profiles!expert_id (
          id,
          full_name,
          username,
          profile_picture_url,
          headline
        )
      `
      )
      .eq("student_id", studentId)
      .order("session_date", { ascending: false });

    if (filters?.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("❌ Error fetching student bookings:", error);
      throw error;
    }

    let results = data || [];
    if (filters?.searchQuery && results.length > 0) {
      const searchLower = filters.searchQuery.toLowerCase();
      results = results.filter((booking) => {
        const mentorName = booking.expert?.full_name?.toLowerCase() || "";
        return mentorName.includes(searchLower);
      });
    }

    return results;
  } catch (error) {
    console.error("Error in fetchStudentBookings:", error);
    return [];
  }
}

/**
 * Get next upcoming session for student
 */
export async function fetchUpcomingSession(
  studentId: string
): Promise<StudentBooking | null> {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("bookings")
      .select(
        `
        *,
        expert:expert_profiles!expert_id (
          id,
          full_name,
          username,
          profile_picture_url,
          headline
        )
      `
      )
      .eq("student_id", studentId)
      .gte("session_date", now)
      .order("session_date", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.error("❌ Error fetching upcoming session:", error);
      throw error;
    }

    return data || null;
  } catch (error) {
    console.error("Error in fetchUpcomingSession:", error);
    return null;
  }
}

/**
 * Get booking statistics for student
 */
export async function getStudentBookingStats(
  studentId: string
): Promise<BookingStats> {
  try {
    const { data, error } = await supabase
      .from("bookings")
      .select("status, duration, session_date")
      .eq("student_id", studentId);

    if (error) {
      console.error("❌ Error fetching booking stats:", error);
      throw error;
    }

    const bookings = data || [];
    const now = new Date().toISOString();

    const stats: BookingStats = {
      totalSessions: bookings.length,
      upcomingSessions: bookings.filter((b) => b.session_date >= now && b.status === "confirmed").length,
      completedSessions: bookings.filter((b) => b.status === "completed").length,
      totalHours: Math.round(
        bookings.reduce((sum, b) => sum + (b.duration || 0), 0) / 60
      ),
    };

    return stats;
  } catch (error) {
    console.error("Error in getStudentBookingStats:", error);
    return {
      totalSessions: 0,
      upcomingSessions: 0,
      completedSessions: 0,
      totalHours: 0,
    };
  }
}

/**
 * Get unique mentors from student's bookings
 */
export async function fetchStudentMentors(studentId: string) {
  try {
    const { data, error } = await supabase
      .from("bookings")
      .select(
        `
        expert_id,
        session_date,
        expert:expert_profiles!expert_id (
          id,
          full_name,
          username,
          profile_picture_url,
          headline
        )
      `
      )
      .eq("student_id", studentId)
      .order("session_date", { ascending: false });

    if (error) {
      console.error("❌ Error fetching student mentors:", error);
      throw error;
    }

    const bookings = data || [];
    const mentorMap = new Map();
    const now = new Date().toISOString();

    bookings.forEach((booking) => {
      if (booking.expert) {
        const mentorId = booking.expert_id;
        if (!mentorMap.has(mentorId)) {
          mentorMap.set(mentorId, {
            ...booking.expert,
            sessionCount: 0,
            nextSession: undefined,
          });
        }

        const mentor = mentorMap.get(mentorId);
        mentor.sessionCount = (mentor.sessionCount || 0) + 1;

        if (booking.session_date >= now && !mentor.nextSession) {
          mentor.nextSession = booking.session_date;
        }
      }
    });

    return Array.from(mentorMap.values());
  } catch (error) {
    console.error("Error in fetchStudentMentors:", error);
    return [];
  }
}
