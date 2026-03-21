import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, X } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import ServiceSelection from "./ServiceSelection";
import DateTimeSelection from "./DateTimeSelection";
import BookingConfirmation from "./BookingConfirmation";
import BookingSuccessModal from "./BookingSuccessModal";
import { createBooking } from "@/services/bookingService";
import { checkBookingLimit } from "@/services/bookingLimitService";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { serviceRequiresScheduling } from "@/config/serviceConfig";

interface BookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mentorId: string;
  mentorName: string;
  mentorImage: string;
  services: any;
  servicePricing: any;
  suggestedServices?: any[]; // Add this prop
  timezone?: string;
  averageRating?: number;
  totalReviews?: number;
  preSelectedDateTime?: SelectedDateTime | null;
}

export type BookingStep = 1 | 2 | 3;

export interface SelectedService {
  type: "oneOnOneSession" | "priorityDm" | "digitalProducts";
  serviceKey?: string;
  name: string;
  duration: number; // in minutes
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
  shareContactInfo?: boolean;
}

const getLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getBookingEmailCopy = (
  serviceType: SelectedService["type"],
  serviceName: string,
  mentorName: string,
  studentName: string
) => {
  if (serviceType === "digitalProducts") {
    return {
      studentSubject: `Digital Product Confirmed: ${serviceName} by ${mentorName}`,
      mentorSubject: `New Digital Product Order: ${serviceName} from ${studentName}`,
      studentHeader: "Digital Product Confirmed",
      mentorHeader: "New Digital Product Order",
      studentIntro: `Your digital product from ${mentorName} is confirmed.`,
      mentorIntro: `You received a new digital product order from ${studentName}.`,
      detailsTitle: "Order Details",
    };
  }

  if (serviceType === "priorityDm") {
    return {
      studentSubject: `Priority DM Confirmed: ${serviceName} with ${mentorName}`,
      mentorSubject: `New Priority DM Request: ${serviceName} from ${studentName}`,
      studentHeader: "Priority DM Confirmed",
      mentorHeader: "New Priority DM Request",
      studentIntro: `Your priority DM request with ${mentorName} is confirmed.`,
      mentorIntro: `You have a new priority DM request from ${studentName}.`,
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
export default function BookingDialog({
  open,
  onOpenChange,
  mentorId,
  mentorName,
  mentorImage,
  services,
  servicePricing,
  suggestedServices = [],
  timezone = "Asia/Kolkata",
  averageRating = 0,
  totalReviews = 0,
  preSelectedDateTime = null,
}: BookingDialogProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<BookingStep>(1);
  const [selectedService, setSelectedService] =
    useState<SelectedService | null>(null);
  const [selectedDateTime, setSelectedDateTime] =
    useState<SelectedDateTime | null>(null);
  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdBooking, setCreatedBooking] = useState<any>(null);
  const [bookingLimitReached, setBookingLimitReached] = useState(false);
  const [bookingLimitInfo, setBookingLimitInfo] = useState<any>(null);

  // Check booking limit when dialog opens
  useEffect(() => {
    if (open) {
      checkBookingLimit(mentorId).then(limitInfo => {
        setBookingLimitInfo(limitInfo);
        setBookingLimitReached(!limitInfo.allowed);
        if (!limitInfo.allowed) {
          toast.warning(limitInfo.message || 'This mentor has reached their weekly booking limit');
        }
      });
    }
  }, [open, mentorId]);

  // Effect to handle pre-selected date/time
  useEffect(() => {
    if (open && preSelectedDateTime) {
      setSelectedDateTime(preSelectedDateTime);
      // If we have a pre-selected date/time, start at step 1 (service selection)
      // After service is selected, it will auto-advance to step 3 (confirmation)
      setStep(1);
    }
  }, [open, preSelectedDateTime]);

  const handleClose = () => {
    // Don't reset state if we have a created booking (success modal will show)
    if (!createdBooking) {
      setStep(1);
      setSelectedService(null);
      // Only reset selectedDateTime if there's no preSelectedDateTime
      if (!preSelectedDateTime) {
        setSelectedDateTime(null);
      }
      setBookingDetails(null);
    }
    onOpenChange(false);
  };

  const handleServiceSelect = (service: SelectedService) => {
    setSelectedService(service);

    const requiresScheduling = serviceRequiresScheduling(service.type);

    if (!requiresScheduling) {
      setStep(3);
    } else {
      // If we already have a pre-selected date/time, skip to confirmation
      if (preSelectedDateTime || selectedDateTime) {
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

  // Function to send confirmation emails
  const sendConfirmationEmails = async (
    bookingData: any,
    studentDetails: BookingDetails,
    serviceDetails: SelectedService
  ) => {
    try {
      const formattedDate = format(
        new Date(bookingData.scheduled_date),
        "EEEE, MMMM d, yyyy"
      );
      const isDigitalProduct = serviceDetails.type === "digitalProducts";
      const digitalProductLink = bookingData.digital_product_link || "";
      const emailCopy = getBookingEmailCopy(
        serviceDetails.type,
        serviceDetails.name,
        mentorName,
        studentDetails.name
      );

      // Check if meeting link exists
      const hasMeetingLink =
        bookingData.meeting_link && bookingData.meeting_link.length > 0;
      const meetingLink = bookingData.meeting_link || "";
      const meetingProvider = bookingData.meeting_provider || "Jitsi Meet";

      // Email to Student
      const studentPrimaryActionUrl = isDigitalProduct
        ? digitalProductLink || `${window.location.origin}/dashboard`
        : hasMeetingLink
        ? meetingLink
        : `${window.location.origin}/dashboard`;
      const studentPrimaryActionLabel = isDigitalProduct
        ? "Access Product"
        : hasMeetingLink
        ? "Join Meeting"
        : "Open Dashboard";

      const studentEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; padding: 0; background-color: #f6f7f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .wrapper { width: 100%; padding: 60px 0; display: flex; justify-content: center; }
    .container { width: 100%; }
    .inner-container { width: 520px; margin: 0 auto; background: #ffffff; border-radius: 10px; padding: 40px; }
    .logo { text-align: center; font-size: 22px; font-weight: 600; color: #000; margin-bottom: 28px; }
    .header { text-align: center; background: #ffffff; margin-bottom: 28px; color: #111; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .subtitle { font-size: 14px; color: #555; margin-top: 12px; line-height: 1.6; }
    .content { background: #ffffff; }
    .content p { font-size: 14px; color: #555; margin-bottom: 18px; line-height: 1.6; }
    .card { background: #f4f5f7; border-radius: 8px; padding: 20px; margin: 30px 0; }
    .card h2 { font-size: 14px; font-weight: 600; margin-bottom: 16px; color: #111; margin-top: 0; }
    .detail-row { font-size: 13px; color: #444; padding: 10px 0; border-bottom: 1px solid #e5e5e5; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { color: #111; font-weight: 600; display: inline-block; min-width: 110px; }
    .detail-value { color: #444; }
    .action-wrap { text-align: center; margin: 36px 0; }
    .action-button { background-color: #000; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 14px; font-weight: 500; display: inline-block; }
    .note { font-size: 13px; color: #666; text-align: center; line-height: 1.6; margin-bottom: 32px; }
    .footer { text-align: center; font-size: 12px; color: #888; margin-top: 12px; background: #ffffff; }
    .link { color: #000; text-decoration: none; font-weight: 500; }
  </style>
</head>
<body>
  <div class="wrapper"><div class="container"><div class="inner-container">
    <div class="logo">MatePeak</div>
    <div class="header">
      <h1>${emailCopy.studentHeader}</h1>
      <div class="subtitle">Your request has been successfully confirmed.</div>
    </div>
    
    <div class="content">
      <p>Hi ${studentDetails.name},</p>
      <p>${emailCopy.studentIntro}</p>
      
      <div class="card">
        <h2 style="color: #111827; font-size: 20px; margin-top: 0;">${emailCopy.detailsTitle}</h2>
        <div class="detail-row">
          <span class="detail-label">Service:&nbsp;</span>
          <span class="detail-value">${serviceDetails.name}</span>
        </div>
        ${
          isDigitalProduct
            ? ""
            : `
        <div class="detail-row">
          <span class="detail-label">Date:&nbsp;</span>
          <span class="detail-value">${formattedDate}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Time:&nbsp;</span>
          <span class="detail-value">${bookingData.scheduled_time} (${
        selectedDateTime?.timezone || timezone
      })</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Duration:&nbsp;</span>
          <span class="detail-value">${serviceDetails.duration} minutes</span>
        </div>
        `
        }
        <div class="detail-row">
          <span class="detail-label">Status:</span>
          <span class="detail-value">Confirmed</span>
        </div>
      </div>
      
      <div class="action-wrap">
        <a href="${studentPrimaryActionUrl}" class="action-button">${studentPrimaryActionLabel}</a>
      </div>

      <p class="note">
        ${
          isDigitalProduct
            ? "Your access details are available now and are also saved in your dashboard."
            : hasMeetingLink
            ? `Use ${meetingProvider} at the scheduled time. We will also send reminder emails before your session.`
            : "Your dashboard has the latest booking details and session updates."
        }
      </p>
    </div>
    
    <div class="footer">
      Need help? <a href="mailto:support@matepeak.com" class="link">Contact Support</a>
    </div>
  </div></div></div>
</body>
</html>
      `;

      // Send email to student
      await supabase.functions.invoke("send-email", {
        body: {
          to: studentDetails.email,
          subject: emailCopy.studentSubject,
          html: studentEmailHtml,
        },
      });

      // Fetch mentor email
      const { data: mentorProfile } = await supabase
        .from("expert_profiles")
        .select("email, full_name")
        .eq("id", mentorId)
        .single();

      if (mentorProfile?.email) {
        // Email to Mentor
        const mentorPrimaryActionUrl = `${window.location.origin}/mentor/dashboard`;
        const mentorEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; padding: 0; background-color: #f6f7f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .wrapper { width: 100%; padding: 60px 0; display: flex; justify-content: center; }
    .container { width: 520px; background: #ffffff; border-radius: 10px; padding: 40px; }
    .logo { text-align: center; font-size: 22px; font-weight: 600; color: #000; margin-bottom: 28px; }
    .header { text-align: center; background: #ffffff; margin-bottom: 28px; color: #111; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .subtitle { font-size: 14px; color: #555; margin-top: 12px; line-height: 1.6; }
    .content { background: #ffffff; }
    .content p { font-size: 14px; color: #555; margin-bottom: 18px; line-height: 1.6; }
    .card { background: #f4f5f7; border-radius: 8px; padding: 20px; margin: 30px 0; }
    .card h2 { font-size: 14px; font-weight: 600; margin-bottom: 16px; color: #111; margin-top: 0; }
    .detail-row { font-size: 13px; color: #444; padding: 10px 0; border-bottom: 1px solid #e5e5e5; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { color: #111; font-weight: 600; display: inline-block; min-width: 110px; }
    .detail-value { color: #444; }
    .message-box { background: #f4f5f7; border-radius: 8px; padding: 20px; margin: 20px 0; color: #555; border: none; }
    .action-wrap { text-align: center; margin: 36px 0; }
    .action-button { background-color: #000; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 14px; font-weight: 500; display: inline-block; }
    .note { font-size: 13px; color: #666; text-align: center; line-height: 1.6; margin-bottom: 32px; }
    .footer { text-align: center; font-size: 12px; color: #888; margin-top: 12px; background: #ffffff; }
    .link { color: #000; text-decoration: none; font-weight: 500; }
  </style>
</head>
<body>
  <div class="wrapper"><div class="container">
    <div class="logo">MatePeak</div>
    <div class="header">
      <h1>${emailCopy.mentorHeader}</h1>
      <div class="subtitle">A new booking has been confirmed on MatePeak.</div>
    </div>
    
    <div class="content">
      <p>Hi ${mentorProfile.full_name || "there"},</p>
      <p>${emailCopy.mentorIntro}</p>
      
      <div class="card">
        <h2 style="color: #111827; font-size: 20px; margin-top: 0;">${emailCopy.detailsTitle}</h2>
        <div class="detail-row">
          <span class="detail-label">Student:&nbsp;</span>
          <span class="detail-value">${studentDetails.name}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Service:&nbsp;</span>
          <span class="detail-value">${serviceDetails.name}</span>
        </div>
        ${
          isDigitalProduct
            ? ""
            : `
        <div class="detail-row">
          <span class="detail-label">Date:&nbsp;</span>
          <span class="detail-value">${formattedDate}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Time:&nbsp;</span>
          <span class="detail-value">${bookingData.scheduled_time} (${
          selectedDateTime?.timezone || timezone
        })</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Duration:&nbsp;</span>
          <span class="detail-value">${serviceDetails.duration} minutes</span>
        </div>
        `
        }
      </div>
      
      ${
        studentDetails.purpose
          ? `
      <div class="message-box">
        <strong>Student Goal:</strong><br>
        ${studentDetails.purpose}
      </div>
      `
          : ""
      }

      <div class="action-wrap">
        <a href="${mentorPrimaryActionUrl}" class="action-button">Open Mentor Dashboard</a>
      </div>

      <p class="note">
        ${
          isDigitalProduct
            ? "Keep your product link active and follow up with the student if needed."
            : hasMeetingLink
            ? `Use ${meetingProvider} at the scheduled time. The meeting link is already available in your booking.`
            : "Review the full booking details and next steps from your dashboard."
        }
      </p>
    </div>
    
    <div class="footer">
      Need help? <a href="mailto:support@matepeak.com" class="link">Contact Support</a>
    </div>
  </div></div>
</body>
</html>
        `;

        // Send email to mentor
        await supabase.functions.invoke("send-email", {
          body: {
            to: mentorProfile.email,
            subject: emailCopy.mentorSubject,
            html: mentorEmailHtml,
          },
        });
      }

      console.log("Confirmation emails sent successfully");
    } catch (error) {
      console.error("Failed to send confirmation emails:", error);
      // Don't fail the booking if email fails
    }
  };

  const handleBookingSubmit = async (details: BookingDetails) => {
    if (!selectedService) return;

    setIsSubmitting(true);
    setBookingDetails(details);

    try {
      const recordingPrice = details.addRecording ? 300 : 0;
      const totalAmount = selectedService.price + recordingPrice;

      // For services without date/time, use immediate/null values
      let scheduledDate = null;
      let scheduledTime = null;

      if (selectedDateTime) {
        scheduledDate = getLocalDateString(selectedDateTime.date);
        scheduledTime = selectedDateTime.time;
      } else {
        // For non-scheduled services, use local today as placeholder booking date.
        scheduledDate = getLocalDateString(new Date());
        scheduledTime = "00:00"; // Placeholder time
      }

      const bookingData = {
        expert_id: mentorId,
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
        // Store booking data for success modal
        setCreatedBooking(result.data);
        console.log("Booking created successfully:", result.data);

        // Send confirmation emails (async, don't wait)
        sendConfirmationEmails(result.data, details, selectedService);

        // Close booking dialog immediately
        handleClose();
        console.log("Booking dialog closed");

        // Show success modal after dialog animation completes (600ms for smooth transition)
        setTimeout(() => {
          console.log("Showing success modal");
          setShowSuccessModal(true);
        }, 600);
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

  const handleBack = () => {
    if (step === 3 && selectedService) {
      const needsDateTime = serviceRequiresScheduling(selectedService.type);

      if (needsDateTime) {
        // Go back to step 2 (date/time selection)
        setStep(2);
      } else {
        // Skip step 2 and go directly to step 1 (service selection)
        setStep(1);
      }
    } else if (step === 2) {
      // From step 2, always go back to step 1
      setStep(1);
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1:
        return `Book a Session with ${mentorName}`;
      case 2:
        return "Select Date & Time";
      case 3:
        if (selectedService?.type === "digitalProducts") {
          return "Complete Purchase";
        } else if (selectedService?.type === "priorityDm") {
          return "Priority DM";
        }
        return "Confirm Booking";
      default:
        return "Book a Session";
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange} modal>
        <DialogContent
          className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto p-0 gap-0"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          {/* Header */}
          <DialogHeader className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center gap-3">
              {step > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  className="h-8 w-8 p-0 rounded-full hover:bg-gray-100"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}

              {step === 1 && mentorImage && (
                <img
                  src={mentorImage}
                  alt={mentorName}
                  className="h-10 w-10 rounded-full object-cover"
                />
              )}

              <DialogTitle className="text-xl font-bold text-gray-900 flex-1">
                {getStepTitle()}
              </DialogTitle>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-8 w-8 p-0 rounded-full hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          {/* Booking Limit Warning */}
          {bookingLimitReached && bookingLimitInfo && (
            <div className="mx-6 mt-4 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-yellow-900 mb-1">Weekly Booking Limit Reached</h4>
                  <p className="text-sm text-yellow-800 mb-2">
                    This mentor has reached their limit of {bookingLimitInfo.maxBookings} bookings this week ({bookingLimitInfo.currentBookings}/{bookingLimitInfo.maxBookings} booked).
                  </p>
                  <p className="text-xs text-yellow-700">
                    {bookingLimitInfo.tier === 'basic' && 'Basic mentors can accept up to 5 bookings per week. '}
                    {bookingLimitInfo.tier === 'verified' && 'Verified mentors can accept up to 15 bookings per week. '}
                    Please try again next week or browse other mentors.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="px-6 py-6">
            {step === 1 && (
              <ServiceSelection
                servicePricing={servicePricing}
                onServiceSelect={handleServiceSelect}
                averageRating={averageRating}
                totalReviews={totalReviews}
              />
            )}

            {step === 2 && selectedService && (
              <DateTimeSelection
                key={`datetime-${step}`} // Force remount to clear cache and fetch fresh availability
                selectedService={selectedService}
                mentorId={mentorId}
                timezone={timezone}
                onDateTimeSelect={handleDateTimeSelect}
              />
            )}

            {step === 3 && selectedService && (
              <BookingConfirmation
                selectedService={selectedService}
                selectedDateTime={selectedDateTime}
                mentorName={mentorName}
                onSubmit={handleBookingSubmit}
                onChangeDateTime={() => setStep(2)}
                isSubmitting={isSubmitting}
                bookingLimitReached={bookingLimitReached}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Modal - Separate from booking dialog */}
      {console.log("Success Modal Check:", {
        showSuccessModal,
        hasCreatedBooking: !!createdBooking,
        hasBookingDetails: !!bookingDetails,
        hasSelectedService: !!selectedService,
        shouldRender: !!(
          showSuccessModal &&
          createdBooking &&
          bookingDetails &&
          selectedService
        ),
      })}
      {showSuccessModal &&
        createdBooking &&
        bookingDetails &&
        selectedService && (
          <BookingSuccessModal
            open={showSuccessModal}
            onClose={() => {
              setShowSuccessModal(false);
              setCreatedBooking(null);
              // Reset all booking state
              setStep(1);
              setSelectedService(null);
              setSelectedDateTime(null);
              setBookingDetails(null);
            }}
            bookingDetails={{
              mentorName,
              serviceName: selectedService.name,
              serviceType: selectedService.type,
              date: createdBooking.scheduled_date,
              time: createdBooking.scheduled_time,
              timezone: selectedDateTime?.timezone || timezone,
              duration: selectedService.duration,
              userEmail: bookingDetails.email,
              digitalProductLink: createdBooking.digital_product_link,
            }}
            onViewBookings={() => {
              setShowSuccessModal(false);
              setCreatedBooking(null);
              // Reset all booking state
              setStep(1);
              setSelectedService(null);
              setSelectedDateTime(null);
              setBookingDetails(null);
              navigate("/dashboard");
            }}
          />
        )}
    </>
  );
}
