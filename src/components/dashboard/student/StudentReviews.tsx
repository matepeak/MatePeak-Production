import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  Edit,
  Trash2,
  Send,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { useNavigate } from "react-router-dom";
import { validateReviewComment } from "@/utils/inputSanitization";

interface StudentReviewsProps {
  studentProfile: any;
}

export default function StudentReviews({
  studentProfile,
}: StudentReviewsProps) {
  const [pendingReviews, setPendingReviews] = useState<any[]>([]);
  const [submittedReviews, setSubmittedReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingReview, setEditingReview] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Get completed sessions without reviews
      const { data: completedSessions, error: sessionsError } = await supabase
        .from("bookings")
        .select(
          `
          *,
          expert_profiles (
            id,
            full_name,
            username,
            profile_picture_url
          )
        `
        )
        .eq("student_id", user.id)
        .eq("status", "completed")
        .order("session_date", { ascending: false });

      if (sessionsError) throw sessionsError;

      // Get existing reviews
      const { data: reviews, error: reviewsError } = await supabase
        .from("reviews")
        .select(
          `
          id,
          student_id,
          expert_id,
          booking_id,
          rating,
          comment,
          created_at,
          updated_at
        `
        )
        .eq("student_id", user.id)
        .order("created_at", { ascending: false });

      if (reviewsError) throw reviewsError;

      // Fetch mentor profiles for reviews
      const mentorIds = Array.from(
        new Set((reviews || []).map((r: any) => r.expert_id))
      );
      const mentorProfilesMap = new Map();

      if (mentorIds.length > 0) {
        const { data: mentorProfiles } = await supabase
          .from("expert_profiles")
          .select("id, full_name, username, profile_picture_url")
          .in("id", mentorIds);

        (mentorProfiles || []).forEach((m: any) =>
          mentorProfilesMap.set(m.id, m)
        );
      }

      // Fetch booking info for reviews
      const bookingIds = (reviews || []).map((r: any) => r.booking_id);
      const bookingsMap = new Map();

      if (bookingIds.length > 0) {
        const { data: bookings } = await supabase
          .from("bookings")
          .select("id, session_date, duration")
          .in("id", bookingIds);

        (bookings || []).forEach((b: any) =>
          bookingsMap.set(b.id, b)
        );
      }

      // Enrich reviews with mentor and booking data
      const enrichedReviews = (reviews || []).map((r: any) => ({
        ...r,
        expert_profiles: mentorProfilesMap.get(r.expert_id),
        bookings: bookingsMap.get(r.booking_id),
      }));

      const reviewedBookingIds = new Set(reviews?.map((r) => r.booking_id));
      const pending =
        completedSessions?.filter((s) => !reviewedBookingIds.has(s.id)) || [];

      setPendingReviews(pending);
      setSubmittedReviews(enrichedReviews);
    } catch (error: any) {
      console.error("Error fetching reviews:", error);
      toast.error("Failed to load reviews");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async (
    bookingId: string,
    expertId: string,
    rating: number,
    comment: string
  ) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("reviews").insert({
        student_id: user.id,
        expert_id: expertId,
        booking_id: bookingId,
        rating,
        comment,
      });

      if (error) throw error;

      toast.success("Review submitted successfully!");
      fetchReviews(); // Refresh the lists
    } catch (error: any) {
      console.error("Error submitting review:", error);
      toast.error("Failed to submit review");
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm("Are you sure you want to delete this review?")) return;

    try {
      const { error } = await supabase
        .from("reviews")
        .delete()
        .eq("id", reviewId);

      if (error) throw error;

      toast.success("Review deleted successfully");
      fetchReviews();
    } catch (error: any) {
      console.error("Error deleting review:", error);
      toast.error("Failed to delete review");
    }
  };

  const ReviewForm = ({ session }: { session: any }) => {
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
      // Validate comment
      const validation = validateReviewComment(comment);
      if (!validation.valid) {
        toast.error(validation.error || "Invalid comment");
        return;
      }

      setSubmitting(true);
      await handleSubmitReview(
        session.id,
        session.expert_id,
        rating,
        validation.sanitized!
      );
      setSubmitting(false);
      setComment("");
      setRating(5);
    };

    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            {/* Mentor Avatar */}
            <div className="h-14 w-14 rounded-full bg-gray-300 flex-shrink-0 overflow-hidden">
              {session.expert_profiles?.profile_picture_url ? (
                <img
                  src={session.expert_profiles.profile_picture_url}
                  alt={session.expert_profiles.full_name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-blue-600 text-white text-xl font-bold">
                  {session.expert_profiles?.full_name?.charAt(0) || "M"}
                </div>
              )}
            </div>

            <div className="flex-1 space-y-3">
              <div>
                <h3 className="font-semibold text-gray-900">
                  {session.expert_profiles?.full_name || "Mentor"}
                </h3>
                <p className="text-sm text-gray-600">
                  Session on{" "}
                  {new Date(session.session_date).toLocaleDateString()}
                </p>
              </div>

              {/* Star Rating */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">
                  Rating:
                </span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className="focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star
                        className={`h-6 w-6 ${
                          star <= rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <span className="text-sm font-medium text-gray-700 ml-2">
                  {rating}/5
                </span>
              </div>

              {/* Comment */}
              <Textarea
                placeholder="Share your experience with this mentor..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                className="bg-white"
              />

              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                {submitting ? "Submitting..." : "Submit Review"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-32 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Reviews */}
      {pendingReviews.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            <h2 className="text-xl font-bold text-gray-900">
              Pending Reviews ({pendingReviews.length})
            </h2>
          </div>
          <p className="text-gray-600">
            Help other students by sharing your experience with these mentors
          </p>

          <div className="space-y-4">
            {pendingReviews.map((session) => (
              <ReviewForm key={session.id} session={session} />
            ))}
          </div>
        </div>
      )}

      {/* Submitted Reviews */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <h2 className="text-xl font-bold text-gray-900">
            Your Reviews ({submittedReviews.length})
          </h2>
        </div>

        {submittedReviews.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Star className="h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Reviews Yet
              </h3>
              <p className="text-gray-600 text-center">
                Complete sessions and write reviews to help other students
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {submittedReviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Mentor Avatar */}
                    <div
                      className="h-14 w-14 rounded-full bg-gray-300 flex-shrink-0 overflow-hidden cursor-pointer"
                      onClick={() =>
                        navigate(`/mentor/${review.expert_profiles?.username}`)
                      }
                    >
                      {review.expert_profiles?.profile_picture_url ? (
                        <img
                          src={review.expert_profiles.profile_picture_url}
                          alt={review.expert_profiles.full_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-blue-600 text-white text-xl font-bold">
                          {review.expert_profiles?.full_name?.charAt(0) || "M"}
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3
                            className="font-semibold text-gray-900 cursor-pointer hover:text-blue-600"
                            onClick={() =>
                              navigate(
                                `/mentor/${review.expert_profiles?.username}`
                              )
                            }
                          >
                            {review.expert_profiles?.full_name || "Mentor"}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {new Date(review.created_at).toLocaleDateString(
                              "en-US",
                              {
                                month: "long",
                                day: "numeric",
                                year: "numeric",
                              }
                            )}
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingReview(review.id)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteReview(review.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Rating */}
                      <div className="flex items-center gap-1 mb-3">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${
                              star <= review.rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                        <span className="text-sm font-medium text-gray-700 ml-2">
                          {review.rating}/5
                        </span>
                      </div>

                      {/* Comment */}
                      <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                        "{review.comment}"
                      </p>

                      {/* Session Info */}
                      {review.bookings && (
                        <div className="mt-3 text-sm text-gray-500">
                          Session:{" "}
                          {new Date(
                            review.bookings.session_date
                          ).toLocaleDateString()}
                          {" • "}
                          {review.bookings.duration || 60} minutes
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Empty State - All Caught Up */}
      {pendingReviews.length === 0 && submittedReviews.length > 0 && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <p className="text-green-800 font-medium">
              You're all caught up! No pending reviews.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
