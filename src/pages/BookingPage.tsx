import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, AlertCircle, Home, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { createBooking } from "@/services/bookingService";
import { format } from "date-fns";
import Navbar from "@/components/Navbar";
import ServiceSelection from "@/components/booking/ServiceSelection";
import DateTimeSelection from "@/components/booking/DateTimeSelection";
import BookingConfirmation from "@/components/booking/BookingConfirmation";

export type BookingStep = 1 | 2 | 3;

export interface SelectedService {
  type: "oneOnOneSession" | "chatAdvice" | "digitalProducts" | "notes";
  name: string;
  duration: number;
  price: number;
  hasFreeDemo?: boolean;
}

export interface SelectedDateTime {
  date: Date;
  time: string;
  timezone: string;
}

export interface BookingDetails {
  name: string;
  email: string;
  phone?: string;
  purpose: string;
  addRecording?: boolean;
}

interface MentorData {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string;
  timezone: string;
  services: any;
  service_pricing: any;
  average_rating: number;
  total_reviews: number;
}

const BookingPage = () => {
  const [searchParams] = useSearchParams();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Support both query params (?mentorId=X) and URL params (/book/:id)
  const mentorId = searchParams.get("mentorId") || id;
  const preSelectedServiceId = searchParams.get("serviceId");
  const preSelectedDate = searchParams.get("date");
  const preSelectedTime = searchParams.get("time");
  const preSelectedTimezone = searchParams.get("timezone");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mentorData, setMentorData] = useState<MentorData | null>(null);

  const [step, setStep] = useState<BookingStep>(1);
  const [selectedService, setSelectedService] =
    useState<SelectedService | null>(null);
  const [selectedDateTime, setSelectedDateTime] =
    useState<SelectedDateTime | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchMentorData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check authentication
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          toast.warning("Please log in to book a session");
          navigate("/student/login");
          return;
        }

        // Validate mentorId
        if (!mentorId) {
          console.error("No mentor ID provided");
          setError("Mentor ID is required");
          setLoading(false);
          return;
        }

        console.log("Fetching mentor with ID:", mentorId);

        // Fetch mentor data
        const { data: mentor, error: mentorError } = await supabase
          .from("expert_profiles")
          .select(
            `
            id,
            username,
            full_name,
            profile_picture_url,
            services,
            service_pricing
          `
          )
          .eq("id", mentorId)
          .single();

        if (mentorError) {
          console.error("Mentor fetch error:", mentorError);
          setError(`Unable to find mentor. Error: ${mentorError.message}`);
          setLoading(false);
          return;
        }

        if (!mentor) {
          console.error("No mentor data returned");
          setError("Unable to find mentor. Please try again.");
          setLoading(false);
          return;
        }

        console.log("Mentor fetched successfully:", mentor.full_name);

        // Fetch reviews for rating
        const { data: reviews } = await supabase
          .from("reviews")
          .select("rating")
          .eq("mentor_id", mentorId);

        let averageRating = 0;
        let totalReviews = 0;

        if (reviews && reviews.length > 0) {
          totalReviews = reviews.length;
          const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
          averageRating = sum / totalReviews;
        }

        setMentorData({
          id: mentor.id,
          username: mentor.username,
          full_name: mentor.full_name,
          avatar_url: mentor.profile_picture_url || "",
          timezone: "Asia/Kolkata", // Default timezone since column doesn't exist
          services: mentor.services || {},
          service_pricing: mentor.service_pricing || {},
          average_rating: averageRating,
          total_reviews: totalReviews,
        });

        // If serviceId is provided, auto-select the service
        if (preSelectedServiceId && mentor.services) {
          const serviceKey =
            preSelectedServiceId as keyof typeof mentor.services;
          if (mentor.services[serviceKey] === true) {
            // Auto-select based on serviceId
            const pricing = mentor.service_pricing || {};
            let serviceName = "";
            let duration = 60;
            let price = 0;

            switch (serviceKey) {
              case "oneOnOneSession":
                serviceName = "1-on-1 Video Session";
                duration = 60;
                price = pricing.oneOnOneSession || 0;
                break;
              case "chatAdvice":
                serviceName = "Chat Advice";
                duration = 30;
                price = pricing.chatAdvice || 0;
                break;
              case "digitalProducts":
                serviceName = "Digital Products";
                duration = 0;
                price = pricing.digitalProducts || 0;
                break;
              case "notes":
                serviceName = "Session Notes";
                duration = 0;
                price = pricing.notes || 0;
                break;
            }

            if (serviceName) {
              setSelectedService({
                type: serviceKey,
                name: serviceName,
                duration,
                price,
                hasFreeDemo: pricing.hasFreeDemo || false,
              });

              // Auto-advance to appropriate step
              if (serviceKey === "oneOnOneSession") {
                setStep(2); // Date/time selection
              } else {
                setStep(3); // Skip to confirmation for non-scheduled services
              }
            }
          }
        }

        // Handle pre-selected date/time from query params
        if (preSelectedDate && preSelectedTime && preSelectedTimezone) {
          try {
            const dateObj = new Date(preSelectedDate);
            if (!isNaN(dateObj.getTime())) {
              setSelectedDateTime({
                date: dateObj,
                time: decodeURIComponent(preSelectedTime),
                timezone: decodeURIComponent(preSelectedTimezone),
              });
              // Auto-select first available service or go to step 1
              setStep(1); // Let user pick service, then will skip to step 3
            }
          } catch (e) {
            console.error("Invalid date/time in query params:", e);
          }
        }

        setLoading(false);
      } catch (err) {
        console.error("Error fetching mentor data:", err);
        setError("An unexpected error occurred. Please try again.");
        setLoading(false);
      }
    };

    fetchMentorData();
  }, [
    mentorId,
    preSelectedServiceId,
    preSelectedDate,
    preSelectedTime,
    preSelectedTimezone,
    navigate,
  ]);

  const handleServiceSelect = (service: SelectedService) => {
    setSelectedService(service);

    // For digital products and notes, skip date/time selection
    if (
      service.type === "digitalProducts" ||
      service.type === "notes" ||
      service.type === "chatAdvice"
    ) {
      setStep(3);
    } else {
      // If we have pre-selected date/time, skip to confirmation
      if (selectedDateTime) {
        setStep(3);
      } else {
        setStep(2);
      }
    }
  };

  const handleDateTimeSelect = (dateTime: SelectedDateTime) => {
    setSelectedDateTime(dateTime);
    setStep(3);
  };

  const handleBack = () => {
    if (step === 3 && selectedService) {
      const needsDateTime = selectedService.type === "oneOnOneSession";
      setStep(needsDateTime ? 2 : 1);
    } else if (step === 2) {
      setStep(1);
    } else {
      // Go back to mentor profile or explore page
      if (mentorData?.username) {
        navigate(`/mentor/${mentorData.username}`);
      } else {
        navigate("/explore");
      }
    }
  };

  const sendConfirmationEmails = async (
    bookingData: any,
    studentDetails: BookingDetails,
    serviceDetails: SelectedService,
    mentorName: string
  ) => {
    try {
      const formattedDate = format(
        new Date(bookingData.scheduled_date),
        "EEEE, MMMM d, yyyy"
      );

      const hasMeetingLink =
        bookingData.meeting_link && bookingData.meeting_link.trim() !== "";
      const meetingLink = bookingData.meeting_link || "#";
      const meetingProvider =
        bookingData.meeting_provider || "your preferred platform";

      // Email to Student
      const studentEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6; }
    .container { max-width: 600px; margin: 0 auto; background-color: white; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 32px; text-align: center; }
    .content { padding: 32px; }
    .card { background-color: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .detail-label { color: #6b7280; font-weight: 500; }
    .detail-value { color: #111827; font-weight: 600; }
    .meeting-box { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; border-radius: 12px; padding: 24px; margin: 20px 0; text-align: center; }
    .meeting-button { display: inline-block; background-color: white; color: #2563eb; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 12px 0; }
    .footer { background-color: #f9fafb; padding: 24px; text-align: center; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://wpltqdlvrzukghiwvxqd.supabase.co/storage/v1/object/public/avatars/lovable-uploads/MatePeak_logo_with_name.png" alt="MatePeak" style="height: 40px; margin-bottom: 16px;" />
      <h1 style="margin: 0; font-size: 28px;">✅ Booking Confirmed!</h1>
      <p style="margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">Your session has been successfully booked</p>
    </div>
    
    <div class="content">
      <p style="color: #111827; font-size: 16px;">Hi ${studentDetails.name},</p>
      <p style="color: #6b7280; font-size: 14px;">Great news! Your booking with <strong>${mentorName}</strong> has been confirmed.</p>
      
      <div class="card">
        <h3 style="color: #111827; margin-top: 0;">📋 Booking Details</h3>
        <div class="detail-row">
          <span class="detail-label">Mentor</span>
          <span class="detail-value">${mentorName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Service</span>
          <span class="detail-value">${serviceDetails.name}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Date</span>
          <span class="detail-value">${formattedDate}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Time</span>
          <span class="detail-value">${bookingData.scheduled_time} ${
        selectedDateTime?.timezone || mentorData?.timezone || ""
      }</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Duration</span>
          <span class="detail-value">${serviceDetails.duration} minutes</span>
        </div>
      </div>
      
      ${
        hasMeetingLink
          ? `
      <div class="meeting-box">
        <h3 style="color: white; margin-top: 0;">🎥 Video Meeting Link</h3>
        <p style="opacity: 0.9; font-size: 14px; margin: 8px 0;">Join the session using ${meetingProvider}</p>
        <a href="${meetingLink}" class="meeting-button">Join Meeting</a>
        <p style="opacity: 0.8; font-size: 12px; margin: 16px 0 0 0;">
          Click the button above when it's time for your session.
        </p>
      </div>
      `
          : ""
      }
      
      <p style="color: #6b7280; font-size: 14px;">
        <strong>What to expect:</strong><br>
        • You'll receive a reminder 24 hours before the session<br>
        • Another reminder will be sent 1 hour before<br>
        ${
          hasMeetingLink
            ? "• Use the meeting link above to join at the scheduled time<br>"
            : "• Meeting link will be available in your dashboard<br>"
        }
      </p>
    </div>
    
    <div class="footer">
      <p>Need help? <a href="mailto:iteshofficial@gmail.com">Contact Support</a></p>
    </div>
  </div>
</body>
</html>
      `;

      await supabase.functions.invoke("send-email", {
        body: {
          to: studentDetails.email,
          subject: `Booking Confirmed: ${serviceDetails.name} with ${mentorName}`,
          html: studentEmailHtml,
        },
      });

      // Fetch and send mentor email
      const { data: mentorProfile } = await supabase
        .from("expert_profiles")
        .select("email")
        .eq("id", mentorId)
        .single();

      if (mentorProfile?.email) {
        const mentorEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6; }
    .container { max-width: 600px; margin: 0 auto; background-color: white; }
    .header { background-color: #111827; color: white; padding: 32px; text-align: center; }
    .content { padding: 32px; }
    .card { background-color: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .detail-label { color: #6b7280; font-weight: 500; }
    .detail-value { color: #111827; font-weight: 600; }
    .footer { background-color: #f9fafb; padding: 24px; text-align: center; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://wpltqdlvrzukghiwvxqd.supabase.co/storage/v1/object/public/avatars/lovable-uploads/MatePeak_logo_with_name.png" alt="MatePeak" style="height: 40px; margin-bottom: 16px;" />
      <h1 style="margin: 0; font-size: 28px;">🎉 New Booking Request!</h1>
    </div>
    
    <div class="content">
      <p style="color: #111827; font-size: 16px;">Hi ${mentorName},</p>
      <p style="color: #6b7280; font-size: 14px;">You have a new booking request from ${studentDetails.name}.</p>
      
      <div class="card">
        <h3 style="color: #111827; margin-top: 0;">📋 Booking Details</h3>
        <div class="detail-row">
          <span class="detail-label">Student</span>
          <span class="detail-value">${studentDetails.name}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Email</span>
          <span class="detail-value">${studentDetails.email}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Service</span>
          <span class="detail-value">${serviceDetails.name}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Date</span>
          <span class="detail-value">${formattedDate}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Time</span>
          <span class="detail-value">${bookingData.scheduled_time}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Duration</span>
          <span class="detail-value">${serviceDetails.duration} minutes</span>
        </div>
      </div>
      
      <p style="color: #6b7280; font-size: 14px;">
        Please review and manage this booking in your dashboard.
      </p>
    </div>
    
    <div class="footer">
      <p><a href="${window.location.origin}/mentor/dashboard">Go to Dashboard</a></p>
    </div>
  </div>
</body>
</html>
        `;

        await supabase.functions.invoke("send-email", {
          body: {
            to: mentorProfile.email,
            subject: `New Booking: ${serviceDetails.name} with ${studentDetails.name}`,
            html: mentorEmailHtml,
          },
        });
      }
    } catch (error) {
      console.error("Error sending confirmation emails:", error);
    }
  };

  const handleBookingSubmit = async (details: BookingDetails) => {
    if (!selectedService || !mentorData) return;

    try {
      setIsSubmitting(true);

      const recordingPrice = details.addRecording ? 500 : 0;
      const totalAmount = selectedService.price + recordingPrice;

      let scheduledDate = null;
      let scheduledTime = null;

      if (selectedDateTime) {
        scheduledDate = selectedDateTime.date.toISOString().split("T")[0];
        scheduledTime = selectedDateTime.time;
      } else {
        scheduledDate = new Date().toISOString().split("T")[0];
        scheduledTime = "00:00";
      }

      const bookingData = {
        expert_id: mentorId!,
        session_type: selectedService.type,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
        duration: selectedService.duration,
        message: details.purpose,
        total_amount: totalAmount,
        user_name: details.name,
        user_email: details.email,
        user_phone: details.phone,
        add_recording: details.addRecording,
      };

      const result = await createBooking(bookingData);

      if (result.success) {
        // Send confirmation emails (async, don't wait)
        sendConfirmationEmails(
          result.data,
          details,
          selectedService,
          mentorData.full_name
        );

        // Redirect to confirmation page
        navigate(`/booking/confirmed/${result.data.id}`);
      } else {
        toast.error(result.error || "Failed to create booking");
      }
    } catch (error: any) {
      console.error("Booking submission error:", error);
      toast.error(error.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStepTitle = () => {
    if (!mentorData) return "Book a Session";

    switch (step) {
      case 1:
        return `Book with ${mentorData.full_name}`;
      case 2:
        return "Select Date & Time";
      case 3:
        if (selectedService?.type === "digitalProducts")
          return "Complete Purchase";
        if (selectedService?.type === "chatAdvice") return "Send Message";
        if (selectedService?.type === "notes") return "Purchase Session Notes";
        return "Confirm Booking";
      default:
        return "Book a Session";
    }
  };

  // Loading state
  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-white flex items-center justify-center">
          <Card className="p-8 max-w-md w-full mx-4 shadow-sm border border-gray-200">
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
  if (error || !mentorData) {
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
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Unable to Load
                </h2>
                <p className="text-gray-600">{error || "Mentor not found."}</p>
              </div>
              <div className="flex gap-3 w-full">
                <Button
                  variant="outline"
                  onClick={() => navigate("/explore")}
                  className="flex-1"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Browse Mentors
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={handleBack}
            className="mb-6 hover:bg-gray-100 text-gray-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {step === 1 ? "Back to Profile" : "Back"}
          </Button>

          {/* Unified Card */}
          <Card className="bg-white shadow-sm border border-gray-200 rounded-2xl overflow-hidden">
            {/* Header Section */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-4 mb-6">
                {mentorData.avatar_url && (
                  <img
                    src={mentorData.avatar_url}
                    alt={mentorData.full_name}
                    className="w-16 h-16 rounded-full object-cover ring-2 ring-gray-100"
                  />
                )}
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {getStepTitle()}
                  </h1>
                  <p className="text-gray-500 mt-1 text-sm font-medium">
                    Step {step} of 3
                  </p>
                </div>
              </div>

              {/* Modern Step Indicator */}
              <div className="flex justify-center">
                <div className="w-full max-w-md">
                  <div className="flex items-start justify-between relative px-8">
                    {/* Background Line */}
                    <div
                      className="absolute top-5 left-8 right-8 h-0.5 bg-gray-200"
                      style={{ zIndex: 0 }}
                    />

                    {/* Progress Line */}
                    <div
                      className="absolute top-5 left-8 h-0.5 bg-gray-900 transition-all duration-300"
                      style={{
                        width: `calc(${((step - 1) / 2) * 100}% - ${
                          ((step - 1) / 2) * 64
                        }px)`,
                        zIndex: 1,
                      }}
                    />

                    {[1, 2, 3].map((stepNumber) => (
                      <div
                        key={stepNumber}
                        className="flex flex-col items-center relative"
                        style={{ zIndex: 2 }}
                      >
                        {/* Step Circle */}
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                            stepNumber < step
                              ? "bg-gray-900 text-white"
                              : stepNumber === step
                              ? "bg-gray-900 text-white ring-4 ring-gray-200"
                              : "bg-white border-2 border-gray-300 text-gray-400"
                          }`}
                        >
                          {stepNumber < step ? (
                            <Check className="w-5 h-5" />
                          ) : (
                            stepNumber
                          )}
                        </div>
                        <span
                          className={`mt-3 text-xs font-medium whitespace-nowrap ${
                            stepNumber <= step
                              ? "text-gray-900"
                              : "text-gray-400"
                          }`}
                        >
                          {stepNumber === 1
                            ? "Service"
                            : stepNumber === 2
                            ? "Date & Time"
                            : "Confirm"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Content Section */}
            <div className="p-6">
              {step === 1 && (
                <ServiceSelection
                  services={mentorData.services}
                  servicePricing={mentorData.service_pricing}
                  suggestedServices={[]}
                  onServiceSelect={handleServiceSelect}
                  averageRating={mentorData.average_rating}
                  totalReviews={mentorData.total_reviews}
                />
              )}

              {step === 2 && selectedService && (
                <DateTimeSelection
                  key="datetime-selection"
                  selectedService={selectedService}
                  mentorId={mentorData.id}
                  timezone={mentorData.timezone}
                  onDateTimeSelect={handleDateTimeSelect}
                />
              )}

              {step === 3 && selectedService && (
                <BookingConfirmation
                  selectedService={selectedService}
                  selectedDateTime={selectedDateTime}
                  mentorName={mentorData.full_name}
                  onSubmit={handleBookingSubmit}
                  onChangeDateTime={() => setStep(2)}
                  isSubmitting={isSubmitting}
                />
              )}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
};

export default BookingPage;
