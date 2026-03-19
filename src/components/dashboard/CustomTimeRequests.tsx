import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Clock,
  Calendar,
  MessageSquare,
  CheckCircle,
  XCircle,
  Loader2,
  User,
  UserCircle,
  Award,
} from "lucide-react";
import { toast } from "@/components/ui/sonner";

interface CustomTimeRequestsProps {
  mentorProfile: any;
}

interface TimeRequest {
  id: string;
  mentee_id: string;
  requested_date: string;
  requested_start_time: string;
  requested_end_time: string;
  message: string | null;
  status: "pending" | "approved" | "declined";
  mentor_response: string | null;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

type StatusFilter = "all" | "pending" | "approved" | "declined";

export default function CustomTimeRequests({
  mentorProfile,
}: CustomTimeRequestsProps) {
  const [requests, setRequests] = useState<TimeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [respondDialog, setRespondDialog] = useState<{
    open: boolean;
    request: TimeRequest | null;
    action: "approve" | "decline" | null;
  }>({
    open: false,
    request: null,
    action: null,
  });
  const [mentorResponse, setMentorResponse] = useState("");
  const [responding, setResponding] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [mentorProfile]);

  const fetchRequests = async () => {
    try {
      setLoading(true);

      // First, try to fetch booking requests
      const { data: requestsData, error: requestsError } = await supabase
        .from("booking_requests")
        .select("*")
        .eq("mentor_id", mentorProfile.id)
        .order("created_at", { ascending: false });

      if (requestsError) {
        console.error("Error fetching booking requests:", requestsError);
        throw requestsError;
      }

      // Then fetch profile data for each request
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

      setRequests(requestsWithProfiles);
    } catch (error) {
      console.error("Error fetching time requests:", error);
      toast.error("Failed to load time requests");
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async () => {
    if (!respondDialog.request || !respondDialog.action) return;

    try {
      setResponding(true);

      const newStatus =
        respondDialog.action === "approve" ? "approved" : "declined";

      // Update database
      const { error } = await supabase
        .from("booking_requests")
        .update({
          status: newStatus,
          mentor_response: mentorResponse || null,
        })
        .eq("id", respondDialog.request.id);

      if (error) throw error;

      console.log("[Email] Attempting to send email notification...");
      console.log("Student email:", respondDialog.request.profiles?.email);
      console.log("Student name:", respondDialog.request.profiles?.full_name);
      console.log("Mentor name:", mentorProfile.full_name);

      // Send email notification to student
      try {
        await sendTimeRequestResponseEmail(
          respondDialog.request,
          newStatus,
          mentorResponse
        );
        console.log("[Email] Email sent successfully");
      } catch (emailError) {
        console.error("[Email] Email sending failed:", emailError);
        // Continue even if email fails
      }

      toast.success(
        `Request ${newStatus}! The student will be notified via email.`
      );

      // Refresh requests
      await fetchRequests();

      // Close dialog
      setRespondDialog({ open: false, request: null, action: null });
      setMentorResponse("");
    } catch (error) {
      console.error("Error responding to request:", error);
      toast.error("Failed to respond. Please try again.");
    } finally {
      setResponding(false);
    }
  };

  const sendTimeRequestResponseEmail = async (
    request: TimeRequest,
    status: string,
    mentorResponseText: string
  ) => {
    const studentEmail = request.profiles?.email;
    const studentName = request.profiles?.full_name || "Student";
    const mentorName = mentorProfile.full_name || "Your mentor";
    const isApproved = status === "approved";

    console.log("[Email] Email function called with:");
    console.log("- Student Email:", studentEmail);
    console.log("- Student Name:", studentName);
    console.log("- Mentor Name:", mentorName);
    console.log("- Status:", status);

    if (!studentEmail) {
      console.error(
        "[Email] Student email not found, cannot send email notification"
      );
      console.log("Request data:", request);
      throw new Error("Student email not found");
    }

    const formattedDate = new Date(request.requested_date).toLocaleDateString(
      "en-US",
      {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    );

    const startTime = formatTime(request.requested_start_time);
    const endTime = formatTime(request.requested_end_time);

    const subject = isApproved
      ? `Time Request Approved by ${mentorName}`
      : `Time Request Update from ${mentorName}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background: ${
      isApproved
        ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
        : "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)"
    }; color: white; padding: 30px 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .content { padding: 30px 20px; }
    .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; margin-bottom: 20px; background: ${
      isApproved ? "#d1fae5" : "#e0e7ff"
    }; color: ${isApproved ? "#065f46" : "#3730a3"}; }
    .details-card { background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid ${
      isApproved ? "#10b981" : "#6366f1"
    }; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { font-weight: 600; color: #6b7280; }
    .detail-value { color: #111827; font-weight: 500; }
    .message-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 15px; margin: 20px 0; }
    .message-box h3 { margin: 0 0 10px 0; color: #92400e; font-size: 14px; }
    .message-box p { margin: 0; color: #78350f; }
    .cta-button { display: inline-block; background: ${
      isApproved ? "#10b981" : "#6366f1"
    }; color: white; text-decoration: none; padding: 12px 30px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${
        isApproved ? "🎉 Time Request Approved!" : "📅 Time Request Response"
      }</h1>
    </div>
    
    <div class="content">
      <p style="color: #111827; font-size: 16px;">Hi ${studentName},</p>
      <p style="color: #6b7280; font-size: 14px; margin-bottom: 20px;">
        ${mentorName} has ${
      isApproved ? "approved" : "declined"
    } your custom time request.
      </p>
      
      <span class="status-badge">${
        isApproved ? "✓ APPROVED" : "✗ DECLINED"
      }</span>
      
      <div class="details-card">
        <h3 style="margin-top: 0; color: #111827;">Requested Time Details</h3>
        <div class="detail-row">
          <span class="detail-label">Mentor</span>
          <span class="detail-value">${mentorName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Date</span>
          <span class="detail-value">${formattedDate}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Time</span>
          <span class="detail-value">${startTime} - ${endTime}</span>
        </div>
      </div>
      
      ${
        mentorResponseText
          ? `
      <div class="message-box">
        <h3>💬 Message from ${mentorName}:</h3>
        <p>${mentorResponseText}</p>
      </div>
      `
          : ""
      }
      
      ${
        isApproved
          ? `
      <p style="color: #059669; font-weight: 600; font-size: 14px; margin-top: 20px;">
        ✨ Great news! You can now proceed to book this time slot with ${mentorName}.
      </p>
      <p style="color: #6b7280; font-size: 14px;">
        Visit the mentor's profile to complete your booking.
      </p>
      `
          : `
      <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
        Don't worry! You can request a different time or explore other available slots on ${mentorName}'s profile.
      </p>
      `
      }
      
      <div style="text-align: center; margin-top: 30px;">
        <a href="https://spark-mentor-connect.vercel.app/dashboard" class="cta-button">
          ${isApproved ? "View Dashboard" : "Explore Other Times"}
        </a>
      </div>
    </div>
    
    <div class="footer">
      <p>Need help? <a href="mailto:support@matepeak.com" style="color: #6366f1;">Contact Support</a></p>
      <p style="margin: 5px 0;">© 2025 MatePeak. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;

    console.log("[Email] Invoking send-email function...");
    console.log("Subject:", subject);
    console.log("To:", studentEmail);

    const response = await supabase.functions.invoke("send-email", {
      body: {
        to: studentEmail,
        subject,
        html,
      },
    });

    console.log("[Email] Full response:", response);

    if (response.error) {
      console.error("[Email] Supabase function error:", response.error);
      console.error(
        "[Email] Error details:",
        JSON.stringify(response.error, null, 2)
      );
      throw response.error;
    }

    // Check if the function returned an error in the data
    if (!response.data?.success) {
      console.error("[Email] Function returned error:", response.data);
      console.error("[Email] Error message:", response.data?.error);
      console.error("[Email] Error details:", response.data?.details);
      throw new Error(response.data?.error || "Failed to send email");
    }

    console.log("[Email] Function response:", response.data);
    console.log(
      `[Email] Time request response email sent successfully to ${studentEmail}`
    );
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            Approved
          </Badge>
        );
      case "declined":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            Declined
          </Badge>
        );
      default:
        return null;
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60)
      return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
    if (diffHours < 24)
      return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
    return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
  };

  const isNewRequest = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    // Consider a request "new" if it's less than 48 hours old
    return diffHours < 48;
  };

  const filteredRequests = requests.filter((request) => {
    if (statusFilter === "all") return true;
    return request.status === statusFilter;
  });

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const declinedCount = requests.filter((r) => r.status === "declined").length;

  if (loading) {
    return (
      <Card className="shadow-sm border border-gray-200 rounded-xl">
        <CardContent className="p-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400 mb-4" />
            <p className="text-gray-500">Loading time requests...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - Matching Dashboard Style */}
      <div className="py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              Time Requests
            </h1>
            <p className="text-gray-600 text-sm">
              Manage custom time slot requests from students
            </p>
          </div>
          {pendingCount > 0 && (
            <Badge className="bg-amber-500 text-white px-4 py-1.5 text-sm font-semibold">
              {pendingCount} Pending
            </Badge>
          )}
        </div>
      </div>

      {/* Filters & Stats */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setStatusFilter("all")}
          className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
            statusFilter === "all"
              ? "bg-gray-900 text-white shadow-sm"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          All Requests
          {requests.length > 0 && (
            <span className="ml-1.5 opacity-75">({requests.length})</span>
          )}
        </button>
        <button
          onClick={() => setStatusFilter("approved")}
          className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
            statusFilter === "approved"
              ? "bg-gray-900 text-white shadow-sm"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Approved
          {approvedCount > 0 && (
            <span className="ml-1.5 opacity-75">({approvedCount})</span>
          )}
        </button>
        <button
          onClick={() => setStatusFilter("declined")}
          className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
            statusFilter === "declined"
              ? "bg-gray-900 text-white shadow-sm"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Declined
          {declinedCount > 0 && (
            <span className="ml-1.5 opacity-75">({declinedCount})</span>
          )}
        </button>
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <Card className="bg-white border border-gray-200 rounded-2xl shadow-sm">
          <CardContent className="p-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No {statusFilter !== "all" ? statusFilter : ""} requests
              </h3>
              <p className="text-sm text-gray-500 max-w-sm mx-auto">
                {statusFilter === "pending"
                  ? "You don't have any pending requests at the moment."
                  : "Time requests from students will appear here."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {filteredRequests.map((request) => (
                <div
                  key={request.id}
                  className={`p-6 transition-all duration-200 hover:bg-gray-50/50 ${
                    request.status === "pending"
                      ? "bg-blue-50/20 border-l-2 border-blue-300"
                      : ""
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="flex-shrink-0 w-11 h-11 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center ring-2 ring-gray-50">
                      <User className="h-5 w-5 text-gray-500" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Header Row */}
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-gray-900 truncate">
                              {request.profiles?.full_name || "Unknown Student"}
                            </h3>
                            {isNewRequest(request.created_at) && (
                              <Badge className="bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0 h-4 leading-none">
                                NEW
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {request.profiles?.email}
                          </p>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>

                      {/* Date & Time Info */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-700">
                            {formatDate(request.requested_date)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-700">
                            {formatTime(request.requested_start_time)} -{" "}
                            {formatTime(request.requested_end_time)}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {getTimeAgo(request.created_at)}
                        </span>
                      </div>

                      {/* Messages */}
                      {request.message && (
                        <div className="mb-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                            <UserCircle className="h-3.5 w-3.5" />
                            Mentee's Message
                          </p>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {request.message}
                          </p>
                        </div>
                      )}

                      {request.mentor_response && (
                        <div className="mb-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                            <Award className="h-3.5 w-3.5" />
                            Your Response
                          </p>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {request.mentor_response}
                          </p>
                        </div>
                      )}

                      {/* Action Buttons */}
                      {request.status === "pending" && (
                        <div className="flex gap-2.5 mt-4">
                          <Button
                            size="sm"
                            onClick={() =>
                              setRespondDialog({
                                open: true,
                                request,
                                action: "approve",
                              })
                            }
                            className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-5 rounded-lg shadow-sm transition-all hover:shadow"
                          >
                            <CheckCircle className="h-4 w-4 mr-1.5" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            onClick={() =>
                              setRespondDialog({
                                open: true,
                                request,
                                action: "decline",
                              })
                            }
                            variant="outline"
                            className="h-9 border-2 border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 text-xs font-semibold px-5 rounded-lg transition-all"
                          >
                            <XCircle className="h-4 w-4 mr-1.5" />
                            Decline
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Response Dialog */}
      <Dialog
        open={respondDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setRespondDialog({ open: false, request: null, action: null });
            setMentorResponse("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {respondDialog.action === "approve" ? "Approve" : "Decline"} Time
              Request
            </DialogTitle>
            <DialogDescription>
              {respondDialog.action === "approve"
                ? "Confirm that you can accommodate this time slot. The student will be notified."
                : "Let the student know why this time doesn't work. They can submit another request."}
            </DialogDescription>
          </DialogHeader>

          {respondDialog.request && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm font-semibold text-gray-900 mb-2">
                  Request Details:
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Date:</strong>{" "}
                  {formatDate(respondDialog.request.requested_date)}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Time:</strong>{" "}
                  {formatTime(respondDialog.request.requested_start_time)} -{" "}
                  {formatTime(respondDialog.request.requested_end_time)}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="response">
                  Response Message{" "}
                  {respondDialog.action === "decline" && "(Required)"}
                </Label>
                <Textarea
                  id="response"
                  placeholder={
                    respondDialog.action === "approve"
                      ? "Add a confirmation message (optional)..."
                      : "Let the student know why this time doesn't work..."
                  }
                  value={mentorResponse}
                  onChange={(e) => setMentorResponse(e.target.value)}
                  className="border-gray-300 min-h-[100px]"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRespondDialog({ open: false, request: null, action: null });
                setMentorResponse("");
              }}
              disabled={responding}
              className="border-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRespond}
              disabled={
                responding ||
                (respondDialog.action === "decline" && !mentorResponse)
              }
              className={
                respondDialog.action === "approve"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }
            >
              {responding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {respondDialog.action === "approve" ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Decline
                    </>
                  )}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
