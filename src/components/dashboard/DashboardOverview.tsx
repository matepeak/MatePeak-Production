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
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { SERVICE_CONFIG } from "@/config/serviceConfig";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

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
  const SUCCESSFUL_PAYMENT_STATUSES = new Set(["paid", "completed"]);
  const SUCCESSFUL_BOOKING_STATUSES = new Set(["confirmed", "completed"]);

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
  const [pendingPayouts, setPendingPayouts] = useState<number>(0);
  const [lifetimeEarnings, setLifetimeEarnings] = useState<number>(0);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [bookingComparison, setBookingComparison] = useState<{ current: number; previous: number; change: number; percentChange: number }>({ current: 0, previous: 0, change: 0, percentChange: 0 });
  const [earningsComparison, setEarningsComparison] = useState<{ current: number; previous: number; change: number; percentChange: number }>({ current: 0, previous: 0, change: 0, percentChange: 0 });
  const [serviceBreakdown, setServiceBreakdown] = useState<Array<{ service: string; bookings: number; revenue: number; percentage: number }>>([]);
  const [timeInsights, setTimeInsights] = useState<{ bestDay: string; bestTime: string; peakBookingTime: string }>({ bestDay: "", bestTime: "", peakBookingTime: "" });
  const [conversionFunnel, setConversionFunnel] = useState<{ views: number; clicks: number; bookings: number; viewToClick: number; clickToBooking: number }>({ views: 0, clicks: 0, bookings: 0, viewToClick: 0, clickToBooking: 0 });
  const [keyInsights, setKeyInsights] = useState<string[]>([]);
  const [utilizationMetrics, setUtilizationMetrics] = useState<{ totalSlots: number; bookedSlots: number; utilizationRate: number }>({ totalSlots: 0, bookedSlots: 0, utilizationRate: 0 });

  const chartColors = ["#3b82f6", "#f97316", "#8b5cf6", "#22c55e", "#06b6d4"];

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

      const now = new Date();

      // Calculate date range boundaries based on selected period
      let rangeStart: Date | null = null;
      let rangeEnd: Date | null = null;

      switch (timePeriod) {
        case "today": {
          const startOfDay = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );
          const startOfNextDay = new Date(startOfDay);
          startOfNextDay.setDate(startOfNextDay.getDate() + 1);
          rangeStart = startOfDay;
          rangeEnd = startOfNextDay;
          break;
        }
        case "week": {
          const startOfWeek = new Date(now);
          const dayOfWeek = startOfWeek.getDay();
          const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
          startOfWeek.setDate(startOfWeek.getDate() + diffToMonday);
          startOfWeek.setHours(0, 0, 0, 0);

          const startOfNextWeek = new Date(startOfWeek);
          startOfNextWeek.setDate(startOfNextWeek.getDate() + 7);

          rangeStart = startOfWeek;
          rangeEnd = startOfNextWeek;
          break;
        }
        case "month": {
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const startOfNextMonth = new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            1
          );
          rangeStart = startOfMonth;
          rangeEnd = startOfNextMonth;
          break;
        }
        case "all":
        default:
          rangeStart = null;
          rangeEnd = null;
          break;
      }

      const toLocalDateString = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      };

      const startDateString = rangeStart ? toLocalDateString(rangeStart) : null;
      const endDateString = rangeEnd ? toLocalDateString(rangeEnd) : null;

      // Fetch sessions where user is the mentor
      let mentorQuery = supabase
        .from("bookings")
        .select("*")
        .eq("expert_id", mentorProfile.id)
        .in("status", ["confirmed", "completed", "cancelled"]);

      // Fetch sessions where user is the student
      let studentQuery = supabase
        .from("bookings")
        .select("*")
        .eq("user_id", mentorProfile.id)
        .in("status", ["confirmed", "completed", "cancelled"]);

      if (startDateString && endDateString) {
        mentorQuery = mentorQuery
          .gte("scheduled_date", startDateString)
          .lt("scheduled_date", endDateString);
        studentQuery = studentQuery
          .gte("scheduled_date", startDateString)
          .lt("scheduled_date", endDateString);
      }

      const { data: mentorSessions } = await mentorQuery;
      const { data: studentSessions } = await studentQuery;

      const sessions = [
        ...(mentorSessions || []),
        ...(studentSessions || []),
      ];
      const filteredMentorSessions = mentorSessions || [];

      // Calculate stats
      const upcoming =
        sessions?.filter((s) => {
          const sessionDate = new Date(
            `${s.scheduled_date}T${s.scheduled_time}`
          );
          return sessionDate > now && s.status === "confirmed";
        }) || [];
      const completed = sessions?.filter((s) => s.status === "completed") || [];
      const total = sessions?.length || 0;

      // Calculate earnings only from mentor-side successful paid bookings
      const earnings = (filteredMentorSessions || []).reduce((sum, session) => {
        const amount = Number(session.total_amount || 0);
        const paymentStatus = String(session.payment_status || "").trim().toLowerCase();
        const bookingStatus = String(session.status || "").trim().toLowerCase();
        const isSuccessfulPayment = SUCCESSFUL_PAYMENT_STATUSES.has(paymentStatus);
        const isSuccessfulBooking = SUCCESSFUL_BOOKING_STATUSES.has(bookingStatus);

        // Count only real successful paid mentor bookings.
        if (!isSuccessfulPayment || !isSuccessfulBooking || amount <= 0) return sum;

        return sum + amount;
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

      const calculateDateKey = (date: Date) => {
        const p = timePeriod;
        if (p === "month") {
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        }
        if (p === "week") {
          const day = date.getDay();
          const mondayOffset = day === 0 ? -6 : 1 - day;
          const monday = new Date(date);
          monday.setDate(date.getDate() + mondayOffset);
          return monday.toISOString().slice(0, 10);
        }
        return date.toISOString().slice(0, 10);
      };

      const generateTrendKeys = () => {
        const values: string[] = [];
        const today = new Date();

        if (timePeriod === "month") {
          for (let i = 11; i >= 0; i -= 1) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            values.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
          }
        } else if (timePeriod === "week") {
          const firstDay = new Date(today);
          const day = firstDay.getDay();
          firstDay.setDate(firstDay.getDate() - (day === 0 ? 6 : day - 1));
          for (let i = 7; i >= 0; i -= 1) {
            const d = new Date(firstDay);
            d.setDate(firstDay.getDate() - i * 7);
            values.push(d.toISOString().slice(0, 10));
          }
        } else {
          for (let i = 13; i >= 0; i -= 1) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            values.push(d.toISOString().slice(0, 10));
          }
        }

        return values;
      };

      const trendKeys = generateTrendKeys();
      const trendMap = new Map<string, { date: string; bookedSessions: number; totalEarnings: number; avgEarnings: number }>();
      trendKeys.forEach((key) => {
        trendMap.set(key, {
          date: key,
          bookedSessions: 0,
          totalEarnings: 0,
          avgEarnings: 0,
        });
      });

      const relevantSessions = (mentorSessions || []).filter((session) => {
        const status = String(session.status || "").toLowerCase();
        return status === "confirmed" || status === "completed";
      });

      relevantSessions.forEach((session) => {
        if (!session.scheduled_date) return;

        const date = new Date(session.scheduled_date);
        const key = calculateDateKey(date);
        if (!trendMap.has(key)) return;

        const node = trendMap.get(key);
        if (!node) return;

        const amount = Number(session.total_amount || 0);
        node.bookedSessions += 1;
        node.totalEarnings += amount;
      });

      const computedTrendData = Array.from(trendMap.values()).map((point) => ({
        ...point,
        avgEarnings: point.bookedSessions > 0 ? point.totalEarnings / point.bookedSessions : 0,
      }));

      setTrendData(computedTrendData);

      // Calculate period-over-period comparison
      if (computedTrendData.length > 0) {
        const midpoint = Math.floor(computedTrendData.length / 2);
        const firstHalf = computedTrendData.slice(0, midpoint);
        const secondHalf = computedTrendData.slice(midpoint);

        const currentBookings = secondHalf.reduce((sum, point) => sum + point.bookedSessions, 0);
        const previousBookings = firstHalf.reduce((sum, point) => sum + point.bookedSessions, 0);
        const bookingChange = currentBookings - previousBookings;
        const bookingPercentChange = previousBookings > 0 ? (bookingChange / previousBookings) * 100 : 0;

        const currentEarnings = secondHalf.reduce((sum, point) => sum + point.totalEarnings, 0);
        const previousEarnings = firstHalf.reduce((sum, point) => sum + point.totalEarnings, 0);
        const earningsChange = currentEarnings - previousEarnings;
        const earningsPercentChange = previousEarnings > 0 ? (earningsChange / previousEarnings) * 100 : 0;

        setBookingComparison({
          current: currentBookings,
          previous: previousBookings,
          change: bookingChange,
          percentChange: bookingPercentChange,
        });

        setEarningsComparison({
          current: currentEarnings,
          previous: previousEarnings,
          change: earningsChange,
          percentChange: earningsPercentChange,
        });
      }

      const computedPending = (mentorSessions || []).reduce((sum, session) => {
        const status = String(session.status || "").toLowerCase();
        const payoutStatus = String(session.payment_status || "").toLowerCase();
        if (status === "confirmed" && payoutStatus === "pending") {
          return sum + Number(session.total_amount || 0);
        }
        return sum;
      }, 0);

      const computedLifetime = (mentorSessions || []).reduce((sum, session) => {
        const paymentStatus = String(session.payment_status || "").toLowerCase();
        const bookingStatus = String(session.status || "").toLowerCase();
        if (paymentStatus === "paid" || bookingStatus === "completed") {
          return sum + Number(session.total_amount || 0);
        }
        return sum;
      }, 0);

      setPendingPayouts(computedPending);
      setLifetimeEarnings(computedLifetime);

      // Calculate Service Breakdown
      const serviceMap = new Map<string, { bookings: number; revenue: number }>();
      (mentorSessions || [])
        .filter((s) => s.status === "completed" || s.payment_status === "paid")
        .forEach((session) => {
          const serviceName = getServiceDisplayName(session.session_type);
          const current = serviceMap.get(serviceName) || { bookings: 0, revenue: 0 };
          current.bookings += 1;
          current.revenue += Number(session.total_amount || 0);
          serviceMap.set(serviceName, current);
        });

      const totalServiceBookings = Array.from(serviceMap.values()).reduce((sum, s) => sum + s.bookings, 0);
      const serviceBreakdownData = Array.from(serviceMap.entries())
        .map(([service, data]) => ({
          service,
          bookings: data.bookings,
          revenue: data.revenue,
          percentage: totalServiceBookings > 0 ? (data.bookings / totalServiceBookings) * 100 : 0,
        }))
        .sort((a, b) => b.bookings - a.bookings);

      setServiceBreakdown(serviceBreakdownData);

      // Calculate Time Insights
      const dayMap = new Map<string, number>();
      const hourMap = new Map<number, number>();
      (mentorSessions || [])
        .filter((s) => s.scheduled_date && s.scheduled_time)
        .forEach((session) => {
          const date = new Date(`${session.scheduled_date}T${session.scheduled_time}`);
          const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
          const hour = date.getHours();
          dayMap.set(dayName, (dayMap.get(dayName) || 0) + 1);
          hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
        });

      const bestDay = dayMap.size > 0 ? Array.from(dayMap.entries()).sort((a, b) => b[1] - a[1])[0][0] : "N/A";
      const bestHour = hourMap.size > 0 ? Array.from(hourMap.entries()).sort((a, b) => b[1] - a[1])[0][0] : 0;
      const bestTime = bestHour > 0 ? `${String(bestHour).padStart(2, "0")}:00 - ${String(bestHour + 1).padStart(2, "0")}:00` : "N/A";

      setTimeInsights({
        bestDay,
        bestTime,
        peakBookingTime: bestTime,
      });

      // Generate Key Insights
      const insights: string[] = [];
      if (serviceBreakdownData.length > 0) {
        insights.push(`"${serviceBreakdownData[0].service}" generated ${serviceBreakdownData[0].percentage.toFixed(0)}% of bookings`);
      }
      if (bestDay !== "N/A") {
        insights.push(`Peak bookings on ${bestDay}s`);
      }
      if (bestTime !== "N/A") {
        insights.push(`Best time slot: ${bestTime}`);
      }
      if (bookingComparison.percentChange > 0) {
        insights.push(`📈 Bookings up ${bookingComparison.percentChange.toFixed(0)}% vs previous period`);
      } else if (bookingComparison.percentChange < 0) {
        insights.push(`📉 Bookings down ${Math.abs(bookingComparison.percentChange).toFixed(0)}% vs previous period`);
      }

      setKeyInsights(insights);

      // Set utilization metrics (estimate based on average availability)
      const estimatedSlotsPerDay = 8; // Assume mentor can do 8 sessions per day
      const recentDays = mentorSessions?.filter((s) => {
        const date = new Date(s.scheduled_date);
        const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        return daysDiff <= 14;
      }).length || 0;

      const estimatedTotalSlots = estimatedSlotsPerDay * 14;
      const utilisationRate = estimatedTotalSlots > 0 ? (recentDays / estimatedTotalSlots) * 100 : 0;

      setUtilizationMetrics({
        totalSlots: estimatedTotalSlots,
        bookedSlots: recentDays,
        utilizationRate: Math.min(utilisationRate, 100),
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
            .maybeSingle();

          return {
            ...request,
            profiles: profileData || { full_name: "Deleted User", email: "" },
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

  const statCards: Array<{
    title: string;
    value: number | string;
    icon: any;
    iconColor: string;
    suffix?: string;
    isComingSoon?: boolean;
  }> = [
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
      value: `Rs. ${stats.totalEarnings.toLocaleString("en-IN")}`,
      icon: IndianRupee,
      iconColor: "text-rose-400",
    },
    {
      title: "Average Rating",
      value: stats.averageRating > 0 ? stats.averageRating.toFixed(1) : "N/A",
      icon: Star,
      iconColor: "text-rose-400",
      suffix: stats.averageRating > 0 ? "/ 5.0" : "",
    },
  ];

  const getServiceDisplayName = (sessionType: string): string => {
    if (mentorProfile?.service_pricing?.[sessionType]?.name) {
      return mentorProfile.service_pricing[sessionType].name;
    }
    if (SERVICE_CONFIG[sessionType]) {
      return SERVICE_CONFIG[sessionType].name;
    }
    return sessionType || SERVICE_CONFIG.oneOnOneSession?.name || "1-on-1 Session";
  };

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

      {/* Earnings Summary + Booking Trend & Earnings Graphs */}
      <div className="space-y-4">
        {/* Summary Cards */}
        <Card className="bg-gray-100 border-0 rounded-2xl shadow-none">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">
                Earnings Overview
              </h3>
              {/* Time Period Filter for Graphs */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTimePeriod("today")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    timePeriod === "today"
                      ? "bg-gray-900 text-white shadow-sm"
                      : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  14 Days
                </button>
                <button
                  onClick={() => setTimePeriod("week")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    timePeriod === "week"
                      ? "bg-gray-900 text-white shadow-sm"
                      : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  8 Weeks
                </button>
                <button
                  onClick={() => setTimePeriod("month")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    timePeriod === "month"
                      ? "bg-gray-900 text-white shadow-sm"
                      : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  12 Months
                </button>
                <button
                  onClick={() => setTimePeriod("all")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    timePeriod === "all"
                      ? "bg-gray-900 text-white shadow-sm"
                      : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  All Time
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-xl border border-gray-200 bg-white p-3">
                <p className="text-xs text-gray-500">Total Earnings</p>
                <p className="text-lg font-bold text-gray-900 mt-1">
                  Rs. {stats.totalEarnings.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-3">
                <p className="text-xs text-gray-500">Pending Payouts</p>
                <p className="text-lg font-bold text-gray-900 mt-1">
                  Rs. {pendingPayouts.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-3">
                <p className="text-xs text-gray-500">Lifetime Earnings</p>
                <p className="text-lg font-bold text-gray-900 mt-1">
                  Rs. {lifetimeEarnings.toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Two Graphs Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Booking Trend Graph */}
          <Card className="bg-white border border-gray-200 rounded-2xl shadow-none">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    Booking Trend
                  </h3>
                  <p className="text-xs text-gray-500">Sessions booked over time</p>
                </div>
                <span className="text-xs text-gray-500">
                  {timePeriod === "today"
                    ? "14 days"
                    : timePeriod === "week"
                    ? "8 weeks"
                    : timePeriod === "month"
                    ? "12 months"
                    : "All time"}
                </span>
              </div>

              {/* Comparison Badge */}
              {bookingComparison.current > 0 && (
                <div className="mb-3 flex items-center gap-2 rounded-lg bg-green-50 p-2.5 border border-green-200">
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      {bookingComparison.current}
                    </p>
                    <p className={`text-xs font-medium ${bookingComparison.change >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {bookingComparison.change >= 0 ? "+" : ""}{bookingComparison.change.toFixed(0)} sessions ({bookingComparison.percentChange >= 0 ? "+" : ""}{bookingComparison.percentChange.toFixed(1)}%)
                    </p>
                  </div>
                  <div className={`ml-auto text-sm font-bold ${bookingComparison.change >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {bookingComparison.change >= 0 ? "↑" : "↓"}
                  </div>
                </div>
              )}

              <div className="h-56">
                {trendData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-xs text-gray-500">
                    No booking data available yet.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="date"
                        minTickGap={10}
                        tick={{ fontSize: 10, fill: "#6b7280" }}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "#6b7280" }}
                        allowDecimals={false}
                      />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line
                        type="monotone"
                        dataKey="bookedSessions"
                        name="Sessions Booked"
                        stroke="#22c55e"
                        strokeWidth={2.5}
                        dot={{ r: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Earnings Graph */}
          <Card className="bg-white border border-gray-200 rounded-2xl shadow-none">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    Earnings Trend
                  </h3>
                  <p className="text-xs text-gray-500">Total & average earnings</p>
                </div>
                <span className="text-xs text-gray-500">
                  {timePeriod === "today"
                    ? "14 days"
                    : timePeriod === "week"
                    ? "8 weeks"
                    : timePeriod === "month"
                    ? "12 months"
                    : "All time"}
                </span>
              </div>

              {/* Comparison Badge */}
              {earningsComparison.current > 0 && (
                <div className="mb-3 flex items-center gap-2 rounded-lg bg-blue-50 p-2.5 border border-blue-200">
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      Rs. {earningsComparison.current.toLocaleString("en-IN")}
                    </p>
                    <p className={`text-xs font-medium ${earningsComparison.change >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {earningsComparison.change >= 0 ? "+" : ""}Rs. {earningsComparison.change.toLocaleString("en-IN")} ({earningsComparison.percentChange >= 0 ? "+" : ""}{earningsComparison.percentChange.toFixed(1)}%)
                    </p>
                  </div>
                  <div className={`ml-auto text-sm font-bold ${earningsComparison.change >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {earningsComparison.change >= 0 ? "↑" : "↓"}
                  </div>
                </div>
              )}

              <div className="h-56">
                {trendData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-xs text-gray-500">
                    No earnings data available yet.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="date"
                        minTickGap={10}
                        tick={{ fontSize: 10, fill: "#6b7280" }}
                      />
                      <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} />
                      <Tooltip formatter={(value: number) => [`Rs. ${value.toLocaleString("en-IN")}`, ""]} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line
                        type="monotone"
                        dataKey="totalEarnings"
                        name="Total Earnings"
                        stroke="#3b82f6"
                        strokeWidth={2.5}
                        dot={{ r: 2 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="avgEarnings"
                        name="Avg per Session"
                        stroke="#f97316"
                        strokeWidth={2.5}
                        dot={{ r: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Actionable Insights Section - Game Changer */}
      <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-0 rounded-2xl shadow-none">
        <CardContent className="p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-4">
            💡 Actionable Insights
          </h3>

          {/* Key Insights Row */}
          {keyInsights.length > 0 && (
            <div className="mb-4 space-y-2">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Recent Patterns
              </p>
              <div className="space-y-1.5">
                {keyInsights.map((insight, idx) => (
                  <div
                    key={idx}
                    className="text-sm text-gray-800 flex items-start gap-2 p-2 rounded-lg bg-white bg-opacity-70"
                  >
                    <span className="text-indigo-600 flex-shrink-0 mt-0.5">→</span>
                    <span>{insight}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Service Breakdown + Time Insights Side by Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Service Breakdown */}
            {serviceBreakdown.length > 0 && (
              <div className="rounded-xl border border-indigo-200 bg-white p-3">
                <p className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                  Service Performance
                </p>
                <div className="space-y-2">
                  {serviceBreakdown.slice(0, 3).map((service, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium text-gray-900">{service.service}</p>
                        <p className="text-xs text-gray-500">
                          {service.bookings} bookings • Rs. {service.revenue.toLocaleString("en-IN")}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center">
                          <span className="text-sm font-bold text-indigo-600">
                            {service.percentage.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Time-Based & Utilization */}
            <div className="rounded-xl border border-indigo-200 bg-white p-3 space-y-3">
              {/* Best Day/Time */}
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                  Optimal Timing
                </p>
                <div className="space-y-1.5">
                  {timeInsights.bestDay !== "N/A" && (
                    <div className="text-sm">
                      <p className="text-gray-600">Best Day</p>
                      <p className="font-bold text-gray-900">{timeInsights.bestDay}</p>
                    </div>
                  )}
                  {timeInsights.bestTime !== "N/A" && (
                    <div className="text-sm">
                      <p className="text-gray-600">Peak Time</p>
                      <p className="font-bold text-gray-900">{timeInsights.bestTime}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Utilization */}
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                  Utilization (14 days)
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      utilizationMetrics.utilizationRate >= 70
                        ? "bg-green-500"
                        : utilizationMetrics.utilizationRate >= 40
                        ? "bg-yellow-500"
                        : "bg-orange-500"
                    }`}
                    style={{ width: `${Math.min(utilizationMetrics.utilizationRate, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {utilizationMetrics.bookedSlots} of {utilizationMetrics.totalSlots} slots booked
                  <span className="font-bold text-gray-900 ml-1">
                    ({utilizationMetrics.utilizationRate.toFixed(0)}%)
                  </span>
                </p>
              </div>
            </div>
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
                        {(() => {
                          // Check custom service name first
                          if (mentorProfile?.service_pricing?.[session.session_type]) {
                            const customName = mentorProfile.service_pricing[session.session_type].name;
                            if (customName) return customName;
                          }
                          // Then check SERVICE_CONFIG
                          if (SERVICE_CONFIG[session.session_type]) {
                            return SERVICE_CONFIG[session.session_type].name;
                          }
                          // Fallback to default
                          return session.session_type || SERVICE_CONFIG.oneOnOneSession?.name || "1-on-1 Session";
                        })()}
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
                <Badge className="bg-amber-500 text-white px-2.5 py-0.5 text-xs font-semibold hover:bg-amber-500 hover:text-white">
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
                          {request.profiles?.full_name || "Deleted User"}
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
