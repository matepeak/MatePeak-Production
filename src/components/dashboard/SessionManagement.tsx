import { useEffect, useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SERVICE_CONFIG } from "@/config/serviceConfig";
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  Search,
  ArrowUpDown,
  Download,
  CalendarCheck,
  Users,
  ClockAlert,
  Filter,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import SessionDetailsModal from "./SessionDetailsModal";

interface SessionManagementProps {
  mentorProfile: any;
}

type SessionStatus =
  | "all"
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled";
type SortOption =
  | "date-desc"
  | "date-asc"
  | "amount-desc"
  | "amount-asc"
  | "status";
type DateRange = "all" | "today" | "week" | "month";

const SessionManagement = ({ mentorProfile }: SessionManagementProps) => {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<SessionStatus>("all");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("date-desc");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    sessionId: string | null;
    action: "accept" | "decline" | null;
  }>({
    open: false,
    sessionId: null,
    action: null,
  });
  const [detailsModal, setDetailsModal] = useState<{
    open: boolean;
    session: any;
  }>({
    open: false,
    session: null,
  });

  // Helper function to get effective status (treat past confirmed sessions as completed)
  const getEffectiveStatus = (session: any): string => {
    if (session.status === "confirmed") {
      try {
        const sessionDate = new Date(
          `${session.scheduled_date}T${session.scheduled_time}`
        );
        const now = new Date();
        if (sessionDate < now) {
          return "completed";
        }
      } catch {
        // If date parsing fails, keep original status
      }
    }
    return session.status || "pending";
  };

  useEffect(() => {
    fetchSessions();
  }, [mentorProfile]);

  // Helper function to format session type display name
  const formatSessionType = (sessionType: string | null | undefined) => {
    if (!sessionType) return SERVICE_CONFIG.oneOnOneSession?.name || "1 on 1 Session";

    // First, check if it's in the mentor's custom service_pricing
    if (mentorProfile?.service_pricing?.[sessionType]) {
      const customName = mentorProfile.service_pricing[sessionType].name;
      if (customName) return customName;
    }

    // Then check SERVICE_CONFIG for predefined services
    if (SERVICE_CONFIG[sessionType]) {
      return SERVICE_CONFIG[sessionType].name;
    }

    // Legacy format conversion as fallback
    const typeMap: Record<string, string> = {
      oneonesession: SERVICE_CONFIG.oneOnOneSession?.name || "1 on 1 Session",
      oneOnOneSession: SERVICE_CONFIG.oneOnOneSession?.name || "1 on 1 Session",
      "one-on-one": SERVICE_CONFIG.oneOnOneSession?.name || "1 on 1 Session",
      chatAdvice: SERVICE_CONFIG.chatAdvice?.name || "Chat Consultation",
      group: "Group Session",
      groupsession: "Group Session",
      workshop: "Workshop",
      consultation: "Consultation",
    };

    // Check if we have a mapping (case-insensitive)
    const lowerType = sessionType.toLowerCase();
    if (typeMap[lowerType]) {
      return typeMap[lowerType];
    }

    // Check exact match
    if (typeMap[sessionType]) {
      return typeMap[sessionType];
    }

    // Otherwise, format camelCase to Title Case with spaces
    return sessionType
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  // Helper function to check if date is within range
  const isWithinDateRange = (
    scheduledDate: string,
    scheduledTime: string,
    range: DateRange
  ) => {
    if (range === "all") return true;

    if (!scheduledDate) return false;

    try {
      // Parse the session date and time
      const sessionDateTime = new Date(
        `${scheduledDate}T${scheduledTime || "00:00"}`
      );

      // Get current date components
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const currentDate = now.getDate();

      // Get session date components
      const sessionYear = sessionDateTime.getFullYear();
      const sessionMonth = sessionDateTime.getMonth();
      const sessionDate = sessionDateTime.getDate();

      switch (range) {
        case "today":
          // Check if same year, month, and date
          return (
            sessionYear === currentYear &&
            sessionMonth === currentMonth &&
            sessionDate === currentDate
          );

        case "week":
          // Get start of current week (Monday)
          const currentDay = now.getDay();
          const diff = currentDay === 0 ? -6 : 1 - currentDay; // Adjust when Sunday (0)
          const weekStart = new Date(
            currentYear,
            currentMonth,
            currentDate + diff,
            0,
            0,
            0,
            0
          );

          // Get end of current week (Sunday)
          const weekEnd = new Date(
            currentYear,
            currentMonth,
            currentDate + diff + 6,
            23,
            59,
            59,
            999
          );

          return sessionDateTime >= weekStart && sessionDateTime <= weekEnd;

        case "month":
          // Check if same year and month
          return sessionYear === currentYear && sessionMonth === currentMonth;

        default:
          return true;
      }
    } catch (error) {
      console.error("Date parsing error:", error, {
        scheduledDate,
        scheduledTime,
      });
      return false;
    }
  };

  // Calculate statistics using useMemo for performance - respecting date range filter
  const statistics = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Filter sessions by current date range first (for display in the list)
    const dateFilteredSessions = sessions.filter((s) =>
      isWithinDateRange(s.scheduled_date, s.scheduled_time, dateRange)
    );

    const pending = dateFilteredSessions.filter(
      (s) => s.status === "pending"
    ).length;
    const thisWeek = sessions.filter((s) => {
      try {
        const sessionDate = new Date(`${s.scheduled_date}T${s.scheduled_time}`);
        return sessionDate >= weekStart && sessionDate < weekEnd;
      } catch {
        return false;
      }
    }).length;

    const thisMonth = sessions.filter((s) => {
      try {
        const sessionDate = new Date(`${s.scheduled_date}T${s.scheduled_time}`);
        return sessionDate >= monthStart && sessionDate <= monthEnd;
      } catch {
        return false;
      }
    }).length;

    const upcoming = sessions.filter((s) => {
      try {
        const sessionDate = new Date(`${s.scheduled_date}T${s.scheduled_time}`);
        return sessionDate > now && s.status === "confirmed";
      } catch {
        return false;
      }
    }).length;

    return {
      total: sessions.length, // Total should always be ALL sessions
      pending,
      thisWeek,
      thisMonth,
      upcoming,
    };
  }, [sessions, dateRange]);

  // Get status counts for tab badges - respecting date range filter
  const statusCounts = useMemo(() => {
    const dateFilteredSessions = sessions.filter((s) =>
      isWithinDateRange(s.scheduled_date, s.scheduled_time, dateRange)
    );

    return {
      all: dateFilteredSessions.length,
      pending: dateFilteredSessions.filter(
        (s) => getEffectiveStatus(s) === "pending"
      ).length,
      confirmed: dateFilteredSessions.filter(
        (s) => getEffectiveStatus(s) === "confirmed"
      ).length,
      completed: dateFilteredSessions.filter(
        (s) => getEffectiveStatus(s) === "completed"
      ).length,
      cancelled: dateFilteredSessions.filter(
        (s) => getEffectiveStatus(s) === "cancelled"
      ).length,
    };
  }, [sessions, dateRange]);

  // Get upcoming sessions (next 3) - respecting date range filter
  const upcomingSessions = useMemo(() => {
    const now = new Date();
    return sessions
      .filter((s) => {
        try {
          const sessionDate = new Date(
            `${s.scheduled_date}T${s.scheduled_time}`
          );
          // Must be future, confirmed, AND within selected date range
          return (
            sessionDate > now &&
            s.status === "confirmed" &&
            isWithinDateRange(s.scheduled_date, s.scheduled_time, dateRange)
          );
        } catch {
          return false;
        }
      })
      .sort((a, b) => {
        const dateA = new Date(`${a.scheduled_date}T${a.scheduled_time}`);
        const dateB = new Date(`${b.scheduled_date}T${b.scheduled_time}`);
        return dateA.getTime() - dateB.getTime();
      })
      .slice(0, 3);
  }, [sessions, dateRange]);

  const fetchSessions = async () => {
    try {
      setLoading(true);

      console.log("Fetching sessions for mentor:", mentorProfile?.id);

      // Fetch sessions where user is the expert (mentor)
      const { data: expertSessions, error: expertError } = await supabase
        .from("bookings")
        .select("*")
        .eq("expert_id", mentorProfile.id)
        .order("scheduled_date", { ascending: false })
        .limit(100);

      console.log("Expert sessions query result:", {
        expertSessions,
        expertError,
      });

      if (expertError) throw expertError;

      // Fetch student details separately for expert sessions
      let enrichedExpertSessions = expertSessions || [];
      if (expertSessions && expertSessions.length > 0) {
        const userIds = expertSessions.map((s) => s.user_id).filter(Boolean);
        const { data: studentsData } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone")
          .in("id", userIds);

        // Merge student data with sessions
        enrichedExpertSessions = expertSessions.map((session) => ({
          ...session,
          student: studentsData?.find((s) => s.id === session.user_id),
          display_name:
            studentsData?.find((s) => s.id === session.user_id)?.full_name ||
            session.student_name ||
            "Student",
          display_email:
            studentsData?.find((s) => s.id === session.user_id)?.email ||
            session.student_email ||
            "",
          display_phone:
            studentsData?.find((s) => s.id === session.user_id)?.phone || "",
          user_role: "expert" as const,
        }));
      }

      // Fetch sessions where user booked as a student (using the auth user id, not expert_profile id)
      const { data: studentSessions, error: studentError } = await supabase
        .from("bookings")
        .select("*")
        .eq("user_id", mentorProfile.id)
        .order("scheduled_date", { ascending: false })
        .limit(100);

      console.log("Student sessions query result:", {
        studentSessions,
        studentError,
      });

      // Fetch mentor details separately for student sessions
      let enrichedStudentSessions = studentSessions || [];
      if (studentSessions && studentSessions.length > 0) {
        const expertIds = studentSessions
          .map((s) => s.expert_id)
          .filter(Boolean);
        const { data: mentorsData } = await supabase
          .from("expert_profiles")
          .select("id, full_name, email, phone")
          .in("id", expertIds);

        // Merge mentor data with sessions
        enrichedStudentSessions = studentSessions.map((session) => ({
          ...session,
          mentor_profile: mentorsData?.find((m) => m.id === session.expert_id),
          display_name:
            mentorsData?.find((m) => m.id === session.expert_id)?.full_name ||
            "Mentor",
          display_email:
            mentorsData?.find((m) => m.id === session.expert_id)?.email || "",
          display_phone:
            mentorsData?.find((m) => m.id === session.expert_id)?.phone || "",
          user_role: "student" as const,
        }));
      }

      if (studentError) {
        console.warn(
          "Student sessions error (this is normal if user hasn't booked as student):",
          studentError
        );
      }

      // Combine both types of sessions
      const allSessions = [
        ...enrichedExpertSessions,
        ...enrichedStudentSessions,
      ].sort((a, b) => {
        // Sort by date and time combined (most recent first)
        const dateTimeA = new Date(
          `${a.scheduled_date}T${a.scheduled_time || "00:00"}`
        );
        const dateTimeB = new Date(
          `${b.scheduled_date}T${b.scheduled_time || "00:00"}`
        );
        return dateTimeB.getTime() - dateTimeA.getTime();
      });

      setSessions(allSessions);
      console.log("Fetched sessions:", allSessions.length, allSessions);
    } catch (error: any) {
      console.error("Error fetching sessions:", error);
      toast({
        title: "Error",
        description:
          error.message || "Failed to load sessions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSessionAction = async (
    sessionId: string,
    action: "accept" | "decline"
  ) => {
    if (!sessionId) {
      toast({
        title: "Error",
        description: "Invalid session ID",
        variant: "destructive",
      });
      return;
    }

    try {
      setActionLoading(sessionId);

      const newStatus = action === "accept" ? "confirmed" : "cancelled";

      const { error } = await supabase
        .from("bookings")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      if (error) throw error;

      // Update local state
      setSessions((prev) =>
        prev.map((session) =>
          session.id === sessionId ? { ...session, status: newStatus } : session
        )
      );

      toast({
        title: action === "accept" ? "Session confirmed" : "Session declined",
        description:
          action === "accept"
            ? "The session has been confirmed successfully"
            : "The session has been declined",
      });
    } catch (error: any) {
      console.error("Error updating session:", error);
      toast({
        title: "Error",
        description:
          error.message || "Failed to update session. Please try again.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
      setConfirmDialog({ open: false, sessionId: null, action: null });
    }
  };

  const openConfirmDialog = (
    sessionId: string,
    action: "accept" | "decline"
  ) => {
    setConfirmDialog({ open: true, sessionId, action });
  };

  // Filter, search, and sort sessions
  const filteredAndSortedSessions = sessions
    .filter((session) => {
      const effectiveStatus = getEffectiveStatus(session);

      // Status filter - use effective status
      if (filter !== "all" && effectiveStatus !== filter) return false;

      // Date range filter
      if (
        !isWithinDateRange(
          session.scheduled_date,
          session.scheduled_time,
          dateRange
        )
      ) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const searchFields = [
          session.session_type,
          session.display_name,
          session.display_email,
          session.notes,
          session.message,
          session.status,
        ].filter(Boolean);

        const matches = searchFields.some((field) =>
          String(field).toLowerCase().includes(query)
        );

        if (!matches) return false;
      }

      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return (
            new Date(`${b.scheduled_date}T${b.scheduled_time}`).getTime() -
            new Date(`${a.scheduled_date}T${a.scheduled_time}`).getTime()
          );
        case "date-asc":
          return (
            new Date(`${a.scheduled_date}T${a.scheduled_time}`).getTime() -
            new Date(`${b.scheduled_date}T${b.scheduled_time}`).getTime()
          );
        case "amount-desc":
          return (b.total_amount || 0) - (a.total_amount || 0);
        case "amount-asc":
          return (a.total_amount || 0) - (b.total_amount || 0);
        case "status":
          return (a.status || "").localeCompare(b.status || "");
        default:
          return 0;
      }
    });

  console.log("Filter state:", { filter, dateRange, searchQuery, sortBy });
  console.log(
    "Filtered sessions:",
    filteredAndSortedSessions.length,
    filteredAndSortedSessions
  );

  // Export to CSV function
  const exportToCSV = () => {
    try {
      const headers = [
        "Date & Time",
        "Session Type",
        "Participant Name",
        "Participant Email",
        "Status",
        "Amount",
        "Message",
      ];

      const csvData = filteredAndSortedSessions.map((session) => [
        formatDate(session.scheduled_date, session.scheduled_time),
        formatSessionType(session.session_type),
        session.display_name || "N/A",
        session.display_email || "N/A",
        session.status || "pending",
        session.total_amount ? `₹${session.total_amount.toFixed(2)}` : "N/A",
        (session.message || "").replace(/,/g, ";"), // Replace commas to avoid CSV issues
      ]);

      const csvContent = [
        headers.join(","),
        ...csvData.map((row) => row.map((cell) => `"${cell}"`).join(",")),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `sessions_${new Date().toISOString().split("T")[0]}.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export Successful",
        description: `Exported ${filteredAndSortedSessions.length} sessions to CSV`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export sessions. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Get time remaining for upcoming session
  const getTimeRemaining = (scheduledDate: string, scheduledTime: string) => {
    try {
      const sessionDate = new Date(`${scheduledDate}T${scheduledTime}`);
      const now = new Date();
      const diffMs = sessionDate.getTime() - now.getTime();

      if (diffMs < 0) return "Past";

      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);

      if (diffDays > 0) return `in ${diffDays} day${diffDays > 1 ? "s" : ""}`;
      if (diffHours > 0)
        return `in ${diffHours} hour${diffHours > 1 ? "s" : ""}`;

      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `in ${diffMins} minute${diffMins > 1 ? "s" : ""}`;
    } catch {
      return "";
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      pending: {
        label: "Pending",
        className:
          "bg-yellow-50 text-yellow-700 border-0 rounded-md hover:bg-yellow-50",
      },
      confirmed: {
        label: "Confirmed",
        className:
          "bg-green-50 text-green-700 border-0 rounded-md hover:bg-green-50",
      },
      completed: {
        label: "Completed",
        className:
          "bg-blue-50 text-blue-700 border-0 rounded-md hover:bg-blue-50",
      },
      cancelled: {
        label: "Cancelled",
        className: "bg-red-50 text-red-700 border-0 rounded-md hover:bg-red-50",
      },
    };

    const config = statusConfig[status] || {
      label: status,
      className:
        "bg-gray-50 text-gray-700 border-0 rounded-md hover:bg-gray-50",
    };

    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const formatDate = (scheduledDate: string, scheduledTime: string) => {
    if (!scheduledDate || !scheduledTime) return "Date not set";
    try {
      const date = new Date(`${scheduledDate}T${scheduledTime}`);
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch {
      return "Invalid date";
    }
  };

  const isUpcoming = (scheduledDate: string, scheduledTime: string) => {
    if (!scheduledDate || !scheduledTime) return false;
    try {
      const sessionDate = new Date(`${scheduledDate}T${scheduledTime}`);
      return sessionDate > new Date();
    } catch {
      return false;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header - Matching DashboardOverview */}
      <div className="py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              Session Management
            </h1>
            <p className="text-gray-600 text-sm">
              Manage your bookings and upcoming sessions
            </p>
          </div>
          <Button
            onClick={exportToCSV}
            disabled={filteredAndSortedSessions.length === 0}
            variant="ghost"
            className="h-11 text-sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Statistics Cards - Matching DashboardOverview Style */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card
              key={i}
              className="bg-gray-100 border-0 rounded-2xl shadow-none h-[116px]"
            >
              <CardContent className="p-6 h-full">
                <div className="flex items-center justify-between h-full">
                  <div className="flex-1">
                    <Skeleton className="h-3 w-20 mb-3" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                  <Skeleton className="h-6 w-6 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Upcoming Sessions */}
          <Card className="group bg-gray-100 border-0 rounded-2xl shadow-none hover:shadow-md transition-all duration-200 h-[116px]">
            <CardContent className="p-6 h-full">
              <div className="flex items-center justify-between h-full">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Upcoming
                  </p>
                  <div className="flex items-baseline mt-3">
                    <p className="text-3xl font-bold text-gray-900">
                      {statistics.upcoming}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Clock className="h-6 w-6 text-rose-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* This Week */}
          <Card className="group bg-gray-100 border-0 rounded-2xl shadow-none hover:shadow-md transition-all duration-200 h-[116px]">
            <CardContent className="p-6 h-full">
              <div className="flex items-center justify-between h-full">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    This Week
                  </p>
                  <div className="flex items-baseline mt-3">
                    <p className="text-3xl font-bold text-gray-900">
                      {statistics.thisWeek}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-center group-hover:scale-105 transition-transform">
                  <CalendarCheck className="h-6 w-6 text-rose-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* This Month */}
          <Card className="group bg-gray-100 border-0 rounded-2xl shadow-none hover:shadow-md transition-all duration-200 h-[116px]">
            <CardContent className="p-6 h-full">
              <div className="flex items-center justify-between h-full">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    This Month
                  </p>
                  <div className="flex items-baseline mt-3">
                    <p className="text-3xl font-bold text-gray-900">
                      {statistics.thisMonth}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Calendar className="h-6 w-6 text-rose-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Sessions */}
          <Card className="group bg-gray-100 border-0 rounded-2xl shadow-none hover:shadow-md transition-all duration-200 h-[116px]">
            <CardContent className="p-6 h-full">
              <div className="flex items-center justify-between h-full">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Total Sessions
                  </p>
                  <div className="flex items-baseline mt-3">
                    <p className="text-3xl font-bold text-gray-900">
                      {statistics.total}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Users className="h-6 w-6 text-rose-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upcoming Sessions Widget - Matching DashboardOverview Card Style */}
      {!loading && upcomingSessions.length > 0 && (
        <Card className="bg-gray-100 border-0 rounded-2xl shadow-none">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-rose-400" />
              <h3 className="text-sm font-semibold text-gray-700">Next Up</h3>
            </div>
            <div className="space-y-2">
              {upcomingSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-gray-200 hover:border-rose-300 transition-all"
                >
                  <div className="flex-1 min-w-0 mr-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {formatSessionType(session.session_type)}
                    </p>
                    <p className="text-xs text-gray-600 truncate">
                      {formatDate(
                        session.scheduled_date,
                        session.scheduled_time
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Badge className="bg-rose-50 text-rose-700 border-0 rounded-md text-xs whitespace-nowrap">
                      {getTimeRemaining(
                        session.scheduled_date,
                        session.scheduled_time
                      )}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDetailsModal({ open: true, session })}
                      className="h-7 w-7 p-0 hover:bg-gray-100"
                    >
                      <Eye className="h-3.5 w-3.5 text-gray-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Filter Tabs - Matching DashboardOverview Time Period Style */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
            filter === "all"
              ? "bg-gray-900 text-white shadow-sm"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          All Sessions
          {statusCounts.all > 0 && (
            <span className="ml-1.5 opacity-75">({statusCounts.all})</span>
          )}
        </button>
        <button
          onClick={() => setFilter("confirmed")}
          className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
            filter === "confirmed"
              ? "bg-gray-900 text-white shadow-sm"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Confirmed
          {statusCounts.confirmed > 0 && (
            <span className="ml-1.5 opacity-75">
              ({statusCounts.confirmed})
            </span>
          )}
        </button>
        <button
          onClick={() => setFilter("completed")}
          className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
            filter === "completed"
              ? "bg-gray-900 text-white shadow-sm"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Completed
          {statusCounts.completed > 0 && (
            <span className="ml-1.5 opacity-75">
              ({statusCounts.completed})
            </span>
          )}
        </button>
        <button
          onClick={() => setFilter("cancelled")}
          className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
            filter === "cancelled"
              ? "bg-gray-900 text-white shadow-sm"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Cancelled
          {statusCounts.cancelled > 0 && (
            <span className="ml-1.5 opacity-75">
              ({statusCounts.cancelled})
            </span>
          )}
        </button>
      </div>

      {/* Date Range Filter - Matching DashboardOverview */}
      <div className="flex items-center gap-2 pb-2">
        <button
          onClick={() => setDateRange("today")}
          className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
            dateRange === "today"
              ? "bg-gray-900 text-white shadow-sm"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Today
        </button>
        <button
          onClick={() => setDateRange("week")}
          className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
            dateRange === "week"
              ? "bg-gray-900 text-white shadow-sm"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          This Week
        </button>
        <button
          onClick={() => setDateRange("month")}
          className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
            dateRange === "month"
              ? "bg-gray-900 text-white shadow-sm"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          This Month
        </button>
        <button
          onClick={() => setDateRange("all")}
          className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
            dateRange === "all"
              ? "bg-gray-900 text-white shadow-sm"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          All Time
        </button>
      </div>

      {/* Search and Filter Row */}
      <div className="flex items-center gap-3">
        {/* Search Bar */}
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search sessions by name, email, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-gray-200 bg-white rounded-xl h-11"
          />
        </div>

        {/* Filter Dropdown for Sort */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="h-11 w-11 p-0 border-gray-200 rounded-xl flex-shrink-0"
            >
              <Filter className="h-4 w-4 text-gray-600" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-4" align="end">
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Sort By</h4>
              <Select
                value={sortBy}
                onValueChange={(value) => setSortBy(value as SortOption)}
              >
                <SelectTrigger className="w-full h-9">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">Date (Newest First)</SelectItem>
                  <SelectItem value="date-asc">Date (Oldest First)</SelectItem>
                  <SelectItem value="amount-desc">
                    Amount (High to Low)
                  </SelectItem>
                  <SelectItem value="amount-asc">
                    Amount (Low to High)
                  </SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>

              {sortBy !== "date-desc" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortBy("date-desc")}
                  className="w-full h-8 text-xs"
                >
                  Reset Sort
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Results Count */}
      {(searchQuery || filter !== "all" || dateRange !== "all") && (
        <div className="flex items-center gap-2 px-1">
          <p className="text-sm text-gray-600">
            Showing{" "}
            <span className="font-medium text-gray-900">
              {filteredAndSortedSessions.length}
            </span>{" "}
            of {sessions.length} session{sessions.length !== 1 ? "s" : ""}
            {searchQuery && (
              <span className="ml-1">
                matching{" "}
                <span className="font-medium text-gray-900">
                  "{searchQuery}"
                </span>
              </span>
            )}
          </p>
        </div>
      )}

      {/* Sessions List - 2 Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border-gray-200 rounded-xl shadow-sm">
              <CardContent className="p-4 min-h-[180px]">
                {/* Header skeleton */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-6 w-24 rounded-md" />
                </div>

                {/* Info section skeleton */}
                <div className="space-y-2 mb-3">
                  {/* Date and time skeleton */}
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 w-56" />
                  </div>

                  {/* Student name skeleton */}
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 w-44" />
                  </div>

                  {/* Amount skeleton */}
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                </div>

                {/* Action buttons skeleton */}
                <div className="flex items-center justify-between gap-2">
                  <Skeleton className="h-8 w-full rounded-lg" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredAndSortedSessions.length > 0 ? (
          filteredAndSortedSessions.map((session) => {
            const effectiveStatus = getEffectiveStatus(session);
            return (
              <Card
                key={session.id}
                className="bg-white border border-gray-200 rounded-xl shadow-sm"
              >
                <CardContent className="p-4">
                  {/* Header Section - Type, Status, and Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <h3 className="text-base font-semibold text-gray-900 truncate">
                        {formatSessionType(session.session_type)}
                      </h3>
                      {isUpcoming(
                        session.scheduled_date,
                        session.scheduled_time
                      ) &&
                        effectiveStatus === "confirmed" && (
                          <Badge className="bg-blue-50 text-blue-700 border-0 rounded-md text-xs px-2 py-0.5 whitespace-nowrap flex-shrink-0">
                            Upcoming
                          </Badge>
                        )}
                    </div>
                    {getStatusBadge(effectiveStatus)}
                  </div>

                  {/* Info Section */}
                  <div className="space-y-2 mb-3">
                    {/* Date & Time */}
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700 truncate">
                        {formatDate(
                          session.scheduled_date,
                          session.scheduled_time
                        )}
                      </span>
                    </div>

                    {/* Amount */}
                    {session.total_amount && session.total_amount > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-green-600">
                          ₹{session.total_amount.toFixed(2)}
                        </span>
                      </div>
                    )}

                    {/* Message Preview */}
                    {session.message && (
                      <div className="pt-2 border-t border-gray-100">
                        <p className="text-xs font-medium text-gray-500 mb-1">
                          Mentee's Message:
                        </p>
                        <p className="text-xs text-gray-600 line-clamp-2">
                          {session.message}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between gap-2">
                    {session.status === "pending" ? (
                      <>
                        <div className="flex gap-2 flex-1">
                          <Button
                            size="sm"
                            onClick={() =>
                              openConfirmDialog(session.id, "accept")
                            }
                            disabled={actionLoading === session.id}
                            className="flex-1 h-8 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg"
                          >
                            {actionLoading === session.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                                Accept
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              openConfirmDialog(session.id, "decline")
                            }
                            disabled={actionLoading === session.id}
                            className="flex-1 h-8 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 text-xs font-medium rounded-lg"
                          >
                            {actionLoading === session.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <>
                                <XCircle className="h-3.5 w-3.5 mr-1.5" />
                                Decline
                              </>
                            )}
                          </Button>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setDetailsModal({ open: true, session })
                          }
                          className="h-8 px-3 text-xs font-medium border-gray-200 rounded-lg flex items-center gap-1.5"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View</span>
                        </Button>
                      </>
                    ) : (
                      <div className="w-full flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setDetailsModal({ open: true, session })
                          }
                          className="h-8 px-3 text-xs font-medium border-gray-200 rounded-lg flex items-center gap-1.5"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-0 rounded-2xl shadow-none lg:col-span-2">
            <CardContent className="p-16">
              <div className="text-center max-w-md mx-auto">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white shadow-sm mb-5">
                  <Calendar className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  No sessions found
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {filter === "all" && dateRange === "all"
                    ? "You don't have any sessions yet. When students book sessions with you, they will appear here."
                    : dateRange !== "all"
                    ? `No ${
                        filter !== "all" ? filter : ""
                      } sessions found for ${
                        dateRange === "today"
                          ? "today"
                          : dateRange === "week"
                          ? "this week"
                          : "this month"
                      }.`
                    : `You don't have any ${filter} sessions.`}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog({ open, sessionId: null, action: null })
        }
        onConfirm={() => {
          if (confirmDialog.sessionId && confirmDialog.action) {
            handleSessionAction(confirmDialog.sessionId, confirmDialog.action);
          }
        }}
        title={
          confirmDialog.action === "accept"
            ? "Confirm Session"
            : "Decline Session"
        }
        description={
          confirmDialog.action === "accept"
            ? "Are you sure you want to accept this session? The student will be notified and the session will be confirmed."
            : "Are you sure you want to decline this session? This action cannot be undone and the student will be notified."
        }
        confirmText={
          confirmDialog.action === "accept"
            ? "Accept Session"
            : "Decline Session"
        }
        variant={confirmDialog.action === "decline" ? "destructive" : "default"}
      />

      {/* Session Details Modal */}
      <SessionDetailsModal
        open={detailsModal.open}
        onClose={() => setDetailsModal({ open: false, session: null })}
        session={detailsModal.session}
      />
    </div>
  );
};

export default SessionManagement;
