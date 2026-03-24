import { supabase } from "@/integrations/supabase/client";

export interface Phase2ProofItem {
  id: string;
  type: "linkedin" | "work_proof_file" | "portfolio_url";
  label: string;
  url: string;
  meta?: Record<string, unknown>;
}

export interface Phase2DraftData {
  livenessPhotoUrl?: string;
  linkedInUrl?: string;
  portfolioUrl?: string;
  workProofFiles?: Phase2ProofItem[];
  introVideoUrl?: string;
  introVideoDurationConfirmed?: boolean;
}

export interface MentorPhase2Status {
  id: string;
  onboarding_version: string | null;
  phase_1_complete: boolean | null;
  phase_2_complete: boolean | null;
  verification_status: string | null;
  phase2_progress: number | null;
  phase2_attempt_count: number | null;
  phase2_max_attempts: number | null;
  phase2_locked: boolean | null;
  phase2_draft_data: Phase2DraftData | null;
  phase2_skipped_at: string | null;
  phase2_rejection_reason: string | null;
  phase2_review_notes: string | null;
}

export interface LivenessCheckResult {
  passed: boolean;
  message: string;
}

export interface LivenessProvider {
  name: string;
  verifySelfie(file: File): Promise<LivenessCheckResult>;
}

class SelfieOnlyMvpLivenessProvider implements LivenessProvider {
  name = "selfie-only-mvp";

  async verifySelfie(file: File): Promise<LivenessCheckResult> {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    const maxBytes = 8 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      return {
        passed: false,
        message: "Please upload a clear selfie as JPG, PNG, or WEBP.",
      };
    }

    if (file.size > maxBytes) {
      return {
        passed: false,
        message: "Selfie file is too large. Please upload under 8MB.",
      };
    }

    const dimensions = await getImageDimensions(file);
    if (dimensions.width < 400 || dimensions.height < 400) {
      return {
        passed: false,
        message: "Selfie resolution is too low. Please upload a clearer image.",
      };
    }

    return {
      passed: true,
      message: "Liveness selfie looks valid.",
    };
  }
}

export const defaultLivenessProvider: LivenessProvider =
  new SelfieOnlyMvpLivenessProvider();

export const SUPPORT_EMAIL = "support@matepeak.com";

export const isSecureUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
};

export const isAllowedVideoUrl = (url: string): boolean => {
  if (!isSecureUrl(url)) return false;

  const parsed = new URL(url);
  const host = parsed.hostname.toLowerCase();

  return (
    host.includes("youtube.com") ||
    host === "youtu.be" ||
    host.includes("drive.google.com")
  );
};

export const isLinkedInUrl = (url: string): boolean => {
  if (!isSecureUrl(url)) return false;
  const host = new URL(url).hostname.toLowerCase();
  return host.includes("linkedin.com");
};

export const isLikelyPortfolioUrl = (url: string): boolean => {
  if (!isSecureUrl(url)) return false;
  const host = new URL(url).hostname.toLowerCase();
  return (
    host.includes("github.com") ||
    host.includes("behance.net") ||
    host.includes("dribbble.com") ||
    host.includes("notion.site") ||
    host.includes("medium.com") ||
    host.includes("substack.com") ||
    host.includes("webflow.io") ||
    host.includes("vercel.app") ||
    host.includes("netlify.app") ||
    host.includes("portfolio") ||
    host.includes("case")
  );
};

export const getPhase2CompletionProgress = (draft: Phase2DraftData): number => {
  const done = [
    Boolean(draft.livenessPhotoUrl),
    Boolean(
      (draft.linkedInUrl && isLinkedInUrl(draft.linkedInUrl)) ||
        (draft.portfolioUrl && isSecureUrl(draft.portfolioUrl)) ||
        (draft.workProofFiles && draft.workProofFiles.length > 0)
    ),
    Boolean(
      draft.introVideoUrl &&
        isAllowedVideoUrl(draft.introVideoUrl) &&
        draft.introVideoDurationConfirmed
    ),
    false,
  ];

  return done.filter(Boolean).length;
};

export async function fetchMentorPhase2Status(): Promise<MentorPhase2Status | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("expert_profiles")
    .select(
      "id, onboarding_version, phase_1_complete, phase_2_complete, verification_status, phase2_progress, phase2_attempt_count, phase2_max_attempts, phase2_locked, phase2_draft_data, phase2_skipped_at, phase2_rejection_reason, phase2_review_notes"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as MentorPhase2Status) || null;
}

export async function uploadPhase2File(
  userId: string,
  file: File,
  folder: "liveness" | "proofs"
): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `${userId}/phase2/${folder}/${Date.now()}_${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("verification-documents")
    .upload(filePath, file, { upsert: false });

  if (uploadError) {
    throw uploadError;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("verification-documents").getPublicUrl(filePath);

  return publicUrl;
}

export async function savePhase2Draft(
  payload: Partial<Phase2DraftData>
): Promise<{ success: boolean; message: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "You must be logged in." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("expert_profiles")
    .select("phase2_draft_data")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return { success: false, message: profileError.message };
  }

  const mergedDraft: Phase2DraftData = {
    ...((profile?.phase2_draft_data as Phase2DraftData) || {}),
    ...payload,
  };

  const progress = getPhase2CompletionProgress(mergedDraft);

  const { error } = await supabase
    .from("expert_profiles")
    .update({
      phase2_draft_data: mergedDraft,
      phase2_progress: progress,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return { success: false, message: error.message };
  }

  return { success: true, message: "Draft saved." };
}

export async function markPhase2Skipped(): Promise<{ success: boolean; message: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "You must be logged in." };
  }

  const { error } = await supabase
    .from("expert_profiles")
    .update({ phase2_skipped_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    return { success: false, message: error.message };
  }

  return { success: true, message: "Phase 2 skipped." };
}

export async function incrementPhase2AttemptCount(): Promise<{
  success: boolean;
  locked: boolean;
  attempts: number;
  maxAttempts: number;
  message: string;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      locked: false,
      attempts: 0,
      maxAttempts: 3,
      message: "You must be logged in.",
    };
  }

  const { data: profile, error: fetchError } = await supabase
    .from("expert_profiles")
    .select("phase2_attempt_count, phase2_max_attempts")
    .eq("id", user.id)
    .single();

  if (fetchError) {
    return {
      success: false,
      locked: false,
      attempts: 0,
      maxAttempts: 3,
      message: fetchError.message,
    };
  }

  const attempts = (profile?.phase2_attempt_count || 0) + 1;
  const maxAttempts = Math.max(profile?.phase2_max_attempts || 3, 1);
  const locked = attempts >= maxAttempts;

  const { error: updateError } = await supabase
    .from("expert_profiles")
    .update({
      phase2_attempt_count: attempts,
      phase2_locked: locked,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (updateError) {
    return {
      success: false,
      locked,
      attempts,
      maxAttempts,
      message: updateError.message,
    };
  }

  return {
    success: true,
    locked,
    attempts,
    maxAttempts,
    message: locked
      ? `Maximum attempts reached. Please contact ${SUPPORT_EMAIL}.`
      : "Attempt recorded.",
  };
}

export async function submitPhase2Verification(
  draft: Phase2DraftData
): Promise<{ success: boolean; message: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "You must be logged in." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("expert_profiles")
    .select("id, verification_status, phase2_locked, phase2_attempt_count, phase2_max_attempts, onboarding_version, phase_1_complete, phase_2_complete")
    .eq("id", user.id)
    .single();

  if (profileError) {
    return { success: false, message: profileError.message };
  }

  if (profile?.onboarding_version !== "v2") {
    return {
      success: false,
      message: "Phase 2 onboarding applies only to new mentors.",
    };
  }

  if (!profile?.phase_1_complete || profile?.phase_2_complete) {
    return {
      success: false,
      message: "Phase 2 is only available after Phase 1 and before completion.",
    };
  }

  if (profile?.phase2_locked) {
    return {
      success: false,
      message: `You have reached the maximum attempts. Contact ${SUPPORT_EMAIL}.`,
    };
  }

  const hasAtLeastOneProof = Boolean(
    (draft.linkedInUrl && isLinkedInUrl(draft.linkedInUrl)) ||
      (draft.portfolioUrl && isSecureUrl(draft.portfolioUrl)) ||
      (draft.workProofFiles && draft.workProofFiles.length > 0)
  );

  if (!draft.livenessPhotoUrl) {
    return { success: false, message: "Identity verification selfie is required." };
  }

  if (!hasAtLeastOneProof) {
    return { success: false, message: "Please add at least one proof item." };
  }

  if (!draft.introVideoUrl || !isAllowedVideoUrl(draft.introVideoUrl)) {
    return {
      success: false,
      message: "Please provide a valid HTTPS YouTube or Google Drive intro video URL.",
    };
  }

  if (!draft.introVideoDurationConfirmed) {
    return {
      success: false,
      message: "Please confirm the intro video is under 2 minutes.",
    };
  }

  const proofs: Phase2ProofItem[] = [
    ...(draft.workProofFiles || []),
    ...(draft.linkedInUrl
      ? [
          {
            id: crypto.randomUUID(),
            type: "linkedin" as const,
            label: "LinkedIn verification",
            url: draft.linkedInUrl,
          },
        ]
      : []),
    ...(draft.portfolioUrl
      ? [
          {
            id: crypto.randomUUID(),
            type: "portfolio_url" as const,
            label: "Portfolio / Case studies",
            url: draft.portfolioUrl,
          },
        ]
      : []),
  ];

  const nowIso = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("expert_profiles")
    .update({
      phase_2_complete: true,
      verification_status: "under_review",
      phase2_review_status: "under_review",
      phase2_progress: 4,
      phase2_submitted_at: nowIso,
      phase2_liveness_photo_url: draft.livenessPhotoUrl,
      phase2_intro_video_url: draft.introVideoUrl,
      phase2_proofs: proofs,
      phase2_draft_data: draft,
      phase2_skipped_at: null,
      phase2_rejection_reason: null,
      verification_rejection_reason: null,
      updated_at: nowIso,
    })
    .eq("id", user.id);

  if (updateError) {
    return { success: false, message: updateError.message };
  }

  const { data: mentorProfile } = await supabase
    .from("expert_profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const { data: baseProfile } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", user.id)
    .maybeSingle();

  const mentorName =
    mentorProfile?.full_name || baseProfile?.full_name || "Mentor";
  const mentorEmail = baseProfile?.email || "";

  if (mentorEmail) {
    await supabase.functions.invoke("send-email", {
      body: {
        to: mentorEmail,
        subject: "Phase 2 submitted — Under Review",
        html: `
          <p>Hi ${mentorName},</p>
          <p>Your Phase 2 verification has been successfully submitted and is now <strong>Under Review</strong>.</p>
          <p><strong>What to expect next:</strong></p>
          <ul>
            <li>Our team will review your selfie, proof links/files, and intro video.</li>
            <li>If approved, your profile will be marked <strong>Verified</strong> and you will get another confirmation email.</li>
            <li>If updates are needed, we will email you with the reason so you can edit and resubmit.</li>
          </ul>
          <p>No action is required from you right now.</p>
          <p>If you have questions, contact us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
          <p>Thanks,<br/>MatePeak Team</p>
        `,
      },
    });
  }

  await supabase.functions.invoke("send-email", {
    body: {
      to: SUPPORT_EMAIL,
      subject: "New mentor Phase 2 verification submission",
      html: `<p>A mentor submitted Phase 2 verification.</p><p>Name: ${mentorName}</p><p>User ID: ${user.id}</p><p>Status: under_review</p>`,
    },
  });

  return {
    success: true,
    message: "Phase 2 verification submitted. Status: under review.",
  };
}

const getImageDimensions = async (
  file: File
): Promise<{ width: number; height: number }> => {
  const imageUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const instance = new Image();
      instance.onload = () => resolve(instance);
      instance.onerror = () => reject(new Error("Could not read image"));
      instance.src = imageUrl;
    });

    return { width: img.width, height: img.height };
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
};
