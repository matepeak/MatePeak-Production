import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ArrowRight, ArrowLeft } from "lucide-react";

import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import OnboardingHeader from "@/components/onboarding/OnboardingHeader";
import BasicInfoStep from "@/components/onboarding/BasicInfoStep";
import { AvailabilitySetupStep } from "@/components/onboarding/AvailabilitySetupStep";
import ServicesAndPricingStep from "@/components/onboarding/ServicesAndPricingStep";
import { useExpertOnboardingForm } from "@/hooks/useExpertOnboardingForm";
import { updateExpertProfile } from "@/services/expertProfileService";

// Phase 1: Quick Start (Steps 1-4) - Required to go live

export default function ExpertOnboarding() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const navigate = useNavigate();
  const form = useExpertOnboardingForm();
  
  const totalSteps = 3; // Basic Info → Services → Availability

  // Check if scheduling services are enabled
  const hasSchedulingService = useMemo(() => {
    const servicePricing = form.watch("servicePricing");
    return servicePricing?.oneOnOneSession?.enabled || servicePricing?.priorityDm?.enabled;
  }, [form.watch("servicePricing")]);

  // Phase 1 step components - dynamic title for availability based on services
  const stepComponents = useMemo(() => [
    { component: BasicInfoStep, title: "Basic Info*", required: true },
    { component: ServicesAndPricingStep, title: "Services & Pricing*", required: true },
    { component: AvailabilitySetupStep, title: hasSchedulingService ? "Availability Setup*" : "Availability Setup (Optional)", required: true },
  ], [hasSchedulingService]);

  // Auto-save draft to localStorage
  useEffect(() => {
    const saveDraft = () => {
      const data = form.getValues();
      localStorage.setItem('mentor-onboarding-phase1-draft', JSON.stringify({ 
        data, 
        step,
        timestamp: Date.now(),
        phase: 1
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

  // Load draft on mount
  useEffect(() => {
    const draft = localStorage.getItem('mentor-onboarding-phase1-draft');
    if (draft) {
      try {
        const { data, step: savedStep, timestamp } = JSON.parse(draft);
        
        // Only show "draft loaded" message if user actually made progress
        const hasProgress = savedStep > 1 || 
                           (data.firstName && data.lastName && data.username && data.category);
        
        if (hasProgress) {
          Object.keys(data).forEach(key => {
            if (data[key] !== undefined && data[key] !== null) {
              form.setValue(key as any, data[key]);
            }
          });
          setStep(savedStep || 1);
          toast.info("Draft loaded! Continue where you left off.");
        } else {
          // Clear empty/minimal draft
          localStorage.removeItem('mentor-onboarding-phase1-draft');
        }
      } catch (error) {
        console.error("Failed to load draft:", error);
        localStorage.removeItem('mentor-onboarding-phase1-draft');
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

  const onSubmit = async () => {
    setIsSubmitting(true);

    try {
      const data = form.getValues();
      const profileData = {
        ...data,
        is_profile_live: true,
        phase_1_complete: true,
        mentor_tier: 'basic', // All mentors start as basic
        max_weekly_bookings: 5, // Basic tier limit
        verification_status: 'pending', // Pending until first successful session
        profile_status: 'active',
      };
      
      await updateExpertProfile(profileData);
      
      localStorage.removeItem('mentor-onboarding-phase1-draft');
      
      // Navigate to dedicated Phase 1 success page
      navigate('/expert/onboarding/phase-1/success');
    } catch (error: any) {
      console.error("Error creating profile:", error);
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
      localStorage.setItem('mentor-onboarding-phase1-draft', JSON.stringify({ 
        data, 
        step,
        timestamp: Date.now(),
        phase: 1
      }));
      
      // Try to save to database if we have minimum required fields
      if (data.firstName && data.lastName && data.username) {
        try {
          await updateExpertProfile(data);
        } catch (dbError: any) {
          console.error("Database save error (non-critical):", dbError);
          // Don't fail the whole operation if DB save fails
        }
      }
      
      toast.success("Draft saved! You can resume anytime from the menu.");
      navigate("/");
    } catch (error: any) {
      console.error("Error saving draft:", error);
      toast.error(error.message || "Failed to save draft");
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleNext = async () => {
    let isValid = false;

    // Validate current step
    switch (step) {
      case 1: // Basic Info
        isValid = await form.trigger([
          "firstName", "lastName", "email", "username", "skills", "ageConfirmation"
        ]);
        if (!isValid) {
          toast.error("Please fill in all required fields");
        }
        break;
        
      case 2: // Services & Pricing
        const servicePricing = form.getValues("servicePricing");
        const hasEnabledService = servicePricing && Object.values(servicePricing).some(
          (service: any) => service?.enabled === true
        );
        
        if (!hasEnabledService) {
          toast.error("Please add at least one service offering");
          isValid = false;
        } else {
          // Validate that enabled services have valid prices
          const invalidPrices = servicePricing && Object.entries(servicePricing).filter(
            ([key, service]: [string, any]) => {
              if (service?.enabled === true) {
                const price = service.price || 0;
                return price < 50 || price > 20000;
              }
              return false;
            }
          );
          
          if (invalidPrices && invalidPrices.length > 0) {
            toast.error("Invalid Price Range", {
              description: "All enabled services must have a price between ₹50 and ₹20,000",
            });
            isValid = false;
          } else {
            isValid = true;
          }
        }
        break;
        
      case 3: // Availability Setup
        const availableHours = form.getValues("availableHours");
        const servicePricingForAvailability = form.getValues("servicePricing");
        
        // Check which services require scheduling (oneOnOneSession, priorityDm)
        const hasSchedulingService = servicePricingForAvailability && 
          (servicePricingForAvailability.oneOnOneSession?.enabled || 
           servicePricingForAvailability.priorityDm?.enabled);
        
        // Check if at least one day is enabled
        const hasAvailability = availableHours && Object.values(availableHours).some(
          (day: any) => day?.enabled === true
        );
        
        // Only require availability if they have scheduling-based services
        if (hasSchedulingService && !hasAvailability) {
          toast.error("Please set your availability for at least one day", {
            description: "1-on-1 sessions and chat services require availability slots"
          });
          isValid = false;
        } else {
          // Phase 1 complete! Publish profile
          await onSubmit();
          return;
        }
        break;
        
      default:
        isValid = true;
        break;
    }

    if (isValid && step < totalSteps) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setStep(Math.max(step - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderStep = () => {
    const StepComponent = stepComponents[step - 1]?.component;
    return StepComponent ? <StepComponent form={form} /> : null;
  };

  return (
    <div className="min-h-screen bg-white">
      <OnboardingHeader />

      {/* Clean centered layout - Apple style */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* MatePeak Logo & Progress - Compact */}
        <div className="mb-10">
          {/* Logo - Small and centered */}
          <div className="flex justify-center mb-6">
            <img
              src="/lovable-uploads/14bf0eea-1bc9-4675-9231-356df10eb82d.png"
              alt="MatePeak"
              className="h-10 w-auto"
            />
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center justify-center gap-2 mb-2">
            {[1, 2, 3].map((stepNum) => (
              <div
                key={stepNum}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  stepNum < step 
                    ? "w-8 bg-green-500" // Completed steps
                    : stepNum === step 
                    ? "w-12 bg-gray-900" // Current step
                    : "w-8 bg-gray-200" // Future steps
                )}
              />
            ))}
          </div>
          <p className="text-center text-xs text-gray-400">
            Step {step} of {totalSteps}
          </p>
        </div>

        {/* Main Content Card */}
        <div className="bg-white">
          {/* Title Section - Clean Typography */}
          <div className="mb-12 text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-gray-900 mb-3">
              {stepComponents[step - 1]?.title}
            </h1>
            <p className="text-base text-gray-500 max-w-xl mx-auto">
              Complete your essential profile to start mentoring
            </p>
          </div>

          <TooltipProvider>
            <Form {...form}>
              <form className="space-y-8">
                {renderStep()}

                {/* Navigation - Clean Buttons */}
                <div className="flex justify-between items-center pt-12 mt-12 border-t border-gray-100">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleBack}
                    disabled={step === 1}
                    className="group px-6 h-11 text-gray-600 hover:text-gray-900 font-medium disabled:opacity-30 flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" />
                    <span>Back</span>
                  </Button>

                  <div className="flex items-center gap-4">
                    {/* Save Draft - Subtle */}
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleSaveDraft}
                      disabled={isSavingDraft}
                      className="text-sm text-gray-400 hover:text-gray-600"
                    >
                      {isSavingDraft ? "Saving..." : "Save Draft"}
                    </Button>

                    <Button
                      type="button"
                      onClick={handleNext}
                      disabled={isSubmitting}
                      className="group px-8 h-11 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                    >
                      <span>
                        {isSubmitting ? "Publishing..." : 
                         step === totalSteps ? "Finish" :
                         "Continue"}
                      </span>
                      {!isSubmitting && (
                        <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}
