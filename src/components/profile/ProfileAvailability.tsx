import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SERVICE_CONFIG } from "@/config/serviceConfig";
import {
  Calendar as CalendarIcon,
  Clock,
  XCircle,
  CheckCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Globe,
  Bell,
  MessageSquare,
  Filter,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { autoMigrateAvailabilitySlots } from "@/utils/availabilityMigration";

interface ProfileAvailabilityProps {
  mentorId: string;
  mentorName?: string;
  mentorTimezone?: string;
  onBookSlot?: (date: Date, time: string, timezone: string) => void;
}

interface AvailabilitySlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  specific_date: string | null;
}

interface BlockedDate {
  date: string;
  reason: string;
}

interface DaySchedule {
  date: Date;
  dateStr: string;
  dayName: string;
  isToday: boolean;
  isBlocked: boolean;
  slots: { start: string; end: string }[];
  blockedReason?: string;
}

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// Helper to get date string in local timezone (avoids UTC conversion)
const getLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Timezone utilities
const getUserTimezone = () => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

const isValidTimezone = (timezone: string): boolean => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch (e) {
    return false;
  }
};

const getTimezoneOffsetMinutes = (
  timezone: string,
  date: Date = new Date()
): number => {
  // If timezone is not a valid IANA timezone, treat as UTC
  if (!isValidTimezone(timezone)) {
    console.warn(`Invalid timezone: ${timezone}, using UTC`);
    return 0;
  }

  try {
    // Create a date string in the target timezone
    const dateInTz = new Date(
      date.toLocaleString("en-US", { timeZone: timezone })
    );
    const dateInUTC = new Date(
      date.toLocaleString("en-US", { timeZone: "UTC" })
    );

    // Return offset in minutes
    return (dateInTz.getTime() - dateInUTC.getTime()) / (1000 * 60);
  } catch (e) {
    console.error(`Error calculating timezone offset for ${timezone}:`, e);
    return 0;
  }
};

const convertTime = (
  time: string,
  date: string,
  fromTz: string,
  toTz: string
): { time: string; dateOffset: number } => {
  // If either timezone is invalid, return original time with no date change
  if (!isValidTimezone(fromTz) || !isValidTimezone(toTz)) {
    return { time, dateOffset: 0 };
  }

  try {
    const [hours, minutes] = time.split(":").map(Number);

    // Create a proper date object with the time in the source timezone
    const dateObj = new Date(date + "T00:00:00");

    // Get offset difference in minutes
    const offsetMinutes =
      getTimezoneOffsetMinutes(toTz, dateObj) -
      getTimezoneOffsetMinutes(fromTz, dateObj);

    // Convert time
    let totalMinutes = hours * 60 + minutes + offsetMinutes;
    let dayOffset = 0;

    // Handle day boundaries
    if (totalMinutes < 0) {
      dayOffset = -1;
      totalMinutes += 24 * 60;
    } else if (totalMinutes >= 24 * 60) {
      dayOffset = 1;
      totalMinutes -= 24 * 60;
    }

    const newHours = Math.floor(totalMinutes / 60);
    const newMinutes = totalMinutes % 60;

    return {
      time: `${String(newHours).padStart(2, "0")}:${String(newMinutes).padStart(
        2,
        "0"
      )}`,
      dateOffset: dayOffset,
    };
  } catch (e) {
    console.error("Error converting time:", e);
    return { time, dateOffset: 0 };
  }
};

export default function ProfileAvailability({
  mentorId,
  mentorName,
  mentorTimezone = "UTC",
  onBookSlot,
}: ProfileAvailabilityProps) {
  const [loading, setLoading] = useState(true);
  const [recurringSlots, setRecurringSlots] = useState<AvailabilitySlot[]>([]);
  const [specificSlots, setSpecificSlots] = useState<AvailabilitySlot[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
  );
  // Start from today instead of start of week
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [showUserTimezone, setShowUserTimezone] = useState(false);
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);

  // Session Type Selector state
  const [sessionTypes, setSessionTypes] = useState<string[]>([]);
  const [selectedSessionType, setSelectedSessionType] = useState<string>("all");

  // Request Custom Time state
  const [customTimeDialogOpen, setCustomTimeDialogOpen] = useState(false);
  const [requestedDate, setRequestedDate] = useState("");
  const [requestedStartTime, setRequestedStartTime] = useState("");
  const [requestedEndTime, setRequestedEndTime] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);

  // Availability Alerts state
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [alertEmail, setAlertEmail] = useState("");

  // Authentication state
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [alertDaysPreference, setAlertDaysPreference] = useState<string[]>([]);
  const [submittingAlert, setSubmittingAlert] = useState(false);

  // All Slots Modal state
  const [showAllSlotsModal, setShowAllSlotsModal] = useState(false);
  const [selectedDaySlots, setSelectedDaySlots] = useState<{
    dayName: string;
    dateStr: string;
    slots: { start: string; end: string }[];
  } | null>(null);

  const navigate = useNavigate();

  const userTimezone = getUserTimezone();
  const displayTimezone = showUserTimezone ? userTimezone : mentorTimezone;

  function getStartOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  }

  useEffect(() => {
    fetchAvailability();
  }, [mentorId]);

  const fetchAvailability = async () => {
    try {
      setLoading(true);

      // Auto-migrate availability_json to slots if needed
      await autoMigrateAvailabilitySlots(mentorId);

      // Fetch recurring availability slots from availability_slots table
      const { data: recurring, error: recurringError } = await supabase
        .from("availability_slots")
        .select("*")
        .eq("expert_id", mentorId)
        .eq("is_recurring", true)
        .order("day_of_week", { ascending: true })
        .order("start_time", { ascending: true });

      if (recurringError && recurringError.code !== "PGRST116") {
        console.error("Error fetching recurring slots:", recurringError);
      }

      // Fetch specific date slots
      const { data: specific, error: specificError } = await supabase
        .from("availability_slots")
        .select("*")
        .eq("expert_id", mentorId)
        .eq("is_recurring", false)
        .not("specific_date", "is", null)
        .order("specific_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (specificError && specificError.code !== "PGRST116") {
        console.error("Error fetching specific slots:", specificError);
      }

      // Fetch blocked dates
      const { data: blocked, error: blockedError } = await supabase
        .from("blocked_dates")
        .select("date, reason")
        .eq("expert_id", mentorId)
        .order("date", { ascending: true });

      if (blockedError && blockedError.code !== "PGRST116") {
        console.error("Error fetching blocked dates:", blockedError);
      }

      setRecurringSlots(recurring || []);
      setSpecificSlots(specific || []);

      setBlockedDates(blocked || []);

      // Fetch mentor's session types
      const { data: mentorProfile } = await supabase
        .from("expert_profiles")
        .select("service_pricing, services")
        .eq("id", mentorId)
        .single();

      if (mentorProfile) {
        const types: string[] = [];
        
        // Check new service_pricing field first
        if (mentorProfile.service_pricing) {
          if (mentorProfile.service_pricing.oneOnOneSession?.enabled)
            types.push(SERVICE_CONFIG.oneOnOneSession.name);
          if (mentorProfile.service_pricing.priorityDm?.enabled)
            types.push(SERVICE_CONFIG.priorityDm.name);
        }
        // Fallback to old services field for backward compatibility
        else if (mentorProfile.services) {
          if (mentorProfile.services.oneOnOneSession)
            types.push(SERVICE_CONFIG.oneOnOneSession.name);
          if (mentorProfile.services.priorityDm)
            types.push(SERVICE_CONFIG.priorityDm.name);
          if (mentorProfile.services.freeDemo) types.push("Free Demo");
        }
        
        setSessionTypes(types);
      }

      // Check if user has active alert subscription
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: alertData } = await supabase
          .from("availability_alerts")
          .select("*")
          .eq("mentee_id", user.id)
          .eq("mentor_id", mentorId)
          .eq("is_active", true)
          .single();

        if (alertData) {
          setAlertsEnabled(true);
          setAlertEmail(alertData.email);
          setAlertDaysPreference(alertData.preferred_days || []);
        }
      }
    } catch (error) {
      console.error("Error fetching availability:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (time: string, date: string = "2000-01-01") => {
    const convertedTime = showUserTimezone
      ? convertTime(time, date, mentorTimezone, userTimezone).time
      : time;
    return new Date(`2000-01-01T${convertedTime}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getWeekSchedule = (): DaySchedule[] => {
    const schedule: DaySchedule[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get current time for filtering today's slots
    const now = new Date();
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Show 30 days (1 month) of availability starting from currentWeekStart
    // This allows navigation while showing 30 days at a time
    for (let i = 0; i < 30; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      const dateStr = getLocalDateString(date);
      const dayOfWeek = date.getDay();
      const todayStr = getLocalDateString(today);
      const isToday = dateStr === todayStr;

      // Check if date is blocked
      const blocked = blockedDates.find((b) => b.date === dateStr);

      // Get slots for this date
      const slots: { start: string; end: string }[] = [];

      // Add specific slots for this exact date
      specificSlots.forEach((slot) => {
        if (slot.specific_date === dateStr) {
          // Filter out past slots for today
          if (isToday && slot.start_time < currentTimeStr) {
            return; // Skip past slots
          }
          slots.push({ start: slot.start_time, end: slot.end_time });
        }
      });

      // Add recurring slots for this day of week
      if (!blocked) {
        recurringSlots.forEach((slot) => {
          if (slot.day_of_week === dayOfWeek) {
            // Filter out past slots for today
            if (isToday && slot.start_time < currentTimeStr) {
              return; // Skip past slots
            }
            slots.push({ start: slot.start_time, end: slot.end_time });
          }
        });
      }

      // Sort slots by start time
      slots.sort((a, b) => a.start.localeCompare(b.start));

      schedule.push({
        date,
        dateStr,
        dayName: DAYS_OF_WEEK[dayOfWeek],
        isToday: date.getTime() === today.getTime(),
        isBlocked: !!blocked,
        slots,
        blockedReason: blocked?.reason,
      });
    }

    return schedule;
  };

  const navigateWeek = (direction: "prev" | "next") => {
    const newDate = new Date(currentWeekStart);
    // Navigate by 30 days (1 month) at a time
    newDate.setDate(
      currentWeekStart.getDate() + (direction === "next" ? 30 : -30)
    );
    
    // Don't allow going back before today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (direction === "prev" && newDate < today) {
      setCurrentWeekStart(today);
    } else {
      setCurrentWeekStart(newDate);
    }
  };

  const goToCurrentWeek = () => {
    // Start from today instead of start of week
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setCurrentWeekStart(today);
  };

  const calculateDuration = (startTime: string, endTime: string): number => {
    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);
    return endHour * 60 + endMin - (startHour * 60 + startMin);
  };

  // Helper function to check if a slot is in the past
  const isSlotInPast = (
    dateStr: string,
    startTime: string,
    timezone: string
  ): boolean => {
    try {
      // Create a date-time in the specified timezone
      const slotDateTime = new Date(`${dateStr}T${startTime}`);

      // Get current time
      const now = new Date();

      // For simplicity, we'll compare in UTC
      // A more robust solution would use a timezone library
      return slotDateTime < now;
    } catch (error) {
      console.error("Error checking if slot is in past:", error);
      return false;
    }
  };

  const handleBookSlot = async (
    date: string,
    startTime: string,
    endTime: string
  ) => {
    setIsCheckingAuth(true);

    try {
      // Check if the slot is in the past (in mentor's timezone)
      if (isSlotInPast(date, startTime, mentorTimezone)) {
        toast.error("Cannot book a time slot that has already passed");
        setIsCheckingAuth(false);
        return;
      }

      // Check if user is authenticated
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        // User is not logged in, show login dialog
        setShowLoginDialog(true);
        setIsCheckingAuth(false);
        return;
      }

      // Check if user is trying to book their own profile
      if (user.id === mentorId) {
        toast.warning("You cannot book a session with yourself");
        setIsCheckingAuth(false);
        return;
      }

      // User is authenticated, proceed with booking
      // IMPORTANT: If user is viewing in their timezone, convert back to mentor's timezone
      // The database should always store times in mentor's timezone
      let actualDate = date;
      let actualStartTime = startTime;
      let actualEndTime = endTime;

      if (showUserTimezone) {
        // Convert times back from user timezone to mentor timezone
        const convertedStart = convertTime(
          startTime,
          date,
          userTimezone,
          mentorTimezone
        );
        const convertedEnd = convertTime(
          endTime,
          date,
          userTimezone,
          mentorTimezone
        );

        actualStartTime = convertedStart.time;
        actualEndTime = convertedEnd.time;

        // Adjust date if needed (when time crosses midnight)
        if (convertedStart.dateOffset !== 0) {
          const dateObj = new Date(date + "T00:00:00");
          dateObj.setDate(dateObj.getDate() + convertedStart.dateOffset);
          actualDate = dateObj.toISOString().split("T")[0];
        }
      }

      const dateObj = new Date(actualDate + "T00:00:00");

      // Use the callback if provided
      if (onBookSlot) {
        // Always pass mentor's timezone - this is the source of truth
        onBookSlot(dateObj, actualStartTime, mentorTimezone);
      } else {
        // Fallback to old navigation behavior
        const bookingData = {
          mentorId,
          mentorName,
          date: actualDate,
          startTime: actualStartTime,
          endTime: actualEndTime,
          timezone: mentorTimezone, // Always use mentor's timezone for storage
        };

        // Store booking data in session storage for the booking page
        sessionStorage.setItem("pendingBooking", JSON.stringify(bookingData));

        // Navigate to booking page
        navigate(`/booking/${mentorId}`, {
          state: bookingData,
        });
      }
    } catch (error) {
      console.error("Auth check error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const handleLoginConfirm = () => {
    setShowLoginDialog(false);
    navigate("/student/login", {
      state: {
        returnTo: window.location.pathname,
        message: "Login to book a session with this mentor",
      },
    });
  };

  // Check if user is logged in before opening custom time dialog
  const handleCustomTimeDialogOpen = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.warning("Please log in to request custom time with this mentor", {
        description: "You need to be logged in to send custom time requests",
      });
      return;
    }

    // Check if user is trying to request time from themselves
    if (user.id === mentorId) {
      toast.warning("You cannot request custom time from yourself", {
        description:
          "Custom time requests are for students to request sessions with mentors",
      });
      return;
    }

    setCustomTimeDialogOpen(true);
  };

  // Handle custom time request submission
  const handleCustomTimeRequest = async () => {
    if (
      !requestedDate ||
      !requestedStartTime ||
      !requestedEndTime ||
      !requestMessage.trim()
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Check if the requested date/time is in the past
    if (isSlotInPast(requestedDate, requestedStartTime, mentorTimezone)) {
      toast.error("Cannot request a time that has already passed");
      return;
    }

    // Validate time order and minimum duration
    const [startHour, startMin] = requestedStartTime.split(":").map(Number);
    const [endHour, endMin] = requestedEndTime.split(":").map(Number);
    const startTotal = startHour * 60 + startMin;
    const endTotal = endHour * 60 + endMin;
    const duration = endTotal - startTotal;
    if (endTotal <= startTotal) {
      toast.error("End time must be after start time");
      return;
    }
    if (duration < 30) {
      toast.error("Session must be at least 30 minutes");
      return;
    }

    try {
      setSubmittingRequest(true);

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.warning("Please sign in to request custom time");
        return;
      }

      // Prevent mentor from requesting time from themselves
      if (user.id === mentorId) {
        toast.warning("You cannot request custom time from yourself");
        return;
      }

      // Create custom time request record
      const { error } = await supabase.from("booking_requests").insert({
        mentee_id: user.id,
        mentor_id: mentorId,
        requested_date: requestedDate,
        requested_start_time: requestedStartTime,
        requested_end_time: requestedEndTime,
        message: requestMessage,
        status: "pending",
      });

      if (error) throw error;

      toast.success(
        "Time request sent successfully! The mentor will respond within 24 hours."
      );
      setCustomTimeDialogOpen(false);

      // Reset form
      setRequestedDate("");
      setRequestedStartTime("");
      setRequestedEndTime("");
      setRequestMessage("");
    } catch (error) {
      console.error("Error submitting time request:", error);
      toast.error("Failed to send request. Please try again.");
    } finally {
      setSubmittingRequest(false);
    }
  };

  // Handle availability alert subscription
  const handleAlertDialogOpen = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.warning("Please log in to set up availability alerts", {
        description: "You need to be logged in to receive notifications",
      });
      return;
    }

    // Check if user is trying to subscribe to their own alerts
    if (user.id === mentorId) {
      toast.warning("You cannot subscribe to alerts for your own availability", {
        description:
          "Availability alerts are for students to get notified when mentors add new slots",
      });
      return;
    }

    setAlertDialogOpen(true);
  };

  const handleAlertSubscription = async () => {
    if (!alertEmail || alertDaysPreference.length === 0) {
      toast.error("Please provide email and select preferred days");
      return;
    }

    try {
      setSubmittingAlert(true);

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.warning("Please sign in to enable alerts");
        return;
      }

      // Prevent mentor from subscribing to their own alerts
      if (user.id === mentorId) {
        toast.warning("You cannot subscribe to alerts for your own availability");
        return;
      }

      // Create or update alert subscription
      const { error } = await supabase.from("availability_alerts").upsert(
        {
          mentee_id: user.id,
          mentor_id: mentorId,
          email: alertEmail,
          preferred_days: alertDaysPreference,
          is_active: true,
        },
        {
          onConflict: "mentee_id,mentor_id",
        }
      );

      if (error) throw error;

      setAlertsEnabled(true);
      toast.success(
        "Availability alerts enabled! You'll be notified when new slots are added."
      );
      setAlertDialogOpen(false);
    } catch (error) {
      console.error("Error setting up alerts:", error);
      toast.error("Failed to enable alerts. Please try again.");
    } finally {
      setSubmittingAlert(false);
    }
  };

  // Toggle alert day preference
  const toggleAlertDay = (day: string) => {
    setAlertDaysPreference((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const isDateBlocked = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return blockedDates.some((blocked) => blocked.date === dateStr);
  };

  const weekSchedule = getWeekSchedule();
  const hasAnyAvailability =
    recurringSlots.length > 0 || specificSlots.length > 0;

  // Calculate current page number (1-based) for pagination
  // Each page represents a 30-day period
  const getCurrentPage = (): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = currentWeekStart.getTime() - today.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 30) + 1;
  };

  const goToPage = (pageNum: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newDate = new Date(today);
    newDate.setDate(today.getDate() + (pageNum - 1) * 30);
    setCurrentWeekStart(newDate);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="flex gap-3">
            <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
            <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>

        {/* Week View Skeleton */}
        <Card className="shadow-sm border border-gray-200 bg-white rounded-2xl">
          <CardContent className="p-6">
            <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl border-2 border-gray-100 bg-gray-50"
                >
                  <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mb-3" />
                  <div className="space-y-2">
                    <div className="h-10 bg-gray-200 rounded-lg animate-pulse" />
                    <div className="h-10 bg-gray-200 rounded-lg animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* No Availability Message */}
      {!hasAnyAvailability && !loading && (
        <Card className="shadow-sm border border-gray-200 bg-white rounded-2xl overflow-hidden">
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <CalendarIcon className="h-8 w-8 text-gray-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  No Availability Set
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  {mentorName || "This mentor"} hasn't added any availability
                  slots yet.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={handleCustomTimeDialogOpen}
                  className="border-2 border-matepeak-primary text-matepeak-primary hover:bg-matepeak-primary hover:text-white"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Request Custom Time
                </Button>
                <Button
                  variant="outline"
                  onClick={handleAlertDialogOpen}
                  className="border-2 border-gray-400 hover:bg-gray-50"
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Get Notified When Available
                </Button>
              </div>
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-left">
                <p className="text-sm text-blue-900">
                  <strong>💡 Tip:</strong> You can request a custom session time
                  or enable notifications to be alerted when this mentor adds
                  availability.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Timezone & Actions - Redesigned Combined Header */}
      {hasAnyAvailability && (
        <div className="flex flex-wrap items-center justify-between gap-6 px-4 py-3">
          {/* Timezone Info */}
          <div className="flex items-center gap-3">
            <Globe className="h-4 w-4 text-matepeak-primary" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Times shown in</span>
              <button
                onClick={() => setShowUserTimezone(!showUserTimezone)}
                className="px-2 py-1 text-sm font-semibold text-gray-900 bg-gray-100 hover:bg-matepeak-primary hover:text-white transition-colors rounded-md"
              >
                {showUserTimezone ? userTimezone : mentorTimezone}
              </button>
              <span className="text-xs text-gray-400">• Click to switch</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleCustomTimeDialogOpen}
              className="flex items-center gap-2 text-sm font-medium text-matepeak-primary hover:text-matepeak-primary/80 transition-colors relative group"
            >
              <MessageSquare className="h-4 w-4" />
              <span className="relative">
                Request Time
                <span className="absolute bottom-0 left-0 w-full h-[2px] bg-matepeak-primary/90 scale-x-0 origin-right group-hover:scale-x-100 group-hover:origin-left transition-transform duration-300 ease-out"></span>
              </span>
            </button>

            <div className="h-4 w-px bg-gray-300"></div>

            <button
              onClick={handleAlertDialogOpen}
              className={`flex items-center gap-2 text-sm font-medium transition-colors relative group ${
                alertsEnabled
                  ? "text-green-600 hover:text-green-700"
                  : "text-gray-700 hover:text-gray-900"
              }`}
            >
              <Bell
                className={`h-4 w-4 ${alertsEnabled ? "fill-green-600" : ""}`}
              />
              <span className="relative">
                {alertsEnabled ? "Alerts On" : "Get Alerts"}
                <span
                  className={`absolute bottom-0 left-0 w-full h-[2px] scale-x-0 origin-right group-hover:scale-x-100 group-hover:origin-left transition-transform duration-300 ease-out ${
                    alertsEnabled ? "bg-green-700" : "bg-gray-800"
                  }`}
                ></span>
              </span>
            </button>
          </div>
        </div>
      )}
      {/* Week View */} {/* Week View */}
      {hasAnyAvailability && (
        <Card className="shadow-sm border border-gray-200 bg-white rounded-2xl overflow-hidden">
          <CardContent className="p-6">
            {/* Week Navigation */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {currentWeekStart.toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                  })}{" "}
                  -{" "}
                  {new Date(
                    currentWeekStart.getTime() + 29 * 24 * 60 * 60 * 1000
                  ).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Showing next 30 days · Click on any time slot to book
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateWeek("prev")}
                  className="border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToCurrentWeek}
                  className="border-gray-300 hover:border-gray-400 hover:bg-gray-50 px-4"
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateWeek("next")}
                  className="border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Week Schedule Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {weekSchedule.map((day) => (
                <div
                  key={day.dateStr}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    day.isToday
                      ? "border-matepeak-primary bg-matepeak-yellow/5 shadow-sm"
                      : day.isBlocked
                      ? "border-red-200 bg-red-50/50"
                      : day.slots.length > 0
                      ? "border-green-400 bg-green-100/60 hover:border-green-500 hover:shadow-sm"
                      : "border-gray-100 bg-gray-50/50"
                  }`}
                >
                  <div className="mb-3 pb-2.5 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-0.5">
                      <h3 className="font-bold text-gray-900 text-sm">
                        {day.dayName}
                      </h3>
                      {day.isToday && (
                        <Badge className="bg-matepeak-primary text-white text-xs px-1.5 py-0">
                          Today
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-600">
                      {day.date.toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>

                  {day.isBlocked ? (
                    <div className="flex items-start gap-2 p-2.5 bg-red-100/50 rounded-lg">
                      <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-red-900">
                          Blocked
                        </p>
                        {day.blockedReason && (
                          <p className="text-xs text-red-600 mt-0.5">
                            {day.blockedReason}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : day.slots.length > 0 ? (
                    <div className="space-y-2">
                      {day.slots.slice(0, 3).map((slot, idx) => {
                        const slotKey = `${day.dateStr}-${idx}`;
                        const duration = calculateDuration(
                          slot.start,
                          slot.end
                        );
                        return (
                          <div
                            key={idx}
                            className={`group relative flex items-center gap-2.5 p-2.5 rounded-lg border-2 transition-all duration-200 cursor-pointer ${
                              hoveredSlot === slotKey
                                ? "bg-matepeak-yellow/10 border-matepeak-primary shadow-md transform scale-[1.02]"
                                : "bg-green-100/80 border-green-400 hover:bg-green-100 hover:border-green-500 hover:shadow-sm"
                            }`}
                            onMouseEnter={() => setHoveredSlot(slotKey)}
                            onMouseLeave={() => setHoveredSlot(null)}
                            onClick={() =>
                              handleBookSlot(day.dateStr, slot.start, slot.end)
                            }
                          >
                            <div
                              className={`p-1.5 rounded-lg transition-colors ${
                                hoveredSlot === slotKey
                                  ? "bg-matepeak-primary/10"
                                  : "bg-gray-100"
                              }`}
                            >
                              <Clock
                                className={`h-3.5 w-3.5 transition-colors ${
                                  hoveredSlot === slotKey
                                    ? "text-matepeak-primary"
                                    : "text-gray-600"
                                }`}
                              />
                            </div>
                            <div className="flex-grow">
                              <span className="text-xs font-semibold text-gray-900 block">
                                {formatTime(slot.start, day.dateStr)} -{" "}
                                {formatTime(slot.end, day.dateStr)}
                              </span>
                              <span className="text-xs text-gray-500">
                                {duration} min
                              </span>
                              {showUserTimezone &&
                                (() => {
                                  const startConv = convertTime(
                                    slot.start,
                                    day.dateStr,
                                    mentorTimezone,
                                    userTimezone
                                  );
                                  if (startConv.dateOffset !== 0) {
                                    return (
                                      <span className="text-xs text-orange-600 font-medium block mt-0.5">
                                        {startConv.dateOffset > 0
                                          ? "Next day"
                                          : "Previous day"}
                                      </span>
                                    );
                                  }
                                  return null;
                                })()}
                            </div>
                            <Button
                              size="sm"
                              className={`opacity-0 group-hover:opacity-100 transition-all h-7 text-xs font-semibold ${
                                hoveredSlot === slotKey
                                  ? "bg-matepeak-primary hover:bg-matepeak-secondary text-white"
                                  : "bg-gray-900 hover:bg-gray-800 text-white"
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleBookSlot(
                                  day.dateStr,
                                  slot.start,
                                  slot.end
                                );
                              }}
                            >
                              Book
                            </Button>
                          </div>
                        );
                      })}
                      {day.slots.length > 3 && (
                        <button
                          onClick={() => {
                            setSelectedDaySlots({
                              dayName: day.dayName,
                              dateStr: day.date.toLocaleDateString("en-US", {
                                month: "long",
                                day: "numeric",
                                year: "numeric",
                              }),
                              slots: day.slots,
                            });
                            setShowAllSlotsModal(true);
                          }}
                          className="w-full py-2 px-3 text-xs font-medium text-matepeak-primary hover:text-matepeak-secondary underline decoration-2 hover:bg-matepeak-yellow/10 rounded-lg transition-colors"
                        >
                          View All {day.slots.length} Slots
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-4">
                      <p className="text-xs text-gray-400">No availability</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Google-style Pagination */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-center gap-2">
                {/* Previous Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateWeek("prev")}
                  disabled={getCurrentPage() === 1}
                  className="text-matepeak-primary hover:bg-matepeak-yellow/20 disabled:opacity-30 disabled:cursor-not-allowed px-3 h-8 text-sm font-medium"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>

                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((pageNum) => {
                    const currentPage = getCurrentPage();
                    const isActive = pageNum === currentPage;
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        className={`min-w-[32px] h-8 px-2 rounded text-sm font-medium transition-all ${
                          isActive
                            ? "bg-matepeak-primary text-white shadow-md"
                            : "text-matepeak-primary hover:bg-matepeak-yellow/20"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                {/* Next Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateWeek("next")}
                  disabled={getCurrentPage() >= 10}
                  className="text-matepeak-primary hover:bg-matepeak-yellow/20 disabled:opacity-30 disabled:cursor-not-allowed px-3 h-8 text-sm font-medium"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>

              {/* Helper Text */}
              <p className="text-center text-xs text-gray-500 mt-3">
                Each page shows a 30-day period • Page {getCurrentPage()} of 10 (Next 300 days)
              </p>

              {/* Request Custom Time CTA */}
              <div className="mt-6 pt-4 border-t border-gray-100">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-3">
                    Can't find a suitable time?
                  </p>
                  <Button
                    onClick={handleCustomTimeDialogOpen}
                    variant="outline"
                    className="border-2 border-matepeak-primary text-matepeak-primary hover:bg-matepeak-primary hover:text-white transition-all shadow-sm hover:shadow-md"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Request Custom Time
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Custom Time Request Dialog */}
      <Dialog
        open={customTimeDialogOpen}
        onOpenChange={setCustomTimeDialogOpen}
      >
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-lg font-bold">
              Request Custom Time
            </DialogTitle>
            <DialogDescription className="text-sm">
              Request a custom session time and {mentorName} will get back to
              you within 24 hours.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            {/* Date Selection with Calendar */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Preferred Date <span className="text-red-500">*</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-full justify-start text-left font-normal h-9 text-sm ${
                      !requestedDate && "text-gray-500"
                    }`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {requestedDate ? (
                      format(new Date(requestedDate + "T00:00:00"), "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={
                      requestedDate
                        ? new Date(requestedDate + "T00:00:00")
                        : undefined
                    }
                    onSelect={(date) => {
                      if (date) {
                        setRequestedDate(format(date, "yyyy-MM-dd"));
                      }
                    }}
                    disabled={(date) =>
                      date < new Date(new Date().setHours(0, 0, 0, 0))
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="request-start" className="text-sm font-medium">
                  Start Time <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={requestedStartTime}
                  onValueChange={setRequestedStartTime}
                >
                  <SelectTrigger
                    id="request-start"
                    className="h-9 text-sm"
                    aria-label="Start Time"
                  >
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    {Array.from({ length: 48 }).map((_, i) => {
                      const hour = Math.floor(i / 2);
                      const min = i % 2 === 0 ? "00" : "30";
                      const value = `${String(hour).padStart(2, "0")}:${min}`;

                      // Disable past times if the selected date is today
                      const isToday =
                        requestedDate ===
                        new Date().toISOString().split("T")[0];
                      const isPast =
                        isToday &&
                        isSlotInPast(requestedDate, value, mentorTimezone);

                      return (
                        <SelectItem
                          key={value}
                          value={value}
                          className="cursor-pointer text-sm"
                          disabled={isPast}
                        >
                          {value}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="request-end" className="text-sm font-medium">
                  End Time <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={requestedEndTime}
                  onValueChange={setRequestedEndTime}
                >
                  <SelectTrigger
                    id="request-end"
                    className="h-9 text-sm"
                    aria-label="End Time"
                  >
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    {Array.from({ length: 48 }).map((_, i) => {
                      const hour = Math.floor(i / 2);
                      const min = i % 2 === 0 ? "00" : "30";
                      const value = `${String(hour).padStart(2, "0")}:${min}`;

                      // Disable times that would be before start time or in the past
                      const isToday =
                        requestedDate ===
                        new Date().toISOString().split("T")[0];
                      const isPast =
                        isToday &&
                        isSlotInPast(requestedDate, value, mentorTimezone);
                      const isBeforeStart =
                        requestedStartTime && value <= requestedStartTime;

                      return (
                        <SelectItem
                          key={value}
                          value={value}
                          className="cursor-pointer text-sm"
                          disabled={isPast || isBeforeStart}
                        >
                          {value}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="request-message" className="text-sm font-medium">
                Message <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="request-message"
                placeholder="Describe your requirements, goals, or questions..."
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                className="min-h-[80px] text-sm resize-none"
              />
            </div>

            <p className="text-xs text-gray-600 pt-1">
              <span className="font-medium">Note:</span> The mentor will review
              your request and respond via email.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setCustomTimeDialogOpen(false)}
              disabled={submittingRequest}
              className="h-9 text-sm"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCustomTimeRequest}
              disabled={submittingRequest}
              className="bg-matepeak-primary hover:bg-matepeak-primary/90 h-9 text-sm"
            >
              {submittingRequest ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Availability Alerts Dialog */}
      <Dialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Get Availability Alerts
            </DialogTitle>
            <DialogDescription>
              Receive notifications when {mentorName} adds new availability
              slots that match your preferences.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="alert-email">Email Address</Label>
              <Input
                id="alert-email"
                type="email"
                placeholder="your.email@example.com"
                value={alertEmail}
                onChange={(e) => setAlertEmail(e.target.value)}
                className="border-gray-300"
              />
            </div>

            <div className="space-y-2">
              <Label>Preferred Days (Select at least one)</Label>
              <div className="grid grid-cols-2 gap-2">
                {DAYS_OF_WEEK.map((day, index) => (
                  <Button
                    key={day}
                    type="button"
                    variant="outline"
                    onClick={() => toggleAlertDay(day)}
                    className={`justify-start transition-all ${
                      alertDaysPreference.includes(day)
                        ? "bg-matepeak-primary text-white border-matepeak-primary hover:bg-matepeak-primary/90 hover:text-white"
                        : "border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <CheckCircle
                      className={`h-4 w-4 mr-2 ${
                        alertDaysPreference.includes(day)
                          ? "opacity-100"
                          : "opacity-0"
                      }`}
                    />
                    {day}
                  </Button>
                ))}
              </div>
            </div>

            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Bell className="h-4 w-4 text-green-600 mt-0.5" />
                <p className="text-sm text-green-900">
                  <strong>You'll be notified when:</strong> New slots are added
                  on your preferred days or existing slots become available.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAlertDialogOpen(false)}
              disabled={submittingAlert}
              className="border-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAlertSubscription}
              disabled={submittingAlert}
              className="bg-matepeak-primary hover:bg-matepeak-primary/90"
            >
              {submittingAlert ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enabling...
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  Enable Alerts
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* All Slots Modal */}
      <Dialog open={showAllSlotsModal} onOpenChange={setShowAllSlotsModal}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {selectedDaySlots?.dayName} - All Available Slots
            </DialogTitle>
            <DialogDescription className="text-sm">
              {selectedDaySlots?.dateStr}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {selectedDaySlots && selectedDaySlots.slots.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedDaySlots.slots.map((slot, idx) => {
                  const duration = calculateDuration(slot.start, slot.end);
                  return (
                    <div
                      key={idx}
                      className="group relative flex items-center gap-2.5 p-3 rounded-lg border-2 bg-green-100/80 border-green-400 hover:bg-green-100 hover:border-green-500 hover:shadow-sm transition-all duration-200 cursor-pointer"
                      onClick={() => {
                        const dateStr = selectedDaySlots.dateStr;
                        const dateObj = new Date(dateStr);
                        const formattedDate = getLocalDateString(dateObj);
                        handleBookSlot(formattedDate, slot.start, slot.end);
                        setShowAllSlotsModal(false);
                      }}
                    >
                      <div className="p-1.5 rounded-lg bg-gray-100">
                        <Clock className="h-4 w-4 text-gray-600" />
                      </div>
                      <div className="flex-grow">
                        <span className="text-sm font-semibold text-gray-900 block">
                          {formatTime(slot.start, "")} -{" "}
                          {formatTime(slot.end, "")}
                        </span>
                        <span className="text-xs text-gray-500">
                          {duration} min
                        </span>
                      </div>
                      <Button
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-all h-8 text-xs font-semibold bg-matepeak-primary hover:bg-matepeak-secondary text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          const dateStr = selectedDaySlots.dateStr;
                          const dateObj = new Date(dateStr);
                          const formattedDate = getLocalDateString(dateObj);
                          handleBookSlot(formattedDate, slot.start, slot.end);
                          setShowAllSlotsModal(false);
                        }}
                      >
                        Book
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">
                No slots available
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {/* Login Confirmation Dialog */}
      <AlertDialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Login Required</AlertDialogTitle>
            <AlertDialogDescription>
              You need to be logged in to book a session with this mentor. Would
              you like to login or create an account?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLoginConfirm}
              className="bg-matepeak-primary hover:bg-matepeak-secondary text-white"
            >
              Go to Login
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
