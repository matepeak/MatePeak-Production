import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Clock,
  Search,
  Filter,
  Download,
  Eye,
  IndianRupee,
  User,
  Mail,
  Phone,
  Video,
} from "lucide-react";
import { toast } from "sonner";

interface MySessionsProps {
  studentProfile: any;
}

type StatusFilter = "all" | "confirmed" | "completed" | "cancelled";
type TimeRange = "today" | "thisWeek" | "thisMonth" | "allTime";

export default function MySessions({ studentProfile }: MySessionsProps) {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<any[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [timeRange, setTimeRange] = useState<TimeRange>("allTime");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [mentorProfile, setMentorProfile] = useState<any>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [sessions, searchQuery, statusFilter, timeRange]);

  const fetchSessions = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("bookings")
        .select(
          `
          *,
          expert_profiles (
            id,
            full_name,
            username,
            profile_picture_url
          )
        `
        )
        .eq("student_id", user.id)
        .order("session_date", { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error: any) {
      console.error("Error fetching sessions:", error);
      toast.error("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getEffectiveStatus = (session: any): string => {
    if (session.status === "confirmed") {
      try {
        const sessionDate = new Date(session.session_date);
        const now = new Date();
        if (sessionDate < now) {
          return "completed";
        }
      } catch {}
    }
    return session.status || "pending";
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      confirmed: {
        label: "Confirmed",
        className: "bg-green-50 text-green-700 border-0 rounded-md hover:bg-green-50",
      },
      completed: {
        label: "Completed",
        className: "bg-blue-50 text-blue-700 border-0 rounded-md hover:bg-blue-50",
      },
      cancelled: {
        label: "Cancelled",
        className: "bg-red-50 text-red-700 border-0 rounded-md hover:bg-red-50",
      },
      pending: {
        label: "Pending",
        className: "bg-yellow-50 text-yellow-700 border-0 rounded-md hover:bg-yellow-50",
      },
    };
    const cfg = statusConfig[status] || {
      label: status,
      className: "bg-gray-50 text-gray-700 border-0 rounded-md hover:bg-gray-50",
    };
    return <Badge className={cfg.className}>{cfg.label}</Badge>;
  };

  const getStatusColor = (status: string) => {
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

  const inRange = (dateStr: string): boolean => {
    const date = new Date(dateStr);
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    switch (timeRange) {
      case "today":
        return date.toDateString() === now.toDateString();
      case "thisWeek":
        return date >= startOfWeek && date <= endOfWeek;
      case "thisMonth":
        return date >= startOfMonth && date <= endOfMonth;
      case "allTime":
      default:
        return true;
    }
  };

  const applyFilters = () => {
    let result = sessions.filter((s) => inRange(s.session_date));

    if (statusFilter !== "all") {
      result = result.filter((s) => getEffectiveStatus(s) === statusFilter);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.expert_profiles?.full_name?.toLowerCase().includes(q) ||
          s.message?.toLowerCase().includes(q)
      );
    }

    setFilteredSessions(result);
  };

  // Helper for Next Up relative time
  const daysUntil = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return days <= 0 ? "today" : `in ${days} day${days > 1 ? "s" : ""}`;
  };

  const nextUp = (() => {
    const now = new Date();
    const upcoming = sessions
      .filter((s) => new Date(s.session_date) > now && getEffectiveStatus(s) !== "cancelled")
      .sort((a, b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime());
    return upcoming[0] || null;
  })();

  const exportToCSV = () => {
    const csv = [
      ["Date", "Time", "Mentor", "Duration", "Status", "Amount"].join(","),
      ...filteredSessions.map((s) =>
        [
          formatDate(s.session_date),
          formatTime(s.session_date),
          s.expert_profiles?.full_name || "",
          `${s.duration || 60} min`,
          getEffectiveStatus(s),
          (s.total_amount ?? 0).toString(),
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sessions_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    toast.success("Sessions exported successfully");
  };

  const openDetails = async (session: any) => {
    setActiveSession(session);
    setDetailsOpen(true);

    try {
      if (!session?.expert_id) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone")
        .eq("id", session.expert_id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching mentor profile:", error);
      }
      setMentorProfile(data || null);
    } catch (err) {
      console.error("Error loading mentor details:", err);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title + Export */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Session Management</h2>
          <p className="text-sm text-gray-600">Manage your bookings and upcoming sessions</p>
        </div>
        <Button variant="ghost" onClick={exportToCSV} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Next Up */}
      {nextUp && (
        <div className="bg-gray-100 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-700 mb-3">
            <Clock className="h-4 w-4 text-red-500" />
            <span className="font-medium">Next Up</span>
          </div>
          <Card className="border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">1 on 1 Session</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {formatDate(nextUp.session_date)} at {formatTime(nextUp.session_date)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-red-50 text-red-600 border-red-200">
                    {daysUntil(nextUp.session_date)}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/booking-confirmed/${nextUp.id}`)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={statusFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("all")}
        >
          All Sessions ({sessions.length})
        </Button>
        <Button
          variant={statusFilter === "confirmed" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("confirmed")}
        >
          Confirmed ({sessions.filter((s) => getEffectiveStatus(s) === "confirmed").length})
        </Button>
        <Button
          variant={statusFilter === "completed" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("completed")}
        >
          Completed ({sessions.filter((s) => getEffectiveStatus(s) === "completed").length})
        </Button>
        <Button
          variant={statusFilter === "cancelled" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("cancelled")}
        >
          Cancelled ({sessions.filter((s) => getEffectiveStatus(s) === "cancelled").length})
        </Button>
      </div>

      {/* Time range chips */}
      <div className="flex flex-wrap gap-2">
        {([
          { key: "today", label: "Today" },
          { key: "thisWeek", label: "This Week" },
          { key: "thisMonth", label: "This Month" },
          { key: "allTime", label: "All Time" },
        ] as { key: TimeRange; label: string }[]).map((t) => (
          <Button
            key={t.key}
            variant={timeRange === t.key ? "default" : "outline"}
            size="sm"
            onClick={() => setTimeRange(t.key)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search sessions by name, email, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filter
        </Button>
      </div>

      {/* Session list */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {filteredSessions.map((session) => {
          const status = getEffectiveStatus(session);
          return (
            <Card key={session.id}>
              <CardContent className="p-4">
                {/* Header */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-gray-900 truncate">1 on 1 Session</h3>
                    {new Date(session.session_date) > new Date() && status === "confirmed" && (
                      <Badge className="bg-blue-50 text-blue-700 border-0 rounded-md text-xs px-2 py-0.5 whitespace-nowrap flex-shrink-0">Upcoming</Badge>
                    )}
                  </div>
                  {getStatusBadge(status)}
                </div>

                {/* Info */}
                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-700 truncate">
                      {formatDate(session.session_date)} at {formatTime(session.session_date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-green-600">
                      ₹{Number(session.total_amount ?? 0).toFixed(2)}
                    </span>
                  </div>
                  {session.message && (
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs font-medium text-gray-500 mb-1">Mentee's Message:</p>
                      <p className="text-xs text-gray-600 line-clamp-2">{session.message}</p>
                    </div>
                  )}
                </div>

                {/* Footer: View button */}
                <div className="w-full flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openDetails(session)}
                    className="h-8 px-3 text-xs font-medium border-gray-200 rounded-lg flex items-center gap-1.5"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>View</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {activeSession && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-gray-900">
                  Session Details
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                <div className="flex items-center justify-between">
                  <Badge
                    className={`px-3 py-1 text-sm font-medium border ${getStatusColor(
                      getEffectiveStatus(activeSession)
                    )}`}
                  >
                    {getEffectiveStatus(activeSession).toUpperCase()}
                  </Badge>
                  {activeSession.created_at && (
                    <p className="text-sm text-gray-600">
                      Created {new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
                        Math.round(
                          (new Date(activeSession.created_at).getTime() - Date.now()) /
                            (1000 * 60 * 60 * 24)
                        ),
                        "day"
                      )}
                    </p>
                  )}
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Session Information</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-gray-50 border border-gray-200">
                      <div className="p-2 rounded-lg bg-white">
                        <Calendar className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-600 uppercase">Date & Time</p>
                        <p className="text-sm text-gray-900 mt-1 font-medium">
                          {formatDate(activeSession.session_date)} at {formatTime(activeSession.session_date)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 rounded-lg bg-gray-50 border border-gray-200">
                      <div className="p-2 rounded-lg bg-white">
                        <Clock className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-600 uppercase">Duration</p>
                        <p className="text-sm text-gray-900 mt-1 font-medium">
                          {activeSession.duration || 60} minutes
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 rounded-lg bg-gray-50 border border-gray-200">
                      <div className="p-2 rounded-lg bg-white">
                        <IndianRupee className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-600 uppercase">Total Amount</p>
                        <p className="text-sm text-gray-900 mt-1 font-medium">
                          ₹{Number(activeSession.total_amount ?? 0).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 rounded-lg bg-gray-50 border border-gray-200">
                      <div className="p-2 rounded-lg bg-white">
                        <Video className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-600 uppercase">Session Type</p>
                        <p className="text-sm text-gray-900 mt-1 font-medium">
                          {activeSession.session_type === "oneOnOneSession" ||
                          activeSession.session_type === "one-on-one"
                            ? "1:1 Session"
                            : activeSession.session_type || "1:1 Session"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Mentor Information</h3>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                      <User className="h-5 w-5 text-gray-600" />
                      <div>
                        <p className="text-xs font-medium text-gray-600">Full Name</p>
                        <p className="text-sm text-gray-900 font-medium">
                          {mentorProfile?.full_name || activeSession.expert_profiles?.full_name || "Mentor"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                      <Mail className="h-5 w-5 text-gray-600" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-600">Email</p>
                        <p className="text-sm text-gray-900 font-medium break-all">
                          {mentorProfile?.email || "Not provided"}
                        </p>
                      </div>
                    </div>

                    {mentorProfile?.phone && (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                        <Phone className="h-5 w-5 text-gray-600" />
                        <div>
                          <p className="text-xs font-medium text-gray-600">Phone</p>
                          <p className="text-sm text-gray-900 font-medium">{mentorProfile.phone}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {activeSession.meeting_link && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-gray-900">Meeting Link</h3>
                      <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                        <a
                          href={activeSession.meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium break-all"
                        >
                          {activeSession.meeting_link}
                        </a>
                      </div>
                    </div>
                  </>
                )}

                <Separator />
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Booking ID</p>
                    <p className="text-gray-900 font-medium mt-1">{activeSession.id}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Last Updated</p>
                    <p className="text-gray-900 font-medium mt-1">
                      {activeSession.updated_at
                        ? new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
                            Math.round(
                              (new Date(activeSession.updated_at).getTime() - Date.now()) /
                                (1000 * 60 * 60 * 24)
                            ),
                            "day"
                          )
                        : "Not available"}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
