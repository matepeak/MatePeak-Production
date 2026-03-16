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
import { CheckCircle2, Mail } from "lucide-react";

const StudentSignup = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [userEmail, setUserEmail] = useState("");

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

    // DETAILED DEBUG LOGGING
    console.log('==========================================');
    console.log('STUDENT SIGNUP ATTEMPT');
    console.log('==========================================');
    console.log('Email:', email);
    console.log('Full Name:', fullName);
    console.log('Password Length:', password?.length);
    console.log('Password Valid:', isPasswordValid);
    console.log('Redirect URL:', `${window.location.origin}/`);
    console.log('==========================================');

    try {
      console.log('📡 Calling supabase.auth.signUp...');
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: 'student'
          },
          emailRedirectTo: `${window.location.origin}/`
        },
      });

      console.log('Signup Response Data:', JSON.stringify(data, null, 2));
      console.log('Signup Error:', error);

      if (error) {
        console.error('==========================================');
        console.error('SIGNUP ERROR DETAILS:');
        console.error('==========================================');
        console.error('Error Message:', error.message);
        console.error('Error Name:', error.name);
        console.error('Error Status:', error.status);
        console.error('Full Error Object:', JSON.stringify(error, null, 2));
        console.error('==========================================');
        
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

      console.log('==========================================');
      console.log('SIGNUP SUCCESS');
      console.log('==========================================');
      console.log('User ID:', data?.user?.id);
      console.log('User Email:', data?.user?.email);
      console.log('Email Confirmed:', data?.user?.email_confirmed_at);
      console.log('Has Session:', !!data?.session);
      console.log('Session Token:', data?.session ? 'Present' : 'None');
      console.log('==========================================');

      // Check if email confirmation is required
      if (data.user && !data.session) {
        // Email confirmation is required - show success message
        console.log('EMAIL CONFIRMATION REQUIRED');
        setEmailSent(true);
        setUserEmail(email);
        toast.success('Account created! Please check your email to verify your account.', {
          duration: 8000,
        });
        return; // Don't navigate, show the email confirmation UI
      }

      // If session exists, email confirmation is disabled
      if (data.session) {
        console.log('Session available - no email confirmation needed');
        toast.success("Account created successfully! Welcome to MatePeak!");
        navigate("/dashboard");
      }
    } catch (error: any) {
      console.error('==========================================');
      console.error('💥 UNEXPECTED ERROR:');
      console.error('==========================================');
      console.error('Error:', error);
      console.error('Error Message:', error?.message);
      console.error('Error Stack:', error?.stack);
      console.error('==========================================');
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
      console.log('🏁 Signup process completed');
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

  // Show email confirmation success screen
  if (emailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <Mail className="h-10 w-10 text-green-600" />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Check Your Email!</h1>
          
          <p className="text-gray-600 mb-4">
            We've sent a confirmation email to:
          </p>
          
          <p className="font-semibold text-lg mb-6 text-primary break-all">
            {userEmail}
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-2">Next Steps:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Open the email from MatePeak</li>
                  <li>Click the "Confirm Email" button</li>
                  <li>You'll be redirected back to login</li>
                  <li>Sign in with your credentials</li>
                </ol>
              </div>
            </div>
          </div>
          
          <p className="text-sm text-gray-500 mb-6">
            Didn't receive the email? Check your spam folder or{' '}
            <button 
              onClick={() => {
                setEmailSent(false);
                setUserEmail("");
              }}
              className="text-primary hover:underline font-semibold"
            >
              try signing up again
            </button>
          </p>
          
          <div className="flex flex-col gap-3">
            <Button 
              onClick={() => navigate('/student/login')}
              className="w-full h-11"
            >
              Go to Login
            </Button>
            
            <Button 
              onClick={() => navigate('/')}
              variant="outline"
              className="w-full h-11"
            >
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
          <h1 className="text-3xl font-bold text-gray-900">Create Student Account</h1>
          <p className="text-gray-600 mt-2">Start learning with expert mentors</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-sm font-medium text-gray-700">Full Name</Label>
            <Input
              id="fullName"
              name="fullName"
              type="text"
              required
              placeholder="John Doe"
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
            <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
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
            <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">Confirm Password</Label>
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
            {isLoading ? "Creating Account..." : "Create Account"}
          </Button>
        </form>

        <div className="mt-6 space-y-3">
          <p className="text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link to="/student/login" className="text-matepeak-primary hover:text-matepeak-secondary transition-colors font-medium">
              Sign in
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
            Want to become a mentor?{" "}
            <Link to="/mentor/signup" className="text-matepeak-primary hover:text-matepeak-secondary transition-colors font-medium">
              Sign up as mentor
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default StudentSignup;
