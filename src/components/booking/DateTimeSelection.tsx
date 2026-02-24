import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MessageSquare,
  ArrowRight,
} from "lucide-react";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import { SelectedService, SelectedDateTime } from "./BookingDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAvailableTimeSlots, TimeSlot } from "@/services/bookingService";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

interface DateTimeSelectionProps {
  selectedService: SelectedService;
  mentorId: string;
  timezone: string;
  onDateTimeSelect: (dateTime: SelectedDateTime) => void;
}

export default function DateTimeSelection({
  selectedService,
  mentorId,
  timezone,
  onDateTimeSelect,
}: DateTimeSelectionProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedTimezone, setSelectedTimezone] = useState(timezone);
  const [weekStart, setWeekStart] = useState(new Date());
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loadingDates, setLoadingDates] = useState(true);
  const [hasAutoSelectedDate, setHasAutoSelectedDate] = useState(false);
  const [datesWithSlots, setDatesWithSlots] = useState<Set<string>>(new Set());

  // Cache for time slot results to avoid redundant API calls
  // Note: Cache automatically reflects booking changes because:
  // - Only CONFIRMED bookings block slots
  // - When a booking is confirmed, the slot becomes unavailable
  // - When a booking is cancelled, the slot becomes available again
  // - Cache is cleared when component remounts or date changes
  const [slotCache, setSlotCache] = useState<Map<string, TimeSlot[]>>(
    new Map()
  );

  // Request Custom Time states
  const [showCustomTimeRequest, setShowCustomTimeRequest] = useState(false);
  const [requestedStartTime, setRequestedStartTime] = useState("");
  const [requestedEndTime, setRequestedEndTime] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);

  // Generate 7 days starting from today
  const visibleDates = Array.from({ length: 7 }, (_, i) =>
    addDays(weekStart, i)
  );

  // Check which dates have available slots and auto-select - COMBINED for efficiency
  useEffect(() => {
    initializeDatesAndAutoSelect();
  }, [weekStart, mentorId, selectedService.duration]);

  const initializeDatesAndAutoSelect = async () => {
    setLoadingDates(true);

    // Only check visible dates if we already have auto-selected, otherwise check more dates
    const datesToCheck = hasAutoSelectedDate
      ? visibleDates
      : Array.from({ length: 14 }, (_, i) => addDays(new Date(), i));

    // Fetch all dates in parallel
    const availabilityPromises = datesToCheck.map(async (date) => {
      const result = await getAvailableTimeSlots(
        mentorId,
        date,
        selectedService.duration
      );
      return {
        date,
        dateStr: date.toISOString().split("T")[0],
        hasSlots: result.success && result.data.some((slot) => slot.available),
      };
    });

    const results = await Promise.all(availabilityPromises);

    // Build dates with slots set
    const datesWithAvailability = new Set<string>();
    results.forEach(({ dateStr, hasSlots }) => {
      if (hasSlots) {
        datesWithAvailability.add(dateStr);
      }
    });

    setDatesWithSlots(datesWithAvailability);

    // Do not cache empty placeholders here. Only cache real slot data after fetching in fetchTimeSlots.

    // Auto-select first available date if not already selected
    if (!hasAutoSelectedDate) {
      const firstAvailable = results.find((result) => result.hasSlots);

      if (firstAvailable) {
        setSelectedDate(firstAvailable.date);
        setHasAutoSelectedDate(true);

        // Adjust week view if needed
        const daysDiff = Math.floor(
          (firstAvailable.date.getTime() - weekStart.getTime()) /
            (1000 * 60 * 60 * 24)
        );
        if (daysDiff >= 7) {
          setWeekStart(firstAvailable.date);
        }
      }
    }

    setLoadingDates(false);
  };

  // Fetch available time slots when date is selected (with caching)
  useEffect(() => {
    if (selectedDate) {
      fetchTimeSlots();
    }
  }, [selectedDate, mentorId, selectedService.duration]);

  const fetchTimeSlots = async () => {
    if (!selectedDate) return;

    const dateStr = selectedDate.toISOString().split("T")[0];
    const cacheKey = `${mentorId}-${dateStr}-${selectedService.duration}`;

    // Check cache first to avoid redundant API calls
    if (slotCache.has(cacheKey)) {
      const cachedSlots = slotCache.get(cacheKey)!;
      console.log(
        `✅ Using cached time slots for ${dateStr} (${cachedSlots.length} slots)`
      );
      setTimeSlots(cachedSlots);
      return;
    }

    setLoadingSlots(true);
    setSelectedTime(null); // Reset selected time

    try {
      const result = await getAvailableTimeSlots(
        mentorId,
        selectedDate,
        selectedService.duration
      );

      if (result.success) {
        setTimeSlots(result.data);
        // Cache the result for future use (5 minute cache)
        setSlotCache((prev) => new Map(prev).set(cacheKey, result.data));
        console.log(
          `📦 Cached time slots for ${dateStr} (${result.data.length} slots)`
        );
      } else {
        console.error("Failed to fetch time slots:", result.error);
        setTimeSlots([]);
      }
    } catch (error) {
      console.error("Error fetching time slots:", error);
      setTimeSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handlePrevWeek = () => {
    setWeekStart(addDays(weekStart, -7));
  };

  const handleNextWeek = () => {
    setWeekStart(addDays(weekStart, 7));
  };

  const handleContinue = () => {
    if (selectedDate && selectedTime) {
      onDateTimeSelect({
        date: selectedDate,
        time: selectedTime,
        timezone: selectedTimezone,
      });
    }
  };

  // Check if user is logged in before showing custom time request form
  const handleShowCustomTimeRequest = async () => {
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

    setShowCustomTimeRequest(true);
  };

  const handleCustomTimeRequest = async () => {
    if (!selectedDate) {
      toast.error("Please select a date first");
      return;
    }
    if (!requestedStartTime || !requestedEndTime) {
      toast.error("Please enter both start and end times");
      return;
    }

    setSubmittingRequest(true);

    try {
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

      // Check mentor's availability and block status for the requested date
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      // 1. Check if date is blocked
      const { data: blockedDates, error: blockedError } = await supabase
        .from("blocked_dates")
        .select("date")
        .eq("expert_id", mentorId)
        .eq("date", dateStr);
      if (blockedError) throw blockedError;
      if (blockedDates && blockedDates.length > 0) {
        toast.error("You cannot request time on a blocked date.");
        return;
      }

      // 2. Check if mentor has any available slots on this date
      const { data: availSlots, error: availError } = await supabase
        .from("availability_slots")
        .select("id")
        .eq("expert_id", mentorId)
        .or(`(is_recurring.eq.true,day_of_week.eq.${selectedDate.getDay()})`, {
          foreignTable: "availability_slots",
        })
        .or(`(is_recurring.eq.false,specific_date.eq.${dateStr})`, {
          foreignTable: "availability_slots",
        });
      if (availError) throw availError;
      if (availSlots && availSlots.length > 0) {
        toast.error(
          "You can only request time for days when the mentor is not available."
        );
        return;
      }

      // 3. Check if mentor has any confirmed bookings on this date
      const { data: bookings, error: bookingsError } = await supabase
        .from("bookings")
        .select("id")
        .eq("expert_id", mentorId)
        .eq("scheduled_date", dateStr)
        .eq("status", "confirmed");
      if (bookingsError) throw bookingsError;
      if (bookings && bookings.length > 0) {
        toast.error(
          "You cannot request time for days when the mentor already has a confirmed session."
        );
        return;
      }

      // All checks passed, create custom time request record
      const { error } = await supabase.from("booking_requests").insert({
        mentor_id: mentorId,
        mentee_id: user.id,
        requested_date: dateStr,
        requested_start_time: requestedStartTime,
        requested_end_time: requestedEndTime,
        message: requestMessage,
        status: "pending",
      });

      if (error) throw error;

      toast.success(
        "Custom time request sent! The mentor will review and respond via email."
      );

      // Reset form
      setShowCustomTimeRequest(false);
      setRequestedStartTime("");
      setRequestedEndTime("");
      setRequestMessage("");
    } catch (error: any) {
      console.error("Error submitting custom time request:", error);
      toast.error(error.message || "Failed to submit request");
    } finally {
      setSubmittingRequest(false);
    }
  };

  const isDatePast = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  // Group time slots by time of day
  const groupTimeSlots = (slots: TimeSlot[]) => {
    const morning: TimeSlot[] = [];
    const afternoon: TimeSlot[] = [];
    const evening: TimeSlot[] = [];

    slots
      .filter((slot) => slot.available)
      .forEach((slot) => {
        const hour = parseInt(slot.time.split(":")[0]);
        if (hour < 12) {
          morning.push(slot);
        } else if (hour < 17) {
          afternoon.push(slot);
        } else {
          evening.push(slot);
        }
      });

    return { morning, afternoon, evening };
  };

  const formatTimeRange = (time: string, duration: number) => {
    const [hours, minutes] = time.split(":").map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + duration;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;

    return `${time} - ${endHours.toString().padStart(2, "0")}:${endMins
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-1.5">
          Select Date & Time
        </h3>
        <p className="text-sm text-gray-600">
          Choose your preferred date and time slot
        </p>
      </div>

      {/* Service Summary */}
      <div className="bg-gray-100 rounded-2xl p-5 border-0 shadow-sm">
        {/* Service Info */}
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold text-gray-900 text-base">
              {selectedService.name}
            </h4>
            <p className="text-sm text-gray-600 mt-1 font-medium">
              {selectedService.duration > 0 &&
                `${selectedService.duration} mins • `}
              Video Call
            </p>
          </div>
          <div className="bg-white rounded-xl px-4 py-2 shadow-sm">
            <div className="text-2xl font-bold text-gray-900">
              ₹{selectedService.price.toLocaleString("en-IN")}
            </div>
          </div>
        </div>
      </div>

      {/* Loading State for Initial Date Fetching */}
      {loadingDates && !hasAutoSelectedDate ? (
        <div className="bg-gray-100 rounded-2xl p-12 border-0 shadow-sm">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-gray-400 mb-4" />
            <p className="text-gray-600 font-medium">
              Loading available dates...
            </p>
            <p className="text-sm text-gray-500 mt-1">Please wait a moment</p>
          </div>
        </div>
      ) : (
        <>
          {/* Date Selection */}
          <div className="bg-gray-100 rounded-2xl p-5 border-0 shadow-sm">
            <h3 className="text-base font-bold text-gray-900 mb-4">
              When should we meet?
            </h3>

            <div className="flex items-center gap-3">
              {/* Week navigation */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrevWeek}
                className="h-9 w-9 p-0 hover:bg-white rounded-xl"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>

              <div className="flex gap-2 overflow-x-auto flex-1 pb-2 scrollbar-hide">
                {visibleDates.map((date, index) => {
                  const isSelected =
                    selectedDate && isSameDay(date, selectedDate);
                  const isPast = isDatePast(date);
                  const isToday = isSameDay(date, new Date());
                  const dateStr = date.toISOString().split("T")[0];
                  const hasAvailableSlots = datesWithSlots.has(dateStr);

                  return (
                    <button
                      key={index}
                      onClick={() => !isPast && setSelectedDate(date)}
                      disabled={isPast}
                      className={cn(
                        "flex flex-col items-center justify-center min-w-[75px] p-3.5 rounded-xl border-2 transition-all",
                        isSelected
                          ? "border-gray-900 bg-gray-900 text-white shadow-sm"
                          : isPast
                          ? "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed"
                          : hasAvailableSlots
                          ? "border-green-400 bg-white hover:border-green-500 hover:shadow-sm"
                          : "border-gray-200 bg-white hover:border-gray-300",
                        isToday &&
                          !isSelected &&
                          !hasAvailableSlots &&
                          "border-gray-400"
                      )}
                    >
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          isSelected ? "text-gray-200" : "text-gray-600"
                        )}
                      >
                        {format(date, "EEE")}
                      </span>
                      <span
                        className={cn(
                          "text-sm font-bold mt-1.5",
                          isSelected ? "text-white" : "text-gray-900"
                        )}
                      >
                        {format(date, "d MMM")}
                      </span>
                    </button>
                  );
                })}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleNextWeek}
                className="h-9 w-9 p-0 hover:bg-white rounded-xl"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Time Selection */}
          {selectedDate && (
            <div className="bg-gray-100 rounded-2xl p-5 border-0 shadow-sm animate-fade-in">
              <h3 className="text-base font-bold text-gray-900 mb-4">
                Select time slot ({selectedService.duration} min session)
              </h3>

              {loadingSlots ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : timeSlots.filter((slot) => slot.available).length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border-0 shadow-sm">
                  <p className="text-gray-600 font-medium">
                    No available slots for this date
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Please select another date
                  </p>
                </div>
              ) : (
                (() => {
                  const { morning, afternoon, evening } =
                    groupTimeSlots(timeSlots);

                  console.log("🔍 Time slots debug:", {
                    totalSlots: timeSlots.length,
                    availableSlots: timeSlots.filter((s) => s.available).length,
                    morning: morning.length,
                    afternoon: afternoon.length,
                    evening: evening.length,
                  });

                  return (
                    <div className="space-y-5">
                      {morning.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <span className="text-yellow-500">☀️</span> Morning
                            (Before 12 PM)
                          </h4>
                          <div className="grid grid-cols-2 gap-2.5">
                            {morning.map((slot) => {
                              const isSelected = selectedTime === slot.time;
                              return (
                                <button
                                  key={slot.time}
                                  onClick={() => setSelectedTime(slot.time)}
                                  className={cn(
                                    "px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all text-left",
                                    isSelected
                                      ? "border-gray-900 bg-gray-900 text-white shadow-sm"
                                      : "border-gray-200 bg-white hover:border-gray-400 text-gray-700 hover:shadow-sm"
                                  )}
                                >
                                  <div className="font-bold pointer-events-none">
                                    {slot.time}
                                  </div>
                                  <div
                                    className={cn(
                                      "text-xs mt-0.5 pointer-events-none",
                                      isSelected
                                        ? "text-gray-300"
                                        : "text-gray-500"
                                    )}
                                  >
                                    {formatTimeRange(
                                      slot.time,
                                      selectedService.duration
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {afternoon.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <span className="text-orange-500">☀️</span>{" "}
                            Afternoon (12 PM - 5 PM)
                          </h4>
                          <div className="grid grid-cols-2 gap-2.5">
                            {afternoon.map((slot) => {
                              const isSelected = selectedTime === slot.time;
                              return (
                                <button
                                  key={slot.time}
                                  onClick={() => setSelectedTime(slot.time)}
                                  className={cn(
                                    "px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all text-left",
                                    isSelected
                                      ? "border-gray-900 bg-gray-900 text-white shadow-sm"
                                      : "border-gray-200 bg-white hover:border-gray-400 text-gray-700 hover:shadow-sm"
                                  )}
                                >
                                  <div className="font-bold pointer-events-none">
                                    {slot.time}
                                  </div>
                                  <div
                                    className={cn(
                                      "text-xs mt-0.5 pointer-events-none",
                                      isSelected
                                        ? "text-gray-300"
                                        : "text-gray-500"
                                    )}
                                  >
                                    {formatTimeRange(
                                      slot.time,
                                      selectedService.duration
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {evening.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <span className="text-blue-500">🌙</span> Evening
                            (After 5 PM)
                          </h4>
                          <div className="grid grid-cols-2 gap-2.5">
                            {evening.map((slot) => {
                              const isSelected = selectedTime === slot.time;
                              return (
                                <button
                                  key={slot.time}
                                  onClick={() => setSelectedTime(slot.time)}
                                  className={cn(
                                    "px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all text-left",
                                    isSelected
                                      ? "border-gray-900 bg-gray-900 text-white shadow-sm"
                                      : "border-gray-200 bg-white hover:border-gray-400 text-gray-700 hover:shadow-sm"
                                  )}
                                >
                                  <div className="font-bold pointer-events-none">
                                    {slot.time}
                                  </div>
                                  <div
                                    className={cn(
                                      "text-xs mt-0.5 pointer-events-none",
                                      isSelected
                                        ? "text-gray-300"
                                        : "text-gray-500"
                                    )}
                                  >
                                    {formatTimeRange(
                                      slot.time,
                                      selectedService.duration
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}
            </div>
          )}

          {/* Timezone Selection */}
          {selectedDate && selectedTime && (
            <div className="bg-gray-100 rounded-2xl p-5 border-0 shadow-sm animate-fade-in">
              <h3 className="text-base font-bold text-gray-900 mb-4">
                Timezone
              </h3>
              <Select
                value={selectedTimezone}
                onValueChange={setSelectedTimezone}
              >
                <SelectTrigger className="w-full h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia/Kolkata">
                    (GMT+5:30) Chennai, Kolkata, Mumbai, New Delhi
                  </SelectItem>
                  <SelectItem value="America/New_York">
                    (GMT-5:00) Eastern Time (US & Canada)
                  </SelectItem>
                  <SelectItem value="America/Los_Angeles">
                    (GMT-8:00) Pacific Time (US & Canada)
                  </SelectItem>
                  <SelectItem value="Europe/London">
                    (GMT+0:00) London
                  </SelectItem>
                  <SelectItem value="Asia/Dubai">(GMT+4:00) Dubai</SelectItem>
                  <SelectItem value="Asia/Singapore">
                    (GMT+8:00) Singapore
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Continue Button */}
          {selectedDate && selectedTime && (
            <div className="flex justify-center">
              <Button
                onClick={handleContinue}
                className="bg-gray-900 hover:bg-gray-800 text-white py-2.5 px-6 text-sm font-semibold rounded-lg shadow-sm animate-fade-in transition-all group"
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2 transition-transform duration-300 ease-out group-hover:translate-x-1" />
              </Button>
            </div>
          )}

          {/* Request Custom Time Section */}
          {selectedDate && (
            <div className="bg-gray-100 rounded-2xl p-5 border-0 shadow-sm">
              {!showCustomTimeRequest ? (
                <div className="text-center">
                  <div className="mb-3">
                    <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <h4 className="text-sm font-semibold text-gray-900">
                      Don't see a suitable time?
                    </h4>
                    <p className="text-xs text-gray-600 mt-1">
                      Request a custom session time and the mentor will get back
                      to you
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleShowCustomTimeRequest}
                    className="border-gray-300 hover:bg-white hover:border-gray-900 rounded-xl"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Request Custom Time
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-base font-bold text-gray-900">
                      Request Custom Time
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowCustomTimeRequest(false);
                        setRequestedStartTime("");
                        setRequestedEndTime("");
                        setRequestMessage("");
                      }}
                      className="h-8 text-gray-500 hover:text-gray-900"
                    >
                      Cancel
                    </Button>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                    <p className="text-xs text-blue-900">
                      <strong>Selected Date:</strong>{" "}
                      {format(selectedDate, "EEEE, MMMM d, yyyy")}
                    </p>
                  </div>

                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 space-y-2">
                      <Label
                        htmlFor="custom-start"
                        className="text-sm font-semibold text-gray-700"
                      >
                        Start Time
                      </Label>
                      <Select
                        value={requestedStartTime}
                        onValueChange={setRequestedStartTime}
                      >
                        <SelectTrigger
                          id="custom-start"
                          className="border-gray-300 rounded-xl h-11"
                          aria-label="Start Time"
                        >
                          <SelectValue placeholder="Select start time" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60 overflow-y-auto">
                          {Array.from({ length: 48 }).map((_, i) => {
                            const hour = Math.floor(i / 2);
                            const min = i % 2 === 0 ? "00" : "30";
                            const value = `${String(hour).padStart(
                              2,
                              "0"
                            )}:${min}`;
                            return (
                              <SelectItem
                                key={value}
                                value={value}
                                className="cursor-pointer"
                              >
                                {value}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label
                        htmlFor="custom-end"
                        className="text-sm font-semibold text-gray-700"
                      >
                        End Time
                      </Label>
                      <Select
                        value={requestedEndTime}
                        onValueChange={setRequestedEndTime}
                      >
                        <SelectTrigger
                          id="custom-end"
                          className="border-gray-300 rounded-xl h-11"
                          aria-label="End Time"
                        >
                          <SelectValue placeholder="Select end time" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60 overflow-y-auto">
                          {Array.from({ length: 48 }).map((_, i) => {
                            const hour = Math.floor(i / 2);
                            const min = i % 2 === 0 ? "00" : "30";
                            const value = `${String(hour).padStart(
                              2,
                              "0"
                            )}:${min}`;
                            return (
                              <SelectItem
                                key={value}
                                value={value}
                                className="cursor-pointer"
                              >
                                {value}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="custom-message"
                      className="text-sm font-semibold text-gray-700"
                    >
                      Message (Optional)
                    </Label>
                    <Textarea
                      id="custom-message"
                      placeholder="Add any specific requirements or questions..."
                      value={requestMessage}
                      onChange={(e) => setRequestMessage(e.target.value)}
                      className="border-gray-300 rounded-xl min-h-[80px] resize-none"
                    />
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <p className="text-xs text-amber-900">
                      <strong>💡 Note:</strong> The mentor will review your
                      request and respond via email. You'll be notified once
                      they confirm availability.
                    </p>
                  </div>

                  <div className="flex justify-center">
                    <Button
                      onClick={handleCustomTimeRequest}
                      disabled={submittingRequest}
                      className="bg-gray-900 hover:bg-gray-800 text-white py-2.5 px-8 text-sm font-semibold rounded-xl shadow-sm"
                    >
                      {submittingRequest ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Send Request
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
