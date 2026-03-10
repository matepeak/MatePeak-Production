import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { Phone, Shield, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

interface PhoneVerificationStepProps {
  form: UseFormReturn<any>;
}

export default function PhoneVerificationStep({ form }: PhoneVerificationStepProps) {
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(
    form.getValues("phoneVerified") || false
  );

  const phoneNumber = form.watch("phoneNumber");

  const sendOTP = async () => {
    if (!phoneNumber) {
      toast.error("Please enter your phone number in the previous step");
      return;
    }

    setIsSendingOtp(true);
    try {
      // Use Supabase Phone Auth to send OTP
      const { error } = await supabase.auth.signInWithOtp({
        phone: phoneNumber,
      });

      if (error) throw error;

      setOtpSent(true);
      toast.success("Verification code sent to " + phoneNumber);
    } catch (error: any) {
      console.error("OTP send error:", error);
      toast.error("Failed to send verification code: " + error.message);
    } finally {
      setIsSendingOtp(false);
    }
  };

  const verifyOTP = async () => {
    if (!otpCode || otpCode.length !== 6) {
      toast.error("Please enter the 6-digit verification code");
      return;
    }

    setIsVerifying(true);
    try {
      // Verify the OTP code
      const { error } = await supabase.auth.verifyOtp({
        phone: phoneNumber,
        token: otpCode,
        type: 'sms',
      });

      if (error) throw error;

      // Mark as verified in form
      form.setValue("phoneVerified", true);
      form.setValue("phoneVerifiedAt", new Date().toISOString());
      setPhoneVerified(true);

      toast.success("✅ Phone number verified successfully!");
    } catch (error: any) {
      console.error("OTP verification error:", error);
      toast.error("Invalid verification code. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const resendOTP = async () => {
    setOtpCode("");
    await sendOTP();
  };

  if (phoneVerified) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900">Phone Verified!</h3>
          <p className="text-gray-600">
            Your phone number <span className="font-medium">{phoneNumber}</span> has been verified.
          </p>
        </div>

        <Alert className="bg-green-50 border-green-200">
          <Shield className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            ✓ Identity verified • Helps prevent fraud • Enables booking notifications
          </AlertDescription>
        </Alert>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong>Why phone verification?</strong> It helps us maintain a trusted platform 
            by preventing fake accounts and ensures students can reliably book sessions with you.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
          <Phone className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900">Verify Your Phone Number</h3>
        <p className="text-gray-600">
          We'll send a 6-digit code to confirm your identity
        </p>
      </div>

      <Alert className="bg-blue-50 border-blue-200">
        <Shield className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          <strong>Quick & Free:</strong> Takes 30 seconds • Prevents fake accounts • 
          Industry standard (used by Uber, Airbnb, Upwork)
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <Label className="text-sm font-medium text-gray-700">Phone Number</Label>
            <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="font-medium text-gray-900">{phoneNumber || "No phone number set"}</p>
              <p className="text-xs text-gray-500 mt-1">
                From your basic info
              </p>
            </div>
          </div>

          {!otpSent ? (
            <Button
              type="button"
              onClick={sendOTP}
              disabled={isSendingOtp || !phoneNumber}
              className="w-full h-11"
            >
              {isSendingOtp ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending code...
                </>
              ) : (
                <>
                  <Phone className="mr-2 h-4 w-4" />
                  Send Verification Code
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="otp" className="text-sm font-medium text-gray-700">
                  Enter 6-Digit Code
                </Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="mt-2 text-center text-2xl tracking-widest font-mono h-14"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Code sent to {phoneNumber}
                </p>
              </div>

              <Button
                type="button"
                onClick={verifyOTP}
                disabled={isVerifying || otpCode.length !== 6}
                className="w-full h-11"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Verify Phone Number
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={resendOTP}
                disabled={isSendingOtp}
                className="w-full"
              >
                Didn't receive code? Resend
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
        <p className="text-sm font-medium text-gray-900">Why we verify phone numbers:</p>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>✓ Prevents fake accounts and scammers</li>
          <li>✓ Enables SMS booking confirmations & reminders</li>
          <li>✓ Builds student trust in our platform</li>
          <li>✓ Standard practice (same as Uber, Airbnb)</li>
        </ul>
        <p className="text-xs text-gray-500 mt-3">
          <strong>Privacy:</strong> Your number is never shared with students 
          until a booking is confirmed.
        </p>
      </div>
    </div>
  );
}
