import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFlaggedReviews, moderateReview } from '@/services/adminService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Flag, EyeOff, Trash2, Star, User, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface Review {
  id: string;
  expert_id: string;
  user_id: string;
  rating: number;
  comment: string;
  created_at: string;
  is_flagged: boolean;
  flag_reason: string;
  flagged_at: string;
  profiles: {
    email: string;
    full_name: string;
  };
  expert_profiles: {
    user_id: string;
    profiles: {
      full_name: string;
    };
  };
}

const AdminReviewModeration = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [showHideDialog, setShowHideDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [moderationReason, setModerationReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadFlaggedReviews();
  }, []);

  const loadFlaggedReviews = async () => {
    setLoading(true);
    const { data, error } = await getFlaggedReviews();
    
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load flagged reviews',
        variant: 'destructive'
      });
    } else {
      setReviews(data || []);
    }
    setLoading(false);
  };

  const handleHide = async () => {
    if (!selectedReview) return;
    
    setProcessing(true);
    const result = await moderateReview(
      selectedReview.id,
      'hide',
      moderationReason || undefined
    );
    
    if (result.success) {
      toast({
        title: 'Success',
        description: 'Review hidden successfully',
      });
      setShowHideDialog(false);
      setModerationReason('');
      loadFlaggedReviews();
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to hide review',
        variant: 'destructive'
      });
    }
    setProcessing(false);
  };

  const handleDelete = async () => {
    if (!selectedReview) return;
    
    setProcessing(true);
    const result = await moderateReview(
      selectedReview.id,
      'delete',
      moderationReason || undefined
    );
    
    if (result.success) {
      toast({
        title: 'Success',
        description: 'Review deleted permanently',
      });
      setShowDeleteDialog(false);
      setModerationReason('');
      loadFlaggedReviews();
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to delete review',
        variant: 'destructive'
      });
    }
    setProcessing(false);
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Admin Dashboard
          </button>
          <div className="flex items-center gap-3">
            <Flag className="h-8 w-8 text-red-500" />
            <div>
              <h1 className="text-3xl font-bold">Review Moderation</h1>
              <p className="text-gray-600">Moderate inappropriate or flagged reviews</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Flagged Reviews ({reviews.length})</CardTitle>
            <CardDescription>
              Reviews that have been flagged and need moderation
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-48 w-full" />
                ))}
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-12">
                <Flag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No flagged reviews</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="border rounded-lg p-6 hover:border-primary transition-colors">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-gray-600" />
                          </div>
                          <div>
                            <p className="font-semibold">{review.profiles?.full_name}</p>
                            <p className="text-sm text-gray-600">{review.profiles?.email}</p>
                          </div>
                        </div>
                        <div className="ml-13">
                          <div className="flex items-center gap-2 mb-2">
                            {renderStars(review.rating)}
                            <span className="text-sm text-gray-600">
                              {review.rating}/5
                            </span>
                          </div>
                          <p className="text-gray-700 mb-2">{review.comment}</p>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Calendar className="h-4 w-4" />
                            Posted: {new Date(review.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <Badge variant="destructive" className="ml-4">
                        <Flag className="h-3 w-3 mr-1" />
                        Flagged
                      </Badge>
                    </div>

                    {/* Review Context */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-1">
                        Review for Mentor:
                      </p>
                      <p className="text-sm text-gray-600">
                        {review.expert_profiles?.profiles?.full_name || 'Unknown'}
                      </p>
                      {review.flag_reason && (
                        <>
                          <p className="text-sm font-medium text-gray-700 mt-2 mb-1">
                            Flag Reason:
                          </p>
                          <p className="text-sm text-gray-600">{review.flag_reason}</p>
                        </>
                      )}
                      {review.flagged_at && (
                        <p className="text-xs text-gray-500 mt-2">
                          Flagged on: {new Date(review.flagged_at).toLocaleString()}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedReview(review);
                          setShowHideDialog(true);
                        }}
                      >
                        <EyeOff className="h-4 w-4 mr-2" />
                        Hide Review
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setSelectedReview(review);
                          setShowDeleteDialog(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Permanently
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Hide Dialog */}
      <Dialog open={showHideDialog} onOpenChange={setShowHideDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hide Review</DialogTitle>
            <DialogDescription>
              Hide this review from public view (can be unhidden later)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium mb-1">Review:</p>
              <div className="flex items-center gap-1 mb-2">
                {renderStars(selectedReview?.rating || 0)}
              </div>
              <p className="text-sm text-gray-700">{selectedReview?.comment}</p>
            </div>
            <Textarea
              placeholder="Moderation reason (optional, internal use only)"
              value={moderationReason}
              onChange={(e) => setModerationReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHideDialog(false)} disabled={processing}>
              Cancel
            </Button>
            <Button
              onClick={handleHide}
              disabled={processing}
            >
              {processing ? 'Hiding...' : 'Hide Review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Review Permanently</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The review will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm font-medium text-red-800 mb-2">Warning: This is permanent!</p>
              <p className="text-sm text-red-700">
                The review and its rating will be permanently removed from the system.
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium mb-1">Review to be deleted:</p>
              <div className="flex items-center gap-1 mb-2">
                {renderStars(selectedReview?.rating || 0)}
              </div>
              <p className="text-sm text-gray-700">{selectedReview?.comment}</p>
            </div>
            <Textarea
              placeholder="Deletion reason (optional, internal use only)"
              value={moderationReason}
              onChange={(e) => setModerationReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={processing}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={processing}
            >
              {processing ? 'Deleting...' : 'Delete Permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminReviewModeration;
