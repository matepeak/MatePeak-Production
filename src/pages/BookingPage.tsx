import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, AlertCircle, Home, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { createBooking } from "@/services/bookingService";
import { paymentService } from "@/services/paymentService";
import { createPriorityDm } from "@/services/priorityDmService";
import { format } from "date-fns";
import {
  normalizeServiceType,
  serviceRequiresScheduling,
} from "@/config/serviceConfig";
import Navbar from "@/components/Navbar";
import ServiceSelection from "@/components/booking/ServiceSelection";
import DateTimeSelection from "@/components/booking/DateTimeSelection";
import BookingConfirmation from "@/components/booking/BookingConfirmation";

export type BookingStep = 1 | 2 | 3;

export interface SelectedService {
  type: "oneOnOneSession" | "priorityDm" | "digitalProducts";
  serviceKey?: string;
  name: string;
  duration: number;
  price: number;
  discountPrice?: number;
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
  shareContactInfo?: boolean;
}

interface MentorData {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string;
  timezone: string;
  service_pricing: any; // Unified service_pricing structure
  average_rating: number;
  total_reviews: number;
}

const getLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatTime24 = (timeValue?: string) => {
  const source = String(timeValue || "");
  const parts = source.split(":");
  if (parts.length >= 2) {
    return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
  }
  return source;
};

const getBookingEmailCopy = (
  serviceType: SelectedService["type"],
  serviceName: string,
  mentorName: string,
  studentName: string
) => {
  if (serviceType === "digitalProducts") {
    return {
      studentSubject: `Digital Product Received: ${serviceName} by ${mentorName}`,
      mentorSubject: `Digital Product Order Received: ${serviceName} from ${studentName}`,
      studentHeader: "Digital Product Received",
      mentorHeader: "Digital Product Order Received",
      studentIntro: `Your digital product from ${mentorName} is ready to access.`,
      mentorIntro: `You received a new digital product order from ${studentName}.`,
      detailsTitle: "Order Details",
    };
  }

  if (serviceType === "priorityDm") {
    return {
      studentSubject: `Priority DM Received: ${serviceName} with ${mentorName}`,
      mentorSubject: `Priority DM Received: ${serviceName} from ${studentName}`,
      studentHeader: "Priority DM Received",
      mentorHeader: "Priority DM Received",
      studentIntro: `Your priority DM request with ${mentorName} was received.`,
      mentorIntro: `You received a new priority DM request from ${studentName}.`,
      detailsTitle: "Request Details",
    };
  }

  return {
    studentSubject: `Session Confirmed: ${serviceName} with ${mentorName}`,
    mentorSubject: `New Session Scheduled: ${serviceName} with ${studentName}`,
    studentHeader: "Session Confirmed",
    mentorHeader: "New Session Scheduled",
    studentIntro: `Your session with ${mentorName} is confirmed.`,
    mentorIntro: `You have a new session scheduled with ${studentName}.`,
    detailsTitle: "Session Details",
  };
};

const BookingPage = () => {
  const isServiceEnabled = (value: any) =>
    value === true || value === "true" || value === 1 || value === "1";

  const [searchParams] = useSearchParams();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Support both query params (?mentorId=X) and URL params (/book/:id)
  const mentorId = searchParams.get("mentorId") || id;
  const preSelectedServiceId = searchParams.get("serviceId");
  const preSelectedDate = searchParams.get("date");
  const preSelectedTime = searchParams.get("time");
  const preSelectedTimezone = searchParams.get("timezone");
  const isAvailabilityFlow = Boolean(
    preSelectedDate && preSelectedTime && preSelectedTimezone
  );

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

        // Prevent self-booking
        if (mentorId && session.user.id === mentorId) {
          toast.error("You cannot book your own services");
          navigate("/mentor/dashboard");
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
          .eq("expert_id", mentorId);

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
          service_pricing: mentor.service_pricing || {},
          average_rating: averageRating,
          total_reviews: totalReviews,
        });

        // If serviceId is provided, auto-select the service
        // For availability flow, only oneOnOneSession is allowed.
        if (
          preSelectedServiceId &&
          mentor.service_pricing &&
          (!isAvailabilityFlow || preSelectedServiceId === "oneOnOneSession")
        ) {
          const serviceData = mentor.service_pricing[preSelectedServiceId];
          const normalizedServiceType =
            normalizeServiceType(serviceData?.type || "") ||
            normalizeServiceType(preSelectedServiceId);
          if (isServiceEnabled(serviceData?.enabled)) {
            // Use the exact price set by the mentor (even if it's 0)
            const actualPrice = serviceData.price !== undefined && serviceData.price !== null ? serviceData.price : 0;

            setSelectedService({
              type: normalizedServiceType || "oneOnOneSession",
              serviceKey: preSelectedServiceId,
              name: serviceData.name || preSelectedServiceId,
              duration: serviceData.duration || (normalizedServiceType === "oneOnOneSession" ? 60 : 30),
              price: actualPrice,
              discountPrice: serviceData.discount_price ?? undefined,
              hasFreeDemo: serviceData.hasFreeDemo || false,
            });

            // Auto-advance to appropriate step based on SERVICE_CONFIG
            const requiresScheduling = serviceRequiresScheduling(
              normalizedServiceType || preSelectedServiceId
            );
            
            if (requiresScheduling) {
              setStep(2); // Date/time selection needed
            } else {
              setStep(3); // Skip to confirmation for non-scheduled services
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

    // Check if the service requires scheduling using SERVICE_CONFIG
    const requiresScheduling = serviceRequiresScheduling(service.type);

    // If service doesn't require scheduling (digitalProducts, priorityDm), skip directly to confirmation
    if (!requiresScheduling) {
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    if (step === 3 && selectedService) {
      // Check if service requires scheduling
      const requiresScheduling = serviceRequiresScheduling(selectedService.type);
      setStep(requiresScheduling ? 2 : 1);
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
      const emailCopy = getBookingEmailCopy(
        serviceDetails.type,
        serviceDetails.name,
        mentorName,
        studentDetails.name
      );
      const requiresScheduling = serviceRequiresScheduling(serviceDetails.type);
      const isDigitalProduct = serviceDetails.type === "digitalProducts";

      const hasMeetingLink =
        bookingData.meeting_link && bookingData.meeting_link.trim() !== "";
      const meetingLink = bookingData.meeting_link || "#";
      const digitalProductLink =
        typeof bookingData.digital_product_link === "string" &&
        bookingData.digital_product_link.trim().length > 0
          ? bookingData.digital_product_link.trim()
          : "";
      const meetingProvider =
        bookingData.meeting_provider || "your preferred platform";
      const timezoneLabel = selectedDateTime?.timezone || mentorData?.timezone || "IST";

      // Email to Student
      const studentEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f6f7f9; }
    .container { width: 100%; background-color: #e9ebed; padding: 48px 16px; }
    .inner-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; }
    .header { background: #ffffff; color: #111827; padding: 24px 32px; text-align: center; border-bottom: 1px solid #e5e7eb; }
    .content { padding: 32px; }
    .card { background-color: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .detail-row { padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
    .detail-label { color: #6b7280; font-weight: 600; display: inline-block; min-width: 110px; margin-right: 12px; }
    .detail-value { color: #111827; font-weight: 600; }
    .meeting-box { background: #f9fafb; color: #111827; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin: 20px 0; text-align: center; }
    .meeting-button { display: inline-block; background-color: #222222; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 12px 0; }
    .footer { background-color: #ffffff; padding: 24px; text-align: center; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="inner-container">
    <div class="header">
      <img src="https://wpltqdlvrzukghiwvxqd.supabase.co/storage/v1/object/public/avatars/lovable-uploads/MatePeak_logo_with_name.png" alt="MatePeak" style="height: 40px; margin-bottom: 16px;" />
      <h1 style="margin: 0; font-size: 28px;">${emailCopy.studentHeader}</h1>
    </div>
    
    <div class="content">
      <p style="color: #111827; font-size: 16px;">Hi ${studentDetails.name},</p>
      <p style="color: #6b7280; font-size: 14px;">${emailCopy.studentIntro}</p>
      
      <div class="card">
        <h3 style="color: #111827; margin-top: 0;">${emailCopy.detailsTitle}</h3>
        <div class="detail-row">
          <span class="detail-label">Mentor:&nbsp;</span>
          <span class="detail-value">${mentorName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Service:&nbsp;</span>
          <span class="detail-value">${serviceDetails.name}</span>
        </div>
        ${
          requiresScheduling
            ? `
        <div class="detail-row">
          <span class="detail-label">Date:&nbsp;</span>
          <span class="detail-value">${formattedDate}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Schedule:&nbsp;</span>
          <span class="detail-value">${formatTime24(bookingData.scheduled_time)} (${timezoneLabel})</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Duration:&nbsp;</span>
          <span class="detail-value">${serviceDetails.duration} minutes</span>
        </div>
        `
            : ""
        }
      </div>
      
      ${
        requiresScheduling && hasMeetingLink
          ? `
      <div class="meeting-box">
        <h3 style="color: #111827; margin-top: 0;">Video Meeting Link</h3>
        <p style="opacity: 0.9; font-size: 14px; margin: 8px 0;">Join the session using ${meetingProvider}</p>
        <a href="${meetingLink}" class="meeting-button">Open Meeting Link</a>
        <p style="opacity: 0.8; font-size: 12px; margin: 16px 0 0 0;">
          Click the button above when it's time for your session.
        </p>
        <p style="opacity: 0.9; font-size: 13px; margin: 12px 0 0 0; word-break: break-all;">
          Meeting link: <a href="${meetingLink}">${meetingLink}</a>
        </p>
      </div>
      `
          : ""
      }

      ${
        isDigitalProduct && digitalProductLink
          ? `
      <div class="meeting-box" style="text-align: left;">
        <h3 style="color: #111827; margin-top: 0;">Access Your Product</h3>
        <a href="${digitalProductLink}" class="meeting-button" style="display: inline-block;">Access Product</a>
        <p style="opacity: 0.9; font-size: 13px; margin: 16px 0 0 0; word-break: break-all;">
          Product link: <a href="${digitalProductLink}">${digitalProductLink}</a>
        </p>
      </div>
      `
          : ""
      }
    </div>
    
    <div class="footer">
      <p>Need help? <a href="mailto:support@matepeak.com">Contact Support</a></p>
    </div>
    </div>
  </div>
</body>
</html>
      `;

      await supabase.functions.invoke("send-email", {
        body: {
          to: studentDetails.email,
          subject: emailCopy.studentSubject,
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
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f6f7f9; }
    .container { width: 100%; background-color: #e9ebed; padding: 48px 16px; }
    .inner-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; }
    .header { background-color: #ffffff; color: #111827; padding: 24px 32px; text-align: center; border-bottom: 1px solid #e5e7eb; }
    .content { padding: 32px; }
    .card { background-color: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .detail-row { padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
    .detail-label { color: #6b7280; font-weight: 600; display: inline-block; min-width: 110px; margin-right: 12px; }
    .detail-value { color: #111827; font-weight: 600; }
    .footer { background-color: #ffffff; padding: 24px; text-align: center; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="inner-container">
    <div class="header">
      <img src="https://wpltqdlvrzukghiwvxqd.supabase.co/storage/v1/object/public/avatars/lovable-uploads/MatePeak_logo_with_name.png" alt="MatePeak" style="height: 40px; margin-bottom: 16px;" />
      <h1 style="margin: 0; font-size: 28px;">${emailCopy.mentorHeader}</h1>
    </div>
    
    <div class="content">
      <p style="color: #111827; font-size: 16px;">Hi ${mentorName},</p>
      <p style="color: #6b7280; font-size: 14px;">${emailCopy.mentorIntro}</p>
      
      <div class="card">
        <h3 style="color: #111827; margin-top: 0;">${emailCopy.detailsTitle}</h3>
        <div class="detail-row">
          <span class="detail-label">Student:&nbsp;</span>
          <span class="detail-value">${studentDetails.name}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Email:&nbsp;</span>
          <span class="detail-value">${studentDetails.email}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Service:&nbsp;</span>
          <span class="detail-value">${serviceDetails.name}</span>
        </div>
        ${
          requiresScheduling
            ? `
        <div class="detail-row">
          <span class="detail-label">Date:&nbsp;</span>
          <span class="detail-value">${formattedDate}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Schedule:&nbsp;</span>
          <span class="detail-value">${formatTime24(bookingData.scheduled_time)} (${timezoneLabel})</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Duration:&nbsp;</span>
          <span class="detail-value">${serviceDetails.duration} minutes</span>
        </div>
        `
            : ""
        }
        ${
          studentDetails.purpose
            ? `
        <div class="detail-row">
          <span class="detail-label">${serviceDetails.type === "priorityDm" ? "Student Message:" : "Student Goal:"}&nbsp;</span>
          <span class="detail-value">${studentDetails.purpose}</span>
        </div>
        `
            : ""
        }
      </div>
    </div>
    
    <div class="footer">
      <p><a href="${window.location.origin}/mentor/dashboard">Go to Dashboard</a></p>
    </div>
    </div>
  </div>
</body>
</html>
        `;

        await supabase.functions.invoke("send-email", {
          body: {
            to: mentorProfile.email,
            subject: emailCopy.mentorSubject,
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

    const asErrorMessage = (value: unknown, fallback: string) => {
      if (typeof value === "string" && value.trim().length > 0) return value;
      if (value && typeof value === "object") {
        const maybeMessage = (value as any).message;
        if (typeof maybeMessage === "string" && maybeMessage.trim().length > 0) {
          return maybeMessage;
        }
        try {
          return JSON.stringify(value);
        } catch {
          return fallback;
        }
      }
      return fallback;
    };

    try {
      setIsSubmitting(true);

      const recordingPrice = details.addRecording ? 500 : 0;
      const baseServicePrice = selectedService.discountPrice ?? selectedService.price;
      const totalAmount = baseServicePrice + recordingPrice;

      let scheduledDate = null;
      let scheduledTime = null;

      if (selectedDateTime) {
        scheduledDate = getLocalDateString(selectedDateTime.date);
        scheduledTime = selectedDateTime.time;
      } else {
        // Non-scheduled services still need a valid date field; use local today.
        scheduledDate = getLocalDateString(new Date());
        scheduledTime = "00:00";
      }

      const bookingData = {
        expert_id: mentorId!,
        session_type: selectedService.type,
        service_key: selectedService.serviceKey,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
        duration:
          selectedService.type === "oneOnOneSession"
            ? selectedService.duration
            : selectedService.duration > 0
            ? selectedService.duration
            : 30,
        message: details.purpose,
        total_amount: totalAmount,
        user_name: details.name,
        user_email: details.email,
        user_phone: details.phone,
        add_recording: details.addRecording,
      };

      const result = await createBooking(bookingData);

      if (result.success) {
        const shouldRedirectToPayment = totalAmount > 0;

        if (shouldRedirectToPayment) {
          const bookingId = result.data.id as string;

          const orderResult = await paymentService.createOrder(totalAmount, bookingId);
          if (!orderResult.success || !orderResult.order || !orderResult.razorpayKey) {
            console.error("createOrder failed:", orderResult);
            toast.error(asErrorMessage(orderResult.error, "Failed to initialize payment"));
            return;
          }

          try {
            const paymentResponse = await paymentService.openCheckout({
              key: orderResult.razorpayKey,
              order: orderResult.order,
              bookingId,
              customerName: details.name,
              customerEmail: details.email,
              customerPhone: details.phone,
              description: `${selectedService.name} with ${mentorData.full_name}`,
            });

            const verifyResult = await paymentService.verifyPayment(
              bookingId,
              paymentResponse
            );

            if (!verifyResult.success) {
              console.error("verifyPayment failed:", verifyResult);
              toast.error(asErrorMessage(verifyResult.error, "Payment verification failed"));
              return;
            }

            if (verifyResult.data?.booking_status !== "confirmed") {
              toast.error("Payment verified but booking is not confirmed yet. Please retry.");
              return;
            }

            if (verifyResult.data?.payment_success_email_status === "failed") {
              const emailError =
                verifyResult.data?.payment_success_email_result?.message ||
                "Payment succeeded but confirmation email could not be sent.";
              console.error("Payment success email failed:", verifyResult.data?.payment_success_email_result);
              toast.warning(emailError);
            }

            toast.success("Payment successful! Booking confirmed.");
            navigate(`/booking/confirmed/${bookingId}`, {
              state: { accessToken: btoa(`${bookingId}:${Date.now()}`) },
              replace: true,
            });
            return;
          } catch (paymentError: any) {
            console.error("Payment flow exception:", paymentError);
            await paymentService.markPaymentFailed(bookingId);
            toast.error(asErrorMessage(paymentError, "Payment cancelled or failed"));
            return;
          }
        }

        // Send confirmation emails (async, don't wait)
        sendConfirmationEmails(
          result.data,
          details,
          selectedService,
          mentorData.full_name
        );

        // Create Priority DM thread for Priority DM service type
        if (selectedService.type === "priorityDm") {
          const dmResult = await createPriorityDm({
            mentorId: mentorId!,
            messageText: details.purpose,
            shareContactInfo: details.shareContactInfo ?? false,
            bookingId: result.data.id,
          });
          if (!dmResult.success) {
            toast.error("Booking created but Priority DM failed: " + dmResult.error);
          }
        }

        // Redirect to confirmation page
        navigate(`/booking/confirmed/${result.data.id}`, {
          state: { accessToken: btoa(`${result.data.id}:${Date.now()}`) },
          replace: true,
        });
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
        if (selectedService?.type === "priorityDm") return "Priority DM";
        return "Confirm Booking";
      default:
        return "Book a Session";
    }
  };

  const isDigitalProductFlow = selectedService?.type === "digitalProducts";
  const showStepTracking = selectedService?.type !== "priorityDm" && !isDigitalProductFlow;

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
                  {showStepTracking && (
                    <p className="text-gray-500 mt-1 text-sm font-medium">
                      {selectedService?.type === "priorityDm"
                        ? `Step ${step === 3 ? 2 : step} of 2`
                        : `Step ${step} of 3`}
                    </p>
                  )}
                </div>
              </div>

              {/* Modern Step Indicator - hidden for Priority DM (2-step, no date/time) */}
              {showStepTracking && (
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
                      className="absolute top-5 left-8 h-0.5 bg-green-600 transition-all duration-300"
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
                              ? "bg-green-600 text-white"
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
                            stepNumber < step
                              ? "text-green-600"
                              : stepNumber === step
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
              )}
            </div>

            {/* Content Section */}
            <div className="p-6">
              {step === 1 && (
                <ServiceSelection
                  servicePricing={mentorData.service_pricing}
                  onServiceSelect={handleServiceSelect}
                  averageRating={mentorData.average_rating}
                  totalReviews={mentorData.total_reviews}
                  oneOnOneOnly={isAvailabilityFlow}
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
