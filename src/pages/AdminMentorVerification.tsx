import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPendingMentorVerifications, verifyMentor, rejectMentor, setPhase2MaxAttempts } from '@/services/adminService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Check, X, Eye, FileText, Award, Calendar, Mail, User, GraduationCap, Globe, Languages as LanguagesIcon, Banknote, Shield } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

interface MentorProfile {
  id: string;
  user_id: string;
  full_name: string;
  username: string;
  bio: string;
  headline: string;
  experience: string;
  hourly_rate: number;
  categories: string[];
  expertise_tags: string[];
  languages: string[];
  teaching_certifications: any[];
  has_no_certificate: boolean;
  introduction: string;
  teaching_experience: string;
  motivation: string;
  education: any;
  service_pricing: any;
  profile_status: string;
  verification_status: string;
  onboarding_version?: string;
  phase2_liveness_photo_url?: string | null;
  phase2_intro_video_url?: string | null;
  phase2_proofs?: any[];
  phase2_attempt_count?: number;
  phase2_max_attempts?: number;
  phase2_locked?: boolean;
  phase2_rejection_reason?: string | null;
  phase2_review_status?: string | null;
  verification_photo_url: string | null;
  profile_picture_url: string | null;
  social_links: any;
  created_at: string;
  profiles: {
    email: string;
    full_name: string;
    avatar_url: string;
  };
}

const AdminMentorVerification = () => {
  const PAGE_SIZE = 10;
  const navigate = useNavigate();
  const [mentors, setMentors] = useState<MentorProfile[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [detailsMentor, setDetailsMentor] = useState<MentorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMentor, setSelectedMentor] = useState<MentorProfile | null>(null);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [notes, setNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [attemptDrafts, setAttemptDrafts] = useState<Record<string, number>>({});

  const formatBadgeLabel = (value: any): string => {
    if (value == null) return '';
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    if (typeof value === 'object') {
      if (typeof value.language === 'string' && typeof value.level === 'string') {
        return `${value.language} (${value.level})`;
      }
      if (typeof value.language === 'string') {
        return value.language;
      }
      if (typeof value.name === 'string') {
        return value.name;
      }
      return Object.values(value)
        .filter((v) => typeof v === 'string' || typeof v === 'number')
        .map(String)
        .join(' • ');
    }
    return String(value);
  };

  const getPreviewType = (url: string): 'image' | 'video' | 'pdf' | 'none' => {
    const normalized = String(url || '').trim().toLowerCase();
    if (!normalized) return 'none';

    const mediaMatch = normalized.match(/\.(png|jpe?g|gif|webp|svg|bmp|mp4|webm|ogg|mov|m4v|pdf)(?:$|[?#])/i);
    const extension = mediaMatch?.[1]?.toLowerCase();

    if (extension && ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(extension)) return 'image';
    if (extension && ['mp4', 'webm', 'ogg', 'mov', 'm4v'].includes(extension)) return 'video';
    if (extension === 'pdf') return 'pdf';

    return 'none';
  };

  const renderLinkPreview = (url: string, altText: string) => {
    const previewType = getPreviewType(url);

    if (previewType === 'image') {
      return (
        <img
          src={url}
          alt={altText}
          className="mt-2 w-full max-w-md rounded-lg border border-gray-300"
        />
      );
    }

    if (previewType === 'video') {
      return (
        <video
          src={url}
          controls
          className="mt-2 w-full max-w-xl rounded-lg border border-gray-300 bg-black"
        />
      );
    }

    if (previewType === 'pdf') {
      return (
        <iframe
          src={url}
          title={altText}
          className="mt-2 h-80 w-full max-w-3xl rounded-lg border border-gray-300"
        />
      );
    }

    return null;
  };

  useEffect(() => {
    loadPendingMentors(currentPage);
  }, [currentPage]);

  const loadPendingMentors = async (page = currentPage) => {
    setLoading(true);
    const { data, error, count } = await getPendingMentorVerifications(page, PAGE_SIZE);
    
    if (error) {
      toast.error(error.message || 'Failed to load pending verifications');
    } else {
      const total = count || 0;
      setTotalCount(total);
      const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

      if (page > totalPages) {
        setCurrentPage(totalPages);
        setLoading(false);
        return;
      }

      setMentors(data || []);
    }
    setLoading(false);
  };

  const handleVerify = async () => {
    if (!selectedMentor) return;
    const mentorEmail = selectedMentor?.profiles?.email?.trim();
    
    setProcessing(true);
    const result = await verifyMentor(selectedMentor.id, notes);
    
    if (result.success) {
      toast.success('Mentor verified successfully');
      if (mentorEmail) {
        await supabase.functions.invoke('send-email', {
          body: {
            to: mentorEmail,
            from: 'MatePeak <support@matepeak.com>',
            subject: 'You are now a verified mentor on MatePeak 🎉',
            html: `
              <p>Hi ${selectedMentor.profiles?.full_name || 'Mentor'},</p>
              <p>Your Phase 2 verification has been approved. Your account is now <strong>Verified</strong>.</p>
              <p><strong>What is now enabled for you:</strong></p>
              <ul>
                <li>Unlimited booking access</li>
                <li>Verified mentor badge across your profile/cards</li>
                <li>Better trust and visibility in mentor discovery</li>
                <li>Improved search ranking for verified mentors</li>
              </ul>
              <p>You can now continue growing your mentor profile from your dashboard.</p>
              <p>— Team MatePeak</p>
            `,
          },
        });
      } else {
        toast.warning('Mentor verified, but email was not sent because mentor email is missing.');
      }
      setShowVerifyDialog(false);
      setNotes('');
      loadPendingMentors(currentPage);
    } else {
      toast.error(result.error || 'Failed to verify mentor');
    }
    setProcessing(false);
  };

  const handleReject = async () => {
    if (!selectedMentor || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    const mentorEmail = selectedMentor?.profiles?.email?.trim();
    
    setProcessing(true);
    const result = await rejectMentor(selectedMentor.id, rejectionReason);
    
    if (result.success) {
      toast.success('Mentor verification rejected');
      if (mentorEmail) {
        await supabase.functions.invoke('send-email', {
          body: {
            to: mentorEmail,
            from: 'MatePeak <support@matepeak.com>',
            subject: 'Your mentor verification needs changes',
            html: `<p>Hi ${selectedMentor.profiles?.full_name || 'Mentor'},</p><p>Your Phase 2 verification was not approved.</p><p><strong>Reason:</strong> ${rejectionReason}</p><p>Please update and resubmit your verification.</p>`,
          },
        });
      } else {
        toast.warning('Mentor rejected, but email was not sent because mentor email is missing.');
      }
      setShowRejectDialog(false);
      setRejectionReason('');
      loadPendingMentors(currentPage);
    } else {
      toast.error(result.error || 'Failed to reject mentor');
    }
    setProcessing(false);
  };

  const handleSetMaxAttempts = async (mentorId: string) => {
    const nextMax = attemptDrafts[mentorId];
    if (!nextMax || Number.isNaN(nextMax) || nextMax < 1) {
      toast.error('Enter a valid max attempts value (1 or higher)');
      return;
    }

    const result = await setPhase2MaxAttempts(mentorId, nextMax, 'Updated from admin panel');
    if (!result.success) {
      toast.error(result.error || result.message);
      return;
    }

    toast.success('Max attempts updated');
    loadPendingMentors(currentPage);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const startItem = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(currentPage * PAGE_SIZE, totalCount);

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
            <Award className="h-8 w-8 text-orange-500" />
            <div>
              <h1 className="text-3xl font-bold">Mentor Verification</h1>
              <p className="text-gray-600">Review and approve mentor applications</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Pending Verifications ({totalCount})</CardTitle>
            <CardDescription>
              Mentors awaiting profile verification and approval
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-48 w-full" />
                ))}
              </div>
            ) : mentors.length === 0 ? (
              <div className="text-center py-12">
                <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No pending verifications</p>
              </div>
            ) : (
              <div className="space-y-4">
                {mentors.map((mentor) => (
                  <div key={mentor.id} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div className="flex items-start gap-3 min-w-0">
                          {mentor.profile_picture_url ? (
                            <img
                              src={mentor.profile_picture_url}
                              alt={mentor.full_name}
                              className="h-12 w-12 rounded-full object-cover border border-gray-200"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center">
                              <User className="h-6 w-6 text-gray-500" />
                            </div>
                          )}

                          <div className="min-w-0">
                            <h3 className="text-sm font-semibold text-gray-900 leading-tight truncate">
                              {mentor.profiles?.full_name || mentor.full_name || 'Mentor'}
                            </h3>
                            <p className="text-xs text-gray-500">@{mentor.username || 'unknown'}</p>
                            <div className="mt-1 flex flex-col gap-0.5 text-xs text-gray-600">
                              <p className="flex items-center gap-1.5 truncate"><Mail className="h-3 w-3" />{mentor.profiles?.email || 'No email'}</p>
                              <p className="flex items-center gap-1.5"><Calendar className="h-3 w-3" />Applied {new Date(mentor.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 md:justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setDetailsMentor(mentor);
                              setShowDetailsDialog(true);
                            }}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Show Details
                          </Button>
                          <Badge variant="outline" className="h-7 bg-gray-50 text-gray-700 border-gray-200">
                            {mentor.profile_status || 'pending_review'}
                          </Badge>
                          <Badge variant="outline" className="h-7 bg-blue-50 text-blue-700 border-blue-200">
                            {mentor.verification_status || 'pending'}
                          </Badge>
                          {mentor.phase2_locked && (
                            <Badge variant="outline" className="h-7 bg-red-50 text-red-700 border-red-200">
                              Locked
                            </Badge>
                          )}
                          <Button
                            variant="default"
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => {
                              setSelectedMentor(mentor);
                              setShowVerifyDialog(true);
                            }}
                          >
                            <Check className="h-3.5 w-3.5 mr-1" />
                            Approve
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setSelectedMentor(mentor);
                              setShowRejectDialog(true);
                            }}
                          >
                            <X className="h-3.5 w-3.5 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>

                      <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5">
                        <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between">
                          <p className="text-xs text-gray-700">
                            Phase 2 attempts: <span className="font-semibold text-gray-900">{mentor.phase2_attempt_count || 0} / {mentor.phase2_max_attempts || 3}</span>
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Max</span>
                            <Input
                              type="number"
                              min={1}
                              value={attemptDrafts[mentor.id] ?? mentor.phase2_max_attempts ?? 3}
                              onChange={(e) =>
                                setAttemptDrafts((prev) => ({
                                  ...prev,
                                  [mentor.id]: Number(e.target.value),
                                }))
                              }
                              className="h-7 max-w-[72px] px-2"
                            />
                            <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => handleSetMaxAttempts(mentor.id)}>
                              Save
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                ))}

                <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 md:flex-row md:items-center md:justify-between">
                  <p className="text-sm text-gray-600">
                    Showing {startItem}-{endItem} of {totalCount}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage <= 1 || loading}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-gray-600 px-2">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage >= totalPages || loading}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {detailsMentor?.profiles?.full_name || detailsMentor?.full_name || 'Mentor'} ({detailsMentor?.username ? `@${detailsMentor.username}` : 'No username'})
            </DialogTitle>
            <DialogDescription>
              Complete verification details for admin review
            </DialogDescription>
          </DialogHeader>

          {detailsMentor && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-xl border border-gray-200 p-3 bg-gray-50">
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm text-gray-900">{detailsMentor.profiles?.email || 'No email'}</p>
                </div>
                <div className="rounded-xl border border-gray-200 p-3 bg-gray-50">
                  <p className="text-xs text-gray-500">Applied On</p>
                  <p className="text-sm text-gray-900">{new Date(detailsMentor.created_at).toLocaleString()}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-800 mb-2">Verification Details</p>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {detailsMentor.phase2_liveness_photo_url && (
                    <div className="rounded-xl border border-gray-200 p-3 bg-gray-50">
                      <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                        <Shield className="h-4 w-4" />
                        Liveness Selfie
                      </p>
                      <img
                        src={detailsMentor.phase2_liveness_photo_url}
                        alt="Phase 2 liveness"
                        className="w-full max-w-md rounded-lg border border-gray-300"
                      />
                    </div>
                  )}

                  {detailsMentor.verification_photo_url && (
                    <div className="rounded-xl border border-gray-200 p-3 bg-gray-50">
                      <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                        <Shield className="h-4 w-4" />
                        Identity Verification Photo
                      </p>
                      <img
                        src={detailsMentor.verification_photo_url}
                        alt="ID Verification"
                        className="w-full max-w-md rounded-lg border border-gray-300"
                      />
                    </div>
                  )}
                </div>
              </div>

              {detailsMentor.phase2_intro_video_url && (
                <div className="rounded-xl border border-gray-200 p-3 bg-gray-50">
                  <p className="text-sm font-medium text-gray-700 mb-2">Intro Video</p>
                  <a
                    href={detailsMentor.phase2_intro_video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline break-all"
                  >
                    {detailsMentor.phase2_intro_video_url}
                  </a>
                  {renderLinkPreview(detailsMentor.phase2_intro_video_url, 'Intro video')}
                </div>
              )}

              {detailsMentor.phase2_proofs && detailsMentor.phase2_proofs.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Proof Links / Files</p>
                  <div className="space-y-2">
                    {detailsMentor.phase2_proofs.map((proof: any) => (
                      <div key={proof.id || proof.url} className="rounded-xl border border-gray-200 p-3 bg-gray-50">
                        <p className="text-xs text-gray-500 mb-1">{proof.type || 'proof'}</p>
                        <a
                          href={proof.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline break-all"
                        >
                          {proof.label || proof.url}
                        </a>
                        {proof.url && renderLinkPreview(proof.url, proof.label || proof.type || 'Proof')}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detailsMentor.social_links && Object.keys(detailsMentor.social_links).length > 0 && (
                <div className="rounded-xl border border-gray-200 p-3 bg-gray-50">
                  <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <Globe className="h-4 w-4" /> Social Links
                  </p>
                  <div className="space-y-2">
                    {Object.entries(detailsMentor.social_links).map(([platform, url]: [string, any]) => (
                      url && (
                        <div key={platform} className="flex items-start gap-2 text-sm">
                          <span className="font-medium text-gray-600 capitalize min-w-[90px]">{platform}:</span>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline break-all"
                          >
                            {url}
                          </a>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Verify Dialog */}
      <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Mentor</DialogTitle>
            <DialogDescription>
              Approve {selectedMentor?.profiles?.full_name}'s mentor application
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Optional notes (internal use only)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVerifyDialog(false)} disabled={processing}>
              Cancel
            </Button>
            <Button
              onClick={handleVerify}
              disabled={processing}
              className="bg-green-600 hover:bg-green-700"
            >
              {processing ? 'Verifying...' : 'Verify Mentor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Mentor Verification</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting {selectedMentor?.profiles?.full_name}'s application
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Rejection reason (required) - This will be visible to the mentor"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              required
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)} disabled={processing}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processing || !rejectionReason.trim()}
            >
              {processing ? 'Rejecting...' : 'Reject Application'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminMentorVerification;
