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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  const navigate = useNavigate();
  const [mentors, setMentors] = useState<MentorProfile[]>([]);
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

  useEffect(() => {
    loadPendingMentors();
  }, []);

  const loadPendingMentors = async () => {
    setLoading(true);
    const { data, error } = await getPendingMentorVerifications();
    
    if (error) {
      toast.error(error.message || 'Failed to load pending verifications');
    } else {
      setMentors(data || []);
    }
    setLoading(false);
  };

  const handleVerify = async () => {
    if (!selectedMentor) return;
    
    setProcessing(true);
    const result = await verifyMentor(selectedMentor.id, notes);
    
    if (result.success) {
      toast.success('Mentor verified successfully');
      if (selectedMentor?.profiles?.email) {
        await supabase.functions.invoke('send-email', {
          body: {
            to: selectedMentor.profiles.email,
            subject: 'Your mentor verification is approved',
            html: `<p>Hi ${selectedMentor.profiles?.full_name || 'Mentor'},</p><p>Your Phase 2 verification has been approved. Your account is now verified.</p>`,
          },
        });
      }
      setShowVerifyDialog(false);
      setNotes('');
      loadPendingMentors();
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
    
    setProcessing(true);
    const result = await rejectMentor(selectedMentor.id, rejectionReason);
    
    if (result.success) {
      toast.success('Mentor verification rejected');
      if (selectedMentor?.profiles?.email) {
        await supabase.functions.invoke('send-email', {
          body: {
            to: selectedMentor.profiles.email,
            subject: 'Your mentor verification needs changes',
            html: `<p>Hi ${selectedMentor.profiles?.full_name || 'Mentor'},</p><p>Your Phase 2 verification was not approved.</p><p><strong>Reason:</strong> ${rejectionReason}</p><p>Please update and resubmit your verification.</p>`,
          },
        });
      }
      setShowRejectDialog(false);
      setRejectionReason('');
      loadPendingMentors();
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
    loadPendingMentors();
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
            <CardTitle>Pending Verifications ({mentors.length})</CardTitle>
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
              <div className="space-y-6">
                {mentors.map((mentor) => (
                  <div key={mentor.id} className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                    {/* Header Section */}
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          {mentor.profile_picture_url ? (
                            <img 
                              src={mentor.profile_picture_url} 
                              alt={mentor.full_name}
                              className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md"
                            />
                          ) : (
                            <div className="w-20 h-20 bg-gradient-to-br from-primary to-purple-600 rounded-full flex items-center justify-center border-4 border-white shadow-md">
                              <User className="h-10 w-10 text-white" />
                            </div>
                          )}
                          <div>
                            <h3 className="font-bold text-xl text-gray-900">{mentor.profiles?.full_name}</h3>
                            <p className="text-sm text-gray-600 mt-0.5">@{mentor.username}</p>
                            <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                              <Mail className="h-3.5 w-3.5" />
                              {mentor.profiles?.email}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                              <Calendar className="h-3.5 w-3.5" />
                              Applied: {new Date(mentor.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                            {mentor.profile_status}
                          </Badge>
                          <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                            Verification: {mentor.verification_status || 'pending'}
                          </Badge>
                          {mentor.onboarding_version && (
                            <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-300">
                              {mentor.onboarding_version}
                            </Badge>
                          )}
                          {mentor.verification_photo_url && (
                            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                              <Shield className="h-3 w-3 mr-1" />
                              ID Verified
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="rounded-lg border bg-white p-3">
                          <p className="text-xs text-gray-500">Attempt Count</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {mentor.phase2_attempt_count || 0} / {mentor.phase2_max_attempts || 3}
                          </p>
                          {mentor.phase2_locked && (
                            <p className="text-xs text-red-600 mt-1">Locked</p>
                          )}
                        </div>
                        <div className="rounded-lg border bg-white p-3 md:col-span-2">
                          <p className="text-xs text-gray-500 mb-2">Change max attempts</p>
                          <div className="flex items-center gap-2">
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
                              className="max-w-[120px]"
                            />
                            <Button
                              variant="outline"
                              onClick={() => handleSetMaxAttempts(mentor.id)}
                            >
                              Save
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Information Tabs */}
                    <div className="p-6">
                      <Tabs defaultValue="overview" className="w-full">
                        <TabsList className="grid w-full grid-cols-4">
                          <TabsTrigger value="overview">Overview</TabsTrigger>
                          <TabsTrigger value="education">Education</TabsTrigger>
                          <TabsTrigger value="services">Services</TabsTrigger>
                          <TabsTrigger value="verification">Verification</TabsTrigger>
                        </TabsList>

                        {/* Overview Tab */}
                        <TabsContent value="overview" className="space-y-4 mt-4">
                          {mentor.headline && (
                            <div>
                              <p className="text-sm font-semibold text-gray-700 mb-1">Headline</p>
                              <p className="text-gray-900 font-medium">{mentor.headline}</p>
                            </div>
                          )}
                          
                          {mentor.introduction && (
                            <div>
                              <p className="text-sm font-semibold text-gray-700 mb-1">Introduction</p>
                              <p className="text-gray-600 text-sm leading-relaxed">{mentor.introduction}</p>
                            </div>
                          )}

                          {mentor.teaching_experience && (
                            <div>
                              <p className="text-sm font-semibold text-gray-700 mb-1">Teaching Experience</p>
                              <p className="text-gray-600 text-sm leading-relaxed">{mentor.teaching_experience}</p>
                            </div>
                          )}

                          {mentor.motivation && (
                            <div>
                              <p className="text-sm font-semibold text-gray-700 mb-1">Motivation</p>
                              <p className="text-gray-600 text-sm leading-relaxed">{mentor.motivation}</p>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-4">
                            {mentor.categories && mentor.categories.length > 0 && (
                              <div>
                                <p className="text-sm font-semibold text-gray-700 mb-2">Categories</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {mentor.categories.map((cat, idx) => (
                                    <Badge key={idx} variant="secondary" className="text-xs">{formatBadgeLabel(cat)}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {mentor.languages && mentor.languages.length > 0 && (
                              <div>
                                <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                                  <LanguagesIcon className="h-4 w-4" />
                                  Languages
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {mentor.languages.map((lang, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">{formatBadgeLabel(lang)}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {mentor.expertise_tags && mentor.expertise_tags.length > 0 && (
                            <div>
                              <p className="text-sm font-semibold text-gray-700 mb-2">Expertise Tags</p>
                              <div className="flex flex-wrap gap-1.5">
                                {mentor.expertise_tags.map((tag, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">{formatBadgeLabel(tag)}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </TabsContent>

                        {/* Education Tab */}
                        <TabsContent value="education" className="space-y-4 mt-4">
                          {mentor.education && (
                            <div>
                              <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                                <GraduationCap className="h-4 w-4" />
                                Educational Background
                              </p>
                              <div className="bg-gray-50 rounded-lg p-4">
                                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                                  {typeof mentor.education === 'string' 
                                    ? mentor.education 
                                    : JSON.stringify(mentor.education, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}

                          {mentor.teaching_certifications && mentor.teaching_certifications.length > 0 ? (
                            <div>
                              <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                                <FileText className="h-4 w-4" />
                                Teaching Certifications ({mentor.teaching_certifications.length})
                              </p>
                              <div className="space-y-2">
                                {mentor.teaching_certifications.map((cert, idx) => (
                                  <div key={idx} className="bg-green-50 border border-green-200 rounded p-3">
                                    <p className="text-sm text-gray-700">
                                      {typeof cert === 'string' ? cert : JSON.stringify(cert)}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : mentor.has_no_certificate && (
                            <div>
                              <Badge variant="outline" className="bg-yellow-50 border-yellow-300 text-yellow-800">
                                <FileText className="h-3 w-3 mr-1" />
                                No Teaching Certificate Provided
                              </Badge>
                            </div>
                          )}
                        </TabsContent>

                        {/* Services Tab */}
                        <TabsContent value="services" className="space-y-4 mt-4">
                          {mentor.service_pricing && (
                            <div>
                              <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1">
                                <Banknote className="h-4 w-4" />
                                Service Pricing
                              </p>
                              <div className="grid gap-3">
                                {Object.entries(mentor.service_pricing).map(([key, value]: [string, any]) => (
                                  value?.enabled && (
                                    <div key={key} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                      <div className="flex items-start justify-between">
                                        <div>
                                          <p className="font-semibold text-gray-900 capitalize">
                                            {key.replace(/([A-Z])/g, ' $1').trim()}
                                          </p>
                                          {value.description && (
                                            <p className="text-sm text-gray-600 mt-1">{value.description}</p>
                                          )}
                                        </div>
                                        <div className="text-right">
                                          <p className="font-bold text-lg text-primary">
                                            ₹{value.price || value.rate || 'N/A'}
                                          </p>
                                          {value.duration && (
                                            <p className="text-xs text-gray-500">{value.duration}</p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )
                                ))}
                              </div>
                            </div>
                          )}
                        </TabsContent>

                        {/* Verification Tab */}
                        <TabsContent value="verification" className="space-y-4 mt-4">
                          {mentor.phase2_liveness_photo_url && (
                            <div>
                              <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                                <Shield className="h-4 w-4" />
                                Phase 2 Liveness Selfie
                              </p>
                              <img
                                src={mentor.phase2_liveness_photo_url}
                                alt="Phase 2 liveness"
                                className="max-w-md rounded-lg border-2 border-gray-300"
                              />
                            </div>
                          )}

                          {mentor.phase2_intro_video_url && (
                            <div>
                              <p className="text-sm font-semibold text-gray-700 mb-2">Intro Video</p>
                              <a
                                href={mentor.phase2_intro_video_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:underline break-all"
                              >
                                {mentor.phase2_intro_video_url}
                              </a>
                            </div>
                          )}

                          {mentor.phase2_proofs && mentor.phase2_proofs.length > 0 && (
                            <div>
                              <p className="text-sm font-semibold text-gray-700 mb-2">Proofs</p>
                              <div className="space-y-2">
                                {mentor.phase2_proofs.map((proof: any) => (
                                  <div key={proof.id || proof.url} className="rounded-lg border p-3 bg-gray-50">
                                    <p className="text-xs text-gray-500">{proof.type || 'proof'}</p>
                                    <a
                                      href={proof.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm text-blue-600 hover:underline break-all"
                                    >
                                      {proof.label || proof.url}
                                    </a>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {mentor.verification_photo_url && (
                            <div>
                              <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                                <Shield className="h-4 w-4" />
                                Identity Verification Photo
                              </p>
                              <img 
                                src={mentor.verification_photo_url} 
                                alt="ID Verification"
                                className="max-w-md rounded-lg border-2 border-gray-300"
                              />
                              <p className="text-xs text-gray-500 mt-2">
                                Status: {mentor.verification_status || 'Pending'}
                              </p>
                            </div>
                          )}

                          {mentor.social_links && Object.keys(mentor.social_links).length > 0 && (
                            <div>
                              <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                                <Globe className="h-4 w-4" />
                                Social Links
                              </p>
                              <div className="space-y-2">
                                {Object.entries(mentor.social_links).map(([platform, url]: [string, any]) => (
                                  url && (
                                    <div key={platform} className="flex items-center gap-2">
                                      <span className="text-sm font-medium capitalize text-gray-600 w-24">
                                        {platform}:
                                      </span>
                                      <a 
                                        href={url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-sm text-blue-600 hover:underline break-all"
                                      >
                                        {url}
                                      </a>
                                    </div>
                                  )
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-sm font-semibold text-gray-700 mb-2">Verification Checklist</p>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <div className={`w-4 h-4 rounded-full flex items-center justify-center ${mentor.profile_picture_url ? 'bg-green-500' : 'bg-gray-300'}`}>
                                  {mentor.profile_picture_url && <Check className="h-3 w-3 text-white" />}
                                </div>
                                <span className="text-sm text-gray-700">Profile picture uploaded</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className={`w-4 h-4 rounded-full flex items-center justify-center ${mentor.verification_photo_url ? 'bg-green-500' : 'bg-gray-300'}`}>
                                  {mentor.verification_photo_url && <Check className="h-3 w-3 text-white" />}
                                </div>
                                <span className="text-sm text-gray-700">Identity verification provided</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className={`w-4 h-4 rounded-full flex items-center justify-center ${(mentor.teaching_certifications && mentor.teaching_certifications.length > 0) || mentor.has_no_certificate ? 'bg-green-500' : 'bg-gray-300'}`}>
                                  {((mentor.teaching_certifications && mentor.teaching_certifications.length > 0) || mentor.has_no_certificate) && <Check className="h-3 w-3 text-white" />}
                                </div>
                                <span className="text-sm text-gray-700">Certification details provided</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className={`w-4 h-4 rounded-full flex items-center justify-center ${mentor.education ? 'bg-green-500' : 'bg-gray-300'}`}>
                                  {mentor.education && <Check className="h-3 w-3 text-white" />}
                                </div>
                                <span className="text-sm text-gray-700">Education information provided</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className={`w-4 h-4 rounded-full flex items-center justify-center ${mentor.service_pricing && Object.keys(mentor.service_pricing).length > 0 ? 'bg-green-500' : 'bg-gray-300'}`}>
                                  {mentor.service_pricing && Object.keys(mentor.service_pricing).length > 0 && <Check className="h-3 w-3 text-white" />}
                                </div>
                                <span className="text-sm text-gray-700">Service pricing set</span>
                              </div>
                            </div>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>

                    {/* Actions */}
                    <div className="bg-gray-50 px-6 py-4 border-t flex gap-3 justify-end">
                      <Button
                        variant="default"
                        size="lg"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => {
                          setSelectedMentor(mentor);
                          setShowVerifyDialog(true);
                        }}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Approve Mentor
                      </Button>
                      <Button
                        variant="destructive"
                        size="lg"
                        onClick={() => {
                          setSelectedMentor(mentor);
                          setShowRejectDialog(true);
                        }}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Reject Application
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
