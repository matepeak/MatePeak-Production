import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Calendar,
  Clock,
  CheckCircle2,
  Mail,
  ArrowRight,
  User,
  Video,
  X,
} from "lucide-react";
import { format } from "date-fns";

interface BookingSuccessModalProps {
  open: boolean;
  onClose: () => void;
  bookingDetails: {
    mentorName: string;
    serviceName: string;
    serviceType?: string;
    date: string;
    time: string;
    timezone?: string;
    duration: number;
    userEmail: string;
    digitalProductLink?: string;
  };
  onViewBookings: () => void;
}

export default function BookingSuccessModal({
  open,
  onClose,
  bookingDetails,
  onViewBookings,
}: BookingSuccessModalProps) {
  const isDigitalProduct = bookingDetails.serviceType === "digitalProducts";

  const formattedDate = bookingDetails.date
    ? format(new Date(bookingDetails.date), "EEEE, MMMM d, yyyy")
    : "";

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        // Only allow closing via explicit button clicks, not backdrop or ESC
        if (!open) return;
      }}
    >
      <DialogContent
        className="sm:max-w-[540px] max-h-[90vh] p-0 border-0 rounded-3xl shadow-2xl my-4 flex flex-col overflow-hidden focus-visible:outline-none"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Custom Close Button */}
        <DialogPrimitive.Close className="absolute right-5 top-5 z-20 rounded-lg bg-white/10 hover:bg-white/20 p-1.5 transition-colors focus:outline-none text-white">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>

        {/* Success Header - Clean & Professional */}
        <div className="bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 px-8 py-8 text-center relative overflow-hidden flex-shrink-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_50%)]" />
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/95 rounded-2xl mb-4 shadow-xl">
              <CheckCircle2
                className="h-9 w-9 text-emerald-500"
                strokeWidth={2.5}
              />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Booking Confirmed!
            </h2>
            <p className="text-emerald-50 text-sm font-medium">
              Your session is all set
            </p>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 bg-gray-50">
          <div className="p-6 space-y-4">
            {/* Session Details Card */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
              {/* Mentor & Service */}
              <div className="p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 bg-gradient-to-br from-gray-900 to-gray-700 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                      Mentor
                    </p>
                    <p className="text-base font-bold text-gray-900">
                      {bookingDetails.mentorName}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Video className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                      Service
                    </p>
                    <p className="text-base font-semibold text-gray-900">
                      {bookingDetails.serviceName}
                    </p>
                  </div>
                </div>
              </div>

              {/* Date & Time - Highlighted Section */}
              {!isDigitalProduct && (
                <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 border-t border-gray-100 p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm border border-gray-200">
                      <Calendar className="h-5 w-5 text-gray-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                        Date
                      </p>
                      <p className="text-base font-bold text-gray-900">
                        {formattedDate}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm border border-gray-200">
                      <Clock className="h-5 w-5 text-gray-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                        Time
                      </p>
                      <p className="text-base font-bold text-gray-900">
                        {bookingDetails.time}
                      </p>
                      <p className="text-sm text-gray-600 mt-0.5">
                        {bookingDetails.timezone &&
                          `${bookingDetails.timezone} • `}
                        {bookingDetails.duration} minutes
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {isDigitalProduct && bookingDetails.digitalProductLink && (
              <div className="bg-white border border-emerald-100 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 mb-1">
                    Your Product Is Ready
                  </p>
                  <a
                    href={bookingDetails.digitalProductLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 break-all"
                  >
                    Access digital product
                  </a>
                </div>
              </div>
            )}

            {/* Email Confirmation */}
            <div className="bg-white border border-blue-100 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Mail className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900 mb-1">
                  Confirmation Sent
                </p>
                <p className="text-sm text-gray-600">
                  Check{" "}
                  <span className="font-semibold text-gray-900">
                    {bookingDetails.userEmail}
                  </span>{" "}
                  for details
                </p>
              </div>
            </div>

            {/* What's Next */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-1 h-4 bg-emerald-500 rounded-full" />
                What Happens Next
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-emerald-50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle2
                      className="h-3 w-3 text-emerald-600"
                      strokeWidth={3}
                    />
                  </div>
                  <span className="text-sm text-gray-700 leading-relaxed">
                    Your mentor has been notified
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-emerald-50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle2
                      className="h-3 w-3 text-emerald-600"
                      strokeWidth={3}
                    />
                  </div>
                  <span className="text-sm text-gray-700 leading-relaxed">
                    Email reminders 24h & 1h before session
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-emerald-50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle2
                      className="h-3 w-3 text-emerald-600"
                      strokeWidth={3}
                    />
                  </div>
                  <span className="text-sm text-gray-700 leading-relaxed">
                    Meeting link available in your dashboard
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Action Buttons - Sticky Footer */}
          <div className="p-6 pt-0">
            <div className="flex gap-3">
              <Button
                onClick={onViewBookings}
                className="flex-1 bg-gray-900 hover:bg-gray-800 text-white rounded-xl h-11 font-semibold shadow-sm"
              >
                View My Bookings
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                onClick={onClose}
                variant="outline"
                className="rounded-xl h-11 border-gray-300 hover:bg-gray-50 font-semibold px-7"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
