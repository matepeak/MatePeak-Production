import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import SessionDetailsModal from "./SessionDetailsModal";

interface SessionCalendarProps {
  mentorProfile: any;
}

interface Session {
  id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  session_type: string;
  student_name: string;
  total_amount: number;
}

const SessionCalendar = ({ mentorProfile }: SessionCalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  useEffect(() => {
    fetchSessions();
  }, [mentorProfile, currentDate]);

  const fetchSessions = async () => {
    try {
      setLoading(true);

      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("expert_id", mentorProfile.id)
        .in("status", ["confirmed", "completed"])
        .gte("scheduled_date", firstDay.toISOString().split("T")[0])
        .lte("scheduled_date", lastDay.toISOString().split("T")[0])
        .order("scheduled_time", { ascending: true });

      if (error) throw error;
      setSessions(data || []);
    } catch (error: any) {
      console.error("Error fetching sessions:", error);
      toast.error("Error", {
        description: "Failed to load sessions",
      });
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    // Add all days in month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const getSessionsForDate = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return sessions.filter((session) => session.scheduled_date === dateStr);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const previousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };

  const nextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const exportToGoogleCalendar = () => {
    // Generate ICS file for Google Calendar
    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Spark Mentor Connect//EN",
      ...sessions.map((session) => {
        const startDateTime = new Date(
          `${session.scheduled_date}T${session.scheduled_time}`
        );
        const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // 1 hour duration
        return [
          "BEGIN:VEVENT",
          `DTSTART:${
            startDateTime.toISOString().replace(/[-:]/g, "").split(".")[0]
          }Z`,
          `DTEND:${
            endDateTime.toISOString().replace(/[-:]/g, "").split(".")[0]
          }Z`,
          `SUMMARY:${session.session_type || "Session"} with ${
            session.student_name
          }`,
          `DESCRIPTION:Status: ${session.status}`,
          `STATUS:${
            session.status === "confirmed" ? "CONFIRMED" : "TENTATIVE"
          }`,
          "END:VEVENT",
        ].join("\r\n");
      }),
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([icsContent], { type: "text/calendar" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sessions-${currentDate.getFullYear()}-${
      currentDate.getMonth() + 1
    }.ics`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success("Calendar file downloaded.", {
      description: "Calendar file downloaded. Import it to Google Calendar.",
    });
  };

  const days = getDaysInMonth(currentDate);

  return (
    <div className="space-y-8 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Session Calendar</h1>
          <p className="text-gray-600 mt-1">
            View all your sessions in calendar format
          </p>
        </div>
        <Button
          onClick={exportToGoogleCalendar}
          variant="outline"
          className="border-gray-300"
        >
          <Download className="h-4 w-4 mr-2" />
          Export to Calendar
        </Button>
      </div>

      {/* Calendar Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total Sessions",
            value: sessions.length,
            color: "text-gray-900",
          },
          {
            label: "Pending",
            value: sessions.filter((s) => s.status === "pending").length,
            color: "text-yellow-600",
          },
          {
            label: "Confirmed",
            value: sessions.filter((s) => s.status === "confirmed").length,
            color: "text-green-600",
          },
          {
            label: "Completed",
            value: sessions.filter((s) => s.status === "completed").length,
            color: "text-blue-600",
          },
        ].map((stat, i) => (
          <Card key={i} className="border-gray-200">
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color} mt-1`}>
                {stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Calendar */}
      <Card className="border-gray-200 w-full shadow-none bg-white rounded-2xl">
        <CardContent className="p-2 sm:p-4 w-full">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={previousMonth}
              className="border-gray-300 h-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-base font-semibold text-gray-900">
              {currentDate.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={nextMonth}
              className="border-gray-300 h-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-2 mb-2 w-full">
            {daysOfWeek.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-semibold text-gray-700 py-1.5"
              >
                {day.slice(0, 1)}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          {loading ? (
            <div className="grid grid-cols-7 gap-2 min-h-[420px] w-full">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="aspect-square">
                  <Skeleton className="w-full h-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2 min-h-[420px] w-full">
              {days.map((date, index) => {
                if (!date) {
                  return (
                    <div key={`empty-${index}`} className="aspect-square" />
                  );
                }

                const daySessions = getSessionsForDate(date);
                const today = isToday(date);
                const hasSessions = daySessions.length > 0;

                // Color by status
                const statusColor = (status: string) => {
                  switch (status?.toLowerCase()) {
                    case "confirmed":
                      return "bg-green-100 text-green-800 border-green-200";
                    case "pending":
                      return "bg-yellow-100 text-yellow-800 border-yellow-200";
                    case "completed":
                      return "bg-blue-100 text-blue-800 border-blue-200";
                    case "cancelled":
                      return "bg-red-100 text-red-800 border-red-200";
                    default:
                      return "bg-gray-100 text-gray-800 border-gray-200";
                  }
                };

                return (
                  <button
                    key={date.toISOString()}
                    className={`aspect-square border rounded-md p-1 w-full h-full transition-all text-left focus:outline-none focus:ring-2 focus:ring-rose-400 ${
                      today
                        ? "border-2 border-gray-900 bg-gray-50"
                        : hasSessions
                        ? "border-rose-300 bg-rose-50 hover:bg-rose-100 hover:shadow-md"
                        : "border border-gray-200 hover:border-gray-300 hover:shadow-sm bg-white"
                    } ${hasSessions ? "cursor-pointer" : "cursor-default"}`}
                    onClick={() => {
                      if (hasSessions) {
                        setSelectedSession(
                          daySessions.length === 1
                            ? daySessions[0]
                            : daySessions
                        );
                        setModalOpen(true);
                      }
                    }}
                    tabIndex={0}
                    aria-label={
                      hasSessions
                        ? `Sessions: ${daySessions
                            .map(
                              (s) =>
                                `${s.scheduled_time.slice(0, 5)} with ${
                                  s.student_name || "Session"
                                }`
                            )
                            .join(", ")}`
                        : `No sessions`
                    }
                  >
                    <div className="flex flex-col items-center justify-start h-full">
                      <div className="text-xs font-semibold text-gray-900 mb-1">
                        {date.getDate()}
                      </div>
                      <div className="flex flex-col gap-0.5 w-full items-center">
                        {daySessions.slice(0, 3).map((session) => (
                          <div
                            key={session.id}
                            className={`w-full px-1 py-0.5 rounded text-xs border font-medium truncate mb-0.5 ${statusColor(
                              session.status
                            )}`}
                            title={`${session.scheduled_time.slice(0, 5)} - ${
                              session.student_name || "Session"
                            }`}
                          >
                            <span className="font-semibold">
                              {session.scheduled_time.slice(0, 5)}
                            </span>{" "}
                            - {session.student_name || "Session"}
                          </div>
                        ))}
                        {daySessions.length > 3 && (
                          <div className="text-[10px] text-gray-500 w-full text-center mt-0.5">
                            +{daySessions.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 border-2 border-gray-900 bg-gray-50 rounded" />
              <span className="text-xs text-gray-600">Today</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-yellow-100 rounded" />
              <span className="text-xs text-gray-600">Pending</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-green-100 rounded" />
              <span className="text-xs text-gray-600">Confirmed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-blue-100 rounded" />
              <span className="text-xs text-gray-600">Completed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-red-100 rounded" />
              <span className="text-xs text-gray-600">Cancelled</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Session Details Modal */}
      <SessionDetailsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        session={selectedSession}
      />
    </div>
  );
};

export default SessionCalendar;
