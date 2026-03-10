import { useEffect, useState } from "react";
import {
  Calendar,
  Star,
  TrendingUp,
  Clock,
  Edit,
  Eye,
  MessageCircle,
  ArrowRight,
  IndianRupee,
  User,
  CheckCircle,
  XCircle,
  Settings,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import ProfileCompletionCard from "@/components/dashboard/ProfileCompletionCard";

type TimePeriod = "today" | "week" | "month" | "all";

interface DashboardOverviewProps {
  mentorProfile: any;
  onNavigate?: (view: string) => void;
}

interface Stats {
  totalSessions: number;
  upcomingSessions: number;
  totalEarnings: number;
  averageRating: number;
  completionRate: number;
}

const DashboardOverview = ({
  mentorProfile,
  onNavigate,
}: DashboardOverviewProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState<Stats>({
    totalSessions: 0,
    upcomingSessions: 0,
    totalEarnings: 0,
    averageRating: 0,
    completionRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [upcomingSessions, setUpcomingSessions] = useState<any[]>([]);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("all");
  const [timeRequests, setTimeRequests] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
    fetchTimeRequests();

    // Set up auto-refresh for time requests every 30 seconds
    const refreshInterval = setInterval(() => {
      fetchTimeRequests();
    }, 30000);

    return () => clearInterval(refreshInterval);
  }, [mentorProfile, timePeriod]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Calculate date range based on selected period
      const now = new Date();
      let startDate: Date | null = null;

      switch (timePeriod) {
        case "today":
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );
          break;
        case "week":
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          break;
        case "month":
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 30);
          break;
        case "all":
        default:
          startDate = null;
          break;
      }

      // Fetch sessions where user is the mentor
      let mentorQuery = supabase
        .from("bookings")
        .select("*")
        .eq("expert_id", mentorProfile.id);

      // Fetch sessions where user is the student
      let studentQuery = supabase
        .from("bookings")
        .select("*")
        .eq("user_id", mentorProfile.id);

      const { data: mentorSessions } = await mentorQuery;
      const { data: studentSessions } = await studentQuery;

      // Combine both types of sessions for total count
      const allSessions = [
        ...(mentorSessions || []),
        ...(studentSessions || []),
      ];

      // Apply date filter for other stats
      let filteredMentorQuery = supabase
        .from("bookings")
        .select("*")
        .eq("expert_id", mentorProfile.id);

      let filteredStudentQuery = supabase
        .from("bookings")
        .select("*")
        .eq("user_id", mentorProfile.id);

      if (startDate) {
        filteredMentorQuery = filteredMentorQuery.gte(
          "created_at",
          startDate.toISOString()
        );
        filteredStudentQuery = filteredStudentQuery.gte(
          "created_at",
          startDate.toISOString()
        );
      }

      const { data: filteredMentorSessions } = await filteredMentorQuery;
      const { data: filteredStudentSessions } = await filteredStudentQuery;

      const sessions = [
        ...(filteredMentorSessions || []),
        ...(filteredStudentSessions || []),
      ];

      // Calculate stats
      const upcoming =
        sessions?.filter((s) => {
          const sessionDate = new Date(
            `${s.scheduled_date}T${s.scheduled_time}`
          );
          return sessionDate > now && s.status === "confirmed";
        }) || [];
      const completed = sessions?.filter((s) => s.status === "completed") || [];
      const total = allSessions?.length || 0; // Total includes all sessions from both roles

      // Calculate total earnings
      const earnings = completed.reduce((sum, session) => {
        return sum + (session.total_amount || 0);
      }, 0);

      // Fetch average rating from reviews (if reviews table exists)
      let avgRating = 0;
      try {
        const { data: reviews } = await supabase
          .from("reviews")
          .select("rating")
          .eq("expert_id", mentorProfile.id);

        if (reviews && reviews.length > 0) {
          const totalRating = reviews.reduce(
            (sum, review) => sum + review.rating,
            0
          );
          avgRating = totalRating / reviews.length;
        }
      } catch {
        // Reviews table might not exist yet
        avgRating = 0;
      }

      // Calculate completion rate
      const completionRate = total > 0 ? (completed.length / total) * 100 : 0;

      setStats({
        totalSessions: total,
        upcomingSessions: upcoming.length,
        totalEarnings: earnings,
        averageRating: avgRating,
        completionRate: Math.round(completionRate),
      });

      // Set upcoming sessions for calendar
      setUpcomingSessions(upcoming.slice(0, 5));
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeRequests = async () => {
    try {
      // Fetch pending booking requests (time requests)
      const { data: requestsData, error: requestsError } = await supabase
        .from("booking_requests")
        .select("*")
        .eq("mentor_id", mentorProfile.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(3);

      if (requestsError) throw requestsError;

      // Fetch profile data for each request
      const requestsWithProfiles = await Promise.all(
        (requestsData || []).map(async (request) => {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", request.mentee_id)
            .single();

          return {
            ...request,
            profiles: profileData || { full_name: "Unknown", email: "" },
          };
        })
      );

      setTimeRequests(requestsWithProfiles);
    } catch (error) {
      console.error("Error fetching time requests:", error);
    }
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatRequestDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const statCards = [
    {
      title: "Total Sessions",
      value: stats.totalSessions,
      icon: Calendar,
      iconColor: "text-rose-400",
    },
    {
      title: "Upcoming",
      value: stats.upcomingSessions,
      icon: Clock,
      iconColor: "text-rose-400",
    },
    {
      title: "Earnings",
      value: "Coming Soon",
      icon: IndianRupee,
      iconColor: "text-rose-400",
      isComingSoon: true,
    },
    {
      title: "Average Rating",
      value: stats.averageRating > 0 ? stats.averageRating.toFixed(1) : "N/A",
      icon: Star,
      iconColor: "text-rose-400",
      suffix: stats.averageRating > 0 ? "/ 5.0" : "",
    },
  ];

  const formatDate = (scheduledDate: string, scheduledTime: string) => {
    try {
      const date = new Date(`${scheduledDate}T${scheduledTime}`);
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch {
      return "Date not set";
    }
  };

  return (
    <div className="space-y-6">
      {/* Clean Welcome Section - No Background */}
      <div className="py-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Welcome back,{" "}
            {mentorProfile.full_name?.split(" ")[0] ||
              mentorProfile.full_name ||
              "Mentor"}
            !
          </h1>
          <p className="text-gray-600 text-sm">
            Here's what's happening with your mentoring sessions
          </p>
        </div>
      </div>

      {/* Profile Completion Card */}
      <ProfileCompletionCard 
        profileData={mentorProfile} 
        username={mentorProfile.username} 
      />

      {/* Time Period Filters - Improved Design */}
      <div className="flex items-center gap-2 pb-2">
        <button
          onClick={() => setTimePeriod("today")}
          className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
            timePeriod === "today"
              ? "bg-gray-900 text-white shadow-sm"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Today
        </button>
        <button
          onClick={() => setTimePeriod("week")}
          className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
            timePeriod === "week"
              ? "bg-gray-900 text-white shadow-sm"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          This Week
        </button>
        <button
          onClick={() => setTimePeriod("month")}
          className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
            timePeriod === "month"
              ? "bg-gray-900 text-white shadow-sm"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          This Month
        </button>
        <button
          onClick={() => setTimePeriod("all")}
          className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
            timePeriod === "all"
              ? "bg-gray-900 text-white shadow-sm"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          All Time
        </button>
      </div>

      {/* Stats Grid - MentorLoop Style */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
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
            ))
          : statCards.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card
                  key={index}
                  className={`
                    group bg-gray-100 border-0 rounded-2xl shadow-none hover:shadow-md transition-all duration-200 h-[116px]
                    ${stat.isComingSoon ? "relative overflow-hidden" : ""}
                  `}
                >
                  <CardContent className="p-6 h-full">
                    <div className="flex items-center justify-between h-full">
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          {stat.title}
                        </p>
                        <div className="flex items-baseline mt-3">
                          <p
                            className={`${
                              stat.isComingSoon
                                ? "text-2xl font-extrabold"
                                : "text-3xl font-bold"
                            } ${
                              stat.isComingSoon
                                ? "text-gray-700"
                                : "text-gray-900"
                            }`}
                          >
                            {stat.value}
                          </p>
                          {stat.suffix && (
                            <span className="ml-2 text-sm font-medium text-gray-500">
                              {stat.suffix}
                            </span>
                          )}
                        </div>
                        {stat.isComingSoon && (
                          <p className="text-xs text-gray-600 mt-2 font-medium">
                            Feature under development
                          </p>
                        )}
                      </div>
                      {!stat.isComingSoon && (
                        <div className="flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Icon className={`h-6 w-6 ${stat.iconColor}`} />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
      </div>

      {/* Quick Actions - Compact Design */}
      <Card className="bg-gray-100 border-0 rounded-2xl shadow-none">
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Update Availability */}
            <button
              onClick={() => {
                if (onNavigate) {
                  onNavigate("availability");
                } else {
                  toast({
                    title: "Error",
                    description: "Navigation function not available",
                    variant: "destructive",
                  });
                }
              }}
              className="flex items-center gap-3 p-3 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 hover:border-rose-300 transition-all text-left group cursor-pointer"
            >
              <div className="p-2 rounded-lg bg-gray-100 group-hover:bg-rose-50 transition-colors">
                <Edit className="h-4 w-4 text-rose-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  Update Availability
                </p>
              </div>
            </button>

            {/* Profile Management */}
            <button
              onClick={() => {
                if (onNavigate) {
                  onNavigate("profile");
                } else {
                  toast({
                    title: "Error",
                    description: "Navigation function not available",
                    variant: "destructive",
                  });
                }
              }}
              className="flex items-center gap-3 p-3 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 hover:border-rose-300 transition-all text-left group cursor-pointer"
            >
              <div className="p-2 rounded-lg bg-gray-100 group-hover:bg-rose-50 transition-colors">
                <Settings className="h-4 w-4 text-rose-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  Profile Management
                </p>
              </div>
            </button>

            {/* Message Support */}
            <a
              href="mailto:iteshofficial@gmail.com"
              className="flex items-center gap-3 p-3 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 hover:border-rose-300 transition-all text-left group"
            >
              <div className="p-2 rounded-lg bg-gray-100 group-hover:bg-rose-50 transition-colors">
                <MessageCircle className="h-4 w-4 text-rose-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  Get Support
                </p>
              </div>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Two Column Layout for Sessions and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Sessions */}
        <Card className="bg-white border border-gray-200 rounded-2xl shadow-none hover:shadow-sm transition-shadow">
          <div className="p-5 border-b border-gray-200">
            <h3 className="text-base font-bold text-gray-900">
              Upcoming Sessions
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Your next confirmed bookings
            </p>
          </div>
          <CardContent className="p-5">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 bg-gray-50"
                  >
                    <div className="p-2 rounded-lg bg-gray-100">
                      <Skeleton className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <Skeleton className="h-[14px] w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-[26px] w-20 rounded-md" />
                  </div>
                ))}
              </div>
            ) : upcomingSessions.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {upcomingSessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => onNavigate?.("sessions")}
                    className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 bg-gray-50 hover:bg-white hover:shadow-sm hover:border-gray-300 transition-all cursor-pointer"
                  >
                    <div className="p-2 rounded-lg bg-gray-100">
                      <Calendar className="h-5 w-5 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {session.session_type === "oneOnOneSession"
                          ? "1:1 Session"
                          : session.session_type === "groupSession"
                          ? "Group Session"
                          : session.session_type || "1-on-1 Session"}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {formatDate(
                          session.scheduled_date,
                          session.scheduled_time
                        )}
                      </p>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                      {session.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                  <Calendar className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-sm font-semibold text-gray-900 mb-1">
                  No upcoming sessions
                </p>
                <p className="text-xs text-gray-500">
                  Your upcoming sessions will appear here
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Time Requests - Clean & Professional */}
        <Card className="bg-white border border-gray-200 rounded-2xl shadow-none hover:shadow-sm transition-shadow">
          <div className="p-5 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Time Requests
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Recent custom time slot requests
                </p>
              </div>
              {timeRequests.length > 0 && (
                <Badge className="bg-amber-500 text-white px-2.5 py-0.5 text-xs font-semibold">
                  {timeRequests.length} Pending
                </Badge>
              )}
            </div>
          </div>
          <CardContent className="p-0">
            {loading ? (
              <div className="divide-y divide-gray-100">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="p-4">
                    <div className="flex items-start gap-3">
                      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                      <div className="flex-1 min-w-0 space-y-1">
                        <Skeleton className="h-[14px] w-40" />
                        <Skeleton className="h-3 w-56" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : timeRequests.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <MessageCircle className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-900 mb-1">
                  No pending requests
                </p>
                <p className="text-xs text-gray-500">
                  Custom time requests will appear here
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {timeRequests.map((request) => (
                  <div
                    key={request.id}
                    className="p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-gray-600" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {request.profiles?.full_name || "Unknown Student"}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {formatRequestDate(request.requested_date)}
                          </span>
                          <span>•</span>
                          <Clock className="h-3 w-3" />
                          <span>
                            {formatTime(request.requested_start_time)} -{" "}
                            {formatTime(request.requested_end_time)}
                          </span>
                        </div>
                        {request.message && (
                          <p className="text-xs text-gray-500 mt-1.5 line-clamp-1">
                            {request.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* View All Button */}
            {timeRequests.length > 0 && (
              <div className="p-4 border-t border-gray-100">
                <Button
                  variant="ghost"
                  onClick={() => onNavigate?.("requests")}
                  className="w-full justify-center text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-xl h-9"
                >
                  View All Requests
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardOverview;
