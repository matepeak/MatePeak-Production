import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  CheckCircle,
  Calendar,
  Clock,
  User,
  Video,
  MessageSquare,
  Package,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Home,
  LayoutDashboard,
  CalendarPlus,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Navbar from "@/components/Navbar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BookingDetails {
  id: string;
  student_id: string;
  mentor_id: string;
  service_type: string;
  service_name: string;
  date: string;
  time_slot: string;
  duration: number;
  status: string;
  created_at: string;
  mentor_name: string;
  mentor_email: string;
  mentor_image: string;
  student_name: string;
  student_email: string;
  meeting_link?: string;
}

const BookingConfirmed = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [userRole, setUserRole] = useState<"student" | "mentor" | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [checkComplete, setCheckComplete] = useState(false);

  // Fetch booking details
  useEffect(() => {
    const fetchBookingDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check authentication
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          setError("Please log in to view this booking confirmation.");
          setLoading(false);
          return;
        }

        // Validate booking ID
        if (!bookingId) {
          setError("Invalid booking ID.");
          setLoading(false);
          return;
        }

        // Fetch booking details
        const { data: bookingData, error: bookingError } = await supabase
          .from("bookings")
          .select(
            `
            id,
            user_id,
            expert_id,
            session_type,
            scheduled_date,
            scheduled_time,
            duration,
            status,
            total_amount,
            meeting_link,
            user_name,
            user_email,
            created_at
          `
          )
          .eq("id", bookingId)
          .single();

        if (bookingError) {
          console.error("Booking fetch error:", bookingError);
          console.error("Booking ID:", bookingId);
          console.error("Error details:", {
            code: bookingError.code,
            message: bookingError.message,
            details: bookingError.details,
            hint: bookingError.hint,
          });
          setError(
            `Unable to find booking details. ${
              bookingError.message ||
              "Please check your bookings in the dashboard."
            }`
          );
          setLoading(false);
          return;
        }

        if (!bookingData) {
          setError("Booking not found.");
          setLoading(false);
          return;
        }

        // Verify user has access to this booking
        const userId = session.user.id;
        if (
          bookingData.user_id !== userId &&
          bookingData.expert_id !== userId
        ) {
          setError("You don't have permission to view this booking.");
          setLoading(false);
          return;
        }

        // Determine user role
        setUserRole(bookingData.user_id === userId ? "student" : "mentor");

        // Fetch mentor data from expert_profiles table
        let mentorName = "Unknown Mentor";
        let mentorImage = "";
        if (bookingData.expert_id) {
          const { data: mentorProfile } = await supabase
            .from("expert_profiles")
            .select("full_name, profile_picture_url")
            .eq("id", bookingData.expert_id)
            .single();

          if (mentorProfile) {
            mentorName = mentorProfile.full_name || "Unknown Mentor";
            mentorImage = mentorProfile.profile_picture_url || "";
          }
        }

        // Fetch mentor email from profiles table
        let mentorEmail = "";
        if (bookingData.expert_id) {
          const { data: mentorProfile } = await supabase
            .from("profiles")
            .select("email")
            .eq("id", bookingData.expert_id)
            .single();

          if (mentorProfile) {
            mentorEmail = mentorProfile.email || "";
          }
        }

        // For student name, use the user_name field from booking (which was captured at booking time)
        // If viewing as student, fetch their own profile for full data
        let studentName = bookingData.user_name || "Student";
        let studentEmail = bookingData.user_email || "";

        if (bookingData.user_id === userId) {
          // If current user is the student, fetch their profile
          const { data: profileData } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", userId)
            .single();

          if (profileData) {
            studentName = profileData.full_name || studentName;
            studentEmail = profileData.email || studentEmail;
          }
        }

        // Format booking data
        const formattedBooking: BookingDetails = {
          id: bookingData.id,
          student_id: bookingData.user_id,
          mentor_id: bookingData.expert_id,
          service_type: bookingData.session_type,
          service_name: bookingData.session_type,
          date: bookingData.scheduled_date,
          time_slot: bookingData.scheduled_time,
          duration: bookingData.duration,
          status: bookingData.status,
          created_at: bookingData.created_at,
          mentor_name: mentorName,
          mentor_email: mentorEmail,
          mentor_image: mentorImage,
          student_name: studentName,
          student_email: studentEmail,
          meeting_link: bookingData.meeting_link,
        };

        setBooking(formattedBooking);
      } catch (err) {
        console.error("Error fetching booking:", err);
        setError("An unexpected error occurred. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchBookingDetails();
  }, [bookingId]);

  // Trigger celebration animation
  useEffect(() => {
    if (booking) {
      // Show check animation
      const checkTimer = setTimeout(() => {
        setCheckComplete(true);
      }, 300);

      // Trigger confetti after check completes
      const confettiTimer = setTimeout(() => {
        setShowConfetti(true);
      }, 800);

      // Hide confetti after animation
      const hideTimer = setTimeout(() => {
        setShowConfetti(false);
      }, 3000);

      return () => {
        clearTimeout(checkTimer);
        clearTimeout(confettiTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [booking]);

  // Generate calendar event functions
  const generateCalendarEvent = () => {
    if (!booking) return;

    const startDate = new Date(`${booking.date}T${booking.time_slot}`);
    const endDate = new Date(startDate.getTime() + booking.duration * 60000);

    const formatICSDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };

    const event = {
      title: `Mentorship Session: ${booking.service_name}`,
      description: `Mentorship session with ${booking.mentor_name}${
        booking.meeting_link ? `\n\nMeeting Link: ${booking.meeting_link}` : ""
      }`,
      location: booking.meeting_link || "Online",
      startTime: formatICSDate(startDate),
      endTime: formatICSDate(endDate),
    };

    return event;
  };

  const downloadICS = () => {
    const event = generateCalendarEvent();
    if (!event) return;

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Spark Mentor Connect//EN",
      "BEGIN:VEVENT",
      `DTSTART:${event.startTime}`,
      `DTEND:${event.endTime}`,
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${event.description.replace(/\n/g, "\\n")}`,
      `LOCATION:${event.location}`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([icsContent], {
      type: "text/calendar;charset=utf-8",
    });
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.download = `booking-${booking.id.slice(0, 8)}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const addToGoogleCalendar = () => {
    const event = generateCalendarEvent();
    if (!event) return;

    const startDate = new Date(`${booking.date}T${booking.time_slot}`);
    const endDate = new Date(
      startDate.getTime() + (booking?.duration || 60) * 60000
    );

    const formatGoogleDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };

    const googleUrl = new URL("https://calendar.google.com/calendar/render");
    googleUrl.searchParams.append("action", "TEMPLATE");
    googleUrl.searchParams.append("text", event.title);
    googleUrl.searchParams.append("details", event.description);
    googleUrl.searchParams.append("location", event.location);
    googleUrl.searchParams.append(
      "dates",
      `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`
    );

    window.open(googleUrl.toString(), "_blank");
  };

  const addToOutlook = () => {
    const event = generateCalendarEvent();
    if (!event) return;

    const startDate = new Date(`${booking.date}T${booking.time_slot}`);
    const endDate = new Date(
      startDate.getTime() + (booking?.duration || 60) * 60000
    );

    const outlookUrl = new URL(
      "https://outlook.live.com/calendar/0/deeplink/compose"
    );
    outlookUrl.searchParams.append("path", "/calendar/action/compose");
    outlookUrl.searchParams.append("rru", "addevent");
    outlookUrl.searchParams.append("subject", event.title);
    outlookUrl.searchParams.append("body", event.description);
    outlookUrl.searchParams.append("location", event.location);
    outlookUrl.searchParams.append("startdt", startDate.toISOString());
    outlookUrl.searchParams.append("enddt", endDate.toISOString());

    window.open(outlookUrl.toString(), "_blank");
  };

  // Loading state
  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center">
          <Card className="p-8 max-w-md w-full mx-4">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <p className="text-lg font-medium text-gray-700">
                Loading booking details...
              </p>
            </div>
          </Card>
        </div>
      </>
    );
  }

  // Error state
  if (error || !booking) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-white flex items-center justify-center">
          <Card className="p-8 max-w-md w-full mx-4 shadow-sm border border-gray-200">
            <div className="flex flex-col items-center gap-6">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Oops!</h2>
                <p className="text-gray-600">{error || "Booking not found."}</p>
              </div>
              <div className="flex gap-3 w-full">
                <Button
                  variant="outline"
                  onClick={() => navigate(-1)}
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Go Back
                </Button>
                <Button
                  onClick={() => navigate("/dashboard")}
                  className="flex-1"
                >
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </>
    );
  }

  // Format service type for display
  const formatServiceType = (type: string) => {
    const typeMap: Record<string, string> = {
      oneOnOneSession: "1-on-1 Session",
      priorityDm: "Priority DM",
      chatAdvice: "Priority DM",
      digitalProducts: "Digital Product",
    };
    return typeMap[type] || type.replace(/([A-Z])/g, " $1").trim();
  };

  // Format date and time
  const bookingDate = new Date(booking.date);
  const formattedDate = format(bookingDate, "EEEE, MMMM d, yyyy");
  const isStudent = userRole === "student";
  const normalizedServiceType =
    booking.service_type === "chatAdvice" ? "priorityDm" : booking.service_type;

  const isOneOnOne = normalizedServiceType === "oneOnOneSession";
  const isPriorityDm = normalizedServiceType === "priorityDm";
  const isDigitalProduct = normalizedServiceType === "digitalProducts";

  const serviceDisplayName = formatServiceType(normalizedServiceType);
  const serviceIcon = isPriorityDm
    ? MessageSquare
    : isDigitalProduct
    ? Package
    : Video;

  const headline = isStudent
    ? isOneOnOne
      ? "Your 1-on-1 session is confirmed"
      : isPriorityDm
      ? "Your Priority DM is sent"
      : isDigitalProduct
      ? "Your digital product request is confirmed"
      : "Your request is confirmed"
    : isOneOnOne
    ? "You received a 1-on-1 booking"
    : isPriorityDm
    ? "You received a Priority DM request"
    : isDigitalProduct
    ? "You received a digital product request"
    : "You received a new request";

  const subHeadline = isStudent
    ? isOneOnOne
      ? "Get ready for your scheduled mentoring session."
      : isPriorityDm
      ? "Your mentor will review your message and reply in Priority DM."
      : isDigitalProduct
      ? "Your mentor will share the requested resources from dashboard flow."
      : "Your request was submitted successfully."
    : isOneOnOne
    ? "Review details and prepare for the upcoming session."
    : isPriorityDm
    ? "Reply from your Priority DM inbox when you're ready."
    : isDigitalProduct
    ? "Process this request from your dashboard workflow."
    : "Open your dashboard to continue.";

  const nextSteps = isOneOnOne
    ? [
        "You will receive a confirmation email with session details.",
        "A reminder will be sent 24 hours before the session.",
        "A final reminder will arrive 1 hour before the session.",
        "Use your meeting link from dashboard when the session starts.",
      ]
    : isPriorityDm
    ? [
        "Your Priority DM message has been delivered to the mentor.",
        "The mentor can reply directly in the Priority DM inbox.",
        "You can continue the conversation from your dashboard.",
        "You will be notified when a new reply arrives.",
      ]
    : [
        "Your request is now visible to the mentor.",
        "The mentor will provide the digital resource through platform flow.",
        "Track status and updates from your dashboard.",
      ];

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-white">
        {/* Success Banner with Celebration Animation */}
        <div className="bg-emerald-50 border-b border-emerald-100 py-8 relative overflow-hidden">
          {/* Confetti Spray from Both Sides */}
          {showConfetti && (
            <>
              {/* Left Side Confetti */}
              <div className="absolute left-0 top-0 bottom-0 w-full pointer-events-none">
                {[...Array(40)].map((_, i) => {
                  const size = Math.random() * 8 + 4; // 4-12px
                  const isRectangle = i % 3 === 0;
                  const delay = i * 0.02;
                  const duration = 1.2 + Math.random() * 0.8;
                  const startY = Math.random() * 100;
                  const endX = 100 + Math.random() * 200;
                  const endY = Math.random() * 300 - 150;
                  const rotation = Math.random() * 1080 - 540;

                  return (
                    <div
                      key={`left-${i}`}
                      className="absolute"
                      style={{
                        left: `-10px`,
                        top: `${startY}%`,
                        width: isRectangle ? `${size * 1.5}px` : `${size}px`,
                        height: isRectangle ? `${size * 0.6}px` : `${size}px`,
                        backgroundColor: [
                          "#10b981",
                          "#3b82f6",
                          "#f59e0b",
                          "#ef4444",
                          "#8b5cf6",
                          "#ec4899",
                          "#22d3ee",
                          "#fb923c",
                          "#14b8a6",
                          "#f97316",
                        ][i % 10],
                        borderRadius: isRectangle ? "2px" : "50%",
                        animation: `confettiLeft-${i} ${duration}s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`,
                        animationDelay: `${delay}s`,
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                      }}
                    />
                  );
                })}
              </div>

              {/* Right Side Confetti */}
              <div className="absolute right-0 top-0 bottom-0 w-full pointer-events-none">
                {[...Array(40)].map((_, i) => {
                  const size = Math.random() * 8 + 4; // 4-12px
                  const isRectangle = i % 3 === 0;
                  const delay = i * 0.02;
                  const duration = 1.2 + Math.random() * 0.8;
                  const startY = Math.random() * 100;
                  const endX = -(100 + Math.random() * 200);
                  const endY = Math.random() * 300 - 150;
                  const rotation = Math.random() * 1080 - 540;

                  return (
                    <div
                      key={`right-${i}`}
                      className="absolute"
                      style={{
                        right: `-10px`,
                        top: `${startY}%`,
                        width: isRectangle ? `${size * 1.5}px` : `${size}px`,
                        height: isRectangle ? `${size * 0.6}px` : `${size}px`,
                        backgroundColor: [
                          "#10b981",
                          "#3b82f6",
                          "#f59e0b",
                          "#ef4444",
                          "#8b5cf6",
                          "#ec4899",
                          "#22d3ee",
                          "#fb923c",
                          "#14b8a6",
                          "#f97316",
                        ][i % 10],
                        borderRadius: isRectangle ? "2px" : "50%",
                        animation: `confettiRight-${i} ${duration}s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`,
                        animationDelay: `${delay}s`,
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                      }}
                    />
                  );
                })}
              </div>
            </>
          )}

          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <div className="relative inline-block mb-4">
                {/* Animated Check Circle */}
                <div
                  className={`inline-flex items-center justify-center w-16 h-16 bg-emerald-500 rounded-full transition-all duration-500 ${
                    checkComplete ? "scale-110" : "scale-0"
                  }`}
                  style={{
                    animation: checkComplete
                      ? "checkPulse 0.6s ease-out"
                      : "none",
                  }}
                >
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
              </div>

              <h1
                className={`text-3xl font-bold text-gray-900 mb-2 transition-all duration-500 ${
                  checkComplete
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-4"
                }`}
              >
                {headline}
              </h1>
              <p
                className={`text-gray-600 transition-all duration-500 delay-100 ${
                  checkComplete
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-4"
                }`}
              >
                {subHeadline}
              </p>
            </div>
          </div>

          {/* CSS Animations */}
          <style>{`
            @keyframes checkPulse {
              0% {
                transform: scale(0);
              }
              50% {
                transform: scale(1.2);
              }
              100% {
                transform: scale(1);
              }
            }
            
            ${[...Array(40)]
              .map((_, i) => {
                const endX = 100 + Math.random() * 250;
                const midY = Math.random() * 150 - 75;
                const endY = Math.random() * 400 - 200;
                const rotation = Math.random() * 1440 - 720;

                return `
                @keyframes confettiLeft-${i} {
                  0% {
                    transform: translateX(0) translateY(0) rotate(0deg) scale(1);
                    opacity: 1;
                  }
                  30% {
                    transform: translateX(${
                      endX * 0.3
                    }px) translateY(${midY}px) rotate(${
                  rotation * 0.3
                }deg) scale(1.1);
                    opacity: 1;
                  }
                  70% {
                    transform: translateX(${endX * 0.7}px) translateY(${
                  midY + (endY - midY) * 0.7
                }px) rotate(${rotation * 0.7}deg) scale(1);
                    opacity: 0.6;
                  }
                  100% {
                    transform: translateX(${endX}px) translateY(${endY}px) rotate(${rotation}deg) scale(0.8);
                    opacity: 0;
                  }
                }
              `;
              })
              .join("\n")}
            
            ${[...Array(40)]
              .map((_, i) => {
                const endX = -(100 + Math.random() * 250);
                const midY = Math.random() * 150 - 75;
                const endY = Math.random() * 400 - 200;
                const rotation = Math.random() * 1440 - 720;

                return `
                @keyframes confettiRight-${i} {
                  0% {
                    transform: translateX(0) translateY(0) rotate(0deg) scale(1);
                    opacity: 1;
                  }
                  30% {
                    transform: translateX(${
                      endX * 0.3
                    }px) translateY(${midY}px) rotate(${
                  rotation * 0.3
                }deg) scale(1.1);
                    opacity: 1;
                  }
                  70% {
                    transform: translateX(${endX * 0.7}px) translateY(${
                  midY + (endY - midY) * 0.7
                }px) rotate(${rotation * 0.7}deg) scale(1);
                    opacity: 0.6;
                  }
                  100% {
                    transform: translateX(${endX}px) translateY(${endY}px) rotate(${rotation}deg) scale(0.8);
                    opacity: 0;
                  }
                }
              `;
              })
              .join("\n")} {
                transform: translateX(-150px) translateY(${
                  Math.random() * 200 - 100
                }px) rotate(${Math.random() * 720}deg);
                opacity: 0;
              }
            }
          `}</style>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Single unified card matching mentor dashboard style */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Mentor/Student Info Section */}
              <div className="p-8 border-b border-gray-100">
                <div className="flex items-center gap-4">
                  {booking.mentor_image ? (
                    <div className="relative">
                      <img
                        src={booking.mentor_image}
                        alt={booking.mentor_name}
                        className="w-20 h-20 rounded-full border-2 border-gray-200 object-cover"
                      />
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-full border-2 border-gray-200 bg-gray-100 flex items-center justify-center">
                      <User className="w-10 h-10 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1">
                      {isStudent ? "Session with" : "Session booked by"}
                    </p>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {isStudent ? booking.mentor_name : booking.student_name}
                    </h2>
                  </div>
                </div>
              </div>

              {/* Session Details Grid */}
              <div className="grid md:grid-cols-2 gap-0">
                {/* Service Info */}
                <div className={`p-8 border-b border-gray-100 ${isOneOnOne ? "border-r" : ""}`}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      {serviceIcon && <serviceIcon className="w-5 h-5 text-gray-700" />}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {isOneOnOne
                        ? "Session Details"
                        : isPriorityDm
                        ? "Priority DM Details"
                        : "Order Details"}
                    </h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Service Type</p>
                      <p className="font-semibold text-gray-900">
                        {serviceDisplayName}
                      </p>
                    </div>
                    {isOneOnOne && (
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Duration</p>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-600" />
                          <p className="font-semibold text-gray-900">
                            {booking.duration} minutes
                          </p>
                        </div>
                      </div>
                    )}
                    {isPriorityDm && (
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Reply SLA</p>
                        <p className="font-semibold text-gray-900">Within 24 hours</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Schedule Info */}
                <div className="p-8 border-b border-gray-100">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-gray-700" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {isOneOnOne
                        ? "Schedule"
                        : isPriorityDm
                        ? "Conversation Timeline"
                        : "Delivery Timeline"}
                    </h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">
                        {isOneOnOne ? "Date" : "Created On"}
                      </p>
                      <p className="font-semibold text-gray-900">
                        {isOneOnOne
                          ? formattedDate
                          : format(new Date(booking.created_at), "EEEE, MMMM d, yyyy")}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">
                        {isOneOnOne ? "Time" : "Status"}
                      </p>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-600" />
                        <p className="font-semibold text-gray-900">
                          {isOneOnOne
                            ? booking.time_slot
                            : isPriorityDm
                            ? isStudent
                              ? "Waiting for mentor reply"
                              : "Awaiting your reply"
                            : "Processing delivery"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Participant Info */}
              <div className="p-8 border-b border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-700" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Participants
                  </h3>
                </div>
                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Mentor</p>
                    <p className="font-semibold text-gray-900">{booking.mentor_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Student</p>
                    <p className="font-semibold text-gray-900">{booking.student_name}</p>
                  </div>
                </div>
              </div>

              {/* Meeting Link */}
              {isOneOnOne && booking.meeting_link && (
                <div className="p-8 bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Video className="w-5 h-5 text-gray-700" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">
                      Meeting Link Ready
                    </h3>
                  </div>
                  <p className="text-gray-700 mb-4">
                    Your session meeting link is ready. Click below to join when
                    it's time.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <a
                      href={booking.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                      Join Meeting
                      <ArrowLeft className="w-4 h-4 rotate-180" />
                    </a>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-600 hover:text-white px-6 py-3 h-auto font-medium"
                        >
                          <CalendarPlus className="w-5 h-5 mr-2" />
                          Add to Calendar
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem
                          onClick={addToGoogleCalendar}
                          className="cursor-pointer py-3"
                        >
                          <Calendar className="w-4 h-4 mr-2" />
                          Google Calendar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={addToOutlook}
                          className="cursor-pointer py-3"
                        >
                          <Calendar className="w-4 h-4 mr-2" />
                          Outlook Calendar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={downloadICS}
                          className="cursor-pointer py-3"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download .ics file
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )}

              {/* What's Next */}
              <div className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-gray-700" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">
                    What Happens Next
                  </h3>
                </div>
                <ul className="space-y-3 text-gray-700">
                  {nextSteps.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Action Buttons - Outside main card */}
            <div className="flex flex-col sm:flex-row gap-4 mt-6 justify-center">
              <Button
                variant="outline"
                onClick={() => navigate("/")}
                className="h-12 border-2 text-base px-6"
              >
                <Home className="w-5 h-5 mr-2" />
                Back to Home
              </Button>
              <Button
                onClick={() =>
                  navigate(isStudent ? "/dashboard" : "/mentor/dashboard")
                }
                className="h-12 bg-gray-900 hover:bg-black text-white text-base px-6"
              >
                <LayoutDashboard className="w-5 h-5 mr-2" />
                Go to Dashboard
              </Button>
            </div>

            {/* Booking ID and Help */}
            <div className="mt-6 pt-6 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-500 mb-4">
                Booking ID:{" "}
                <span className="font-mono text-gray-700 font-semibold">
                  {booking.id.slice(0, 8)}
                </span>
              </p>
              <p className="text-gray-600">
                Need help?{" "}
                <a
                  href="mailto:support@matepeak.com"
                  className="text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  Contact Support
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BookingConfirmed;
