import { Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { PasswordInput } from "@/components/ui/password-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import ImageEditor from "@/components/onboarding/ImageEditor";
import { Camera, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type SignupRole = "student" | "mentor";
type SignupStep = "email" | "otp" | "details";

const STEP_EXIT_DURATION_MS = 180;
const STEP_ENTER_DURATION_MS = 320;
const STEP_EXIT_CLASS = "animate-step-exit-left";
const STEP_ENTER_CLASS = "animate-step-enter-right";

const STEP_MAX_WIDTH_CLASS: Record<SignupStep, string> = {
  email: "max-w-[340px]",
  otp: "max-w-[420px]",
  details: "max-w-[420px]",
};

type MultiStepSignupFormProps = {
  role: SignupRole;
  successRedirectPath: string;
};

type OtpFunctionResponse = {
  success?: boolean;
  message?: string;
  expires_in_seconds?: number;
  resend_available_in_seconds?: number;
  retry_after_seconds?: number;
};

const getFunctionErrorMessage = async (error: any, fallback: string): Promise<string> => {
  try {
    const context = error?.context;
    if (context) {
      const payload = await context.json();
      if (payload?.message && typeof payload.message === "string") {
        return payload.message;
      }
    }
  } catch {
  }

  if (error?.message && typeof error.message === "string") {
    return error.message;
  }

  return fallback;
};

const sanitizeUserErrorMessage = (message: string | undefined, fallback: string): string => {
  if (!message) return fallback;

  const normalized = message.trim();
  if (!normalized) return fallback;

  if (normalized.toLowerCase().includes("edge function returned a non-2xx status code")) {
    return fallback;
  }

  return normalized;
};

const extractWaitSeconds = (message: string | undefined): number | null => {
  if (!message) return null;
  const match = message.match(/please\s+wait\s+(\d+)s?/i);
  if (!match) return null;
  const seconds = Number(match[1]);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
};

export default function MultiStepSignupForm({ role, successRedirectPath }: MultiStepSignupFormProps) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [signupStep, setSignupStep] = useState<SignupStep>("email");
  const [signupEmail, setSignupEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState(false);
  const [otpErrorAnimationKey, setOtpErrorAnimationKey] = useState(0);
  const [emailError, setEmailError] = useState("");
  const [continueShakeKey, setContinueShakeKey] = useState(0);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState("");
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [isImageEditorOpen, setIsImageEditorOpen] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState("");
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [stepAnimationClass, setStepAnimationClass] = useState("");
  const [resendSecondsLeft, setResendSecondsLeft] = useState(0);
  const [otpExpirySecondsLeft, setOtpExpirySecondsLeft] = useState(0);
  const isVerifyingOtpRef = useRef(false);
  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const stepSwitchTimeoutRef = useRef<number | null>(null);
  const stepClearAnimationTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (resendSecondsLeft <= 0) return;

    const timerId = window.setInterval(() => {
      setResendSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timerId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [resendSecondsLeft]);

  useEffect(() => {
    if (otpExpirySecondsLeft <= 0) return;

    const timerId = window.setInterval(() => {
      setOtpExpirySecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timerId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [otpExpirySecondsLeft]);

  useEffect(() => {
    return () => {
      if (stepSwitchTimeoutRef.current !== null) {
        window.clearTimeout(stepSwitchTimeoutRef.current);
      }
      if (stepClearAnimationTimeoutRef.current !== null) {
        window.clearTimeout(stepClearAnimationTimeoutRef.current);
      }
    };
  }, []);

  const loginPath = role === "mentor" ? "/expert/login" : "/student/login";
  const subtitle =
    role === "mentor"
      ? "Create your account. Share what you know. Earn from it."
      : "Create your account. Learn from experts. Grow faster.";
  const otpSlotClassName = cn(
    "h-[4.9rem] w-16 rounded-xl border-2 text-4xl font-medium transition-colors duration-200",
    otpError
      ? "border-red-200 bg-red-50 text-gray-900 hover:border-red-200 focus:border-red-200 focus-visible:border-red-200 active:border-red-200"
      : "border-gray-300 bg-white text-gray-900 hover:border-gray-300 focus:border-gray-300 focus-visible:border-gray-300 active:border-gray-300"
  );

  const transitionToStep = (nextStep: SignupStep) => {
    if (nextStep === signupStep) return;

    if (stepSwitchTimeoutRef.current !== null) {
      window.clearTimeout(stepSwitchTimeoutRef.current);
    }
    if (stepClearAnimationTimeoutRef.current !== null) {
      window.clearTimeout(stepClearAnimationTimeoutRef.current);
    }

    setStepAnimationClass(STEP_EXIT_CLASS);

    stepSwitchTimeoutRef.current = window.setTimeout(() => {
      setSignupStep(nextStep);
      window.requestAnimationFrame(() => {
        setStepAnimationClass(STEP_ENTER_CLASS);
      });

      stepClearAnimationTimeoutRef.current = window.setTimeout(() => {
        setStepAnimationClass("");
      }, STEP_ENTER_DURATION_MS);
    }, STEP_EXIT_DURATION_MS);
  };

  const setResendCooldown = (seconds?: number | null) => {
    const nextSeconds = Number(seconds ?? 0);
    if (!Number.isFinite(nextSeconds) || nextSeconds <= 0) {
      setResendSecondsLeft(0);
      return;
    }
    setResendSecondsLeft(Math.ceil(nextSeconds));
  };

  const setOtpExpiryCountdown = (seconds?: number | null) => {
    const nextSeconds = Number(seconds ?? 0);
    if (!Number.isFinite(nextSeconds) || nextSeconds <= 0) {
      setOtpExpirySecondsLeft(0);
      return;
    }
    setOtpExpirySecondsLeft(Math.ceil(nextSeconds));
  };

  const formatCountdown = (seconds: number): string => {
    const safeSeconds = Math.max(0, Math.floor(seconds));
    const mins = Math.floor(safeSeconds / 60);
    const secs = safeSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const resendBlockSecondsLeft = otpExpirySecondsLeft > 0 ? otpExpirySecondsLeft : resendSecondsLeft;

  const uploadProfilePhotoForUser = async (userId: string): Promise<string | null> => {
    if (!profilePhotoFile) return null;

    const fileExt = profilePhotoFile.name.split(".").pop() || "jpg";
    const filePath = `${userId}/profile-picture.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("profile-pictures")
      .upload(filePath, profilePhotoFile, {
        upsert: true,
        contentType: profilePhotoFile.type,
      });

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from("profile-pictures").getPublicUrl(filePath);

    return publicUrl;
  };

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isEmailVerified) {
      toast.error("Please verify your email before creating account");
      transitionToStep("otp");
      return;
    }

    if (!isPasswordValid) {
      setPasswordError("Password must meet all requirements");
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    if (!profilePhotoFile) {
      toast.error("Please upload your profile photo");
      return;
    }

    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const fullName = formData.get("fullName") as string;

    try {
      const { data, error } = await supabase.functions.invoke<OtpFunctionResponse>("email-otp", {
        body: {
          action: "create_account",
          email: signupEmail,
          password,
          fullName,
          role,
        },
      });

      if (error) {
        const message = await getFunctionErrorMessage(error, "Failed to create account");
        throw new Error(message);
      }

      if (!data?.success) {
        throw new Error(data?.message || "Failed to create account");
      }

      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: signupEmail,
        password,
      });

      if (signInError) {
        throw new Error(signInError.message || "Account created but failed to sign in");
      }

      const user = authData.user;
      if (!user) {
        throw new Error("Account created but user session is missing");
      }

      const avatarUrl = await uploadProfilePhotoForUser(user.id);

      if (avatarUrl) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            avatar_url: avatarUrl,
            full_name: fullName,
            user_type: role,
          })
          .eq("id", user.id);

        if (profileError) {
          console.error("Profile avatar update error:", profileError);
        }

        const { error: userMetadataError } = await supabase.auth.updateUser({
          data: {
            avatar_url: avatarUrl,
            full_name: fullName,
            role,
          },
        });

        if (userMetadataError) {
          console.error("User metadata avatar update error:", userMetadataError);
        }
      }

      toast.success(
        role === "mentor"
          ? "Account created successfully! Redirecting to onboarding..."
          : "Account created successfully! Redirecting to dashboard..."
      );
      navigate(successRedirectPath);
    } catch (error: any) {
      console.error("Unexpected error during signup:", error);

      const message = error?.message || "An unexpected error occurred. Please try again.";

      if (message.toLowerCase().includes("verify otp") || message.toLowerCase().includes("verification expired")) {
        setIsEmailVerified(false);
        transitionToStep("otp");
      }

      if (error.name === "TypeError" && (error.message.includes("fetch") || error.message.includes("network"))) {
        toast.error("Unable to connect to server. Please check your internet connection.");
      } else if (message) {
        toast.error(message);
      } else {
        toast.error("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail) {
      toast.error("Please enter your email address");
      return;
    }

    setIsResettingPassword(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast.success("Password reset email sent! Check your inbox.");
      setForgotPasswordEmail("");
    } catch (error: any) {
      toast.error(error.message || "Failed to send reset email");
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleContinueToOtp = async () => {
    const email = signupEmail.trim();

    if (!email) {
      setEmailError("Please enter your email address.");
      setContinueShakeKey((prev) => prev + 1);
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      setEmailError("Please enter a valid email address.");
      setContinueShakeKey((prev) => prev + 1);
      return;
    }

    setIsSendingOtp(true);
    try {
      const { data, error } = await supabase.functions.invoke<OtpFunctionResponse>("email-otp", {
        body: {
          action: "send",
          email,
        },
      });

      if (error) {
        const message = await getFunctionErrorMessage(error, "Failed to send verification code.");
        throw new Error(sanitizeUserErrorMessage(message, "Failed to send verification code."));
      }
      if (!data?.success) throw new Error(data?.message || "Failed to send verification code.");

      setEmailError("");
      setSignupEmail(email);
      setForgotPasswordEmail(email);
      setOtpCode("");
      setOtpError(false);
      setResendCooldown(data?.resend_available_in_seconds ?? data?.expires_in_seconds);
      setOtpExpiryCountdown(data?.expires_in_seconds);
      transitionToStep("otp");
      setIsEmailVerified(false);
      window.setTimeout(() => otpInputRefs.current[0]?.focus(), 250);
      toast.success("Verification code sent to your email.");
    } catch (error: any) {
      const contextPayload = error?.context ? await error.context.json() : null;
      const safeMessage = sanitizeUserErrorMessage(
        contextPayload?.message || error?.message,
        "Failed to send verification code."
      );
      const retryAfterSeconds = Number(contextPayload?.retry_after_seconds);
      const waitSeconds = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
        ? retryAfterSeconds
        : extractWaitSeconds(safeMessage);

      if (waitSeconds && waitSeconds > 0) {
        setSignupEmail(email);
        setForgotPasswordEmail(email);
        setResendCooldown(waitSeconds);
        setOtpExpiryCountdown(waitSeconds);
        setIsEmailVerified(false);
        transitionToStep("otp");
        window.setTimeout(() => otpInputRefs.current[0]?.focus(), 250);
        toast.error(safeMessage);
      } else if (safeMessage.toLowerCase().includes("limit") || safeMessage.toLowerCase().includes("too many")) {
        toast.error(safeMessage || "Too many attempts. Please try again later.");
      } else {
        toast.error(safeMessage || "Failed to send verification code.");
      }
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (value?: string) => {
    if (isVerifyingOtpRef.current) return;

    const sanitizedOtp = (value ?? otpCode).replace(/\D/g, "").trim();

    if (!sanitizedOtp) {
      setOtpError(true);
      setOtpErrorAnimationKey((prev) => prev + 1);
      toast.error("Please enter the 6-digit code.");
      return;
    }

    if (sanitizedOtp.length !== 6) {
      setOtpError(true);
      setOtpErrorAnimationKey((prev) => prev + 1);
      toast.error("Please enter a valid 6-digit code.");
      return;
    }

    isVerifyingOtpRef.current = true;
    setIsVerifyingOtp(true);
    try {
      const { data, error } = await supabase.functions.invoke<OtpFunctionResponse>("email-otp", {
        body: {
          action: "verify",
          email: signupEmail,
          otp: sanitizedOtp,
        },
      });

      if (error) {
        const message = await getFunctionErrorMessage(error, "Invalid or expired code. Please try again.");
        throw new Error(sanitizeUserErrorMessage(message, "Invalid or expired code. Please try again."));
      }
      if (!data?.success) throw new Error(data?.message || "Failed to verify code.");

      setOtpError(false);
      setIsEmailVerified(true);
      transitionToStep("details");
      toast.success("Email verified. Complete your account details.");
    } catch (error: any) {
      setOtpError(true);
      setOtpErrorAnimationKey((prev) => prev + 1);
      toast.error(error?.message || "Invalid or expired code. Please try again.");
      setOtpCode("");
      window.setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 420);
    } finally {
      setIsVerifyingOtp(false);
      isVerifyingOtpRef.current = false;
    }
  };

  const setOtpDigit = (index: number, digit: string) => {
    const nextDigits = Array.from({ length: 6 }, (_, i) => otpCode[i] ?? "");
    nextDigits[index] = digit;
    const nextCode = nextDigits.join("");
    setOtpCode(nextCode);
    return nextCode;
  };

  const handleOtpChange = (index: number, rawValue: string) => {
    if (isVerifyingOtp || isSendingOtp) return;

    const digitsOnly = rawValue.replace(/\D/g, "");

    if (!digitsOnly) {
      setOtpDigit(index, "");
      return;
    }

    if (otpError) setOtpError(false);

    const nextDigits = Array.from({ length: 6 }, (_, i) => otpCode[i] ?? "");
    let cursor = index;

    for (const digit of digitsOnly) {
      if (cursor > 5) break;
      nextDigits[cursor] = digit;
      cursor += 1;
    }

    const nextCode = nextDigits.join("");
    setOtpCode(nextCode);

    const nextFocusIndex = Math.min(cursor, 5);
    otpInputRefs.current[nextFocusIndex]?.focus();

    if (/^\d{6}$/.test(nextCode)) {
      void handleVerifyOtp(nextCode);
    }
  };

  const handleOtpKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace") {
      event.preventDefault();

      const currentDigits = Array.from({ length: 6 }, (_, i) => otpCode[i] ?? "");

      if (currentDigits[index]) {
        currentDigits[index] = "";
        setOtpCode(currentDigits.join(""));
        return;
      }

      if (index > 0) {
        currentDigits[index - 1] = "";
        setOtpCode(currentDigits.join(""));
        otpInputRefs.current[index - 1]?.focus();
      }
      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      otpInputRefs.current[index - 1]?.focus();
      return;
    }

    if (event.key === "ArrowRight" && index < 5) {
      event.preventDefault();
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (index: number, event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pastedDigits = event.clipboardData.getData("text").replace(/\D/g, "");
    if (!pastedDigits) return;

    if (otpError) setOtpError(false);

    const nextDigits = Array.from({ length: 6 }, (_, i) => otpCode[i] ?? "");
    let cursor = index;

    for (const digit of pastedDigits) {
      if (cursor > 5) break;
      nextDigits[cursor] = digit;
      cursor += 1;
    }

    const nextCode = nextDigits.join("");
    setOtpCode(nextCode);

    const nextFocusIndex = Math.min(cursor, 5);
    otpInputRefs.current[nextFocusIndex]?.focus();

    if (/^\d{6}$/.test(nextCode)) {
      void handleVerifyOtp(nextCode);
    }
  };

  const handleGoogleSignup = () => {
    toast.info("Google signup is under development.");
  };

  const handleProfilePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload JPG or PNG image");
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("Max file size is 5MB");
      return;
    }

    const imageUrl = URL.createObjectURL(file);
    setTempImageUrl(imageUrl);
    setIsImageEditorOpen(true);
    event.currentTarget.value = "";
  };

  const handleSaveEditedProfilePhoto = (editedBlob: Blob) => {
    const croppedFile = new File([editedBlob], "profile-picture.jpg", { type: "image/jpeg" });
    const objectUrl = URL.createObjectURL(croppedFile);
    setProfilePhotoFile(croppedFile);
    setProfilePhotoPreview(objectUrl);
    toast.success("Profile photo selected");
  };

  const maskEmail = (email: string) => {
    const [localPart = "", domainPart = ""] = email.split("@");
    const [domainName = "", domainSuffix = ""] = domainPart.split(".");

    const maskedLocal =
      localPart.length <= 1
        ? `${localPart}*`
        : `${localPart[0]}${"*".repeat(Math.max(localPart.length - 1, 4))}`;

    const maskedDomain =
      domainName.length <= 1
        ? `${domainName}*`
        : `${domainName[0]}${"*".repeat(Math.max(domainName.length - 1, 3))}`;

    return `${maskedLocal}@${maskedDomain}${domainSuffix ? `.${domainSuffix}` : ""}`;
  };

  return (
    <div className="relative min-h-screen bg-[rgb(255,255,255)] flex items-center justify-center px-4 py-10">
      <Link
        to="/"
        className="absolute top-6 left-6 flex min-w-0 items-center gap-2 transition-transform duration-300 hover:scale-105"
      >
        <img
          src="/lovable-uploads/14bf0eea-1bc9-4675-9231-356df10eb82d.png"
          alt="MatePeak Logo"
          className="h-10 drop-shadow-sm mt-0.5"
        />
        <span className="truncate text-xl sm:text-2xl font-extrabold font-poppins text-gray-900">
          MatePeak
        </span>
      </Link>

      <div
        className={`w-full transition-[max-width] duration-300 ${STEP_MAX_WIDTH_CLASS[signupStep]} ${stepAnimationClass}`}
      >
        <div className="text-center mb-4">
          <img
            src="/lovable-uploads/14bf0eea-1bc9-4675-9231-356df10eb82d.png"
            alt="MatePeak Logo"
            className="h-14 mx-auto"
          />
        </div>

        {signupStep === "email" && (
          <div className="text-center mb-7">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Welcome to Matepeak</h1>
            <p className="text-base font-normal text-gray-600 mt-2 leading-relaxed">{subtitle}</p>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          {signupStep === "email" && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleSignup}
                className="w-full h-12 rounded-full border-gray-300 bg-white hover:bg-white text-gray-900 font-medium flex items-center px-3"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center flex-shrink-0" aria-hidden="true">
                  <svg width="38" height="38" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.6 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
                    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.4 19 12 24 12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.5-5.2l-6.2-5.2C29.3 35.2 26.8 36 24 36c-5.2 0-9.6-3.3-11.2-7.9l-6.5 5C9.6 39.6 16.3 44 24 44z" />
                    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3-3.2 5.4-5.9 7l6.2 5.2C39.2 37 44 31 44 24c0-1.3-.1-2.7-.4-3.5z" />
                  </svg>
                </span>
                <span className="flex-1 text-center pr-10">Continue with Google</span>
              </Button>

              <div className="relative mt-5 mb-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full h-[0.5px] bg-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-4 bg-white text-gray-400 tracking-[0.14em]">OR</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="sr-only">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={signupEmail}
                  onChange={(event) => {
                    setSignupEmail(event.target.value);
                    if (emailError) setEmailError("");
                  }}
                  required
                  placeholder="Enter email address"
                  className={`h-11 rounded-lg bg-white focus:bg-white px-5 text-sm placeholder:text-gray-500 focus-visible:ring-0 ${
                    emailError
                      ? "border-red-300 focus-visible:border-red-300 active:border-red-300"
                      : "border-gray-300 focus-visible:border-gray-300 active:border-gray-300"
                  }`}
                />
                {emailError && <p className="text-sm text-red-400 mt-1 animate-fade-in">{emailError}</p>}
              </div>

              <Button
                key={continueShakeKey}
                type="button"
                onClick={handleContinueToOtp}
                disabled={isSendingOtp}
                className={`w-full h-12 rounded-full bg-slate-950 hover:bg-slate-800 text-white font-bold transition-colors mt-6 ${
                  emailError ? "animate-shake-button-fast" : ""
                }`}
              >
                {isSendingOtp ? <Loader2 className="h-5 w-5 animate-spin" /> : "Continue"}
              </Button>

              <p className="text-center mt-6 text-sm text-gray-500 leading-6">
                By continuing, you agree to our{" "}
                <Link to="/privacy" className="text-gray-500 underline underline-offset-2 hover:text-gray-600">
                  Privacy Policy
                </Link>
                .
              </p>

              <p className="text-center mt-3 text-sm text-gray-500">
                Already have an account?{" "}
                <Link to={loginPath} className="text-gray-500 underline underline-offset-2 hover:text-gray-600">
                  Sign in
                </Link>
              </p>
            </>
          )}

          {signupStep === "otp" && (
            <>
              <div className="text-center pt-1 pb-1">
                <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Check your email</h2>
                <p className="mt-4 text-base leading-relaxed text-gray-700">
                  We&rsquo;ve sent you a 6 digit OTP.
                  <br />
                  Please check your inbox at {maskEmail(signupEmail)}.
                </p>
              </div>

              <div className="flex justify-center mt-6">
                <div
                  key={otpErrorAnimationKey}
                  className={`flex items-center gap-3 ${otpError ? "animate-shake-button-fast" : ""}`}
                >
                  {Array.from({ length: 6 }, (_, index) => (
                    <input
                      key={`${index}-${otpErrorAnimationKey}`}
                      ref={(element) => {
                        otpInputRefs.current[index] = element;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete={index === 0 ? "one-time-code" : "off"}
                      maxLength={1}
                      value={otpCode[index] ?? ""}
                      onChange={(event) => handleOtpChange(index, event.target.value)}
                      onKeyDown={(event) => handleOtpKeyDown(index, event)}
                      onPaste={(event) => handleOtpPaste(index, event)}
                      disabled={isVerifyingOtp || isSendingOtp}
                      data-verifying={isVerifyingOtp ? "true" : "false"}
                      data-filled={(!isVerifyingOtp && !otpError && (otpCode[index] ?? "")) ? "true" : "false"}
                      aria-label={`OTP digit ${index + 1}`}
                      className={cn(
                        otpSlotClassName,
                        "otp-digit-input text-center align-middle leading-none focus:outline-none focus:ring-0",
                        isVerifyingOtp && "otp-digit-validating",
                        !isVerifyingOtp && !otpError && ((otpCode[index] ?? "") ? "otp-digit-filled" : "otp-digit-empty"),
                        otpError && "animate-otp-error-slot"
                      )}
                      style={otpError ? { animationDelay: `${index * 45}ms` } : undefined}
                    />
                  ))}
                </div>
              </div>

              <div className="text-center mt-5">
                <button
                  type="button"
                  onClick={async () => {
                    if (!signupEmail) return;
                    if (resendBlockSecondsLeft > 0) return;
                    setIsSendingOtp(true);
                    try {
                      const { data, error } = await supabase.functions.invoke<OtpFunctionResponse>("email-otp", {
                        body: {
                          action: "send",
                          email: signupEmail,
                        },
                      });

                      if (error) {
                        const contextPayload = error?.context ? await error.context.json() : null;
                        const message = sanitizeUserErrorMessage(
                          contextPayload?.message || error?.message,
                          "Failed to resend code."
                        );
                        const retryAfterSeconds = Number(contextPayload?.retry_after_seconds);
                        const waitSeconds = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
                          ? retryAfterSeconds
                          : extractWaitSeconds(message);

                        if (waitSeconds && waitSeconds > 0) {
                          setResendCooldown(waitSeconds);
                          setOtpExpiryCountdown(waitSeconds);
                        }

                        throw new Error(message);
                      }
                      if (!data?.success) throw new Error(data?.message || "Failed to resend code.");
                      setOtpCode("");
                      setOtpError(false);
                      setResendCooldown(data?.resend_available_in_seconds ?? data?.expires_in_seconds);
                      setOtpExpiryCountdown(data?.expires_in_seconds);
                      toast.success("Verification code resent.");
                    } catch (error: any) {
                      toast.error(error?.message || "Failed to resend code.");
                    } finally {
                      setIsSendingOtp(false);
                    }
                  }}
                  disabled={isSendingOtp || resendBlockSecondsLeft > 0}
                  className={cn(
                    "text-sm font-semibold text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed",
                    resendBlockSecondsLeft > 0 ? "cursor-not-allowed" : "hover:text-gray-600"
                  )}
                >
                  {isSendingOtp ? <Loader2 className="h-4 w-4 animate-spin" /> : resendBlockSecondsLeft > 0 ? `Resend in ${formatCountdown(resendBlockSecondsLeft)}` : "Resend code"}
                </button>
              </div>
            </>
          )}

          {signupStep === "details" && (
            <>
              <div className="space-y-2">
                <div className="flex items-center gap-3 rounded-md p-3">
                  <label
                    htmlFor="profile-photo-upload"
                    className="group h-14 w-14 rounded-full border border-dashed border-gray-300 hover:border-gray-900 focus-within:border-gray-900 overflow-hidden bg-gray-50 flex items-center justify-center cursor-pointer transition-colors"
                  >
                    {profilePhotoPreview ? (
                      <img src={profilePhotoPreview} alt="Profile preview" className="h-full w-full object-cover" />
                    ) : (
                      <Camera className="h-5 w-5 text-gray-400 group-hover:text-gray-900 group-focus-within:text-gray-900 transition-colors" />
                    )}
                  </label>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500">JPG, PNG • Max 5MB</p>
                  </div>
                  <label
                    htmlFor="profile-photo-upload"
                    className="h-9 px-4 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex items-center justify-center cursor-pointer text-sm font-medium"
                  >
                    {profilePhotoFile ? "Change" : "Upload"}
                  </label>
                  <input
                    id="profile-photo-upload"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    onChange={handleProfilePhotoSelect}
                    className="hidden"
                  />
                </div>
                <ImageEditor
                  open={isImageEditorOpen}
                  onClose={() => setIsImageEditorOpen(false)}
                  imageUrl={tempImageUrl}
                  onSave={handleSaveEditedProfilePhoto}
                />
              </div>

              <div className="space-y-1.5">
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  placeholder="Enter Full Name"
                  className="h-12 rounded-md bg-white border-gray-300 px-5 shadow-sm placeholder:font-medium focus-visible:ring-1 focus-visible:ring-gray-400"
                />
              </div>

              <div className="space-y-1.5">
                <PasswordInput
                  id="password"
                  name="password"
                  value={password}
                  placeholder="Enter Password"
                  onChange={(value) => {
                    setPassword(value);
                    setPasswordError("");
                  }}
                  onValidityChange={setIsPasswordValid}
                  required
                  showRequirements={true}
                  className="h-12 rounded-md bg-white border-gray-300 px-5 shadow-sm placeholder:font-medium focus-visible:ring-1 focus-visible:ring-gray-400"
                />
              </div>

              <div className="space-y-1.5">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="text"
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    setPasswordError("");
                  }}
                  required
                  placeholder="Enter Confirm Password"
                  className="h-12 rounded-md bg-white border-gray-300 px-5 shadow-sm placeholder:font-medium focus-visible:ring-1 focus-visible:ring-gray-400"
                />
                {passwordError && <p className="text-sm text-destructive mt-1 animate-fade-in">{passwordError}</p>}
                {!passwordError && confirmPassword && password !== confirmPassword && (
                  <p className="text-sm text-destructive mt-1 animate-fade-in">Passwords do not match</p>
                )}
                {!passwordError && confirmPassword && password === confirmPassword && password.length > 0 && (
                  <p className="text-sm text-green-600 mt-1 animate-fade-in flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Passwords match
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between mt-5">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="rememberMe"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    className="border-gray-300"
                  />
                  <Label htmlFor="rememberMe" className="text-sm font-normal text-gray-600 cursor-pointer">
                    Remember Me
                  </Label>
                </div>

                <Dialog>
                  <DialogTrigger asChild>
                    <button type="button" className="text-sm text-gray-700 hover:text-gray-900 transition-colors">
                      Forgot Password?
                    </button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Reset Password</DialogTitle>
                      <DialogDescription>
                        Enter your email address and we'll send you a link to reset your password.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="reset-email">Email</Label>
                        <Input
                          id="reset-email"
                          type="email"
                          placeholder="your@email.com"
                          value={forgotPasswordEmail}
                          onChange={(e) => setForgotPasswordEmail(e.target.value)}
                          className="h-11"
                        />
                      </div>
                      <Button onClick={handleForgotPassword} disabled={isResettingPassword} className="w-full">
                        {isResettingPassword ? "Sending..." : "Send Reset Link"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <Button
                type="submit"
                className="w-full h-12 rounded-full bg-gray-900 hover:bg-black text-white font-semibold transition-colors mt-2"
                disabled={isLoading || !profilePhotoFile || !isPasswordValid || !password || !confirmPassword || password !== confirmPassword}
              >
                {isLoading ? "Creating account..." : "Create Account"}
              </Button>
            </>
          )}
        </form>

        {signupStep === "details" && (
          <p className="text-center mt-6 text-sm text-gray-600">
            {`Already a ${role}?`} {" "}
            <Link to={loginPath} className="text-gray-800 hover:text-black transition-colors font-medium underline underline-offset-2">
              Sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
