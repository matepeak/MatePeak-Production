import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { PasswordInput } from "@/components/ui/password-input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CheckCircle2 } from "lucide-react";
import SEO from "@/components/SEO";


export default function MentorSignup() {
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
  const [signupStep, setSignupStep] = useState<"email" | "otp" | "details">("email");
  const [signupEmail, setSignupEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [continueShakeKey, setContinueShakeKey] = useState(0);


  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    
    if (!isPasswordValid) {
      setPasswordError("Password must meet all requirements");
      return;
    }
    
    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const fullName = formData.get("fullName") as string;

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        toast.error("Session expired. Please verify your email again.");
        setSignupStep("otp");
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password,
        data: {
          full_name: fullName,
          role: "mentor",
        },
      });

      if (error) throw error;

      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          email: user.email,
          full_name: fullName,
          user_type: "mentor",
        },
        {
          onConflict: "id",
        }
      );

      if (profileError) {
        console.error("Profile upsert error:", profileError);
      }

      toast.success("Account created successfully! Redirecting to onboarding...");
      navigate("/expert/onboarding");
    } catch (error: any) {
      console.error('Unexpected error during signup:', error);
      
      // Handle network and other errors
      if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('network'))) {
        toast.error("Unable to connect to server. Please check your internet connection.");
      } else if (error.message) {
        toast.error(error.message);
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
      const tempPassword = `Tmp${Math.random().toString(36).slice(2)}A!9`;
      const { data, error } = await supabase.auth.signUp({
        email,
        password: tempPassword,
        options: {
          data: {
            role: "mentor",
          },
        },
      });

      if (error) {
        throw error;
      }

      if (data.user?.identities && data.user.identities.length === 0) {
        toast.error("An account with this email already exists. Please sign in.");
        return;
      }

      setEmailError("");
      setSignupEmail(email);
      setForgotPasswordEmail(email);
      setSignupStep("otp");
      toast.success("Verification code sent to your email.");
    } catch (error: any) {
      const message = (error?.message || "").toLowerCase();
      if (message.includes("rate limit") || message.includes("too many")) {
        toast.error("Too many attempts. Please wait a minute and try again.");
      } else {
        toast.error(error?.message || "Failed to send verification code.");
      }
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode.trim()) {
      setOtpError("Please enter the verification code.");
      setContinueShakeKey((prev) => prev + 1);
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: signupEmail,
        token: otpCode.trim(),
        type: "signup",
      });

      if (error) throw error;

      setOtpError("");
      setSignupStep("details");
      toast.success("Email verified. Complete your account details.");
    } catch (error: any) {
      setOtpError("Invalid or expired verification code.");
      setContinueShakeKey((prev) => prev + 1);
      toast.error(error?.message || "Failed to verify code.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleGoogleSignup = () => {
    toast.info("Google signup is under development.");
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
    <>
      <SEO
        title="Mentor Signup | MatePeak"
        description="Create your mentor account on MatePeak."
        canonicalPath="/mentor/signup"
        noindex
      />
      <div className="min-h-screen bg-[rgb(255,255,255)] flex items-center justify-center px-4 py-10">
        <div className={`w-full ${signupStep === "otp" ? "max-w-[480px]" : "max-w-[340px]"}`}>
        {signupStep !== "otp" && (
          <div className="text-center mb-7">
            <Link to="/" className="inline-block mb-4">
              <img 
                src="/lovable-uploads/14bf0eea-1bc9-4675-9231-356df10eb82d.png" 
                alt="MatePeak Logo"
                className="h-14 mx-auto"
              />
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Welcome to Matepeak</h1>
            <p className="text-base font-normal text-gray-600 mt-2 leading-relaxed">
              Create your account. Share what you know. Earn from it.
            </p>
          </div>
        )}
      <form onSubmit={onSubmit} className="space-y-4">
        {signupStep === "email" && (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignup}
              className="w-full h-11 rounded-full border-gray-300 bg-white hover:bg-white text-gray-900 font-medium relative"
            >
              <span className="absolute left-4 inline-flex items-center justify-center" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.6 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
                  <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.4 19 12 24 12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                  <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.5-5.2l-6.2-5.2C29.3 35.2 26.8 36 24 36c-5.2 0-9.6-3.3-11.2-7.9l-6.5 5C9.6 39.6 16.3 44 24 44z" />
                  <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3-3.2 5.4-5.9 7l6.2 5.2C39.2 37 44 31 44 24c0-1.3-.1-2.7-.4-3.5z" />
                </svg>
              </span>
              Continue with Google
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
              <Label htmlFor="email" className="sr-only">Email</Label>
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
              {emailError && (
                <p className="text-sm text-red-400 mt-1 animate-fade-in">{emailError}</p>
              )}
            </div>

            <Button
              key={continueShakeKey}
              type="button"
              onClick={handleContinueToOtp}
              disabled={isSendingOtp}
              className={`w-full h-12 rounded-full bg-slate-950 hover:bg-slate-900 text-white font-bold transition-colors mt-6 ${
                emailError ? "animate-shake-subtle" : ""
              }`}
            >
              {isSendingOtp ? "Sending..." : "Continue"}
            </Button>

            <p className="text-center mt-6 text-sm text-gray-500 leading-6">
              By continuing, you agree to our{" "}
              <Link
                to="/privacy"
                className="text-gray-500 underline underline-offset-2 hover:text-gray-600"
              >
                Privacy Policy
              </Link>
              .
            </p>

            <p className="text-center mt-3 text-sm text-gray-500">
              Already have an account?{" "}
              <Link
                to="/expert/login"
                className="text-gray-500 underline underline-offset-2 hover:text-gray-600"
              >
                Sign in
              </Link>
            </p>
          </>
        )}

        {signupStep === "otp" && (
          <>
            <div className="text-center pt-1 pb-1">
              <img
                src="/lovable-uploads/14bf0eea-1bc9-4675-9231-356df10eb82d.png"
                alt="MatePeak"
                className="h-14 mx-auto mb-4"
              />
              <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Check your email</h2>
              <p className="mt-4 text-base leading-relaxed text-gray-700">
                We&rsquo;ve sent you a passcode.
                <br />
                Please check your inbox at {maskEmail(signupEmail)}.
              </p>
            </div>

            <div className="flex justify-center mt-6">
              <InputOTP
                maxLength={6}
                value={otpCode}
                onChange={(value) => {
                  setOtpCode(value);
                  if (otpError) setOtpError("");
                }}
                onComplete={() => {
                  void handleVerifyOtp();
                }}
                containerClassName="justify-center gap-3"
              >
                <InputOTPGroup className="gap-3">
                  <InputOTPSlot index={0} className="h-16 w-16 rounded-xl border border-gray-300 text-4xl font-bold first:rounded-xl first:border last:rounded-xl" />
                  <InputOTPSlot index={1} className="h-16 w-16 rounded-xl border border-gray-300 text-4xl font-bold first:rounded-xl first:border last:rounded-xl" />
                  <InputOTPSlot index={2} className="h-16 w-16 rounded-xl border border-gray-300 text-4xl font-bold first:rounded-xl first:border last:rounded-xl" />
                  <InputOTPSlot index={3} className="h-16 w-16 rounded-xl border border-gray-300 text-4xl font-bold first:rounded-xl first:border last:rounded-xl" />
                  <InputOTPSlot index={4} className="h-16 w-16 rounded-xl border border-gray-300 text-4xl font-bold first:rounded-xl first:border last:rounded-xl" />
                  <InputOTPSlot index={5} className="h-16 w-16 rounded-xl border border-gray-300 text-4xl font-bold first:rounded-xl first:border last:rounded-xl" />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <div className="text-center mt-5">
              <button
                type="button"
                onClick={async () => {
                  if (!signupEmail) return;
                  setIsSendingOtp(true);
                  try {
                    const { error } = await supabase.auth.resend({
                      type: "signup",
                      email: signupEmail,
                    });

                    if (error) throw error;
                    toast.success("Verification code resent.");
                  } catch (error: any) {
                    toast.error(error?.message || "Failed to resend code.");
                  } finally {
                    setIsSendingOtp(false);
                  }
                }}
                disabled={isSendingOtp}
                className="text-sm text-gray-500 hover:text-gray-600 disabled:opacity-50"
              >
                {isSendingOtp ? "Sending..." : "Resend code"}
              </button>
            </div>

            <div className="space-y-1.5 mt-2">
              {otpError && (
                <p className="text-sm text-red-400 mt-1 animate-fade-in">{otpError}</p>
              )}
            </div>
          </>
        )}

        {signupStep === "details" && (
          <>
            <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-sm text-gray-600">Signing up with</p>
              <p className="text-sm font-medium text-gray-900 break-all">{signupEmail}</p>
            </div>

        <div className="space-y-1.5">
          <Label htmlFor="fullName" className="text-sm font-medium text-gray-700">Name</Label>
          <Input
            id="fullName"
            name="fullName"
            type="text"
            required
            placeholder="Enter your full name"
            className="h-12 rounded-md bg-white border-gray-300 px-5 focus-visible:ring-1 focus-visible:ring-gray-400"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            name="password"
            value={password}
            onChange={(value) => {
              setPassword(value);
              setPasswordError("");
            }}
            onValidityChange={setIsPasswordValid}
            required
            showRequirements={true}
            className="h-12 rounded-md bg-white border-gray-300 px-5 focus-visible:ring-1 focus-visible:ring-gray-400"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            value={confirmPassword}
            onChange={(value) => {
              setConfirmPassword(value);
              setPasswordError("");
            }}
            required
            showRequirements={false}
            placeholder="Confirm your password"
              className="h-12 rounded-md bg-white border-gray-300 px-5 focus-visible:ring-1 focus-visible:ring-gray-400"
          />
          {passwordError && (
            <p className="text-sm text-destructive mt-1 animate-fade-in">{passwordError}</p>
          )}
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
            <Label 
              htmlFor="rememberMe" 
              className="text-sm font-normal text-gray-600 cursor-pointer"
            >
              Remember Me
            </Label>
          </div>
          
          <Dialog>
            <DialogTrigger asChild>
              <button 
                type="button"
                className="text-sm text-gray-700 hover:text-gray-900 transition-colors"
              >
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
                <Button 
                  onClick={handleForgotPassword}
                  disabled={isResettingPassword}
                  className="w-full"
                >
                  {isResettingPassword ? "Sending..." : "Send Reset Link"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        <Button 
          type="submit" 
          className="w-full h-12 rounded-full bg-gray-900 hover:bg-black text-white font-semibold transition-colors mt-2" 
          disabled={isLoading || !isPasswordValid || !password || !confirmPassword || password !== confirmPassword}
        >
          {isLoading ? "Creating account..." : "Create Account"}
        </Button>
        </>
        )}
      </form>

      {signupStep === "details" && (
        <p className="text-center mt-6 text-sm text-gray-600">
          Already a mentor?{" "}
          <Link to="/expert/login" className="text-gray-800 hover:text-black transition-colors font-medium underline underline-offset-2">
            Sign in
          </Link>
        </p>
      )}
        </div>
      </div>
    </>
  );
}
