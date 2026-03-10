import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TooltipProvider } from "@/components/ui/tooltip";
import OnboardingHeader from "@/components/onboarding/OnboardingHeader";
import ProfileDescriptionStep from "@/components/onboarding/ProfileDescriptionStep";
import CredentialsAndBackgroundStep from "@/components/onboarding/CredentialsAndBackgroundStep";
import SocialProofStep from "@/components/onboarding/SocialProofStep";
import ProfileSetupStep from "@/components/onboarding/ProfileSetupStep";
import OnboardingSuccessModal from "@/components/onboarding/OnboardingSuccessModal";
import { useExpertOnboardingForm } from "@/hooks/useExpertOnboardingForm";
import { updateExpertProfile } from "@/services/expertProfileService";
import { Sparkles, CheckCircle2 } from "lucide-react";

// Phase 2: Complete Profile (Steps 1-8 of Phase 2) - Optional for better visibility

export default function ExpertOnboardingPhase2() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [completedUsername, setCompletedUsername] = useState("");
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const navigate = useNavigate();
  const form = useExpertOnboardingForm();
  
  const totalSteps = 4; // Phase 2: Build Credibility & Trust

  // Phase 2 step components - Focus on verification and credibility
  const stepComponents = [
    { component: ProfileDescriptionStep, title: "Profile Story", required: false },
    { component: CredentialsAndBackgroundStep, title: "Credentials & Background", required: false },
    { component: SocialProofStep, title: "Social Proof & Verification", required: false },
    { component: ProfileSetupStep, title: "Profile Setup", required: false },
  ];

  // Auto-save draft to localStorage
  useEffect(() => {
    const saveDraft = () => {
      const data = form.getValues();
      localStorage.setItem('mentor-onboarding-phase2-draft', JSON.stringify({ 
        data, 
        step,
        timestamp: Date.now(),
        phase: 2
      }));
    };

    const interval = setInterval(saveDraft, 30000); // Every 30 seconds
    
    // Save draft before page unload
    const handleBeforeUnload = () => {
      saveDraft();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Save one last time on unmount
      saveDraft();
    };
  }, [form, step]);

  // Load draft and existing profile data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) {
          console.error("Auth error:", userError);
          toast.error("Authentication error");
          return;
        }
        
        if (!user) {
          navigate('/login');
          return;
        }

        // Load existing profile data
        const { data: profileData, error: profileError } = await supabase
          .from('expert_profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error("Profile error:", profileError);
          
          // If no profile exists, redirect to Phase 1
          if (profileError.code === 'PGRST116') {
            toast.error("Please complete Phase 1 onboarding first");
            navigate('/expert/onboarding');
            return;
          }
          
          throw profileError;
        }

        // Check if Phase 1 is complete
        if (!profileData?.phase_1_complete) {
          toast.error("Please complete Phase 1 onboarding first");
          navigate('/expert/onboarding');
          return;
        }

        // Load existing profile data into form
        if (profileData) {
          Object.keys(profileData).forEach(key => {
            if (profileData[key] !== undefined && profileData[key] !== null) {
              form.setValue(key as any, profileData[key]);
            }
          });
        }

        // Load draft if exists and user has actually made progress
        const draft = localStorage.getItem('mentor-onboarding-phase2-draft');
        if (draft) {
          try {
            const { data: draftData, step: savedStep, timestamp } = JSON.parse(draft);
            
            // Only load and show message if user actually started Phase 2
            // Show draft for step 1 or higher if there's meaningful data
            const hasPhase2Progress = savedStep > 1 || 
              // Check if user filled any Phase 2 specific fields
              (draftData?.introduction || draftData?.bio || draftData?.professionalExperience || 
               draftData?.linkedinUrl || draftData?.videoIntroductionUrl || draftData?.headline);
            
            if (hasPhase2Progress) {
              Object.keys(draftData).forEach(key => {
                if (draftData[key] !== undefined && draftData[key] !== null) {
                  form.setValue(key as any, draftData[key]);
                }
              });
              setStep(savedStep || 1);
              toast.info("Draft loaded! Continue where you left off.");
            } else {
              // Clear draft if it's just from auto-save without progress
              localStorage.removeItem('mentor-onboarding-phase2-draft');
            }
          } catch (error) {
            console.error("Failed to load draft:", error);
            localStorage.removeItem('mentor-onboarding-phase2-draft');
          }
        }
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Failed to load profile data");
      }
    };

    loadData();
  }, [form, navigate]);

  const onSubmit = async () => {
    setIsSubmitting(true);

    try {
      const data = form.getValues();
      const profileData = {
        ...data,
        phase_2_complete: true,
        // Note: Phase 2 is now optional profile enhancement only
        // Does NOT automatically grant verification status
        // Verification requires phone + LinkedIn + student reviews
      };
      
      await updateExpertProfile(profileData);
      
      toast.success("🎉 Profile enhanced! Your detailed profile helps attract more students.");

      setCompletedUsername(data.username);
      setShowSuccessModal(true);
      localStorage.removeItem('mentor-onboarding-phase2-draft');
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(error.message || "Failed to save profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    try {
      const data = form.getValues();
      
      // Save to localStorage first (always works)
      localStorage.setItem('mentor-onboarding-phase2-draft', JSON.stringify({ 
        data, 
        step,
        timestamp: Date.now(),
        phase: 2
      }));
      
      // Try to save to database
      try {
        await updateExpertProfile(data);
      } catch (dbError: any) {
        console.error("Database save error:", dbError);
        // Show more specific error but don't fail the whole save
        toast.warning("Draft saved locally. Some fields may need completion before syncing to server.");
        setTimeout(() => navigate("/"), 1000);
        return;
      }
      
      toast.success("💾 Draft saved! You can resume anytime from the menu.");
      // Navigate to home page
      setTimeout(() => navigate("/"), 1000);
    } catch (error: any) {
      console.error("Error saving draft:", error);
      toast.error(error.message || "Failed to save draft");
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleNext = async () => {
    // Step 2 validation: Credentials & Background
    if (step === 2) {
      const formValues = form.getValues();
      const education = formValues.education;
      const certifications = formValues.teachingCertifications;
      const hasNoCertificate = formValues.hasNoCertificate;
      const experience = (formValues as any).professionalExperience;
      const hasNoExperience = (formValues as any).hasNoExperience;
      
      // Check if at least one education entry exists and has required fields
      const hasValidEducation = education && 
        education.length > 0 && 
        education.some((edu: any) => {
          const institution = edu.institution === "Other (Enter manually)" 
            ? edu.customInstitution 
            : edu.institution;
          const degree = edu.degree === "Other" 
            ? edu.customDegree 
            : edu.degree;
          const field = edu.field === "Other" 
            ? edu.customField 
            : edu.field;
          
          return institution && 
                 institution.trim() !== "" && 
                 degree && 
                 degree.trim() !== "" && 
                 field && 
                 field.trim() !== "" && 
                 edu.startYear && 
                 edu.startYear.trim() !== "" &&
                 (edu.currentlyStudying || (edu.endYear && edu.endYear.trim() !== ""));
        });
      
      if (!hasValidEducation) {
        toast.error("Please add at least one complete education entry to continue");
        return;
      }

      // Check certifications: Either checkbox is ticked OR at least one valid certification
      const hasValidCertification = certifications && 
        certifications.length > 0 && 
        certifications.some((cert: any) => 
          cert.name && cert.name.trim() !== "" && 
          cert.issuer && cert.issuer.trim() !== "" && 
          cert.year && cert.year.trim() !== ""
        );
      
      if (!hasNoCertificate && !hasValidCertification) {
        toast.error("Please add at least one teaching certification or check 'I don't have any teaching certifications yet'");
        return;
      }

      // Check experience: Either checkbox is ticked OR at least one valid experience
      const hasValidExperience = experience && 
        experience.length > 0 && 
        experience.some((exp: any) => 
          exp.company && exp.company.trim() !== "" && 
          exp.role && exp.role.trim() !== "" && 
          exp.years && exp.years.trim() !== ""
        );
      
      if (!hasNoExperience && !hasValidExperience) {
        toast.error("Please add at least one professional experience or check 'I don't have any professional experience yet'");
        return;
      }
    }

    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      // Final step
      await onSubmit();
    }
  };

  const handleBack = () => {
    if (step === 1) {
      // Go back to dashboard
      navigate(-1);
    } else {
      setStep(Math.max(step - 1, 1));
    }
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    navigate(`/dashboard/${completedUsername}`);
  };

  const renderStep = () => {
    const currentStepInfo = stepComponents[step - 1];
    if (!currentStepInfo) return null;

    const StepComponent = currentStepInfo.component;
    return <StepComponent form={form} />;
  };

  const currentStepInfo = stepComponents[step - 1];
  const progressPercentage = (step / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-orange-50 to-purple-50">
      <OnboardingHeader />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="border-2 shadow-2xl">
          <CardContent className="p-12">
            {/* Phase 2 Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-6 h-6 text-orange-500" />
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Phase 2: Complete Your Profile</h2>
                    <p className="text-sm text-gray-600">Optional steps for better visibility and more bookings</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-orange-500">
                    {step}/{totalSteps}
                  </div>
                  <div className="text-xs text-gray-500">
                    Optional
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="absolute inset-0 h-full transition-all duration-500 rounded-full bg-gradient-to-r from-orange-400 to-pink-500"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              
              {/* Step indicator dots */}
              <div className="flex justify-between mt-2">
                {stepComponents.map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      idx < step ? 'bg-orange-500' : 
                      idx === step - 1 ? 'bg-pink-500' : 
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
              <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                Optional
              </span>
            </div>

            {/* Save Draft Button */}
            <div className="mb-4 flex justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={handleSaveDraft}
                disabled={isSavingDraft}
                className="text-gray-600 hover:text-gray-900"
              >
                {isSavingDraft ? "Saving..." : "💾 Save Draft & Continue Later"}
              </Button>
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
                      className="min-w-[100px]"
                    >
                      ← Back
                    </Button>

                    <div className="flex gap-3">
                      {/* Skip button for all Phase 2 steps */}
                      {step < totalSteps && (
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
                        className="min-w-[120px] bg-gradient-to-r from-orange-400 to-pink-500"
                      >
                        {isSubmitting ? "Saving..." : 
                         step === totalSteps ? "Complete Profile ✨" :
                         "Next →"}
                      </Button>
                    </div>
                  </div>
                </form>
              </Form>
            </TooltipProvider>
          </CardContent>
        </Card>

        <OnboardingSuccessModal
          isOpen={showSuccessModal}
          onClose={handleCloseSuccessModal}
          username={completedUsername}
        />
      </div>
    </div>
  );
}
