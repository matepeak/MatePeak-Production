import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
import SessionDetailsModal from "../SessionDetailsModal";
import {
  Calendar,
  Clock,
  Download,
  Eye,
  Filter,
  LayoutGrid,
  List,
  Search,
  Trash2,
  Users,
  CalendarCheck,
} from "lucide-react";
import { toast } from "@/components/ui/sonner";

interface MySessionsProps {
  studentProfile: any;
}

type SessionStatus = "all" | "pending" | "completed" | "cancelled";
type SortOption =
  | "date-desc"
  | "date-asc"
  | "amount-desc"
  | "amount-asc"
  | "status";
type DateRange = "all" | "today" | "week" | "month";
type SessionViewMode = "cards" | "list";

const STUDENT_SESSIONS_LAYOUT_KEY = "sessionsLayout:student";

export default function MySessions({ studentProfile }: MySessionsProps) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<SessionStatus>("all");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("date-desc");
  const [viewMode, setViewMode] = useState<SessionViewMode>(() => {
    if (typeof window === "undefined") return "list";
    const saved = window.localStorage.getItem(STUDENT_SESSIONS_LAYOUT_KEY);
    return saved === "cards" || saved === "list" ? saved : "list";
  });
  const [detailsModal, setDetailsModal] = useState<{ open: boolean; session: any }>(
    {
      open: false,
      session: null,
    }
  );
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; session: any }>(
    {
      open: false,
      session: null,
    }
  );
  const [deleteLoading, setDeleteLoading] = useState(false);

  const toLocalDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const normalizeSession = (session: any) => {
    const sessionDate = session.scheduled_date || "";
    const sessionTime = session.scheduled_time || "";

    if (sessionDate && sessionTime) {
      return {
        ...session,
        scheduled_date: sessionDate,
        scheduled_time: sessionTime,
      };
    }

    if (session.session_date) {
      try {
        const parsed = new Date(session.session_date);
        const date = parsed.toISOString().slice(0, 10);
        const time = parsed.toTimeString().slice(0, 8);
        return {
          ...session,
          scheduled_date: date,
          scheduled_time: time,
        };
      } catch {
        return {
          ...session,
          scheduled_date: "",
          scheduled_time: "",
        };
      }
    }

    return {
      ...session,
      scheduled_date: "",
      scheduled_time: "",
    };
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
      default:
        return {
          startDate: null,
          endDate: null,
        };
    }
  };

  const isWithinDateRange = (
    scheduledDate: string,
    scheduledTime: string,
    range: DateRange
  ) => {
    if (range === "all") return true;
    if (!scheduledDate) return false;

    try {
      const sessionDateTime = new Date(`${scheduledDate}T${scheduledTime || "00:00:00"}`);
      const now = new Date();

      switch (range) {
        case "today": {
          return sessionDateTime.toDateString() === now.toDateString();
        }
        case "week": {
          const start = new Date(now);
          const dayOfWeek = start.getDay();
          const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
          start.setDate(start.getDate() + diffToMonday);
          start.setHours(0, 0, 0, 0);

          const end = new Date(start);
          end.setDate(end.getDate() + 7);
          return sessionDateTime >= start && sessionDateTime < end;
        }
        case "month": {
          return (
            sessionDateTime.getFullYear() === now.getFullYear() &&
            sessionDateTime.getMonth() === now.getMonth()
          );
        }
        default:
          return true;
      }
    } catch {
      return false;
    }
  };

  const getEffectiveStatus = (session: any): string => {
    if (session.status === "confirmed") {
      try {
        const sessionDate = new Date(`${session.scheduled_date}T${session.scheduled_time}`);
        if (sessionDate < new Date()) return "completed";
      } catch {
        // Keep original status if date parsing fails.
      }
    }

    return session.status || "pending";
  };

  const getSessionStatusForUI = (session: any): string => {
    const effectiveStatus = getEffectiveStatus(session);

    if (effectiveStatus === "confirmed") {
      try {
        const sessionDate = new Date(`${session.scheduled_date}T${session.scheduled_time}`);
        if (sessionDate > new Date()) return "pending";
      } catch {
        // Fall through to effective status.
      }
    }

    return effectiveStatus;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      pending: {
        label: "Pending",
        className:
          "bg-amber-50 text-amber-800 border border-amber-200 rounded-md",
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

  const getParticipantAvatar = (session: any) => {
    return (
      session?.mentor_profile?.profile_picture_url ||
      session?.expert_profiles?.profile_picture_url ||
      session?.avatar_url ||
      ""
    );
  };

  const getParticipantInitial = (session: any) => {
    const label = String(session?.display_name || "Mentor").trim();
    return label.charAt(0).toUpperCase();
  };

  const getMentorPublicPath = (session: any) => {
    const username =
      session?.mentor_profile?.username || session?.expert_profiles?.username;

    if (username) {
      return `/mentor/${username}`;
    }

    return session?.expert_id ? `/mentors/${session.expert_id}` : null;
  };

  const canDeleteSession = (session: any) => {
    const status = getEffectiveStatus(session);
    return ["completed", "cancelled"].includes(status);
  };

  const getTimeRemaining = (scheduledDate: string, scheduledTime: string) => {
    try {
      const sessionDate = new Date(`${scheduledDate}T${scheduledTime}`);
      const now = new Date();
      const diffMs = sessionDate.getTime() - now.getTime();

      if (diffMs < 0) return "Past";

      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);

      if (diffDays > 0) return `in ${diffDays} day${diffDays > 1 ? "s" : ""}`;
      if (diffHours > 0) {
        return `in ${diffHours} hour${diffHours > 1 ? "s" : ""}`;
      }

      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `in ${diffMins} minute${diffMins > 1 ? "s" : ""}`;
    } catch {
      return "";
    }
  };

  const exportToCSV = () => {
    try {
      const headers = ["Date & Time", "Session Type", "Mentor", "Status", "Amount"];
      const csvData = filteredAndSortedSessions.map((session) => [
        formatDate(session.scheduled_date, session.scheduled_time),
        "1-on-1 Career Strategy Call",
        session.display_name || "Mentor",
        getSessionStatusForUI(session),
        session.total_amount ? `₹${session.total_amount.toFixed(2)}` : "₹0.00",
      ]);

      const csvContent = [
        headers.join(","),
        ...csvData.map((row) => row.map((cell) => `"${cell}"`).join(",")),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `student_sessions_${new Date().toISOString().split("T")[0]}.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Exported ${filteredAndSortedSessions.length} sessions`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export sessions");
    }
  };

  const fetchSessions = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        setSessions([]);
        return;
      }

      const { startDate, endDate } = getDateRangeBoundaries(dateRange);

      let query = supabase
        .from("bookings")
        .select(
          `
          *,
          expert_profiles (
            id,
            full_name,
            profile_picture_url,
            username
          )
        `
        )
        .eq("user_id", user.id)
        .eq("is_deleted", false)
        .in("session_type", ["oneOnOneSession", "one-on-one", "oneonesession"])
        .in("status", ["confirmed", "completed", "cancelled"])
        .order("scheduled_date", { ascending: false })
        .limit(100);

      if (startDate && endDate) {
        query = query.gte("scheduled_date", startDate).lt("scheduled_date", endDate);
      }

      const { data, error } = await query;
      if (error) throw error;

      const normalized = (data || []).map((session) => {
        const s = normalizeSession(session);
        const mentor = s.expert_profiles;

        return {
          ...s,
          mentor_profile: mentor,
          display_name: mentor?.full_name || s.expert_name || "Mentor",
          user_role: "student" as const,
        };
      });

      setSessions(normalized);
    } catch (error: any) {
      console.error("Error fetching student sessions:", error);
      toast.error(error?.message || "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (session: any) => {
    if (!session?.id || !canDeleteSession(session)) return;

    try {
      setDeleteLoading(true);

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
      setDeleteDialog({ open: false, session: null });
      toast.success("Session deleted");
    } catch (error: any) {
      toast.error(error?.message || "Unable to delete session");
    } finally {
      setDeleteLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentProfile, dateRange]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STUDENT_SESSIONS_LAYOUT_KEY, viewMode);
  }, [viewMode]);

  const statusCounts = useMemo(() => {
    const dateFilteredSessions = sessions.filter((s) =>
      isWithinDateRange(s.scheduled_date, s.scheduled_time, dateRange)
    );

    return {
      all: dateFilteredSessions.length,
      pending: dateFilteredSessions.filter(
        (s) => getSessionStatusForUI(s) === "pending"
      ).length,
      completed: dateFilteredSessions.filter(
        (s) => getSessionStatusForUI(s) === "completed"
      ).length,
      cancelled: dateFilteredSessions.filter(
        (s) => getSessionStatusForUI(s) === "cancelled"
      ).length,
    };
  }, [sessions, dateRange]);

  const upcomingSessions = useMemo(() => {
    const now = new Date();

    return sessions
      .filter((s) => {
        try {
          const sessionDate = new Date(`${s.scheduled_date}T${s.scheduled_time}`);
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
  }, [sessions, dateRange]);

  const nextUpcomingSessionId = useMemo(
    () => upcomingSessions[0]?.id ?? null,
    [upcomingSessions]
  );

  const statistics = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const thisWeek = sessions.filter((s) => {
      try {
        const date = new Date(`${s.scheduled_date}T${s.scheduled_time}`);
        return date >= weekStart && date < weekEnd;
      } catch {
        return false;
      }
    }).length;

    const thisMonth = sessions.filter((s) => {
      try {
        const date = new Date(`${s.scheduled_date}T${s.scheduled_time}`);
        return date >= monthStart && date <= monthEnd;
      } catch {
        return false;
      }
    }).length;

    return {
      total: sessions.length,
      upcoming: upcomingSessions.length > 0 ? 1 : 0,
      thisWeek,
      thisMonth,
    };
  }, [sessions, upcomingSessions]);

  const filteredAndSortedSessions = sessions
    .filter((session) => {
      const statusForUI = getSessionStatusForUI(session);

      if (filter !== "all" && statusForUI !== filter) return false;

      if (!isWithinDateRange(session.scheduled_date, session.scheduled_time, dateRange)) {
        return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const fields = [
          session.display_name,
          session.session_type,
          session.message,
          statusForUI,
        ].filter(Boolean);

        return fields.some((field) => String(field).toLowerCase().includes(query));
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
          return getSessionStatusForUI(a).localeCompare(getSessionStatusForUI(b));
        default:
          return 0;
      }
    });

  return (
    <div className="space-y-6">
      <div className="py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Session Management</h1>
            <p className="text-gray-600 text-sm">Manage your bookings and upcoming sessions</p>
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

      {!loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-gray-100 border-0 rounded-2xl shadow-none h-[116px]">
            <CardContent className="p-6 h-full">
              <div className="flex items-center justify-between h-full">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Upcoming</p>
                  <p className="text-3xl font-bold text-gray-900 mt-3">{statistics.upcoming}</p>
                </div>
                <Clock className="h-6 w-6 text-rose-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-100 border-0 rounded-2xl shadow-none h-[116px]">
            <CardContent className="p-6 h-full">
              <div className="flex items-center justify-between h-full">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">This Week</p>
                  <p className="text-3xl font-bold text-gray-900 mt-3">{statistics.thisWeek}</p>
                </div>
                <CalendarCheck className="h-6 w-6 text-rose-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-100 border-0 rounded-2xl shadow-none h-[116px]">
            <CardContent className="p-6 h-full">
              <div className="flex items-center justify-between h-full">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">This Month</p>
                  <p className="text-3xl font-bold text-gray-900 mt-3">{statistics.thisMonth}</p>
                </div>
                <Calendar className="h-6 w-6 text-rose-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-100 border-0 rounded-2xl shadow-none h-[116px]">
            <CardContent className="p-6 h-full">
              <div className="flex items-center justify-between h-full">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Sessions</p>
                  <p className="text-3xl font-bold text-gray-900 mt-3">{statistics.total}</p>
                </div>
                <Users className="h-6 w-6 text-rose-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
                      1-on-1 Career Strategy Call
                    </p>
                    <p className="text-xs text-gray-600 truncate">
                      {formatDate(session.scheduled_date, session.scheduled_time)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Badge
                      variant="outline"
                      className="bg-rose-50 text-rose-700 border-0 rounded-md text-xs whitespace-nowrap"
                    >
                      {getTimeRemaining(session.scheduled_date, session.scheduled_time)}
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
          {statusCounts.all > 0 && <span className="ml-1.5 opacity-75">({statusCounts.all})</span>}
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
            <span className="ml-1.5 opacity-75">({statusCounts.pending})</span>
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
            <span className="ml-1.5 opacity-75">({statusCounts.completed})</span>
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
            <span className="ml-1.5 opacity-75">({statusCounts.cancelled})</span>
          )}
        </button>
      </div>

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

      <div className="flex items-center gap-3">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search sessions by name, email, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-gray-200 bg-white rounded-xl h-11"
          />
        </div>

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

      {(searchQuery || filter !== "all" || dateRange !== "all") && (
        <div className="flex items-center gap-2 px-1">
          <p className="text-sm text-gray-600">
            Showing <span className="font-medium text-gray-900">{filteredAndSortedSessions.length}</span>{" "}
            of {sessions.length} session{sessions.length !== 1 ? "s" : ""}
            {searchQuery && (
              <span className="ml-1">
                matching <span className="font-medium text-gray-900">"{searchQuery}"</span>
              </span>
            )}
          </p>
        </div>
      )}

      {viewMode === "list" ? (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {["Session", "Mentee", "Date & Time", "Status", "Amount", "Actions", ""].map(
                    (header) => (
                      <th
                        key={header || "delete-col"}
                        className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider"
                      >
                        {header}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                        <td className="px-4 py-4 text-center">
                          <div className="mx-auto w-40">
                            <Skeleton className="h-4 w-40" />
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <Skeleton className="h-4 w-28" />
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="mx-auto w-44">
                            <Skeleton className="h-4 w-44" />
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="mx-auto w-20">
                            <Skeleton className="h-6 w-20 rounded-md" />
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="mx-auto w-16">
                            <Skeleton className="h-4 w-16" />
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="mx-auto w-20">
                            <Skeleton className="h-8 w-20 rounded-lg" />
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="mx-auto w-8">
                            <Skeleton className="h-8 w-8 rounded" />
                          </div>
                        </td>
                      </tr>
                    ))
                  : filteredAndSortedSessions.map((session, index) => {
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
                          className={`border-b border-gray-100 ${
                            index % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                          }`}
                        >
                          <td className="px-4 py-4 align-middle text-center">
                            <p className="text-sm font-semibold text-gray-900 truncate max-w-[240px] mx-auto">
                              1-on-1 Career Strategy Call
                            </p>
                          </td>
                          <td className="px-4 py-4 align-middle text-center">
                            <div className="flex items-center justify-center gap-2 min-w-[180px]">
                              {(() => {
                                const mentorPath = getMentorPublicPath(session);

                                return (
                                  <>
                              {avatarUrl ? (
                                <img
                                  src={avatarUrl}
                                  alt={session.display_name || "Mentor"}
                                  className="h-8 w-8 rounded-full object-cover border border-gray-200"
                                />
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
                                  {getParticipantInitial(session)}
                                </div>
                              )}
                              {mentorPath ? (
                                <Link
                                  to={mentorPath}
                                  onClick={(event) => event.stopPropagation()}
                                  className="text-sm text-gray-800 truncate max-w-[180px] hover:text-matepeak-primary hover:underline"
                                >
                                  {session.display_name || "Mentor"}
                                </Link>
                              ) : (
                                <span className="text-sm text-gray-800 truncate max-w-[180px]">
                                  {session.display_name || "Mentor"}
                                </span>
                              )}
                                  </>
                                );
                              })()}
                            </div>
                          </td>
                          <td className="px-4 py-4 align-middle text-center">
                            <span className="text-sm text-gray-700 whitespace-nowrap">
                              {formatDate(session.scheduled_date, session.scheduled_time)}
                            </span>
                          </td>
                          <td className="px-4 py-4 align-middle text-center">
                            <div className="inline-flex justify-center">{getStatusBadge(statusForUI)}</div>
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
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="bg-white border border-gray-200 rounded-2xl shadow-none">
                  <CardContent className="p-5 space-y-4">
                    <Skeleton className="h-5 w-56" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-7 w-7 rounded-full" />
                      <Skeleton className="h-4 w-28" />
                    </div>
                    <Skeleton className="h-4 w-48" />
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-6 w-20 rounded-md" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Skeleton className="h-8 w-20 rounded-lg" />
                      <Skeleton className="h-8 w-8 rounded" />
                    </div>
                  </CardContent>
                </Card>
              ))
            : filteredAndSortedSessions.map((session) => {
                const statusForUI = getSessionStatusForUI(session);
                const avatarUrl = getParticipantAvatar(session);
                const isNextUpcomingSession = session.id === nextUpcomingSessionId;
              const mentorPath = getMentorPublicPath(session);

                return (
                  <Card
                    key={session.id}
                    className="border border-gray-200 rounded-2xl shadow-none bg-white"
                  >
                    <CardContent className="p-5 space-y-4">
                      <div className="space-y-2">
                        <h3 className="text-base font-semibold text-gray-900 truncate">
                          1-on-1 Career Strategy Call
                        </h3>
                        <div className="flex items-center gap-2">
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt={session.display_name || "Mentor"}
                              className="h-7 w-7 rounded-full object-cover border border-gray-200"
                            />
                          ) : (
                            <div className="h-7 w-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
                              {getParticipantInitial(session)}
                            </div>
                          )}
                          {mentorPath ? (
                            <Link
                              to={mentorPath}
                              className="text-sm text-gray-800 truncate hover:text-matepeak-primary hover:underline"
                            >
                              {session.display_name || "Mentor"}
                            </Link>
                          ) : (
                            <span className="text-sm text-gray-800 truncate">
                              {session.display_name || "Mentor"}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 truncate">
                          {formatDate(session.scheduled_date, session.scheduled_time)}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div className="inline-flex items-center gap-2">
                          {getStatusBadge(statusForUI)}
                          {isNextUpcomingSession && (
                            <Badge
                              variant="outline"
                              className="bg-gray-100 text-gray-700 border border-gray-200 rounded-md text-xs px-2 py-0.5"
                            >
                              Upcoming
                            </Badge>
                          )}
                        </div>
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
      )}

      {!loading && filteredAndSortedSessions.length === 0 && (
        <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-0 rounded-2xl shadow-none">
          <CardContent className="p-16">
            <div className="text-center max-w-md mx-auto">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white shadow-sm mb-5">
                <Calendar className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No sessions found</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {filter === "all" && dateRange === "all"
                  ? "You don't have any sessions yet. When you book sessions, they will appear here."
                  : "Try a different filter or date range."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <SessionDetailsModal
        open={detailsModal.open}
        onClose={() => setDetailsModal({ open: false, session: null })}
        session={detailsModal.session}
      />

      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => {
          if (deleteLoading) return;
          setDeleteDialog((prev) => ({
            open,
            session: open ? prev.session : null,
          }));
        }}
      >
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Delete Session</DialogTitle>
            <DialogDescription>Delete this session from your dashboard?</DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, session: null })}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => handleDeleteSession(deleteDialog.session)}
              disabled={deleteLoading}
            >
              {deleteLoading ? "Deleting..." : "Delete Session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
