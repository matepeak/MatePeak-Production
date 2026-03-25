import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Eye, EyeOff } from "lucide-react";
import SEO from "@/components/SEO";

export default function StudentLogin() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [submitShakeKey, setSubmitShakeKey] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedEmail = email.trim();
    let hasError = false;

    setEmailError("");
    setPasswordError("");

    if (!trimmedEmail) {
      setEmailError("Please enter your email.");
      hasError = true;
    }

    if (!password) {
      setPasswordError("Please enter your password.");
      hasError = true;
    }

    if (hasError) {
      setSubmitShakeKey((prev) => prev + 1);
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error) {
        setSubmitShakeKey((prev) => prev + 1);
        const message = (error.message || "").toLowerCase();
        if (message.includes("email not confirmed") || message.includes("email not verified")) {
          toast.info("Please verify your email with the code sent to your inbox.");
          navigate(`/auth/verify-code?email=${encodeURIComponent(trimmedEmail)}&role=student`);
          return;
        }
        if (message.includes("invalid login credentials")) {
          setPasswordError("Invalid email or password.");
        } else {
          setPasswordError("Unable to sign in. Please try again.");
        }
        return;
      }

      // Check user role from metadata
      const userRole = data.user?.user_metadata?.role;
      
      if (userRole === 'student') {
        toast.success("Logged in successfully!");
        navigate("/dashboard");
      } else if (userRole === 'mentor') {
        toast.warning("Please use the mentor sign-in page");
      } else {
        toast.warning("Invalid account type");
      }
    } catch (error) {
      setSubmitShakeKey((prev) => prev + 1);
      setPasswordError("An error occurred. Please try again.");
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

  return (
    <>
      <SEO
        title="Student Login | MatePeak"
        description="Sign in to your MatePeak student account."
        canonicalPath="/student/login"
        noindex
      />
      <div className="min-h-screen bg-[rgb(255,255,255)] flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-[390px]">
        <div className="text-center mb-7">
          <Link to="/" className="inline-block mb-4">
            <img 
              src="/lovable-uploads/14bf0eea-1bc9-4675-9231-356df10eb82d.png" 
              alt="MatePeak Logo"
              className="h-14 mx-auto"
            />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Welcome Back, Student!</h1>
          <p className="text-base font-normal text-gray-600 mt-2 leading-relaxed">Sign in to continue your learning journey</p>
        </div>

        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (emailError) setEmailError("");
              }}
              placeholder="Enter Email"
              className={`h-12 rounded-md bg-white px-5 placeholder:font-medium focus-visible:ring-1 ${emailError ? "border-red-300 focus-visible:border-red-300 focus-visible:ring-red-200" : "border-gray-300 focus-visible:border-gray-400 focus-visible:ring-gray-400"}`}
            />
            {emailError && <p className="text-sm text-red-400 mt-1 animate-fade-in">{emailError}</p>}
          </div>

          <div className="space-y-1.5">
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (passwordError) setPasswordError("");
                }}
                placeholder="Enter Password"
                className={`h-12 rounded-md bg-white px-5 pr-10 placeholder:font-medium focus-visible:ring-1 ${passwordError ? "border-red-300 focus-visible:border-red-300 focus-visible:ring-red-200" : "border-gray-300 focus-visible:border-gray-400 focus-visible:ring-gray-400"}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {passwordError && <p className="text-sm text-red-400 mt-1 animate-fade-in">{passwordError}</p>}
          </div>

          <div className="flex items-center justify-between mt-1">
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
            key={submitShakeKey}
            type="submit" 
            className={`w-full h-12 rounded-full bg-slate-950 hover:bg-slate-800 text-white font-bold transition-colors mt-2 ${submitShakeKey > 0 ? "animate-shake-button-fast" : ""}`} 
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Sign in as Student"}
          </Button>
        </form>

        <div className="mt-7 space-y-3">
          <p className="text-center text-sm text-gray-500">
            Don't have an account?{" "}
            <Link to="/student/signup" className="text-gray-800 hover:text-black transition-colors font-semibold">
              Sign up
            </Link>
          </p>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full h-[0.5px] bg-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>
          <p className="text-center text-sm text-gray-500">
            <Link to="/expert/login" className="text-gray-800 hover:text-black transition-colors font-semibold">
              Sign in as a Mentor instead
            </Link>
          </p>
        </div>
        </div>
      </div>
    </>
  );
}