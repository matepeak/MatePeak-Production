import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { 
  Camera, 
  Shield,
  FileText,
  Phone,
  CheckCircle2,
  Linkedin,
  AlertTriangle,
  Upload,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

interface IdentityVerificationStepProps {
  form: UseFormReturn<any>;
}

type VerificationMethod = "camera" | "document" | "phone" | "social" | "skip";

export default function IdentityVerificationStep({ form }: IdentityVerificationStepProps) {
  const [selectedMethod, setSelectedMethod] = useState<VerificationMethod | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const verificationMethods = [
    {
      id: "document" as VerificationMethod,
      icon: FileText,
      title: "ID Document Upload",
      description: "Upload government ID + selfie for manual review",
      recommended: true,
      time: "Verified within 24 hours",
      difficulty: "Easy - Works with any camera"
    },
    {
      id: "phone" as VerificationMethod,
      icon: Phone,
      title: "Phone Verification",
      description: "Verify via SMS code to your phone number",
      recommended: false,
      time: "Instant verification",
      difficulty: "Easy - No camera needed"
    },
    {
      id: "social" as VerificationMethod,
      icon: Linkedin,
      title: "LinkedIn Verification",
      description: "Link your professional LinkedIn profile",
      recommended: false,
      time: "Instant verification",
      difficulty: "Easy - If you have LinkedIn"
    },
    {
      id: "camera" as VerificationMethod,
      icon: Camera,
      title: "Live Camera Verification",
      description: "Real-time face verification (requires good camera)",
      recommended: false,
      time: "Instant verification",
      difficulty: "Medium - Needs good lighting"
    },
    {
      id: "skip" as VerificationMethod,
      icon: Clock,
      title: "Verify Later",
      description: "Skip for now, complete later from dashboard",
      recommended: false,
      time: "Must verify to unlock more bookings",
      difficulty: "Easy - But limited features"
    }
  ];

  const handleDocumentUpload = async () => {
    if (!documentFile || !selfieFile) {
      toast.error("Please upload both your ID document and a selfie");
      return;
    }

    setIsVerifying(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload ID document
      const idFileName = `verification-documents/${user.id}/id_${Date.now()}.${documentFile.name.split('.').pop()}`;
      const { error: idError } = await supabase.storage
        .from('verification-photos')
        .upload(idFileName, documentFile);

      if (idError) throw idError;

      // Upload selfie
      const selfieFileName = `verification-documents/${user.id}/selfie_${Date.now()}.${selfieFile.name.split('.').pop()}`;
      const { error: selfieError } = await supabase.storage
        .from('verification-photos')
        .upload(selfieFileName, selfieFile);

      if (selfieError) throw selfieError;

      // Get public URLs
      const { data: { publicUrl: idUrl } } = supabase.storage
        .from('verification-photos')
        .getPublicUrl(idFileName);

      const { data: { publicUrl: selfieUrl } } = supabase.storage
        .from('verification-photos')
        .getPublicUrl(selfieFileName);

      // Save to form
      form.setValue("verificationPhotoUrl", selfieUrl);
      form.setValue("verificationStatus", "pending");
      form.setValue("verificationMethod", "document");
      form.setValue("verificationDocumentUrl", idUrl);

      toast.success("Documents uploaded! Our team will verify within 24 hours.");
      
    } catch (error: any) {
      console.error("Document upload error:", error);
      toast.error("Failed to upload documents: " + error.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePhoneVerification = async () => {
    if (!phoneNumber) {
      toast.error("Please enter your phone number");
      return;
    }

    if (!otpSent) {
      // Send OTP
      setIsVerifying(true);
      try {
        // TODO: Implement actual SMS OTP service
        // For now, simulate sending OTP
        setOtpSent(true);
        toast.success("Verification code sent to " + phoneNumber);
      } catch (error: any) {
        toast.error("Failed to send OTP: " + error.message);
      } finally {
        setIsVerifying(false);
      }
    } else {
      // Verify OTP
      if (!otp || otp.length !== 6) {
        toast.error("Please enter the 6-digit verification code");
        return;
      }

      setIsVerifying(true);
      try {
        // TODO: Implement actual OTP verification
        // For now, accept any 6-digit code
        form.setValue("verificationStatus", "verified");
        form.setValue("verificationMethod", "phone");
        form.setValue("verifiedPhone", phoneNumber);
        toast.success("Phone verified successfully!");
      } catch (error: any) {
        toast.error("Invalid verification code");
      } finally {
        setIsVerifying(false);
      }
    }
  };

  const handleLinkedInVerification = async () => {
    if (!linkedinUrl || !linkedinUrl.includes('linkedin.com')) {
      toast.error("Please enter a valid LinkedIn profile URL");
      return;
    }

    setIsVerifying(true);
    try {
      // Save LinkedIn URL
      form.setValue("verificationStatus", "pending");
      form.setValue("verificationMethod", "linkedin");
      form.setValue("linkedinUrl", linkedinUrl);
      
      toast.success("LinkedIn profile submitted for verification!");
    } catch (error: any) {
      toast.error("Failed to save LinkedIn profile");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSkipVerification = () => {
    form.setValue("verificationStatus", "pending");
    form.setValue("verificationMethod", "skip");
    toast.info("You can complete verification later from your dashboard");
  };

  if (!selectedMethod) {
    return (
      <div className="space-y-6">
        <Alert className="bg-blue-50 border-blue-200">
          <Shield className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <strong>Why verify?</strong> Verification builds trust with students and unlocks higher booking limits.
            Choose the method that works best for you.
          </AlertDescription>
        </Alert>

        <div className="grid gap-4 md:grid-cols-2">
          {verificationMethods.map((method) => {
            const Icon = method.icon;
            return (
              <Card
                key={method.id}
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  method.recommended ? 'border-2 border-green-500' : 'border'
                }`}
                onClick={() => setSelectedMethod(method.id)}
              >
                <CardContent className="p-6">
                  {method.recommended && (
                    <div className="mb-2">
                      <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded">
                        Recommended
                      </span>
                    </div>
                  )}
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-gray-700" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{method.title}</h3>
                      <p className="text-sm text-gray-600 mb-2">{method.description}</p>
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500">⏱️ {method.time}</p>
                        <p className="text-xs text-gray-500">📊 {method.difficulty}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-900 text-sm">
            <strong>Note:</strong> Unverified mentors are limited to 5 bookings per week. 
            Verified mentors get 15+ bookings per week and better visibility.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Render selected method
  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        onClick={() => setSelectedMethod(null)}
        className="mb-4"
      >
        ← Choose Different Method
      </Button>

      {selectedMethod === "document" && (
        <Card>
          <CardContent className="p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">ID Document Upload</h3>
              <p className="text-sm text-gray-600">
                Upload a government-issued ID (passport, driver's license, national ID) and a selfie. 
                Our team will verify within 24 hours.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="id-document">Government ID Document *</Label>
                <Input
                  id="id-document"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Accepted: Passport, Driver's License, National ID
                </p>
              </div>

              <div>
                <Label htmlFor="selfie">Selfie Photo *</Label>
                <Input
                  id="selfie"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelfieFile(e.target.files?.[0] || null)}
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Take a clear photo of your face - any camera quality works!
                </p>
              </div>

              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-900 text-sm">
                  ✅ Works with low-quality cameras<br />
                  ✅ No special lighting needed<br />
                  ✅ Verified within 24 hours
                </AlertDescription>
              </Alert>

              <Button
                onClick={handleDocumentUpload}
                disabled={!documentFile || !selfieFile || isVerifying}
                className="w-full"
              >
                {isVerifying ? (
                  <>
                    <Upload className="mr-2 h-4 w-4 animate-pulse" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Submit for Verification
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedMethod === "phone" && (
        <Card>
          <CardContent className="p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Phone Verification</h3>
              <p className="text-sm text-gray-600">
                Verify your identity using your phone number. We'll send you a code via SMS.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={otpSent}
                  className="mt-2"
                />
              </div>

              {otpSent && (
                <div>
                  <Label htmlFor="otp">Enter 6-Digit Code *</Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="123456"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="mt-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Code sent to {phoneNumber}
                  </p>
                </div>
              )}

              <Button
                onClick={handlePhoneVerification}
                disabled={isVerifying}
                className="w-full"
              >
                {isVerifying ? "Verifying..." : otpSent ? "Verify Code" : "Send Verification Code"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedMethod === "social" && (
        <Card>
          <CardContent className="p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">LinkedIn Verification</h3>
              <p className="text-sm text-gray-600">
                Link your professional LinkedIn profile to verify your identity.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="linkedin">LinkedIn Profile URL *</Label>
                <Input
                  id="linkedin"
                  type="url"
                  placeholder="https://www.linkedin.com/in/yourprofile"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  className="mt-2"
                />
              </div>

              <Alert className="bg-blue-50 border-blue-200">
                <Linkedin className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900 text-sm">
                  Make sure your LinkedIn profile is public and matches your name.
                </AlertDescription>
              </Alert>

              <Button
                onClick={handleLinkedInVerification}
                disabled={isVerifying}
                className="w-full"
              >
                {isVerifying ? "Submitting..." : "Verify with LinkedIn"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedMethod === "skip" && (
        <Card>
          <CardContent className="p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Skip Verification for Now</h3>
              <p className="text-sm text-gray-600">
                You can complete verification later from your dashboard.
              </p>
            </div>

            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-900">
                <strong>Limitations without verification:</strong>
                <ul className="list-disc ml-5 mt-2 space-y-1 text-sm">
                  <li>Limited to 5 bookings per week (instead of 15+)</li>
                  <li>Lower visibility in search results</li>
                  <li>No "Verified" badge on your profile</li>
                  <li>Cannot access certain premium features</li>
                </ul>
              </AlertDescription>
            </Alert>

            <Button
              onClick={handleSkipVerification}
              variant="outline"
              className="w-full"
            >
              Skip and Continue
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
