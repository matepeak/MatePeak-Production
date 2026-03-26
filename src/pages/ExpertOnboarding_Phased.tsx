import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TooltipProvider } from "@/components/ui/tooltip";
import OnboardingHeader from "@/components/onboarding/OnboardingHeader";
import BasicInfoStep from "@/components/onboarding/BasicInfoStep";
import IdentityVerificationStep from "@/components/onboarding/IdentityVerificationStep";
import TeachingCertificationStep from "@/components/onboarding/TeachingCertificationStep";
import EducationStep from "@/components/onboarding/EducationStep";
import ProfileDescriptionStep from "@/components/onboarding/ProfileDescriptionStep";
import TargetAudienceStep from "@/components/onboarding/TargetAudienceStep";
import ProblemsStep from "@/components/onboarding/ProblemsStep";
import OutcomesStep from "@/components/onboarding/OutcomesStep";
import ServicesAndPricingStep from "@/components/onboarding/ServicesAndPricingStep";
import AvailabilityStep from "@/components/onboarding/AvailabilityStep";
import ProfileSetupStep from "@/components/onboarding/ProfileSetupStep";
import OnboardingSuccessModal from "@/components/onboarding/OnboardingSuccessModal";
import { useExpertOnboardingForm } from "@/hooks/useExpertOnboardingForm";
import { updateExpertProfile } from "@/services/expertProfileService";
import { Rocket, CheckCircle2, Sparkles } from "lucide-react";

// Phase 1: Quick Start (Steps 1-3) - Required to go live
// Phase 2: Complete Profile (Steps 4-11) - Optional for better visibility

export default function ExpertOnboarding() {
  const [step, setStep] = useState(1);
  const [phase, setPhase] = useState<1 | 2>(1); // Phase 1 = Quick Start, Phase 2 = Complete Profile
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [completedUsername, setCompletedUsername] = useState("");
  const [showPhaseTransition, setShowPhaseTransition] = useState(false);
  const navigate = useNavigate();
  const form = useExpertOnboardingForm();
  
  const phase1Steps = 3; // Basic Info → Services → Identity
  const phase2Steps = 8; // All optional enhancement steps
  const totalSteps = phase1Steps + phase2Steps;

  // Reordered step mapping for Phase 1 priority
  const stepComponents = [
    { component: BasicInfoStep, title: "Basic Info", required: true },
    { component: ServicesAndPricingStep, title: "Services & Pricing", required: true },
    { component: IdentityVerificationStep, title: "Identity Verification", required: true },
    // Phase 2 - Optional
    { component: ProfileDescriptionStep, title: "Profile Description", required: false },
    { component: TeachingCertificationStep, title: "Certifications", required: false },
    { component: EducationStep, title: "Education", required: false },
    { component: TargetAudienceStep, title: "Target Audience", required: false },
    { component: ProblemsStep, title: "Problems You Solve", required: false },
    { component: OutcomesStep, title: "Outcomes", required: false },
    { component: AvailabilityStep, title: "Availability", required: false },
    { component: ProfileSetupStep, title: "Profile Setup", required: false },
  ];

  // Auto-save draft to localStorage
  useEffect(() => {
    const saveDraft = () => {
      const data = form.getValues();
      localStorage.setItem('mentor-onboarding-draft', JSON.stringify({ data, step, phase }));
    };

    const interval = setInterval(saveDraft, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [form, step, phase]);

  // Load draft on mount
  useEffect(() => {
    const draft = localStorage.getItem('mentor-onboarding-draft');
    if (draft) {
      try {
        const { data, step: savedStep, phase: savedPhase } = JSON.parse(draft);
        Object.keys(data).forEach(key => {
          if (data[key] !== undefined && data[key] !== null) {
            form.setValue(key as any, data[key]);
          }
        });
        setStep(savedStep || 1);
        setPhase(savedPhase || 1);
        toast.info("Draft loaded! Continue where you left off.");
      } catch (error) {
        console.error("Failed to load draft:", error);
      }
    }
  }, [form]);

  // Auto-populate from signup
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) return;

        const fullName = user.user_metadata?.full_name || "";
        const email = user.email || "";
        const nameParts = fullName.trim().split(" ");
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";

        if (firstName) form.setValue("firstName", firstName);
        if (lastName) form.setValue("lastName", lastName);
        if (email) form.setValue("email", email);
      } catch (error) {
        console.error("Error loading user data:", error);
      }
    };
    loadUserData();
  }, [form]);

  const onSubmit = async (goLiveNow: boolean = false) => {
    setIsSubmitting(true);

    try {
      const data = form.getValues();
      const profileData = {
        ...data,
        is_profile_live: goLiveNow || phase >= 1, // Can go live after Phase 1
        phase_1_complete: phase >= 1,
        phase_2_complete: step > phase1Steps,
      };
      
      await updateExpertProfile(profileData);
      
      if (goLiveNow) {
        toast.success("🎉 Profile is now live! Start accepting bookings!");
      } else {
        toast.success("Progress saved!");
      }

      setCompletedUsername(data.username);
      setShowSuccessModal(true);
      localStorage.removeItem('mentor-onboarding-draft');
    } catch (error: any) {
      console.error("Error creating profile:", error);
      toast.error(error.message || "Failed to save profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = async () => {
    let isValid = false;

    // Validate current step
    switch (step) {
      case 1: // Basic Info
        isValid = await form.trigger([
          "firstName", "lastName", "email", "username",
          "category", "countryOfBirth", "languages", "ageConfirmation"
        ]);
        if (!isValid) {
          toast.error("Please fill in all required fields");
        }
        break;
        
      case 2: // Services & Pricing
        const services = form.getValues("services");
        if (!services || services.length === 0) {
          toast.error("Please add at least one service offering");
          isValid = false;
        } else {
          isValid = true;
        }
        break;
        
      case 3: // Identity Verification
        const verificationStatus = form.getValues("verificationStatus");
        if (verificationStatus === "verified") {
          isValid = true;
          // Phase 1 complete! Show transition
          setShowPhaseTransition(true);
        } else {
          toast.error("Please complete identity verification to go live");
          isValid = false;
        }
        break;
        
      default:
        // Phase 2 steps are all optional
        isValid = true;
        break;
    }

    if (isValid) {
      if (step < totalSteps) {
        setStep(step + 1);
        if (step === phase1Steps) {
          setPhase(2); // Transition to Phase 2
        }
      } else {
        // Final step
        await onSubmit(true);
      }
    }
  };

  const handleBack = () => {
    setStep(Math.max(step - 1, 1));
    if (step === phase1Steps + 1) {
      setPhase(1);
    }
  };

  const handleSkipToGoLive = async () => {
    await onSubmit(true);
  };

  const handleContinueToPhase2 = () => {
    setShowPhaseTransition(false);
    setStep(phase1Steps + 1);
    setPhase(2);
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    navigate(`/dashboard/${completedUsername}`);
  };

  const renderStep = () => {
    const StepComponent = stepComponents[step - 1]?.component;
    return StepComponent ? <StepComponent form={form} /> : null;
  };

  const currentStepInfo = stepComponents[step - 1];
  const progressPercentage = (step / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <OnboardingHeader />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="border-2 shadow-2xl">
          <CardContent className="p-12">
            {/* Phase Indicator */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {phase === 1 ? (
                    <>
                      <Rocket className="w-6 h-6 text-matepeak-primary" />
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">Phase 1: Quick Start</h2>
                        <p className="text-sm text-gray-600">Complete these 3 steps to go live immediately</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-6 h-6 text-orange-500" />
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">Phase 2: Complete Your Profile</h2>
                        <p className="text-sm text-gray-600">Optional steps for better visibility and more bookings</p>
                      </div>
                    </>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-matepeak-primary">
                    {phase === 1 ? `${step}/3` : `${step - phase1Steps}/8`}
                  </div>
                  <div className="text-xs text-gray-500">
                    {phase === 1 ? 'Required' : 'Optional'}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`absolute inset-0 h-full transition-all duration-500 rounded-full ${
                    phase === 1 
                      ? 'bg-gradient-to-r from-matepeak-primary to-matepeak-secondary' 
                      : 'bg-gradient-to-r from-orange-400 to-pink-500'
                  }`}
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              
              {/* Step indicator dots */}
              <div className="flex justify-between mt-2">
                {stepComponents.map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      idx < step ? 'bg-matepeak-primary' : 
                      idx === step - 1 ? 'bg-matepeak-secondary' : 
                      'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Current Step Title */}
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">
                {currentStepInfo?.title}
              </h3>
              <div className="flex items-center gap-2">
                {!currentStepInfo?.required && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                    Optional
                  </span>
                )}
                <span className="text-xs text-gray-500">Draft auto-saves every 30s</span>
              </div>
            </div>

            <TooltipProvider>
              <Form {...form}>
                <form className="space-y-8">
                  {renderStep()}

                  {/* Navigation */}
                  <div className="flex justify-between items-center pt-6 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBack}
                      disabled={step === 1}
                      className="min-w-[100px]"
                    >
                      ← Back
                    </Button>

                    <div className="flex gap-3">
                      {/* Skip button for Phase 2 steps */}
                      {phase === 2 && step < totalSteps && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setStep(step + 1)}
                          className="text-gray-600"
                        >
                          Skip for Now →
                        </Button>
                      )}

                      <Button
                        type="button"
                        onClick={handleNext}
                        disabled={isSubmitting}
                        className="min-w-[120px] bg-gradient-to-r from-matepeak-primary to-matepeak-secondary"
                      >
                        {isSubmitting ? "Saving..." : 
                         step === totalSteps ? "Complete Profile" :
                         step === phase1Steps ? "Verify & Go Live →" :
                         "Next →"}
                      </Button>
                    </div>
                  </div>
                </form>
              </Form>
            </TooltipProvider>
          </CardContent>
        </Card>

        {/* Phase Transition Modal */}
        {showPhaseTransition && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-md w-full shadow-2xl">
              <CardContent className="p-8 text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-12 h-12 text-green-600" />
                </div>
                
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  🎉 Ready to Go Live!
                </h2>
                
                <p className="text-gray-600 mb-6">
                  You've completed the minimum requirements. You can start accepting bookings now or 
                  complete your profile for <strong>3x better visibility</strong> and more bookings.
                </p>

                <div className="space-y-3">
                  <Button
                    onClick={handleSkipToGoLive}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Publishing..." : "Go Live Now 🚀"}
                  </Button>
                  
                  <Button
                    onClick={handleContinueToPhase2}
                    variant="outline"
                    className="w-full border-2 border-matepeak-primary text-matepeak-primary hover:bg-matepeak-primary/10 font-semibold"
                  >
                    Complete Profile First ✨
                  </Button>
                </div>

                <p className="text-xs text-gray-500 mt-4">
                  Mentors with complete profiles get 3x more bookings
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <OnboardingSuccessModal
          isOpen={showSuccessModal}
          onClose={handleCloseSuccessModal}
          username={completedUsername}
        />
      </div>
    </div>
  );
}
