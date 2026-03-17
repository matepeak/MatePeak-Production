
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { PasswordInput } from "@/components/ui/password-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CheckCircle2 } from "lucide-react";


export default function MentorSignup() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);


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
    const email = formData.get("email") as string;
    const fullName = formData.get("fullName") as string;

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: 'mentor'
          },
          emailRedirectTo: `${window.location.origin}/`
        },
      });

      if (error) {
        console.error('Signup error:', error);
        
        // Handle specific error cases with better messages
        if (error.message.includes('fetch')) {
          toast.error("Connection error. Please check your internet connection and try again.");
        } else if (error.message.includes('User already registered')) {
          toast.error("An account with this email already exists. Please try logging in.");
        } else if (error.message.includes('Invalid email')) {
          toast.error("Please enter a valid email address.");
        } else if (error.message.includes('Password')) {
          toast.error("Password must be at least 6 characters long.");
        } else if (error.message.includes('rate limit') || error.message.includes('too many')) {
          toast.error("Too many attempts. Please wait a moment and try again.");
        } else {
          toast.error(error.message || "Failed to create account. Please try again.");
        }
        return;
      }

      // With email confirmation disabled, session should be available immediately
      if (data.session) {
        toast.success("Account created successfully! Redirecting to onboarding...");
        navigate("/expert/onboarding");
      } else {
        toast.error("Failed to create session. Please try logging in.");
        navigate("/expert/login");
      }
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
          <h1 className="text-3xl font-bold text-gray-900">Create your Mentor Account</h1>
          <p className="text-gray-600 mt-2">Share your expertise and help students succeed</p>
        </div>
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="fullName" className="text-sm font-medium text-gray-700">Name</Label>
          <Input
            id="fullName"
            name="fullName"
            type="text"
            required
            placeholder="Enter your full name"
            className="h-11 bg-gray-50 border-gray-300 focus:border-black focus:ring-black transition-all"
          />
        </div>
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
          />
        </div>
        <div className="space-y-2">
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
        
        <div className="flex items-center justify-between mt-6">
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
          disabled={isLoading || !isPasswordValid || !password || !confirmPassword || password !== confirmPassword}
        >
          {isLoading ? "Creating account..." : "Create Account"}
        </Button>
      </form>

      <p className="text-center mt-6 text-sm text-gray-600">
        Already a mentor?{" "}
        <Link to="/expert/login" className="text-matepeak-primary hover:text-matepeak-secondary transition-colors font-medium">
          Sign in
        </Link>
      </p>
    </div>
  </div>
  );
}
