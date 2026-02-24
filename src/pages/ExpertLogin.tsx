import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Eye, EyeOff } from "lucide-react";

export default function ExpertLogin() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      // Check user role from metadata
      const userRole = data.user?.user_metadata?.role;
      
      if (userRole === 'mentor') {
        // Fetch the mentor's username from their profile
        const { data: profile, error: profileError } = await supabase
          .from("expert_profiles")
          .select("username")
          .eq("id", data.user.id)
          .maybeSingle();

        if (profileError) {
          console.error("Profile fetch error:", profileError);
          toast.error("Failed to load profile");
          return;
        }

        if (!profile || !profile.username) {
          // No profile yet, redirect to onboarding
          toast.info("Please complete your profile setup");
          navigate("/expert/onboarding");
          return;
        }

        toast.success("Logged in successfully!");
        // Redirect to username-based dashboard
        navigate(`/dashboard/${profile.username}`);
      } else if (userRole === 'student') {
        toast.warning("Please use the student sign-in page");
      } else {
        toast.warning("Invalid account type");
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.");
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-4">
            <img 
              src="/lovable-uploads/14bf0eea-1bc9-4675-9231-356df10eb82d.png" 
              alt="MatePeak Logo"
              className="h-12 mx-auto"
            />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Welcome Back, Mentor!</h1>
          <p className="text-gray-600 mt-2">Sign in to continue inspiring students</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="your@email.com"
              className="h-11 bg-gray-50 border-gray-300 focus:border-black focus:ring-black transition-all"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                placeholder="Enter your password"
                className="h-11 bg-gray-50 border-gray-300 focus:border-black focus:ring-black transition-all pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
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
                  className="text-sm text-matepeak-primary hover:text-matepeak-secondary transition-colors"
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
            className="w-full h-11 bg-black hover:bg-gray-800 text-white font-semibold transition-all mt-6" 
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <div className="mt-6 space-y-3">
          <p className="text-center text-sm text-gray-600">
            Don't have an account?{" "}
            <Link to="/mentor/signup" className="text-matepeak-primary hover:text-matepeak-secondary transition-colors font-medium">
              Sign up
            </Link>
          </p>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>
          <p className="text-center text-sm text-gray-600">
            <Link to="/student/login" className="text-matepeak-primary hover:text-matepeak-secondary transition-colors font-medium">
              Sign in as a Student instead
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
