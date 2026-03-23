import { useEffect, useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { SERVICE_CONFIG } from "@/config/serviceConfig";
import {
  Calendar,
  Clock,
  Eye,
  Trash2,
  Search,
  ArrowUpDown,
  Download,
  CalendarCheck,
  Users,
  ClockAlert,
  Filter,
  LayoutGrid,
  List,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import SessionDetailsModal from "./SessionDetailsModal";
import { cancelSessionWithReason } from "@/services/sessionService";

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
type SessionViewMode = "cards" | "list";
const CANCELLATION_NOTE_MAX_LENGTH = 300;
const MENTOR_SESSIONS_LAYOUT_KEY = "sessionsLayout:mentor";

const SessionManagement = ({ mentorProfile }: SessionManagementProps) => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<SessionStatus>("all");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("date-desc");
  const [viewMode, setViewMode] = useState<SessionViewMode>(() => {
    if (typeof window === "undefined") return "cards";
    const saved = window.localStorage.getItem(MENTOR_SESSIONS_LAYOUT_KEY);
    return saved === "list" || saved === "cards" ? saved : "cards";
  });
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelDialog, setCancelDialog] = useState<{
    open: boolean;
    session: any;
    note: string;
  }>({
    open: false,
    session: null,
    note: "",
  });
  const [cancelNoteError, setCancelNoteError] = useState("");
  const [detailsModal, setDetailsModal] = useState<{
    open: boolean;
    session: any;
  }>({
    open: false,
    session: null,
  });
  const [deleteDialog, setDeleteDialog] = useState<{
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

  const getSessionStatusForUI = (session: any): string => {
    const effectiveStatus = getEffectiveStatus(session);

    if (effectiveStatus === "confirmed") {
      try {
        const sessionDate = new Date(
          `${session.scheduled_date}T${session.scheduled_time}`
        );
        if (sessionDate > new Date()) {
          return "pending";
        }
      } catch {
        // Fall through to the original effective status
      }
    }

    return effectiveStatus;
  };

  const toLocalDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getDateRangeBoundaries = (range: DateRange) => {
    const now = new Date();

    switch (range) {
      case "today": {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        return {
          startDate: toLocalDateString(start),
          endDate: toLocalDateString(end),
        };
      }
      case "week": {
        const start = new Date(now);
        const dayOfWeek = start.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        start.setDate(start.getDate() + diffToMonday);
        start.setHours(0, 0, 0, 0);

        const end = new Date(start);
        end.setDate(end.getDate() + 7);

        return {
          startDate: toLocalDateString(start),
          endDate: toLocalDateString(end),
        };
      }
      case "month": {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        return {
          startDate: toLocalDateString(start),
          endDate: toLocalDateString(end),
        };
      }
      case "all":
      default:
        return {
          startDate: null,
          endDate: null,
        };
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [mentorProfile, dateRange]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(MENTOR_SESSIONS_LAYOUT_KEY, viewMode);
  }, [viewMode]);

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
      priorityDm: SERVICE_CONFIG.priorityDm?.name || "Priority DM",
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

  const visibleSessions = sessions;

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
    const dateFilteredSessions = visibleSessions.filter((s) =>
      isWithinDateRange(s.scheduled_date, s.scheduled_time, dateRange)
    );

    const pending = dateFilteredSessions.filter(
      (s) => s.status === "pending"
    ).length;
    const thisWeek = visibleSessions.filter((s) => {
      try {
        const sessionDate = new Date(`${s.scheduled_date}T${s.scheduled_time}`);
        return sessionDate >= weekStart && sessionDate < weekEnd;
      } catch {
        return false;
      }
    }).length;

    const thisMonth = visibleSessions.filter((s) => {
      try {
        const sessionDate = new Date(`${s.scheduled_date}T${s.scheduled_time}`);
        return sessionDate >= monthStart && sessionDate <= monthEnd;
      } catch {
        return false;
      }
    }).length;

    const hasUpcoming = visibleSessions.some((s) => {
      try {
        const sessionDate = new Date(`${s.scheduled_date}T${s.scheduled_time}`);
        return sessionDate > now && s.status === "confirmed";
      } catch {
        return false;
      }
    });

    const upcoming = hasUpcoming ? 1 : 0;

    return {
      total: visibleSessions.length,
      pending,
      thisWeek,
      thisMonth,
      upcoming,
    };
  }, [visibleSessions, dateRange]);

  // Get status counts for tab badges - respecting date range filter
  const statusCounts = useMemo(() => {
    const dateFilteredSessions = visibleSessions.filter((s) =>
      isWithinDateRange(s.scheduled_date, s.scheduled_time, dateRange)
    );

    return {
      all: dateFilteredSessions.length,
      pending: dateFilteredSessions.filter(
        (s) => getSessionStatusForUI(s) === "pending"
      ).length,
      confirmed: dateFilteredSessions.filter(
        (s) => getSessionStatusForUI(s) === "confirmed"
      ).length,
      completed: dateFilteredSessions.filter(
        (s) => getSessionStatusForUI(s) === "completed"
      ).length,
      cancelled: dateFilteredSessions.filter(
        (s) => getSessionStatusForUI(s) === "cancelled"
      ).length,
    };
  }, [visibleSessions, dateRange]);

  // Get upcoming sessions (next 3) - respecting date range filter
  const upcomingSessions = useMemo(() => {
    const now = new Date();
    return visibleSessions
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
      .slice(0, 1);
  }, [visibleSessions, dateRange]);

  const nextUpcomingSessionId = useMemo(
    () => upcomingSessions[0]?.id ?? null,
    [upcomingSessions]
  );

  const fetchSessions = async () => {
    try {
      setLoading(true);

      console.log("Fetching sessions for mentor:", mentorProfile?.id);

      const { startDate, endDate } = getDateRangeBoundaries(dateRange);

      // Fetch sessions where user is the expert (mentor)
      let expertQuery = supabase
        .from("bookings")
        .select("*")
        .eq("expert_id", mentorProfile.id)
        .eq("is_deleted", false)
        .in("session_type", ["oneOnOneSession", "one-on-one", "oneonesession"])
        .in("status", ["confirmed", "completed", "cancelled"])
        .order("scheduled_date", { ascending: false })
        .limit(100);

      if (startDate && endDate) {
        expertQuery = expertQuery
          .gte("scheduled_date", startDate)
          .lt("scheduled_date", endDate);
      }

      const { data: expertSessions, error: expertError } = await expertQuery;

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
          .select("id, full_name, email, avatar_url")
          .in("id", userIds);

        // Merge student data with sessions
        enrichedExpertSessions = expertSessions.map((session) => ({
          ...session,
          student: studentsData?.find((s) => s.id === session.user_id),
          display_name:
            studentsData?.find((s) => s.id === session.user_id)?.full_name ||
            session.user_name ||
            session.student_name ||
            "Student",
          display_email:
            studentsData?.find((s) => s.id === session.user_id)?.email ||
            session.student_email ||
            "",
          display_phone:
            session.user_phone || "",
          user_role: "expert" as const,
        }));
      }

      // Fetch sessions where user booked as a student (using the auth user id, not expert_profile id)
      let studentQuery = supabase
        .from("bookings")
        .select("*")
        .eq("user_id", mentorProfile.id)
        .eq("is_deleted", false)
        .in("session_type", ["oneOnOneSession", "one-on-one", "oneonesession"])
        .in("status", ["confirmed", "completed", "cancelled"])
        .order("scheduled_date", { ascending: false })
        .limit(100);

      if (startDate && endDate) {
        studentQuery = studentQuery
          .gte("scheduled_date", startDate)
          .lt("scheduled_date", endDate);
      }

      const { data: studentSessions, error: studentError } = await studentQuery;

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
          .select("id, full_name, profile_picture_url")
          .in("id", expertIds);

        // Merge mentor data with sessions
        enrichedStudentSessions = studentSessions.map((session) => ({
          ...session,
          mentor_profile: mentorsData?.find((m) => m.id === session.expert_id),
          display_name:
            mentorsData?.find((m) => m.id === session.expert_id)?.full_name ||
            "Mentor",
          display_email:
            session.expert_email || "",
          display_phone:
            "",
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

  // Filter, search, and sort sessions
  const filteredAndSortedSessions = visibleSessions
    .filter((session) => {
      const statusForUI = getSessionStatusForUI(session);

      // Status filter - use UI status mapping
      if (filter !== "all" && statusForUI !== filter) return false;

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
          "bg-amber-50 text-amber-800 border border-amber-200 rounded-md",
      },
      confirmed: {
        label: "Confirmed",
        className:
          "bg-sky-50 text-sky-800 border border-sky-200 rounded-md",
      },
      completed: {
        label: "Completed",
        className:
          "bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md",
      },
      cancelled: {
        label: "Cancelled",
        className: "bg-rose-50 text-rose-700 border border-rose-200 rounded-md",
      },
    };

    const config = statusConfig[status] || {
      label: status,
      className: "bg-gray-100 text-gray-700 border border-gray-200 rounded-md",
    };

    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    );
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

  const getParticipantKey = (session: any) => {
    if (session.user_role === "expert") {
      return session.user_id || session.display_email || session.display_name;
    }
    return session.expert_id || session.display_email || session.display_name;
  };

  const getParticipantAvatar = (session: any) => {
    return (
      session?.student?.avatar_url ||
      session?.mentor_profile?.profile_picture_url ||
      session?.avatar_url ||
      ""
    );
  };

  const getParticipantInitial = (session: any) => {
    const label = String(session?.display_name || "Mentee").trim();
    return label.charAt(0).toUpperCase();
  };

  const participantSessionCounts = useMemo(() => {
    const counts = new Map<string, number>();

    visibleSessions.forEach((session) => {
      const key = String(getParticipantKey(session) || "unknown");
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    return counts;
  }, [visibleSessions]);

  const canDeleteSession = (session: any) => {
    const effectiveStatus = getEffectiveStatus(session);
    return ["completed", "cancelled"].includes(effectiveStatus);
  };

  const handleDeleteSession = async (session: any) => {
    if (!session?.id) return;

    if (!canDeleteSession(session)) {
      toast({
        title: "Only completed or cancelled sessions can be deleted",
        variant: "destructive",
      });
      setDeleteDialog({ open: false, session: null });
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("bookings")
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: user?.id || null,
        })
        .eq("id", session.id);

      if (error) throw error;

      setSessions((prev) => prev.filter((item) => item.id !== session.id));

      setDetailsModal((prev) =>
        prev.session?.id === session.id ? { open: false, session: null } : prev
      );

      toast({
        title: "Session deleted",
      });

      setDeleteDialog({ open: false, session: null });
    } catch (error: any) {
      toast({
        title: "Unable to delete session",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const getRiskIndicator = (session: any, effectiveStatus: string) => {
    if (!isUpcoming(session.scheduled_date, session.scheduled_time)) {
      return null;
    }

    const sessionDate = new Date(`${session.scheduled_date}T${session.scheduled_time}`);
    const now = new Date();
    const hoursUntil = (sessionDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (effectiveStatus === "pending" && hoursUntil <= 24) {
      return "Pending <24h";
    }

    if (effectiveStatus === "confirmed" && !session.meeting_link && hoursUntil <= 24) {
      return "Link missing";
    }

    if (
      effectiveStatus === "confirmed" &&
      (!session.payment_status || session.payment_status === "pending") &&
      hoursUntil <= 24
    ) {
      return "Payment pending";
    }

    return null;
  };

  const executeCancelSession = async (session: any, cancellationReason: string) => {
    try {
      setCancelLoading(true);

      const fallbackCancelledBy =
        session?.user_role === "expert" ? session?.expert_id : session?.user_id;

      const response = await cancelSessionWithReason(
        session.id,
        cancellationReason
      );

      if (!response?.success) {
        throw new Error(response?.error || "Failed to cancel session");
      }

      const cancelledAt = new Date().toISOString();
      setSessions((prev) =>
        prev.map((item) =>
          item.id === session.id
            ? {
                ...item,
                status: "cancelled",
                payment_status:
                  response?.data?.payment_status || item.payment_status,
                cancelled_at: response?.data?.cancelled_at || cancelledAt,
                cancelled_by: response?.data?.cancelled_by || fallbackCancelledBy,
                cancellation_reason:
                  response?.data?.cancellation_reason ||
                  cancellationReason,
                meeting_link: null,
              }
            : item
        )
      );

      setDetailsModal((prev) =>
        prev.session?.id === session.id
          ? {
              ...prev,
              session: {
                ...prev.session,
                status: "cancelled",
                payment_status:
                  response?.data?.payment_status || prev.session.payment_status,
                cancelled_at: response?.data?.cancelled_at || cancelledAt,
                cancelled_by: response?.data?.cancelled_by || fallbackCancelledBy,
                cancellation_reason:
                  response?.data?.cancellation_reason ||
                  cancellationReason,
                meeting_link: null,
              },
            }
          : prev
      );

      toast({
        title: "Session cancelled",
        description: "The session was cancelled successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Unable to cancel session",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setCancelLoading(false);
    }
  };

  const handleCancelSession = async (session: any) => {
    if (!session?.id) return;

    const isMentorCancelling = session?.user_role === "expert";

    if (isMentorCancelling) {
      setCancelNoteError("");
      setCancelDialog({
        open: true,
        session,
        note: "",
      });
      return;
    }

    const confirmed = window.confirm(
      "Cancel this session? The participant may be notified and this action cannot be undone."
    );

    if (!confirmed) return;

    await executeCancelSession(session, "Cancelled by student from dashboard");
  };

  const handleConfirmMentorCancellation = async () => {
    const session = cancelDialog.session;
    if (!session?.id) return;

    const trimmedNote = cancelDialog.note.trim();
    if (!trimmedNote) {
      setCancelNoteError("Please provide a note for the student.");
      return;
    }

    const confirmed = window.confirm(
      "Cancel this session? The student will be notified with your note."
    );

    if (!confirmed) return;

    setCancelDialog({ open: false, session: null, note: "" });
    setCancelNoteError("");
    await executeCancelSession(session, trimmedNote);
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
                    <Badge
                      variant="outline"
                      className="bg-rose-50 text-rose-700 border-0 rounded-md text-xs whitespace-nowrap"
                    >
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
          onClick={() => setFilter("pending")}
          className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
            filter === "pending"
              ? "bg-gray-900 text-white shadow-sm"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Pending
          {statusCounts.pending > 0 && (
            <span className="ml-1.5 opacity-75">
              ({statusCounts.pending})
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
        <Popover modal={false}>
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
              <div className="space-y-1">
                {([
                  { value: "date-desc", label: "Date (Newest First)" },
                  { value: "date-asc", label: "Date (Oldest First)" },
                  { value: "amount-desc", label: "Amount (High to Low)" },
                  { value: "amount-asc", label: "Amount (Low to High)" },
                  { value: "status", label: "Status" },
                ] as Array<{ value: SortOption; label: string }>).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSortBy(option.value)}
                    className={`w-full h-9 px-3 rounded-md text-left text-sm transition-colors ${
                      sortBy === option.value
                        ? "bg-gray-100 text-gray-900 font-medium"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

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

        {/* Cards/List Switch */}
        <div className="flex items-center rounded-xl border border-gray-200 bg-white p-1 h-11">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setViewMode("cards")}
            className={`h-9 px-3 rounded-lg text-xs font-medium ${
              viewMode === "cards"
                ? "bg-gray-900 text-white hover:bg-gray-900"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5 mr-1.5" />
            Cards
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setViewMode("list")}
            className={`h-9 px-3 rounded-lg text-xs font-medium ${
              viewMode === "list"
                ? "bg-gray-900 text-white hover:bg-gray-900"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <List className="h-3.5 w-3.5 mr-1.5" />
            List
          </Button>
        </div>
      </div>

      {/* Results Count */}
      {(searchQuery || filter !== "all" || dateRange !== "all") && (
        <div className="flex items-center gap-2 px-1">
          <p className="text-sm text-gray-600">
            Showing{" "}
            <span className="font-medium text-gray-900">
              {filteredAndSortedSessions.length}
            </span>{" "}
            of {visibleSessions.length} session{visibleSessions.length !== 1 ? "s" : ""}
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

      {/* Sessions List */}
      <div>
        {loading ? (
          viewMode === "list" ? (
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px]">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {[
                        "Session",
                        "Mentee",
                        "Date & Time",
                        "Status",
                        "Amount",
                        "Actions",
                        "",
                      ].map((header) => (
                        <th
                          key={header}
                          className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <tr
                        key={i}
                        className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}
                      >
                        <td className="px-4 py-4 text-center">
                          <Skeleton className="h-4 w-40" />
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <Skeleton className="h-4 w-28" />
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <Skeleton className="h-4 w-44" />
                        </td>
                        <td className="px-4 py-4 text-center">
                          <Skeleton className="h-6 w-20 rounded-md" />
                        </td>
                        <td className="px-4 py-4 text-center">
                          <Skeleton className="h-4 w-16" />
                        </td>
                        <td className="px-4 py-4 text-center">
                          <Skeleton className="h-8 w-20 rounded-lg" />
                        </td>
                        <td className="px-4 py-4 text-center">
                          <Skeleton className="h-8 w-8 rounded" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card
                  key={i}
                  className="bg-white border border-gray-200 rounded-2xl shadow-none"
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-start gap-4 lg:gap-6">
                      <div className="min-w-0 flex-1 space-y-2">
                        <Skeleton className="h-5 w-56" />
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-4 w-4 rounded" />
                          <Skeleton className="h-4 w-64" />
                        </div>
                        <Skeleton className="h-10 w-full max-w-[520px] rounded-lg" />
                      </div>
                      <div className="flex items-center gap-2 lg:pl-6 lg:border-l border-gray-100">
                        <Skeleton className="h-6 w-24 rounded-md" />
                        <Skeleton className="h-6 w-20 rounded-md" />
                      </div>
                      <div className="lg:pl-6 lg:border-l border-gray-100">
                        <Skeleton className="h-9 w-24 rounded-lg" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        ) : filteredAndSortedSessions.length > 0 ? (
          viewMode === "list" ? (
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px]">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Session
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Mentee
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Date & Time
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        <span className="sr-only">Delete</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedSessions.map((session, index) => {
                      const effectiveStatus = getEffectiveStatus(session);
                      const statusForUI = getSessionStatusForUI(session);
                      const avatarUrl = getParticipantAvatar(session);

                      return (
                        <tr
                          key={session.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setDetailsModal({ open: true, session })}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setDetailsModal({ open: true, session });
                            }
                          }}
                          aria-label={`View details for ${formatSessionType(session.session_type)}`}
                          className={`border-b border-gray-100 ${
                            index % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                          }`}
                        >
                          <td className="px-4 py-4 align-middle text-center">
                            <p className="text-sm font-semibold text-gray-900 truncate max-w-[240px] mx-auto">
                              {formatSessionType(session.session_type)}
                            </p>
                          </td>
                          <td className="px-4 py-4 align-middle text-center">
                            <div className="flex items-center justify-center gap-2 min-w-[180px]">
                              {avatarUrl ? (
                                <img
                                  src={avatarUrl}
                                  alt={session.display_name || "Mentee"}
                                  className="h-8 w-8 rounded-full object-cover border border-gray-200"
                                />
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
                                  {getParticipantInitial(session)}
                                </div>
                              )}
                              <span className="text-sm text-gray-800 truncate max-w-[180px]">
                                {session.display_name || "Mentee"}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4 align-middle text-center">
                            <span className="text-sm text-gray-700 whitespace-nowrap">
                              {formatDate(session.scheduled_date, session.scheduled_time)}
                            </span>
                          </td>
                          <td className="px-4 py-4 align-middle text-center">
                            <div className="inline-flex justify-center">
                              {getStatusBadge(statusForUI)}
                            </div>
                          </td>
                          <td className="px-4 py-4 align-middle text-center">
                            <span className="text-sm font-semibold text-green-600 whitespace-nowrap">
                              {session.total_amount && session.total_amount > 0
                                ? `₹${session.total_amount.toFixed(2)}`
                                : "₹0.00"}
                            </span>
                          </td>
                          <td className="px-4 py-4 align-middle text-center">
                            <div className="flex items-center justify-center">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setDetailsModal({ open: true, session });
                                }}
                                className="h-8 px-3 text-xs font-medium border-gray-200 rounded-lg flex items-center gap-1.5 bg-white hover:bg-gray-50"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span>View</span>
                              </Button>
                            </div>
                          </td>
                          <td className="px-4 py-4 align-middle text-center">
                            {canDeleteSession(session) ? (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setDeleteDialog({ open: true, session });
                                }}
                                className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                                aria-label="Delete session"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredAndSortedSessions.map((session) => {
                const statusForUI = getSessionStatusForUI(session);
                const avatarUrl = getParticipantAvatar(session);

                return (
                  <Card
                    key={session.id}
                    className="border border-gray-200 rounded-2xl shadow-none bg-white"
                  >
                    <CardContent className="p-5 space-y-4">
                      <div className="space-y-2">
                        <h3 className="text-base font-semibold text-gray-900 truncate">
                          {formatSessionType(session.session_type)}
                        </h3>
                        <div className="flex items-center gap-2">
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt={session.display_name || "Mentee"}
                              className="h-7 w-7 rounded-full object-cover border border-gray-200"
                            />
                          ) : (
                            <div className="h-7 w-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
                              {getParticipantInitial(session)}
                            </div>
                          )}
                          <span className="text-sm text-gray-800 truncate">
                            {session.display_name || "Mentee"}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 truncate">
                          {formatDate(session.scheduled_date, session.scheduled_time)}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div className="inline-flex">{getStatusBadge(statusForUI)}</div>
                        <span className="text-sm font-semibold text-green-600 whitespace-nowrap">
                          {session.total_amount && session.total_amount > 0
                            ? `₹${session.total_amount.toFixed(2)}`
                            : "₹0.00"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDetailsModal({ open: true, session })}
                          className="h-8 px-3 text-xs font-medium border-gray-200 rounded-lg flex items-center gap-1.5 bg-white hover:bg-gray-50"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View</span>
                        </Button>

                        {canDeleteSession(session) && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeleteDialog({ open: true, session })}
                            className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                            aria-label="Delete session"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )
        ) : (
          <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-0 rounded-2xl shadow-none">
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

      {/* Session Details Modal */}
      <SessionDetailsModal
        open={detailsModal.open}
        onClose={() => setDetailsModal({ open: false, session: null })}
        session={detailsModal.session}
        onCancelSession={handleCancelSession}
        cancelLoading={cancelLoading}
      />

      <Dialog
        open={cancelDialog.open}
        onOpenChange={(open) => {
          if (cancelLoading) return;
          setCancelDialog((prev) => ({
            ...prev,
            open,
            session: open ? prev.session : null,
            note: open ? prev.note : "",
          }));
          if (!open) {
            setCancelNoteError("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Cancel Session</DialogTitle>
            <DialogDescription>
              Please provide a note for the student explaining why you are cancelling this booking.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Textarea
              value={cancelDialog.note}
              onChange={(event) => {
                const nextValue = event.target.value.slice(
                  0,
                  CANCELLATION_NOTE_MAX_LENGTH
                );
                setCancelDialog((prev) => ({ ...prev, note: nextValue }));
                if (cancelNoteError && nextValue.trim()) {
                  setCancelNoteError("");
                }
              }}
              placeholder="Example: I have an emergency and need to reschedule this session."
              className="min-h-[120px]"
              disabled={cancelLoading}
            />
            <div className="flex items-center justify-between text-xs">
              <span className="text-red-600">{cancelNoteError}</span>
              <span className="text-gray-500">
                {cancelDialog.note.length}/{CANCELLATION_NOTE_MAX_LENGTH}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCancelDialog({ open: false, session: null, note: "" });
                setCancelNoteError("");
              }}
              disabled={cancelLoading}
            >
              Keep Session
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmMentorCancellation}
              disabled={cancelLoading || !cancelDialog.note.trim()}
            >
              {cancelLoading ? "Cancelling..." : "Cancel and Notify Student"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => {
          if (cancelLoading) return;
          setDeleteDialog((prev) => ({
            open,
            session: open ? prev.session : null,
          }));
        }}
      >
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Delete Session</DialogTitle>
            <DialogDescription>
              Delete this session from your dashboard?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, session: null })}
              disabled={cancelLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => handleDeleteSession(deleteDialog.session)}
              disabled={cancelLoading}
            >
              Delete Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SessionManagement;
