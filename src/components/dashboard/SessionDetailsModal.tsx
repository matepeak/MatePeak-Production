import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  IndianRupee,
  User,
  MessageSquare,
  Video,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface SessionDetailsModalProps {
  open: boolean;
  onClose: () => void;
  session: any;
  onCancelSession?: (session: any) => void;
  cancelLoading?: boolean;
}

const SessionDetailsModal = ({
  open,
  onClose,
  session,
  onCancelSession,
  cancelLoading = false,
}: SessionDetailsModalProps) => {
  if (!session) return null;

  const normalizeParticipantField = (value: unknown) => {
    if (typeof value !== "string") return null;
    const normalized = value.trim();
    if (!normalized) return null;

    const placeholderValues = new Set([
      "mentor",
      "student",
      "unknown",
      "n/a",
      "na",
      "not provided",
    ]);

    return placeholderValues.has(normalized.toLowerCase()) ? null : normalized;
  };

  const now = new Date();
  const sessionStart = new Date(`${session.scheduled_date}T${session.scheduled_time}`);
  const cancellationReasonLower = String(session.cancellation_reason || "").toLowerCase();
  const cancelledByLabel =
    cancellationReasonLower.includes("mentor")
      ? "Mentor"
      : cancellationReasonLower.includes("student")
      ? "Student"
      : session.cancelled_by === session.expert_id
      ? "Mentor"
      : session.cancelled_by === session.user_id
      ? "Student"
      : session.cancelled_by
      ? "User"
      : "Not available";
  const canCancelSession =
    !!onCancelSession &&
    ["pending", "confirmed"].includes((session.status || "").toLowerCase()) &&
    sessionStart > now;
  const statusLabel =
    (session.status || "").toLowerCase() === "cancelled"
      ? "Cancelled"
      : ["pending", "confirmed"].includes((session.status || "").toLowerCase()) &&
        sessionStart > now
      ? "Pending"
      : "Completed";

  const isMentorSideSession = session.user_role === "expert";
  const participantSectionTitle = isMentorSideSession
    ? "Mentee Information"
    : "Mentor Information";

  const participantName =
    normalizeParticipantField(
      isMentorSideSession
        ?
            session.student?.full_name ||
            session.user_name ||
            session.student_name ||
            session.display_name
        : session.mentor_profile?.full_name || session.display_name
    ) || (isMentorSideSession ? "Student" : "Mentor");

  const participantImageUrl =
    (isMentorSideSession
      ? session.student?.avatar_url || session.student?.profile_picture_url
      : session.mentor_profile?.avatar_url || session.mentor_profile?.profile_picture_url) ||
    "";

  const formatDate = (date: string, time: string) => {
    try {
      const dateTime = new Date(`${date}T${time}`);
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(dateTime);
    } catch {
      return "Date not set";
    }
  };

  const getDisplayMessage = (value: unknown) => {
    const raw = typeof value === "string" ? value : "";
    if (!raw.trim()) return "";

    // Order ID metadata is appended by backend for paid booking traceability.
    // Hide it in UI so mentors only see the student-written message content.
    const cleaned = raw
      .split("\n")
      .filter((line) => !/^\s*Order ID:\s*/i.test(line))
      .join("\n")
      .trim();

    return cleaned;
  };

  const displayMessage = getDisplayMessage(session.message);

  return (
    <Dialog open={open} onOpenChange={onClose} modal={false}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-0">
          <div className="flex items-center justify-between pr-8">
            <DialogTitle className="text-xl font-semibold text-gray-900">
              Session Details
            </DialogTitle>
            <p className="text-sm font-medium text-gray-600">{statusLabel}</p>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          <Separator />

          {/* Session Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Session Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date & Time */}
              <div className="flex items-start gap-3 p-4 rounded-lg bg-gray-50 border border-gray-200">
                <div className="p-2 rounded-lg bg-white">
                  <Calendar className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600 uppercase">
                    Date & Time
                  </p>
                  <p className="text-sm text-gray-900 mt-1 font-medium whitespace-nowrap">
                    {formatDate(session.scheduled_date, session.scheduled_time)}
                  </p>
                </div>
              </div>

              {/* Duration */}
              <div className="flex items-start gap-3 p-4 rounded-lg bg-gray-50 border border-gray-200">
                <div className="p-2 rounded-lg bg-white">
                  <Clock className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600 uppercase">
                    Duration
                  </p>
                  <p className="text-sm text-gray-900 mt-1 font-medium">
                    {session.duration || session.session_duration || 30} minutes
                  </p>
                </div>
              </div>

              {/* Amount */}
              <div className="flex items-start gap-3 p-4 rounded-lg bg-gray-50 border border-gray-200">
                <div className="p-2 rounded-lg bg-white">
                  <IndianRupee className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600 uppercase">
                    Total Amount
                  </p>
                  <p className="text-sm text-gray-900 mt-1 font-medium">
                    ₹{session.total_amount?.toFixed(2) || "0.00"}
                  </p>
                </div>
              </div>

              {/* Session Type */}
              <div className="flex items-start gap-3 p-4 rounded-lg bg-gray-50 border border-gray-200">
                <div className="p-2 rounded-lg bg-white">
                  <Video className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600 uppercase">
                    Session Type
                  </p>
                  <p className="text-sm text-gray-900 mt-1 font-medium">
                    {session.session_type === "oneOnOneSession" ||
                    session.session_type === "one-on-one"
                      ? "1:1 Session"
                      : session.session_type || "1:1 Session"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Meeting Link */}
          {session.meeting_link && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900">
                Meeting Link
              </h3>
              <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                <a
                  href={session.meeting_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium break-all"
                >
                  {session.meeting_link}
                </a>
              </div>
            </div>
          )}

          {session.meeting_link && <Separator />}

          {/* Participant Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {participantSectionTitle}
            </h3>

            <div className="space-y-3">
              {/* Participant Name */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                <Avatar className="h-10 w-10 border border-gray-200">
                  <AvatarImage
                    src={participantImageUrl}
                    alt={participantName}
                  />
                  <AvatarFallback className="bg-white text-gray-600">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs font-medium text-gray-600">Full Name</p>
                  <p className="text-sm text-gray-900 font-medium">
                    {participantName}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Notes/Message */}
          {displayMessage && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Mentee's Message
                </h3>
                <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">
                    {displayMessage}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Additional Information */}
          <Separator />
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Booking ID</p>
              <p className="text-gray-900 font-medium mt-1">{session.id}</p>
            </div>
            <div>
              <p className="text-gray-600">Last Updated</p>
              <p className="text-gray-900 font-medium mt-1">
                {formatDistanceToNow(new Date(session.updated_at), {
                  addSuffix: true,
                })}
              </p>
            </div>
          </div>

          {session.status === "cancelled" && (
            <>
              <Separator />
              <div className="space-y-2 text-sm">
                <h3 className="text-lg font-semibold text-gray-900">
                  Cancellation Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <p className="text-gray-600">Cancelled At</p>
                    <p className="text-gray-900 font-medium mt-1">
                      {session.cancelled_at
                        ? new Date(session.cancelled_at).toLocaleString()
                        : "Not available"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Cancelled By</p>
                    <p className="text-gray-900 font-medium mt-1">
                      {cancelledByLabel}
                    </p>
                  </div>
                </div>
                {session.cancellation_reason && (
                  <div>
                    <p className="text-gray-600">Reason</p>
                    <p className="text-gray-900 font-medium mt-1 whitespace-pre-wrap">
                      {session.cancellation_reason}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {canCancelSession && (
            <>
              <Separator />
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="destructive"
                  disabled={cancelLoading}
                  onClick={() => onCancelSession?.(session)}
                  className="min-w-[140px]"
                >
                  {cancelLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    "Cancel Session"
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SessionDetailsModal;
