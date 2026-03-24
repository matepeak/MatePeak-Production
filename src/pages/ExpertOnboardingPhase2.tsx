import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import OnboardingHeader from "@/components/onboarding/OnboardingHeader";
import {
  Shield,
  Link,
  Video,
  Upload,
  Loader2,
  AlertTriangle,
  X,
} from "lucide-react";
import {
  defaultLivenessProvider,
  fetchMentorPhase2Status,
  incrementPhase2AttemptCount,
  isAllowedVideoUrl,
  isLinkedInUrl,
  isLikelyPortfolioUrl,
  isSecureUrl,
  Phase2DraftData,
  Phase2ProofItem,
  savePhase2Draft,
  submitPhase2Verification,
  SUPPORT_EMAIL,
  uploadPhase2File,
} from "@/services/phase2VerificationService";

const PHASE2_LOCAL_STORAGE_KEY = "mentor-phase2-v2-draft";

function PlainGreenTick({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M4 12.5L9.2 17.5L20 6.5"
        stroke="#7CB342"
        strokeWidth="3.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ExpertOnboardingPhase2() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [autoSavingDraft, setAutoSavingDraft] = useState(false);
  const [autoSaveMessage, setAutoSaveMessage] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [verifyingLiveness, setVerifyingLiveness] = useState(false);
  const [mentorId, setMentorId] = useState<string>("");
  const [eligible, setEligible] = useState(true);
  const [locked, setLocked] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [currentStatus, setCurrentStatus] = useState<string>("pending");
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraBusy, setCameraBusy] = useState(false);
  const [cameraError, setCameraError] = useState<string>("");
  const [capturedPreviewUrl, setCapturedPreviewUrl] = useState<string>("");
  const [capturedLivenessFile, setCapturedLivenessFile] = useState<File | null>(null);
  const [quickReviewSelfieImageError, setQuickReviewSelfieImageError] = useState(false);
  const [uploadingWorkProof, setUploadingWorkProof] = useState(false);
  const [uploadingWorkProofName, setUploadingWorkProofName] = useState<string>("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const previousStepRef = useRef(1);

  const [draft, setDraft] = useState<Phase2DraftData>({
    linkedInUrl: "",
    portfolioUrl: "",
    workProofFiles: [],
    introVideoUrl: "",
    introVideoDurationConfirmed: false,
  });

  const totalSteps = 4;

  const completedStepCount = useMemo(() => {
    const step1 = Boolean(draft.livenessPhotoUrl);
    const step2 = Boolean(
      (draft.linkedInUrl && isLinkedInUrl(draft.linkedInUrl)) ||
        (draft.portfolioUrl && isSecureUrl(draft.portfolioUrl)) ||
        (draft.workProofFiles && draft.workProofFiles.length > 0)
    );
    const step3 = Boolean(
      draft.introVideoUrl &&
        isAllowedVideoUrl(draft.introVideoUrl) &&
        draft.introVideoDurationConfirmed
    );
    const step4 = currentStatus === "under_review" || currentStatus === "verified";

    return [step1, step2, step3, step4].filter(Boolean).length;
  }, [draft, currentStatus]);

  const progressPercent = (completedStepCount / totalSteps) * 100;
  const quickReviewSelfieSrc = capturedPreviewUrl || draft.livenessPhotoUrl || "";

  useEffect(() => {
    setQuickReviewSelfieImageError(false);
  }, [capturedPreviewUrl, draft.livenessPhotoUrl]);

  useEffect(() => {
    if (step > previousStepRef.current) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    previousStepRef.current = step;
  }, [step]);

  useEffect(() => {
    const init = async () => {
      try {
        const status = await fetchMentorPhase2Status();
        if (!status) {
          setEligible(false);
          return;
        }

        setMentorId(status.id);
        setAttemptCount(status.phase2_attempt_count || 0);
        setMaxAttempts(status.phase2_max_attempts || 3);
        setLocked(Boolean(status.phase2_locked));
        setCurrentStatus(status.verification_status || "pending");
        setRejectionReason(status.phase2_rejection_reason || "");

        const isEligibleMentor =
          status.onboarding_version === "v2" &&
          status.phase_1_complete === true &&
          status.phase_2_complete !== true;

        if (!isEligibleMentor) {
          setEligible(false);
          return;
        }

        const localDraftRaw = localStorage.getItem(PHASE2_LOCAL_STORAGE_KEY);
        let localDraft: Phase2DraftData = {};
        if (localDraftRaw) {
          try {
            localDraft = JSON.parse(localDraftRaw);
          } catch {
            localStorage.removeItem(PHASE2_LOCAL_STORAGE_KEY);
          }
        }

        setDraft({
          linkedInUrl: "",
          portfolioUrl: "",
          workProofFiles: [],
          introVideoUrl: "",
          introVideoDurationConfirmed: false,
          ...(status.phase2_draft_data || {}),
          ...localDraft,
        });
      } catch (error: any) {
        toast.error(error.message || "Failed to load Phase 2 onboarding");
        setEligible(false);
      } finally {
        setLoading(false);
      }
    };

    init();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      if (capturedPreviewUrl) {
        URL.revokeObjectURL(capturedPreviewUrl);
      }
    };
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
  };

  const startCamera = async () => {
    if (locked) {
      toast.error(`Verification is locked. Contact ${SUPPORT_EMAIL}.`);
      return;
    }

    try {
      setCameraError("");
      setCameraBusy(true);

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera is not supported in this browser.");
      }

      stopCamera();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (!videoRef.current) {
        throw new Error("Camera preview is not available.");
      }

      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setCameraActive(true);
    } catch (error: any) {
      const message =
        error?.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access and try again."
          : error?.message || "Failed to start camera.";

      setCameraError(message);
      toast.error(message);
      stopCamera();
    } finally {
      setCameraBusy(false);
    }
  };

  const persistLocalDraft = (nextDraft: Phase2DraftData) => {
    localStorage.setItem(PHASE2_LOCAL_STORAGE_KEY, JSON.stringify(nextDraft));
  };

  useEffect(() => {
    if (!mentorId || loading || !eligible) {
      return;
    }

    persistLocalDraft(draft);

    const timer = window.setTimeout(async () => {
      setAutoSavingDraft(true);
      const result = await savePhase2Draft(draft);
      if (result.success) {
        setAutoSaveMessage("Draft auto-saved");
      } else {
        setAutoSaveMessage("Offline/local draft saved. Will sync when possible.");
      }
      setAutoSavingDraft(false);
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [draft, mentorId, loading, eligible]);

  const registerFailedAttempt = async (message: string) => {
    const result = await incrementPhase2AttemptCount();
    setAttemptCount(result.attempts);
    setMaxAttempts(result.maxAttempts);
    setLocked(result.locked);

    if (result.locked) {
      toast.error(
        `${message} Maximum attempts reached. Contact ${SUPPORT_EMAIL}.`
      );
      return;
    }

    toast.error(`${message} Attempts: ${result.attempts}/${result.maxAttempts}`);
  };

  const handleCaptureSelfie = async () => {
    if (locked) {
      toast.error(`Verification is locked. Contact ${SUPPORT_EMAIL}.`);
      return;
    }

    if (!cameraActive || !videoRef.current) {
      toast.error("Please start the camera first.");
      return;
    }

    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight) {
      toast.error("Camera is not ready yet. Please try again.");
      return;
    }

    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Could not capture image from camera.");
      }

      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) => {
            if (!result) {
              reject(new Error("Failed to capture image."));
              return;
            }
            resolve(result);
          },
          "image/jpeg",
          0.92
        );
      });

      const capturedFile = new File(
        [blob],
        `phase2-live-selfie-${Date.now()}.jpg`,
        { type: "image/jpeg" }
      );

      if (capturedPreviewUrl) {
        URL.revokeObjectURL(capturedPreviewUrl);
      }
      setCapturedPreviewUrl(URL.createObjectURL(capturedFile));
      setCapturedLivenessFile(capturedFile);
      stopCamera();
      toast.success("Selfie captured. Click Verify to continue.");
    } catch (error: any) {
      toast.error(error.message || "Failed to capture selfie.");
    }
  };

  const handleVerifyCapturedSelfie = async () => {
    if (locked) {
      toast.error(`Verification is locked. Contact ${SUPPORT_EMAIL}.`);
      return;
    }

    if (!capturedLivenessFile) {
      toast.error("Please capture a selfie first.");
      return;
    }

    setVerifyingLiveness(true);
    try {
      const check = await defaultLivenessProvider.verifySelfie(capturedLivenessFile);
      if (!check.passed) {
        await registerFailedAttempt(check.message);
        return;
      }

      const uploadedUrl = await uploadPhase2File(mentorId, capturedLivenessFile, "liveness");

      const nextDraft: Phase2DraftData = {
        ...draft,
        livenessPhotoUrl: uploadedUrl,
      };

      setDraft(nextDraft);
      persistLocalDraft(nextDraft);
      await savePhase2Draft(nextDraft);
      setCapturedLivenessFile(null);
      toast.success("Identity verification (selfie) completed.");
      setStep(2);
    } catch (error: any) {
      await registerFailedAttempt(error.message || "Liveness verification failed.");
    } finally {
      setVerifyingLiveness(false);
    }
  };

  const handleWorkProofUpload = async (file: File) => {
    const allowedMime = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
    if (!allowedMime.includes(file.type)) {
      toast.error("Only PDF, PNG, JPG, and WEBP files are allowed.");
      return;
    }

    if (file.size > 12 * 1024 * 1024) {
      toast.error("File must be under 12MB.");
      return;
    }

    setUploadingWorkProof(true);
    setUploadingWorkProofName(file.name);
    try {
      const uploadedUrl = await uploadPhase2File(mentorId, file, "proofs");
      const item: Phase2ProofItem = {
        id: crypto.randomUUID(),
        type: "work_proof_file",
        label: file.name,
        url: uploadedUrl,
        meta: {
          size: file.size,
          mime: file.type,
        },
      };

      const nextDraft = {
        ...draft,
        workProofFiles: [...(draft.workProofFiles || []), item],
      };

      setDraft(nextDraft);
      persistLocalDraft(nextDraft);
      await savePhase2Draft(nextDraft);
      toast.success("Work proof uploaded.");
    } finally {
      setUploadingWorkProof(false);
      setUploadingWorkProofName("");
    }
  };

  const removeWorkProof = async (proofId: string) => {
    const nextDraft = {
      ...draft,
      workProofFiles: (draft.workProofFiles || []).filter((p) => p.id !== proofId),
    };

    setDraft(nextDraft);
    persistLocalDraft(nextDraft);
    await savePhase2Draft(nextDraft);
  };

  const handleProofsNext = async () => {
    if (draft.linkedInUrl && !isLinkedInUrl(draft.linkedInUrl)) {
      toast.error("LinkedIn verification must be a secure LinkedIn URL.");
      return;
    }

    if (draft.portfolioUrl && !isSecureUrl(draft.portfolioUrl)) {
      toast.error("Portfolio URL must be secure (https). ");
      return;
    }

    if (draft.portfolioUrl && !isLikelyPortfolioUrl(draft.portfolioUrl)) {
      toast.error("Portfolio URL looks suspicious or not portfolio-like.");
      return;
    }

    const hasOneProof = Boolean(
      (draft.linkedInUrl && isLinkedInUrl(draft.linkedInUrl)) ||
        (draft.portfolioUrl && isSecureUrl(draft.portfolioUrl)) ||
        (draft.workProofFiles && draft.workProofFiles.length > 0)
    );

    if (!hasOneProof) {
      toast.error("Please provide at least one proof item.");
      return;
    }

    await savePhase2Draft(draft);
    setStep(3);
  };

  const handleVideoNext = async () => {
    if (!draft.introVideoUrl || !isAllowedVideoUrl(draft.introVideoUrl)) {
      toast.error("Please provide a secure YouTube or Google Drive video URL.");
      return;
    }

    if (!draft.introVideoDurationConfirmed) {
      toast.error("Please confirm your intro video is max 2 minutes.");
      return;
    }

    await savePhase2Draft(draft);
    setStep(4);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const result = await submitPhase2Verification(draft);
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      localStorage.removeItem(PHASE2_LOCAL_STORAGE_KEY);
      toast.success("Submitted. Your status is now under review.");
      navigate("/mentor/dashboard");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-sm text-gray-600">Loading Phase 2 onboarding...</p>
      </div>
    );
  }

  if (!eligible) {
    return (
      <div className="min-h-screen bg-white py-10 px-4">
        <div className="max-w-3xl mx-auto">
          <Card className="border-gray-100 shadow-none rounded-2xl">
            <CardHeader>
              <CardTitle>Phase 2 onboarding is not available</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600">
                This flow is only available for new mentors on onboarding version v2 who completed Phase 1.
              </p>
              <Button onClick={() => navigate("/mentor/dashboard")}>Go to Dashboard</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <OnboardingHeader />

      <div className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        <div className="mb-2">
          <div className="flex justify-center mb-6">
            <img
              src="/lovable-uploads/14bf0eea-1bc9-4675-9231-356df10eb82d.png"
              alt="MatePeak"
              className="h-10 w-auto"
            />
          </div>

          <div className="flex items-center justify-center gap-2 mb-2">
            {[1, 2, 3, 4].map((stepNum) => (
              <div
                key={stepNum}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  stepNum < step
                    ? "w-8 bg-emerald-500"
                    : stepNum === step
                    ? "w-12 bg-gray-900"
                    : "w-8 bg-gray-200"
                )}
              />
            ))}
          </div>
          <p className="text-center text-xs text-gray-400">Step {step} of {totalSteps}</p>
        </div>

        <Card className="border-gray-100 shadow-none rounded-2xl">
          <CardContent className="p-8">
            <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Phase 2 Onboarding Verification</h1>
            <p className="text-sm text-gray-500 mt-2">
              Complete all 4 mandatory steps to unlock verified mentor benefits.
            </p>
          </CardContent>
        </Card>

        {step === 1 && (
          <Card className="border-gray-100 shadow-none rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" /> Identity Verification (Selfie liveness)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Live camera verification</Label>
                <div className="relative rounded-lg border border-gray-200 bg-black/90 overflow-hidden aspect-video flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${cameraActive ? "block" : "hidden"}`}
                  />

                  {!cameraActive && (capturedPreviewUrl || draft.livenessPhotoUrl) && (
                    <img
                      src={capturedPreviewUrl || draft.livenessPhotoUrl}
                      alt="Captured selfie preview"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}

                  {!cameraActive && !(capturedPreviewUrl || draft.livenessPhotoUrl) && (
                    <div className="flex flex-col items-center gap-4 px-4 text-center">
                      <p className="text-sm text-gray-200">
                        Start camera and capture a live selfie for liveness validation.
                      </p>
                      <Button
                        variant="outline"
                        onClick={startCamera}
                        disabled={cameraBusy || locked || verifyingLiveness}
                        className="bg-white/90 hover:bg-white text-gray-900 border-gray-300"
                      >
                        {cameraBusy ? "Starting camera..." : "Start Camera"}
                      </Button>
                    </div>
                  )}

                  {verifyingLiveness && (
                    <>
                      <div className="absolute inset-0 bg-black/28 pointer-events-none" />
                      <div className="absolute inset-3 rounded-xl border border-emerald-300/45 pointer-events-none" />
                      <div className="absolute inset-y-0 -left-24 w-24 bg-gradient-to-r from-transparent via-emerald-300/65 to-transparent blur-[0.5px] phase2-scan-line pointer-events-none" />
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/90 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-gray-900 border border-gray-200 shadow-sm pointer-events-none">
                        Verifying live selfie...
                      </div>
                    </>
                  )}
                </div>
                {cameraError && (
                  <p className="text-sm text-red-600">{cameraError}</p>
                )}
              </div>

              <div className="flex justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  {cameraActive && (
                    <Button className="h-11 rounded-xl" variant="outline" onClick={stopCamera} disabled={verifyingLiveness}>
                      Stop Camera
                    </Button>
                  )}

                  {(capturedPreviewUrl || draft.livenessPhotoUrl) && !cameraActive && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setCapturedLivenessFile(null);
                        if (capturedPreviewUrl) {
                          URL.revokeObjectURL(capturedPreviewUrl);
                          setCapturedPreviewUrl("");
                        }
                        startCamera();
                      }}
                      disabled={cameraBusy || locked || verifyingLiveness}
                      className="h-11 rounded-xl"
                    >
                      Retake
                    </Button>
                  )}

                </div>

                <div className="flex items-center gap-2">
                  {!cameraActive && Boolean(capturedLivenessFile) && !verifyingLiveness && (
                    <PlainGreenTick className="h-4 w-4" />
                  )}
                  <Button
                    className="h-11 rounded-xl"
                    onClick={
                      cameraActive
                        ? handleCaptureSelfie
                        : draft.livenessPhotoUrl
                        ? () => setStep(2)
                        : handleVerifyCapturedSelfie
                    }
                    disabled={
                      verifyingLiveness ||
                      locked ||
                      (cameraActive
                        ? false
                        : draft.livenessPhotoUrl
                        ? false
                        : !capturedLivenessFile)
                    }
                  >
                    {verifyingLiveness
                      ? "Verifying..."
                      : cameraActive
                      ? "Capture"
                      : draft.livenessPhotoUrl
                      ? "Next"
                      : "Verify"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card className="border-gray-100 shadow-none rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link className="h-5 w-5" /> Add proof (at least one required)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>LinkedIn verification URL</Label>
                <div className="relative">
                  <Input
                    className={draft.linkedInUrl && isLinkedInUrl(draft.linkedInUrl) ? "pr-10" : ""}
                    placeholder="https://www.linkedin.com/in/your-profile"
                    value={draft.linkedInUrl || ""}
                    onChange={(e) => setDraft((p) => ({ ...p, linkedInUrl: e.target.value.trim() }))}
                  />
                  {draft.linkedInUrl && isLinkedInUrl(draft.linkedInUrl) && (
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                      <PlainGreenTick className="h-4 w-4" />
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Portfolio / GitHub / Case study URL</Label>
                <div className="relative">
                  <Input
                    className={draft.portfolioUrl && isSecureUrl(draft.portfolioUrl) ? "pr-10" : ""}
                    placeholder="https://github.com/your-handle"
                    value={draft.portfolioUrl || ""}
                    onChange={(e) => setDraft((p) => ({ ...p, portfolioUrl: e.target.value.trim() }))}
                  />
                  {draft.portfolioUrl && isSecureUrl(draft.portfolioUrl) && (
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                      <PlainGreenTick className="h-4 w-4" />
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Work experience proof file</Label>
                <input
                  id="work-proof-upload"
                  type="file"
                  accept="application/pdf,image/png,image/jpeg,image/webp"
                  className="sr-only"
                  disabled={uploadingWorkProof}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      await handleWorkProofUpload(file);
                    } catch (error: any) {
                      toast.error(error.message || "Failed to upload proof file.");
                    }
                    e.currentTarget.value = "";
                  }}
                />
                <label
                  htmlFor="work-proof-upload"
                  className={cn(
                    "group flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 transition-colors",
                    uploadingWorkProof
                      ? "cursor-not-allowed bg-gray-50"
                      : "cursor-pointer hover:bg-gray-50"
                  )}
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {uploadingWorkProof ? "Uploading proof file..." : "Upload PDF or image proof"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {uploadingWorkProof && uploadingWorkProofName
                        ? uploadingWorkProofName
                        : "Accepted: PDF, PNG, JPG, WEBP"}
                    </p>
                  </div>
                  {uploadingWorkProof ? (
                    <span className="inline-flex items-center gap-2 text-xs font-medium text-gray-600">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading
                    </span>
                  ) : (draft.workProofFiles || []).length > 0 ? (
                    <span className="inline-flex items-center">
                      <PlainGreenTick className="h-4 w-4" />
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors group-hover:bg-gray-50">
                      <Upload className="h-3.5 w-3.5" />
                      Choose File
                    </span>
                  )}
                </label>
              </div>

              {(draft.workProofFiles || []).length > 0 && (
                <div className="space-y-2">
                  {(draft.workProofFiles || []).map((proof) => (
                    <div key={proof.id} className="flex items-center justify-between rounded-lg border p-2 text-sm">
                      <span className="truncate">{proof.label}</span>
                      <Button variant="ghost" size="sm" onClick={() => removeWorkProof(proof.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between gap-3 pt-1">
                <Button className="h-11 rounded-xl" variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button className="h-11 rounded-xl" onClick={handleProofsNext}>Next</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card className="border-gray-100 shadow-none rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" /> Intro video (YouTube/Drive)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Intro video URL (required)</Label>
                <Input
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={draft.introVideoUrl || ""}
                  onChange={(e) => setDraft((p) => ({ ...p, introVideoUrl: e.target.value.trim() }))}
                />
                <p className="text-xs text-gray-500">
                  Must be HTTPS and hosted on YouTube or Google Drive. Max 2 minutes.
                </p>
              </div>

              <div className="flex items-start gap-2">
                <Checkbox
                  id="duration-check"
                  checked={Boolean(draft.introVideoDurationConfirmed)}
                  onCheckedChange={(checked) =>
                    setDraft((p) => ({ ...p, introVideoDurationConfirmed: Boolean(checked) }))
                  }
                />
                <Label htmlFor="duration-check" className="text-sm leading-5">
                  Duration confirmed
                </Label>
              </div>

              <div className="flex justify-between gap-3 pt-1">
                <Button className="h-11 rounded-xl" variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button className="h-11 rounded-xl" onClick={handleVideoNext}>Next</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card className="border-gray-100 shadow-none rounded-2xl">
            <CardHeader>
              <CardTitle className="text-xl font-semibold tracking-tight text-gray-900">Quick review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 md:p-6">
                <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 space-y-3">
                  <p className="text-sm font-semibold text-gray-900">Step 1 — Identity Verification</p>
                  <div className="text-sm text-gray-700">
                    <span className="font-medium text-gray-900">Status:</span>{" "}
                    {draft.livenessPhotoUrl ? "Completed" : "Missing"}
                  </div>
                  {draft.livenessPhotoUrl && (
                    <div className="pt-1">
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Captured selfie preview</p>
                      {quickReviewSelfieSrc && !quickReviewSelfieImageError ? (
                        <img
                          src={quickReviewSelfieSrc}
                          alt="Captured selfie"
                          className="h-40 w-auto rounded-lg border border-gray-200 object-cover"
                          onError={() => setQuickReviewSelfieImageError(true)}
                        />
                      ) : (
                        <a
                          href={draft.livenessPhotoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-gray-900 underline decoration-gray-300 underline-offset-4 break-all"
                        >
                          View uploaded selfie
                        </a>
                      )}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 space-y-3">
                  <p className="text-sm font-semibold text-gray-900">Step 2 — Proofs</p>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p>
                      <span className="font-medium text-gray-900">LinkedIn URL:</span>{" "}
                      {draft.linkedInUrl ? (
                        <a
                          href={draft.linkedInUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-gray-900 underline decoration-gray-300 underline-offset-4 break-all"
                        >
                          {draft.linkedInUrl}
                        </a>
                      ) : (
                        "Not provided"
                      )}
                    </p>
                    <p>
                      <span className="font-medium text-gray-900">Portfolio / Case-study URL:</span>{" "}
                      {draft.portfolioUrl ? (
                        <a
                          href={draft.portfolioUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-gray-900 underline decoration-gray-300 underline-offset-4 break-all"
                        >
                          {draft.portfolioUrl}
                        </a>
                      ) : (
                        "Not provided"
                      )}
                    </p>

                    <div>
                      <p>
                        <span className="font-medium text-gray-900">Work proof files:</span>{" "}
                        {(draft.workProofFiles || []).length > 0
                          ? `${(draft.workProofFiles || []).length} uploaded`
                          : "None uploaded"}
                      </p>
                      {(draft.workProofFiles || []).length > 0 && (
                        <ul className="mt-2 space-y-1.5 list-disc list-inside text-gray-700">
                          {(draft.workProofFiles || []).map((proof) => (
                            <li key={proof.id}>
                              {proof.url ? (
                                <a
                                  href={proof.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-gray-900 underline decoration-gray-300 underline-offset-4 break-all"
                                >
                                  {proof.label}
                                </a>
                              ) : (
                                proof.label
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 space-y-3">
                  <p className="text-sm font-semibold text-gray-900">Step 3 — Intro Video</p>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p>
                      <span className="font-medium text-gray-900">Video URL:</span>{" "}
                      {draft.introVideoUrl ? (
                        <a
                          href={draft.introVideoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-gray-900 underline decoration-gray-300 underline-offset-4 break-all"
                        >
                          {draft.introVideoUrl}
                        </a>
                      ) : (
                        "Not provided"
                      )}
                    </p>
                    <p>
                      <span className="font-medium text-gray-900">Duration confirmation:</span>{" "}
                      {draft.introVideoDurationConfirmed ? "Confirmed (≤ 2 min)" : "Not confirmed"}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-gray-600 pt-1">
                  <p>
                    This is a read-only summary. If you need to change anything, click <strong>Back</strong> and edit previous steps.
                  </p>
                  <p>
                    On submit, status becomes <strong>Under Review</strong>. Admin approval unlocks verified badge and Unlimited booking.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3.5 text-sm text-gray-700">
                <AlertTriangle className="inline h-4 w-4 mr-1" />
                Rejections allow resubmission up to {maxAttempts} attempts.
              </div>

              <div className="flex flex-wrap justify-between gap-3">
                <div className="flex gap-2">
                  <Button className="h-11 rounded-xl" variant="outline" onClick={() => setStep(3)}>
                    Back
                  </Button>
                </div>

                <Button className="h-11 rounded-xl" onClick={handleSubmit} disabled={submitting || locked}>
                  {submitting ? "Submitting..." : "Submit for admin review"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
