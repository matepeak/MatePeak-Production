import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  Loader2,
  Smartphone,
  CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type {
  SelectedService,
  SelectedDateTime,
  BookingDetails,
} from "./BookingDialog";
import { supabase } from "@/integrations/supabase/client";
import {
  validateBookingMessage,
  isValidEmail,
  sanitizeInput,
} from "@/utils/inputSanitization";
import { toast } from "sonner";

interface BookingConfirmationProps {
  selectedService: SelectedService;
  selectedDateTime: SelectedDateTime | null;
  mentorName: string;
  onSubmit: (details: BookingDetails) => void;
  onChangeDateTime: () => void;
  isSubmitting?: boolean;
  bookingLimitReached?: boolean;
}

export default function BookingConfirmation({
  selectedService,
  selectedDateTime,
  mentorName,
  onSubmit,
  onChangeDateTime,
  isSubmitting = false,
  bookingLimitReached = false,
}: BookingConfirmationProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [purpose, setPurpose] = useState("");
  const [showOrderSummary, setShowOrderSummary] = useState(false);
  const [shareContactInfo, setShareContactInfo] = useState(false);

  // Pre-fill user data if logged in
  useEffect(() => {
    const fetchUserData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setEmail(user.email || "");

        // Fetch profile data for name
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();

        if (profile?.full_name) {
          setName(profile.full_name);
        }
      }
    };

    fetchUserData();
  }, []);

  const basePrice = selectedService.price;
  const total = basePrice;
  const isFreeBooking = total <= 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate inputs
    const sanitizedName = sanitizeInput(name);
    const sanitizedEmail = email.trim();
    const sanitizedPhone = sanitizeInput(phone);

    if (!sanitizedName || sanitizedName.length < 2) {
      toast.error("Please enter a valid name (minimum 2 characters)");
      return;
    }

    if (!sanitizedEmail || !isValidEmail(sanitizedEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    // Validate purpose/message
    const messageValidation = validateBookingMessage(purpose);
    if (!messageValidation.valid) {
      toast.error(messageValidation.error || "Please provide a valid message");
      return;
    }

    onSubmit({
      name: sanitizedName,
      email: sanitizedEmail,
      phone: sanitizedPhone,
      purpose: messageValidation.sanitized!,
      addRecording: false,
      shareContactInfo,
    });
  };

  const isFormValid = name && email && purpose;

  // Check if this service type needs date/time
  const needsDateTime = selectedService.type === "oneOnOneSession";

  // Determine the appropriate label for purpose field
  const getPurposeLabel = () => {
    switch (selectedService.type) {
      case "priorityDm":
        return "What would you like to discuss?";
      case "digitalProducts":
        return "What are you looking to achieve with this product?";
      default:
        return "What is the call about?";
    }
  };

  const getSubmitButtonText = () => {
    if (isSubmitting) return "Processing...";
    if (isFreeBooking) return "Confirm Booking (FREE)";
    return `Proceed to Payment (Rs. ${total.toLocaleString("en-IN")})`;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-1.5">
          {selectedService.type === "priorityDm" ? "Send Your Priority DM" : "Confirm Your Booking"}
        </h3>
        <p className="text-sm text-gray-600">
          {selectedService.type === "priorityDm"
            ? "Your message goes directly to the mentor — expect a reply within 24 hours"
            : "Review your details and complete your booking"}
        </p>
      </div>

      {/* Service & DateTime Summary */}
      <div className="bg-gray-100 rounded-2xl p-5 border-0 shadow-sm">
        {/* Service Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h4 className="font-bold text-gray-900 text-base mb-1.5">
              {selectedService.name}
            </h4>
            <p className="text-sm text-gray-600 font-medium">
              {selectedService.type === "oneOnOneSession" &&
                `Video Call • ${selectedService.duration} mins`}
              {selectedService.type === "priorityDm" &&
                "Text-based Mentoring Session"}
              {selectedService.type === "digitalProducts" && "Digital Download"}
            </p>
          </div>
          {isFreeBooking ? (
            <div className="bg-green-500 text-white rounded-xl px-4 py-2 shadow-sm">
              <p className="text-xl font-bold">FREE</p>
              <p className="text-xs opacity-90">No payment required</p>
            </div>
          ) : (
            <div className="bg-gray-900 text-white rounded-xl px-4 py-2 shadow-sm">
              <p className="text-xl font-bold">Rs. {total.toLocaleString("en-IN")}</p>
              <p className="text-xs opacity-90">Payable now</p>
            </div>
          )}
        </div>

        {needsDateTime && selectedDateTime && (
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="space-y-2">
              {/* Date */}
              <div className="flex items-center gap-2.5 text-sm">
                <Calendar className="h-4 w-4 text-gray-600" />
                <span className="font-semibold text-gray-900">
                  {format(selectedDateTime.date, "EEE, d MMM yyyy")}
                </span>
              </div>
              {/* Time */}
              <div className="flex items-center gap-2.5 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span className="font-medium">
                  {selectedDateTime.time} ({selectedDateTime.timezone})
                </span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onChangeDateTime}
              className="text-xs font-semibold rounded-lg border-gray-300 hover:bg-gray-900 hover:text-white px-3 py-1.5 h-auto"
            >
              Change
            </Button>
          </div>
        )}
      </div>

      {/* User Details Form */}
      <div className="bg-gray-100 rounded-2xl p-5 border-0 shadow-sm">
        <h4 className="font-bold text-gray-900 text-base mb-4">Your Details</h4>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-sm font-medium text-gray-900">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="mt-1.5"
              required
            />
          </div>

          <div>
            <Label
              htmlFor="email"
              className="text-sm font-medium text-gray-900"
            >
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="mt-1.5"
              required
            />
            <p className="text-xs text-gray-500 mt-1.5">
              Please confirm your email address. All session confirmations,
              reminders, and notifications will be sent here.
            </p>
          </div>

          <div>
            <Label
              htmlFor="purpose"
              className="text-sm font-medium text-gray-900"
            >
              {getPurposeLabel()}
            </Label>
            <Textarea
              id="purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder={
                selectedService.type === "priorityDm"
                  ? "Briefly describe what you'd like to discuss in the chat..."
                  : selectedService.type === "digitalProducts"
                  ? "Tell us about your goals..."
                  : "Briefly describe what you'd like to discuss"
              }
              className="mt-1.5 min-h-[120px]"
              required
            />
          </div>

          {selectedService.type === "priorityDm" && (
            <div className="flex items-start gap-3 pt-1">
              <input
                id="share-contact-info"
                type="checkbox"
                checked={shareContactInfo}
                onChange={(e) => setShareContactInfo(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-green-600 cursor-pointer"
              />
              <Label
                htmlFor="share-contact-info"
                className="text-sm text-gray-700 font-normal cursor-pointer leading-snug"
              >
                Share my contact info (email &amp; phone) with the mentor so they can follow up directly
              </Label>
            </div>
          )}
        </div>
      </div>

      {/* Receive booking details on phone - Coming soon */}
      {selectedService.type === "oneOnOneSession" && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Smartphone className="h-4 w-4 flex-shrink-0" />
          <p>
            Receive booking details on phone{" "}
            <span className="font-light text-gray-500">
              (coming soon! we are working on it)
            </span>
          </p>
        </div>
      )}

      {/* Price Summary */}
      <div className="bg-gray-100 rounded-2xl p-5 border-0 shadow-sm">
        {/* Price Header */}
        <div className="flex items-center justify-between mb-1">
          <h4 className="font-bold text-gray-900 text-base">Order Summary</h4>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowOrderSummary(!showOrderSummary)}
            className="text-sm font-medium hover:bg-white rounded-lg"
          >
            {showOrderSummary ? "Hide" : "View Details"}
            {showOrderSummary ? (
              <ChevronUp className="ml-1.5 h-4 w-4" />
            ) : (
              <ChevronDown className="ml-1.5 h-4 w-4" />
            )}
          </Button>
        </div>

        {showOrderSummary && (
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 font-medium">1 × {selectedService.name}</span>
              <span className="font-semibold text-gray-900">
                Rs. {basePrice.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="pt-3 border-t border-gray-300 flex justify-between items-center">
              <span className="font-bold text-gray-900 text-base">Total</span>
              <div className="text-right">
                <span
                  className={`font-bold text-2xl ${
                    isFreeBooking ? "text-green-600" : "text-gray-900"
                  }`}
                >
                  {isFreeBooking
                    ? "FREE"
                    : `Rs. ${total.toLocaleString("en-IN")}`}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex justify-center">
        <Button
          type="submit"
          disabled={!isFormValid || isSubmitting || bookingLimitReached}
          className="group/confirm bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-2.5 px-8 text-sm font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
          title={bookingLimitReached ? "This mentor has reached their weekly booking limit" : undefined}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4 transition-transform duration-300 ease-out group-hover/confirm:scale-110" />
              {getSubmitButtonText()}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
