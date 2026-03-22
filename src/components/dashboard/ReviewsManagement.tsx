import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Star,
  MessageSquare,
  Download,
  Filter,
  Loader2,
  Send,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDistanceToNow } from "date-fns";

interface ReviewsManagementProps {
  mentorProfile: any;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  mentor_reply?: string;
  replied_at?: string;
  user_id: string;
  profiles?: {
    full_name: string;
    avatar_url?: string;
  };
}

type RatingFilter = "all" | "5" | "4" | "3" | "2" | "1";

const ReviewsManagement = ({ mentorProfile }: ReviewsManagementProps) => {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<RatingFilter>("all");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, [mentorProfile]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      let { data, error } = await supabase
        .from("reviews")
        .select("id, rating, comment, created_at, mentor_reply, replied_at, user_id")
        .eq("expert_id", mentorProfile.id)
        .order("created_at", { ascending: false });

      const errorMessage = (error?.message || "").toLowerCase();
      const hasOptionalReplyColumnError =
        errorMessage.includes("mentor_reply") ||
        errorMessage.includes("replied_at") ||
        errorMessage.includes("column");

      if (error && hasOptionalReplyColumnError) {
        const fallbackResult = await supabase
          .from("reviews")
          .select("id, rating, comment, created_at, user_id")
          .eq("expert_id", mentorProfile.id)
          .order("created_at", { ascending: false });

        data = fallbackResult.data as any;
        error = fallbackResult.error as any;
      }

      if (error) throw error;

      if (!data || data.length === 0) {
        setReviews([]);
        return;
      }

      const reviewsWithProfiles = await Promise.all(
        data.map(async (review) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("id", review.user_id)
            .maybeSingle();

          return {
            ...review,
            mentor_reply: (review as any).mentor_reply || null,
            replied_at: (review as any).replied_at || null,
            profiles: profile || { full_name: "Anonymous", avatar_url: undefined },
          };
        })
      );

      setReviews(reviewsWithProfiles as Review[]);
    } catch (error: any) {
      console.error("Error fetching reviews:", error);
      toast({
        title: "Error",
        description: "Failed to load reviews",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReplySubmit = async (reviewId: string) => {
    if (!replyText.trim()) {
      toast({
        title: "Error",
        description: "Please enter a reply",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      const { error } = await supabase
        .from("reviews")
        .update({
          mentor_reply: replyText.trim(),
          replied_at: new Date().toISOString(),
        })
        .eq("id", reviewId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Reply posted successfully",
      });

      setReplyingTo(null);
      setReplyText("");
      fetchReviews();
    } catch (error: any) {
      console.error("Error posting reply:", error);
      toast({
        title: "Error",
        description: "Failed to post reply",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const exportReviews = () => {
    const csv = [
      ["Date", "Rating", "Student", "Review", "Reply", "Reply Date"],
      ...filteredReviews.map((review) => [
        new Date(review.created_at).toLocaleDateString(),
        review.rating.toString(),
        review.profiles?.full_name || "Anonymous",
        review.comment || "",
        review.mentor_reply || "",
        review.replied_at
          ? new Date(review.replied_at).toLocaleDateString()
          : "",
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reviews-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "Reviews exported successfully",
    });
  };

  const filteredReviews = reviews.filter((review) => {
    if (filter === "all") return true;
    return review.rating === parseInt(filter);
  });

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  const ratingDistribution = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: reviews.filter((r) => r.rating === rating).length,
    percentage:
      reviews.length > 0
        ? (reviews.filter((r) => r.rating === rating).length / reviews.length) *
          100
        : 0,
  }));

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Reviews & Ratings
          </h1>
          <p className="text-gray-600 mt-1">
            Manage student feedback and ratings
          </p>
        </div>
        <Button
          onClick={exportReviews}
          variant="outline"
          disabled={reviews.length === 0}
          className="border-gray-300"
        >
          <Download className="h-4 w-4 mr-2" />
          Export Reviews
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Average Rating */}
        <Card className="border-gray-200">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600 mb-2">
                Average Rating
              </p>
              <div className="text-4xl font-bold text-gray-900 mb-2">
                {averageRating > 0 ? averageRating.toFixed(1) : "N/A"}
              </div>
              {averageRating > 0 && (
                <>
                  <div className="flex items-center justify-center mb-2">
                    {renderStars(Math.round(averageRating))}
                  </div>
                  <p className="text-sm text-gray-500">
                    Based on {reviews.length} review
                    {reviews.length !== 1 ? "s" : ""}
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Total Reviews */}
        <Card className="border-gray-200">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600 mb-2">
                Total Reviews
              </p>
              <div className="text-4xl font-bold text-gray-900 mb-2">
                {reviews.length}
              </div>
              <p className="text-sm text-gray-500">
                {reviews.filter((r) => r.mentor_reply).length} replied
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Rating Distribution */}
        <Card className="border-gray-200">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-gray-600 mb-4">
              Rating Distribution
            </p>
            <div className="space-y-2">
              {ratingDistribution.map((dist) => (
                <div key={dist.rating} className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 w-8">
                    {dist.rating}★
                  </span>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 transition-all"
                      style={{ width: `${dist.percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-10 text-right">
                    {dist.count}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card className="border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Filter className="h-5 w-5 text-gray-600" />
            <Select
              value={filter}
              onValueChange={(value) => setFilter(value as RatingFilter)}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ratings</SelectItem>
                <SelectItem value="5">5 Stars</SelectItem>
                <SelectItem value="4">4 Stars</SelectItem>
                <SelectItem value="3">3 Stars</SelectItem>
                <SelectItem value="2">2 Stars</SelectItem>
                <SelectItem value="1">1 Star</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-600">
              {filteredReviews.length} review
              {filteredReviews.length !== 1 ? "s" : ""}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="border-gray-200">
              <CardContent className="p-6">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))
        ) : filteredReviews.length > 0 ? (
          filteredReviews.map((review) => (
            <Card key={review.id} className="border-gray-200">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Review Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                        <span className="text-sm font-semibold text-gray-700">
                          {(review.profiles?.full_name || "A")[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {review.profiles?.full_name || "Anonymous"}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {renderStars(review.rating)}
                          <span className="text-sm text-gray-500">
                            {formatDistanceToNow(new Date(review.created_at), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Review Text */}
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {review.comment}
                  </p>

                  {/* Mentor Reply */}
                  {review.mentor_reply ? (
                    <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-gray-900">
                      <div className="flex items-start gap-3">
                        <MessageSquare className="h-4 w-4 text-gray-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 mb-1">
                            Your Reply
                          </p>
                          <p className="text-sm text-gray-700">
                            {review.mentor_reply}
                          </p>
                          {review.replied_at && (
                            <p className="text-xs text-gray-500 mt-2">
                              Replied{" "}
                              {formatDistanceToNow(
                                new Date(review.replied_at),
                                {
                                  addSuffix: true,
                                }
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : replyingTo === review.id ? (
                    <div className="space-y-3">
                      <Textarea
                        placeholder="Write your reply..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        rows={3}
                        className="resize-none"
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleReplySubmit(review.id)}
                          disabled={submitting}
                          size="sm"
                          className="bg-gray-900 hover:bg-gray-800"
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Posting...
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4 mr-2" />
                              Post Reply
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={() => {
                            setReplyingTo(null);
                            setReplyText("");
                          }}
                          variant="outline"
                          size="sm"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      onClick={() => setReplyingTo(review.id)}
                      variant="outline"
                      size="sm"
                      className="border-gray-300"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Reply to Review
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="border-gray-200">
            <CardContent className="p-12 text-center">
              <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm font-medium text-gray-900">
                No reviews yet
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Reviews from students will appear here
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ReviewsManagement;
