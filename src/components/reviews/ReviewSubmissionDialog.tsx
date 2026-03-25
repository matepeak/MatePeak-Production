import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";

interface ReviewSubmissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: {
    id: string;
    expert_id: string;
    session_type: string;
    scheduled_date: string;
    scheduled_time: string;
    mentor_name?: string;
  };
  onSuccess?: () => void;
}

export default function ReviewSubmissionDialog({
  open,
  onOpenChange,
  booking,
  onSuccess,
}: ReviewSubmissionDialogProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Rating Required", {
        description: "Please select a star rating before submitting.",
      });
      return;
    }

    if (comment.trim().length < 20) {
      toast.error("Review Too Short", {
        description: "Please write at least 20 characters to make your feedback useful.",
      });
      return;
    }

    try {
      setSubmitting(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("You must be logged in to submit a review");
      }

      // Check if review already exists
      const { data: existingReview } = await supabase
        .from("reviews")
        .select("id")
        .eq("booking_id", booking.id)
        .eq("user_id", user.id)
        .single();

      if (existingReview) {
        toast.error("Review Already Submitted", {
          description: "You've already reviewed this session.",
        });
        return;
      }

      // Insert review
      const { error } = await supabase.from("reviews").insert({
        booking_id: booking.id,
        expert_id: booking.expert_id,
        user_id: user.id,
        rating,
        comment: comment.trim(),
      });

      if (error) throw error;

      toast.success("Review Submitted! ⭐");

      // Reset form
      setRating(0);
      setComment("");
      onOpenChange(false);

      // Call success callback
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error("Error submitting review:", error);
      toast.error("Failed to Submit Review", {
        description: error.message || "Please try again later.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getRatingLabel = (stars: number) => {
    switch (stars) {
      case 1:
        return "Poor";
      case 2:
        return "Fair";
      case 3:
        return "Good";
      case 4:
        return "Very Good";
      case 5:
        return "Excellent";
      default:
        return "Select Rating";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Rate Your Session ⭐</DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Share a quick, honest review of your session with {booking.mentor_name || "your mentor"}.
          </p>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Session Info */}
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm font-medium">{booking.session_type}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(booking.scheduled_date).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}{" "}
              • {booking.scheduled_time}
            </p>
          </div>

          {/* Star Rating */}
          <div>
            <label className="text-sm font-medium mb-3 block">
              Your Rating
            </label>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-10 h-10 ${
                        star <= (hoveredRating || rating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <span className="text-sm font-medium text-muted-foreground ml-2">
                {getRatingLabel(hoveredRating || rating)}
              </span>
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Your Review
            </label>
            <Textarea
              placeholder="What stood out most in this session? What did you learn or improve?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={5}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground mt-2">
              {comment.length} / 500 characters (minimum 20)
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                submitting || rating === 0 || comment.trim().length < 20
              }
              className="flex-1"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Submit Review
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Your rating and comments help other students choose the right mentor.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
