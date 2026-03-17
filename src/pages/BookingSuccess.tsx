import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { CheckCircle, Calendar, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface BookingData {
  id: string;
  session_type: string;
  scheduled_date: string;
  scheduled_time: string;
  duration: number;
  message: string;
  total_amount: number;
  status: string;
  expert: {
    full_name: string;
    profile_picture_url: string;
    username: string;
  };
}

const BookingSuccess = () => {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get("id");
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (bookingId) {
      fetchBookingDetails();
    } else {
      setError("No booking ID provided");
      setLoading(false);
    }
  }, [bookingId]);

  const fetchBookingDetails = async () => {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          `
          *,
          expert:expert_profiles(
            full_name,
            profile_picture_url,
            username
          )
        `
        )
        .eq("id", bookingId)
        .single();

      if (error) throw error;

      setBooking(data as any);
    } catch (err: any) {
      console.error("Error fetching booking:", err);
      setError("Failed to load booking details");
    } finally {
      setLoading(false);
    }
  };

  const getSessionTypeName = (type: string) => {
    const typeMap: { [key: string]: string } = {
      oneOnOneSession: "1:1 Mentoring Session",
      priorityDm: "Priority DM",
      digitalProducts: "Digital Product",
      notes: "Session Notes",
    };
    return typeMap[type] || type;
  };

  const addToCalendar = () => {
    if (!booking) return;

    const event = {
      title: `Mentoring Session with ${booking.expert.full_name}`,
      description: booking.message,
      start: `${booking.scheduled_date}T${booking.scheduled_time}:00`,
      duration: booking.duration,
    };

    // Create ICS file content
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${event.start.replace(/[-:]/g, "")}
DURATION:PT${event.duration}M
SUMMARY:${event.title}
DESCRIPTION:${event.description}
END:VEVENT
END:VCALENDAR`;

    // Download ICS file
    const blob = new Blob([icsContent], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "booking.ics";
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow">
          <div className="container mx-auto px-4 py-12">
            <div className="max-w-2xl mx-auto text-center">
              <h1 className="text-2xl font-bold mb-4 text-gray-900">
                {error || "Booking not found"}
              </h1>
              <Link to="/mentors">
                <Button>Browse Mentors</Button>
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>

              <h1 className="text-3xl font-bold mb-4 text-gray-900">
                Booking Confirmed!
              </h1>
              <p className="text-gray-600 mb-8">
                Your mentoring session has been successfully booked. We've sent
                a confirmation email with all the details.
              </p>

              <div className="bg-gray-50 rounded-lg p-6 mb-8">
                <h2 className="text-xl font-bold mb-4 text-gray-900">
                  Session Details
                </h2>

                <div className="text-left max-w-sm mx-auto space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mentor:</span>
                    <span className="font-medium text-gray-900">
                      {booking.expert.full_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Session Type:</span>
                    <span className="font-medium text-gray-900">
                      {getSessionTypeName(booking.session_type)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium text-gray-900">
                      {format(
                        new Date(booking.scheduled_date),
                        "EEEE, MMMM d, yyyy"
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Time:</span>
                    <span className="font-medium text-gray-900">
                      {booking.scheduled_time}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium text-gray-900">
                      {booking.duration} minutes
                    </span>
                  </div>
                  {booking.message && (
                    <div className="flex flex-col gap-1 pt-2 border-t border-gray-200">
                      <span className="text-gray-600">Purpose:</span>
                      <span className="text-sm text-gray-900">
                        {booking.message}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-gray-200">
                    <span className="text-gray-600 font-semibold">
                      Total Paid:
                    </span>
                    <span className="font-bold text-gray-900">
                      ₹{booking.total_amount.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-900">
                  <strong>What's next?</strong> The mentor will confirm your
                  booking soon. You'll receive an email with the meeting link
                  before the session.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link to="/dashboard">
                  <Button className="bg-gray-900 hover:bg-gray-800 text-white w-full sm:w-auto">
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="border-gray-300 text-gray-700 w-full sm:w-auto"
                  onClick={addToCalendar}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Add to Calendar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BookingSuccess;
