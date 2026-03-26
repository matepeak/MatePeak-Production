import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Globe, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SimilarMentors from "./SimilarMentors";
import { autoMigrateAvailabilitySlots } from "@/utils/availabilityMigration";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AvailabilityPreviewProps {
  mentorId: string;
  onSeeMore?: () => void;
  mentor?: {
    id: string;
    categories?: string[];
    expertise_tags?: string[];
  };
}

interface AvailableDate {
  date: Date;
  day: string;
  dateStr: string;
  timeslotCount: number;
}

interface Language {
  language: string;
  level?: string;
}

interface DayStatus {
  date: Date;
  status: "available" | "blocked" | "unavailable";
  timeslotCount: number;
}

export default function AvailabilityPreview({
  mentorId,
  onSeeMore,
  mentor,
}: AvailabilityPreviewProps) {
  const [loading, setLoading] = useState(true);
  const [availableDates, setAvailableDates] = useState<AvailableDate[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [languages, setLanguages] = useState<Language[]>([]);
  const [calendarDays, setCalendarDays] = useState<DayStatus[]>([]);
  const [showAllDates, setShowAllDates] = useState(false);
  const [showSlotsModal, setShowSlotsModal] = useState(false);
  const [selectedDateSlots, setSelectedDateSlots] = useState<{
    date: string;
    slots: { start_time: string; end_time: string }[];
  } | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const fetchLanguages = useCallback(async () => {
    try {
      console.log("Fetching languages for mentor:", mentorId);
      const { data: profileData, error } = await supabase
        .from("expert_profiles")
        .select("languages")
        .eq("id", mentorId)
        .single();

      if (error) {
        console.error("Error fetching languages:", error);
        throw error;
      }

      console.log("Languages data received:", profileData?.languages);

      if (profileData && Array.isArray(profileData.languages)) {
        const normalizedLanguages: Language[] = profileData.languages
          .map((entry: unknown) => {
            if (typeof entry === "string") {
              return {
                language: entry.trim(),
                level: "",
              };
            }

            if (entry && typeof entry === "object") {
              const languageEntry = entry as Record<string, unknown>;
              return {
                language: String(
                  languageEntry.language || languageEntry.name || languageEntry.lang || ""
                ).trim(),
                level: String(languageEntry.level || languageEntry.proficiency || "").trim(),
              };
            }

            return null;
          })
          .filter((entry): entry is Language => Boolean(entry?.language));

        setLanguages(normalizedLanguages);
      } else {
        setLanguages([]);
      }
    } catch (error) {
      console.error("Error in fetchLanguages:", error);
    }
  }, [mentorId]);

  const fetchAvailability = useCallback(async () => {
    try {
      setLoading(true);

      // Auto-migrate availability_json to slots if needed
      await autoMigrateAvailabilitySlots(mentorId);

      // Create dates in local timezone at midnight
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const todayStr = getLocalDateString(now);

      const endDate = new Date(now);
      endDate.setDate(now.getDate() + 30); // Next 30 days
      endDate.setHours(0, 0, 0, 0);
      const endDateStr = getLocalDateString(endDate);

      // Get current time for filtering today's slots
      const currentTime = new Date();
      const currentHours = currentTime.getHours();
      const currentMinutes = currentTime.getMinutes();
      const currentTimeStr = `${String(currentHours).padStart(2, "0")}:${String(
        currentMinutes
      ).padStart(2, "0")}`;

      // Fetch recurring availability
      const { data: recurring, error: recurringError } = await supabase
        .from("availability_slots")
        .select("*")
        .eq("expert_id", mentorId)
        .eq("is_recurring", true);

      if (recurringError) throw recurringError;

      // Fetch specific date slots
      const { data: specific, error: specificError } = await supabase
        .from("availability_slots")
        .select("*")
        .eq("expert_id", mentorId)
        .eq("is_recurring", false)
        .gte("specific_date", todayStr)
        .lte("specific_date", endDateStr);

      if (specificError) throw specificError;

      // Fetch blocked dates
      const { data: blocked, error: blockedError } = await supabase
        .from("blocked_dates")
        .select("*")
        .eq("expert_id", mentorId)
        .gte("date", todayStr)
        .lte("date", endDateStr);

      if (blockedError) throw blockedError;

      const blockedDates = new Set(blocked?.map((b) => b.date) || []);
      const dateMap = new Map<string, number>();

      // Process specific dates
      specific?.forEach((slot) => {
        if (slot.specific_date && !blockedDates.has(slot.specific_date)) {
          // Filter out past time slots for today
          const isToday = slot.specific_date === todayStr;
          if (isToday && slot.start_time < currentTimeStr) {
            return; // Skip this slot as it's in the past
          }

          const count = dateMap.get(slot.specific_date) || 0;
          dateMap.set(slot.specific_date, count + 1);
        }
      });

      // Process recurring slots for the next 30 days
      if (recurring && recurring.length > 0) {
        for (let i = 0; i < 30; i++) {
          const checkDate = new Date(now);
          checkDate.setDate(now.getDate() + i);
          checkDate.setHours(0, 0, 0, 0);
          const dateStr = getLocalDateString(checkDate);

          if (!blockedDates.has(dateStr)) {
            const dayOfWeek = checkDate.getDay();
            let daySlots = recurring.filter(
              (slot) => slot.day_of_week === dayOfWeek
            );

            // Filter out past time slots for today
            const isToday = dateStr === todayStr;
            if (isToday) {
              daySlots = daySlots.filter(
                (slot) => slot.start_time >= currentTimeStr
              );
            }

            if (daySlots.length > 0) {
              const existingCount = dateMap.get(dateStr) || 0;
              dateMap.set(dateStr, existingCount + daySlots.length);
            }
          }
        }
      }

      // Convert to array and sort
      const datesArray: AvailableDate[] = Array.from(dateMap.entries())
        .map(([dateStr, count]) => {
          const date = parseDateString(dateStr);
          return {
            date,
            day: date
              .toLocaleDateString("en-US", { weekday: "short" })
              .toUpperCase(),
            dateStr: date.toLocaleDateString("en-US", {
              day: "numeric",
              month: "short",
            }),
            timeslotCount: count,
          };
        })
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .slice(0, 6); // Show only next 6 available dates

      setAvailableDates(datesArray);

      // Generate calendar days for the month
      generateCalendarDays(dateMap, blockedDates);
    } catch (error) {
      console.error("Error fetching availability:", error);
    } finally {
      setLoading(false);
    }
  }, [mentorId]);

  useEffect(() => {
    void fetchAvailability();
    void fetchLanguages();
  }, [fetchAvailability, fetchLanguages]);

  // Helper function to get date string in YYYY-MM-DD format in local timezone
  const getLocalDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Helper function to parse date string in local timezone
  const parseDateString = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const fetchSlotsForDate = async (dateStr: string) => {
    try {
      setLoadingSlots(true);
      const date = parseDateString(dateStr);
      const dayOfWeek = date.getDay();

      // Check if selected date is today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isToday = date.getTime() === today.getTime();

      // Get current time for filtering
      const currentTime = new Date();
      const currentTimeStr = `${String(currentTime.getHours()).padStart(
        2,
        "0"
      )}:${String(currentTime.getMinutes()).padStart(2, "0")}`;

      // Fetch specific slots for this date
      const { data: specificSlots } = await supabase
        .from("availability_slots")
        .select("start_time, end_time")
        .eq("expert_id", mentorId)
        .eq("is_recurring", false)
        .eq("specific_date", dateStr)
        .order("start_time", { ascending: true });

      // Fetch recurring slots for this day of week
      const { data: recurringSlots } = await supabase
        .from("availability_slots")
        .select("start_time, end_time")
        .eq("expert_id", mentorId)
        .eq("is_recurring", true)
        .eq("day_of_week", dayOfWeek)
        .order("start_time", { ascending: true });

      const allSlots = [...(specificSlots || []), ...(recurringSlots || [])];

      // Remove duplicates and sort
      let uniqueSlots = allSlots.reduce((acc, slot) => {
        const key = `${slot.start_time}-${slot.end_time}`;
        if (!acc.some((s) => `${s.start_time}-${s.end_time}` === key)) {
          acc.push(slot);
        }
        return acc;
      }, [] as { start_time: string; end_time: string }[]);

      // Filter out past time slots if viewing today
      if (isToday) {
        uniqueSlots = uniqueSlots.filter(
          (slot) => slot.start_time >= currentTimeStr
        );
      }

      uniqueSlots.sort((a, b) => a.start_time.localeCompare(b.start_time));

      setSelectedDateSlots({
        date: date.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        slots: uniqueSlots,
      });
      setShowSlotsModal(true);
    } catch (error) {
      console.error("Error fetching slots:", error);
    } finally {
      setLoadingSlots(false);
    }
  };

  const formatTime = (time: string) => {
    try {
      const [hours, minutes] = time.split(":");
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? "PM" : "AM";
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch {
      return time;
    }
  };

  const generateCalendarDays = (
    availabilityMap: Map<string, number>,
    blockedDates: Set<string>
  ) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // Get first and last day of month in local timezone
    const firstDay = new Date(year, month, 1);
    firstDay.setHours(0, 0, 0, 0);

    const lastDay = new Date(year, month + 1, 0);
    lastDay.setHours(0, 0, 0, 0);

    const daysInMonth = lastDay.getDate();

    const days: DayStatus[] = [];

    // Get today's date at midnight in local timezone
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      date.setHours(0, 0, 0, 0);

      // Create date string in YYYY-MM-DD format using local timezone
      const dateKey = getLocalDateString(date);
      const timeslotCount = availabilityMap.get(dateKey) || 0;

      let status: "available" | "blocked" | "unavailable" = "unavailable";

      // Check if date is in the past (comparing timestamps)
      if (date.getTime() < today.getTime()) {
        status = "unavailable";
      }
      // Check if date is blocked
      else if (blockedDates.has(dateKey)) {
        status = "blocked";
      }
      // Check if date has available timeslots
      else if (timeslotCount > 0) {
        status = "available";
      }
      // Otherwise it's unavailable
      else {
        status = "unavailable";
      }

      days.push({
        date,
        status,
        timeslotCount,
      });
    }

    setCalendarDays(days);
  };

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Calculate total slots for current month from calendar days (not availableDates)
  const totalTimeslots = calendarDays
    .filter((day) => day.status === "available")
    .reduce((sum, day) => sum + day.timeslotCount, 0);

  const getDotColor = (status: "available" | "blocked" | "unavailable") => {
    switch (status) {
      case "available":
        return "bg-green-500";
      case "blocked":
        return "bg-red-500";
      case "unavailable":
        return "bg-gray-300";
    }
  };

  return (
    <>
      <Card className="shadow-none border-0 bg-gray-50 rounded-2xl overflow-hidden">
        <CardContent className="p-4">
          {/* Header */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-gray-900 text-sm">
                Availability On {monthNames[currentMonth.getMonth()]}
              </h3>
              <button
                onClick={onSeeMore}
                className="text-xs text-blue-600 hover:underline font-medium"
              >
                See More
              </button>
            </div>
            {totalTimeslots > 0 && (
              <p className="text-xs text-gray-500">
                {totalTimeslots} slots available this month
              </p>
            )}
          </div>

          {/* Calendar View */}
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              <div className="mb-4">
                {/* Week day headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {weekDays.map((day) => (
                    <div
                      key={day}
                      className="text-center text-xs font-medium text-gray-500 py-1"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">
                  {/* Empty cells for days before start of month */}
                  {(() => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    const firstDayOfMonth = new Date(
                      currentMonth.getFullYear(),
                      currentMonth.getMonth(),
                      1
                    );
                    firstDayOfMonth.setHours(0, 0, 0, 0);

                    // Check if we're in the current month
                    const isCurrentMonth =
                      today.getFullYear() === currentMonth.getFullYear() &&
                      today.getMonth() === currentMonth.getMonth();

                    if (isCurrentMonth && today.getDate() > 7) {
                      // If we're past the first week, calculate how many days to show from previous week
                      const todayDayOfWeek = today.getDay();
                      const startOfWeek = new Date(today);
                      startOfWeek.setDate(today.getDate() - todayDayOfWeek);
                      startOfWeek.setHours(0, 0, 0, 0);

                      // Find how many empty cells we need for the week containing today
                      const emptyCount = startOfWeek.getDay();
                      return Array.from({ length: emptyCount }).map((_, i) => (
                        <div key={`empty-${i}`} className="aspect-square" />
                      ));
                    } else {
                      // Show full month if we're in first week or not current month
                      const emptyCount = firstDayOfMonth.getDay();
                      return Array.from({ length: emptyCount }).map((_, i) => (
                        <div key={`empty-${i}`} className="aspect-square" />
                      ));
                    }
                  })()}

                  {/* Calendar days */}
                  {calendarDays.map((day, index) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const isPast = day.date.getTime() < today.getTime();

                    // Check if we should show this day
                    const isCurrentMonth =
                      today.getFullYear() === currentMonth.getFullYear() &&
                      today.getMonth() === currentMonth.getMonth();

                    // If current month and past the first week, only show dates from the start of current week
                    if (isCurrentMonth && today.getDate() > 7) {
                      const todayDayOfWeek = today.getDay();
                      const startOfWeek = new Date(today);
                      startOfWeek.setDate(today.getDate() - todayDayOfWeek);
                      startOfWeek.setHours(0, 0, 0, 0);

                      // Skip dates before the start of this week
                      if (day.date.getTime() < startOfWeek.getTime()) {
                        return null;
                      }
                    }

                    return (
                      <div
                        key={index}
                        className={`aspect-square flex flex-col items-center justify-center relative p-1 rounded-lg transition-colors ${
                          isPast
                            ? "opacity-40 cursor-not-allowed"
                            : day.status !== "unavailable"
                            ? "hover:bg-gray-50 cursor-pointer"
                            : ""
                        }`}
                        title={`${day.date.toLocaleDateString()} - ${
                          day.status
                        } ${
                          day.timeslotCount > 0
                            ? `(${day.timeslotCount} slots)`
                            : ""
                        }`}
                      >
                        {day.status === "available" ? (
                          <div className="relative">
                            <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center">
                              <span className="text-xs font-semibold text-white">
                                {day.date.getDate()}
                              </span>
                            </div>
                          </div>
                        ) : day.status === "blocked" ? (
                          <div className="relative">
                            <div className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center">
                              <span className="text-xs font-semibold text-white">
                                {day.date.getDate()}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs font-medium text-gray-400">
                            {day.date.getDate()}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-xs text-gray-600">Available</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-xs text-gray-600">Blocked</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-gray-300" />
                    <span className="text-xs text-gray-600">Unavailable</span>
                  </div>
                </div>
              </div>

              {/* Next Available Dates Section */}
              {availableDates.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold text-sm text-gray-900 mb-3">
                    Next Available Dates
                  </h4>
                  <div className="space-y-2">
                    {availableDates
                      .slice(0, showAllDates ? availableDates.length : 3)
                      .map((dateInfo, index) => {
                        const dateKey = getLocalDateString(dateInfo.date);
                        const hasMultipleSlots = dateInfo.timeslotCount > 3;

                        return (
                          <div
                            key={index}
                            onClick={() => {
                              if (hasMultipleSlots) {
                                fetchSlotsForDate(dateKey);
                              } else {
                                onSeeMore?.();
                              }
                            }}
                            className="bg-green-50/50 rounded-lg p-3 hover:bg-green-50 transition-colors cursor-pointer border-2 border-green-200 relative"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs font-semibold text-gray-500 mb-0.5">
                                  {dateInfo.day}
                                </p>
                                <p className="text-sm font-bold text-gray-900">
                                  {dateInfo.dateStr}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-600">
                                  {dateInfo.timeslotCount} Timeslot
                                  {dateInfo.timeslotCount !== 1 ? "s" : ""}
                                </p>
                                {hasMultipleSlots && (
                                  <p className="text-xs text-blue-600 font-medium mt-0.5">
                                    Click to view all
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {/* Show More/Show Less Button */}
                  {availableDates.length > 3 && (
                    <button
                      onClick={() => setShowAllDates(!showAllDates)}
                      className="w-full mt-3 py-2 px-4 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200 hover:border-blue-300"
                    >
                      {showAllDates
                        ? "Show Less"
                        : `Show More (${availableDates.length - 3} more)`}
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {/* Languages Section */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="h-4 w-4 text-gray-600" />
              <h4 className="font-semibold text-sm text-gray-900">Languages</h4>
            </div>
            {languages && languages.length > 0 ? (
              <div className="space-y-2">
                {languages.map((lang, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 px-3 bg-white rounded-lg border border-gray-100"
                  >
                    <span className="text-sm font-medium text-gray-900">
                      {lang.language}
                    </span>
                    {lang.level ? (
                      <span className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full font-medium">
                        {lang.level}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-xs text-gray-400">
                No languages specified
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Time Slots Modal */}
      <Dialog open={showSlotsModal} onOpenChange={setShowSlotsModal}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              Available Time Slots
            </DialogTitle>
            <DialogDescription className="text-sm">
              {selectedDateSlots?.date}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {loadingSlots ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : selectedDateSlots && selectedDateSlots.slots.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {selectedDateSlots.slots.map((slot, index) => (
                  <div
                    key={index}
                    className="bg-green-50 border border-green-200 rounded-lg p-3 hover:bg-green-100 transition-colors"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="font-semibold text-gray-900">
                          {formatTime(slot.start_time)}
                        </p>
                        <p className="text-xs text-gray-600">
                          to {formatTime(slot.end_time)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">
                No slots available
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Similar Mentors - Only show if mentor data is available */}
      {mentor && (
        <div className="mt-6">
          <SimilarMentors
            currentMentorId={mentor.id}
            categories={mentor.categories || []}
            expertiseTags={mentor.expertise_tags || []}
          />
        </div>
      )}
    </>
  );
}
