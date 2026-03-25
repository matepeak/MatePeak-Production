import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import SEO from "@/components/SEO";

type UserRole = "student" | "mentor";

export default function EmailCodeVerification() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialEmail = searchParams.get("email") || "";
  const roleParam = searchParams.get("role");
  const initialRole: UserRole = roleParam === "mentor" ? "mentor" : "student";

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const roleLabel = useMemo(
    () => (initialRole === "mentor" ? "mentor" : "student"),
    [initialRole]
  );

  const ensureProfile = async (role: UserRole) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { error } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || "",
        user_type: role,
        avatar_url: user.user_metadata?.avatar_url || null,
      },
      { onConflict: "id" }
    );

    if (error) {
      console.error("Profile creation/update error:", error);
    }

    return user;
  };

  const handleVerifyCode = async () => {
    if (!email.trim()) {
      toast.error("Please enter your email address.");
      return;
    }

    if (!code.trim()) {
      toast.error("Please enter the verification code.");
      return;
    }

    setIsVerifying(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: "signup",
      });

      if (error) {
        throw error;
      }

      const user = await ensureProfile(initialRole);
      const userRole = (user?.user_metadata?.role as UserRole | undefined) || initialRole;

      toast.success("Email verified successfully!");

      if (userRole === "mentor") {
        navigate("/expert/onboarding");
      } else {
        navigate("/dashboard");
      }
    } catch (error: any) {
      const message = (error?.message || "").toLowerCase();
      if (message.includes("expired") || message.includes("invalid")) {
        toast.error("Invalid or expired code. Please request a new one.");
      } else {
        toast.error(error?.message || "Failed to verify code.");
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (!email.trim()) {
      toast.error("Please enter your email address first.");
      return;
    }

    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      toast.success("Verification code sent. Please check your inbox.");
    } catch (error: any) {
      toast.error(error?.message || "Unable to resend verification code.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <>
      <SEO
        title="Verify Email Code | MatePeak"
        description="Verify your MatePeak account using email confirmation code."
        canonicalPath="/auth/verify-code"
        noindex
      />

      <div className="min-h-screen bg-[rgb(255,255,255)] flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="text-center mb-7">
            <Link to="/" className="inline-block mb-4">
              <img
                src="/lovable-uploads/14bf0eea-1bc9-4675-9231-356df10eb82d.png"
                alt="MatePeak Logo"
                className="h-11 mx-auto"
              />
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Verify your email</h1>
            <p className="text-gray-600 mt-2">
              Enter the code sent to your {roleLabel} account email.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="verificationEmail" className="text-sm font-medium text-gray-700">
                Email
              </Label>
              <Input
                id="verificationEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="h-12 rounded-md bg-white border-gray-300 px-5 focus-visible:ring-1 focus-visible:ring-gray-400"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="verificationCode" className="text-sm font-medium text-gray-700">
                Verification Code
              </Label>
              <Input
                id="verificationCode"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter code"
                className="h-12 rounded-md bg-white border-gray-300 px-5 focus-visible:ring-1 focus-visible:ring-gray-400"
              />
            </div>

            <Button
              onClick={handleVerifyCode}
              disabled={isVerifying}
              className="w-full h-12 rounded-full bg-gray-900 hover:bg-black text-white font-semibold transition-colors"
            >
              {isVerifying ? "Verifying..." : "Verify Code"}
            </Button>

            <Button
              onClick={handleResendCode}
              disabled={isResending}
              variant="secondary"
              className="w-full h-12 rounded-full font-semibold"
            >
              {isResending ? "Sending..." : "Resend Code"}
            </Button>

            <p className="text-center mt-2 text-sm text-gray-600">
              Already verified?{" "}
              <Link
                to={initialRole === "mentor" ? "/expert/login" : "/student/login"}
                className="text-gray-800 hover:text-black transition-colors font-medium underline underline-offset-2"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
