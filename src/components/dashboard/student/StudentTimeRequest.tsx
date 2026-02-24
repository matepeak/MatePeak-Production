import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Clock, Calendar, CheckCircle, XCircle, Search, Filter } from "lucide-react";
import { toast } from "sonner";
import { fetchBookingRequests, type BookingRequest } from "@/services/bookingRequestService";

interface StudentTimeRequestProps {
  studentProfile: any;
}

type StatusFilter = "all" | "pending" | "approved" | "declined";
type DateRangeFilter = "today" | "week" | "month" | "all";

export default function StudentTimeRequest({ studentProfile }: StudentTimeRequestProps) {
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const requestsData = await fetchBookingRequests(user.id);
      console.log("🎯 TimeRequest Component - Received requests:", requestsData);
      requestsData.forEach((req, idx) => {
        console.log(`🎯 Request ${idx + 1}:`, {
          id: req.id,
          mentor_name: req.mentor?.full_name,
          profile_picture_url: req.mentor?.profile_picture_url,
          mentor_object: req.mentor
        });
      });
      setRequests(requestsData);
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast.error("Failed to load time requests");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatName = (name?: string) => {
    if (!name) return "Mentor";
    return name
      .split(" ")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  };

  const getStatusBadge = (status: string) => {
    const normalized = (status || "pending").toLowerCase();
    const variants: Record<string, { className: string; icon: any; text: string }> = {
      pending: {
        className: "bg-gray-100 text-gray-800 border-gray-200",
        icon: Clock,
        text: "Pending",
      },
      approved: {
        className: "bg-green-50 text-green-700 border-green-200",
        icon: CheckCircle,
        text: "Approved",
      },
      declined: {
        className: "bg-red-50 text-red-700 border-red-200",
        icon: XCircle,
        text: "Declined",
      },
      rejected: {
        className: "bg-red-50 text-red-700 border-red-200",
        icon: XCircle,
        text: "Declined",
      },
    };
    const cfg = variants[normalized] || variants.pending;
    const Icon = cfg.icon;
    return (
      <Badge className={`inline-flex items-center gap-1 border ${cfg.className} rounded-md text-xs px-2 py-0.5`}>
        <Icon className="h-3 w-3" />
        {cfg.text}
      </Badge>
    );
  };

  // Filter and search logic
  const filteredRequests = useMemo(() => {
    let filtered = [...requests];

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((req) => {
        const status = (req.status || "pending").toLowerCase();
        if (statusFilter === "declined") {
          return status === "declined" || status === "rejected";
        }
        return status === statusFilter;
      });
    }

    // Filter by date range
    if (dateRangeFilter !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter((req) => {
        const reqDate = new Date(req.requested_date);
        
        switch (dateRangeFilter) {
          case "today":
            return reqDate.toDateString() === today.toDateString();
          case "week":
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return reqDate >= weekAgo;
          case "month":
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return reqDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((req) =>
        req.mentor?.full_name?.toLowerCase().includes(query) ||
        req.message?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [requests, statusFilter, dateRangeFilter, searchQuery]);

  // Count by status
  const statusCounts = useMemo(() => {
    return {
      all: requests.length,
      pending: requests.filter((r) => (r.status || "pending").toLowerCase() === "pending").length,
      approved: requests.filter((r) => (r.status || "").toLowerCase() === "approved").length,
      declined: requests.filter((r) => {
        const s = (r.status || "").toLowerCase();
        return s === "declined" || s === "rejected";
      }).length,
    };
  }, [requests]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading time requests...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Time Requests</h2>
        <p className="text-sm text-gray-600 mt-1">Your requested time slots sent to mentors</p>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setStatusFilter("all")}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            statusFilter === "all"
              ? "bg-gray-900 text-white"
              : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          All Requests ({statusCounts.all})
        </button>
        <button
          onClick={() => setStatusFilter("pending")}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            statusFilter === "pending"
              ? "bg-gray-900 text-white"
              : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          Pending ({statusCounts.pending})
        </button>
        <button
          onClick={() => setStatusFilter("approved")}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            statusFilter === "approved"
              ? "bg-gray-900 text-white"
              : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          Approved ({statusCounts.approved})
        </button>
        <button
          onClick={() => setStatusFilter("declined")}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            statusFilter === "declined"
              ? "bg-gray-900 text-white"
              : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          Declined ({statusCounts.declined})
        </button>
      </div>

      {/* Date Range Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setDateRangeFilter("today")}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            dateRangeFilter === "today"
              ? "bg-gray-900 text-white"
              : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          Today
        </button>
        <button
          onClick={() => setDateRangeFilter("week")}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            dateRangeFilter === "week"
              ? "bg-gray-900 text-white"
              : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          This Week
        </button>
        <button
          onClick={() => setDateRangeFilter("month")}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            dateRangeFilter === "month"
              ? "bg-gray-900 text-white"
              : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          This Month
        </button>
        <button
          onClick={() => setDateRangeFilter("all")}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            dateRangeFilter === "all"
              ? "bg-gray-900 text-white"
              : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          All Time
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search sessions by name, email, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          <Filter className="h-4 w-4" />
          <span className="font-medium text-sm">Filter</span>
        </button>
      </div>

      {filteredRequests.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchQuery || statusFilter !== "all" || dateRangeFilter !== "all"
                ? "No requests match your filters"
                : "No Time Requests Yet"}
            </h3>
            <p className="text-gray-600 text-center">
              {searchQuery || statusFilter !== "all" || dateRangeFilter !== "all"
                ? "Try adjusting your filters or search query"
                : "You don't have any time requests yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {filteredRequests.map((request) => (
            <Card key={request.id}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-12 w-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                        {request.mentor?.profile_picture_url ? (
                          <img
                            src={request.mentor.profile_picture_url}
                            alt={formatName(request.mentor?.full_name)}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-blue-600 text-white text-lg font-bold">
                            {formatName(request.mentor?.full_name).charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-gray-900 truncate">
                          {formatName(request.mentor?.full_name)}
                        </h3>
                        <p className="text-sm text-gray-600 truncate">
                          {request.mentor?.headline || "Expert"}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0">{getStatusBadge(request.status)}</div>
                  </div>

                  <div className="space-y-2 text-sm text-gray-700">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-xs font-medium text-gray-500">Requested Date:</span>
                      <span>{formatDate(request.requested_date)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-xs font-medium text-gray-500">Requested Time:</span>
                      <span>
                        {formatTime(request.requested_start_time)} - {formatTime(request.requested_end_time)}
                      </span>
                    </div>
                  </div>

                  {request.message && (
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs font-medium text-gray-500 mb-1">Message</p>
                      <p className="text-sm text-gray-700">{request.message}</p>
                    </div>
                  )}

                  {request.mentor_response && (
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs font-medium text-blue-700 mb-1">Mentor Response</p>
                      <p className="text-sm text-blue-800">{request.mentor_response}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
