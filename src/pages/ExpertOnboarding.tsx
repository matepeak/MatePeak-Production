import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

import { Form } from "@/components/ui/form";
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
import OnboardingProgress from "@/components/onboarding/OnboardingProgress";
import StepNavigation from "@/components/onboarding/StepNavigation";
import OnboardingSuccessModal from "@/components/onboarding/OnboardingSuccessModal";
import { useExpertOnboardingForm } from "@/hooks/useExpertOnboardingForm";
import { updateExpertProfile } from "@/services/expertProfileService";

export default function ExpertOnboarding() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [completedUsername, setCompletedUsername] = useState("");
  const navigate = useNavigate();
  const form = useExpertOnboardingForm();
  const totalSteps = 11; // Updated: Added identity verification step

  // Auto-populate form fields from signup data
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error || !user) {
          console.error("Error fetching user:", error);
          return;
        }

        // Get full_name from user metadata (set during signup)
        const fullName = user.user_metadata?.full_name || "";
        const email = user.email || "";

        // Split full name into first and last name
        const nameParts = fullName.trim().split(" ");
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";

        // Pre-fill the form fields
        if (firstName) form.setValue("firstName", firstName);
        if (lastName) form.setValue("lastName", lastName);
        if (email) form.setValue("email", email);

        console.log("Auto-populated onboarding form:", {
          firstName,
          lastName,
          email,
        });
      } catch (error) {
        console.error("Error loading user data:", error);
      }
    };

    loadUserData();
  }, [form]);

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);

    try {
      const result = await updateExpertProfile(data);
      toast.success("Profile created successfully!");

      // Store username and show success modal
      setCompletedUsername(data.username);
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error("Error creating profile:", error);
      toast.error(error.message || "Failed to create profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    // Navigate to dashboard after modal closes
    navigate(`/dashboard/${completedUsername}`);
  };

  const handleNext = async () => {
    let isValid = false;

    try {
      switch (step) {
        case 1:
          isValid = await form.trigger([
            "firstName",
            "lastName",
            "email",
            "username",
            "category",
            "countryOfBirth",
            "languages",
            "ageConfirmation",
          ]);

          if (!isValid) {
            // Find the first error field and scroll to it
            const errors = form.formState.errors;
            const errorFields = [
              "firstName",
              "lastName",
              "email",
              "username",
              "category",
              "countryOfBirth",
              "languages",
              "ageConfirmation",
            ];

            for (const field of errorFields) {
              if (errors[field]) {
                // Scroll to the first error field
                setTimeout(() => {
                  const errorElement =
                    document.querySelector(`[name="${field}"]`) ||
                    document.querySelector(`[data-field="${field}"]`);
                  if (errorElement) {
                    errorElement.scrollIntoView({
                      behavior: "smooth",
                      block: "center",
                    });
                    // Add a shake animation to the error element's parent
                    const formItem = errorElement.closest(
                      '.space-y-2, [class*="FormItem"]'
                    );
                    if (formItem) {
                      formItem.classList.add("animate-shake");
                      setTimeout(
                        () => formItem.classList.remove("animate-shake"),
                        500
                      );
                    }
                  }
                }, 100);

                // Show a helpful toast message
                if (field === "languages") {
                  toast.error("Please add at least one language you speak");
                } else if (field === "category") {
                  toast.error("Please select your area of expertise");
                } else if (field === "ageConfirmation") {
                  toast.error("Please confirm you are over 18 years old");
                } else {
                  toast.error(
                    `Please fill in the required field: ${field
                      .replace(/([A-Z])/g, " $1")
                      .trim()}`
                  );
                }
                break;
              }
            }
          }
          break;
        case 2:
          // Identity Verification - optional but recommended
          // Check if verification was completed
          const verificationStatus = form.getValues("verificationStatus");
          if (verificationStatus === "verified") {
            isValid = true;
          } else {
            // Allow skipping for now, but show a reminder
            toast.info("Identity verification is recommended for building trust with students");
            isValid = true;
          }
          break;
        case 3:
          // Teaching Certification - validate only if not skipped
          const hasNoCertificate = form.getValues("hasNoCertificate");
          if (hasNoCertificate) {
            isValid = true;
          } else {
            const certs = form.getValues("teachingCertifications");
            if (!certs || certs.length === 0) {
              toast.error(
                "Please add at least one certificate or check 'I don't have a teaching certificate'"
              );
              isValid = false;
            } else {
              isValid = await form.trigger(["teachingCertifications"]);
            }
          }
          break;
        case 4:
          isValid = await form.trigger(["education"]);
          if (!isValid) {
            toast.error("Please add at least one education entry");
          }
          break;
        case 5:
          isValid = await form.trigger([
            "introduction",
            "teachingExperience",
            "motivation",
            "headline",
          ]);
          if (!isValid) {
            const errors = form.formState.errors;
            if (errors.introduction)
              toast.error("Please provide an introduction");
            else if (errors.teachingExperience)
              toast.error("Please describe your teaching experience");
            else if (errors.motivation)
              toast.error("Please share your motivation");
            else if (errors.headline) toast.error("Please add a headline");
          }
          break;
        case 6:
          // Target Audience - optional but recommended
          isValid = true;
          break;
        case 7:
          // Problems - optional but recommended
          isValid = true;
          break;
        case 8:
          // Outcomes - optional but recommended
          isValid = true;
          break;
        case 9:
          // Services & Pricing - at least one service should be enabled
          const servicePricing = form.getValues("servicePricing");
          const hasAnyService = servicePricing && Object.values(servicePricing).some(
            (service: any) => service?.enabled === true
          );
          if (!hasAnyService) {
            toast.error(
              "Please enable at least one service you want to offer"
            );
            isValid = false;
          } else {
            isValid = true;
          }
          break;
        case 10:
          // Availability is optional
          isValid = true;
          break;
        case 11:
          // Profile Setup - last step, submit form
          isValid = await form.trigger(["socialLinks"]);

          if (isValid) {
            await form.handleSubmit(onSubmit)();
            return;
          }
          break;
      }

      if (isValid) {
        setStep((prev) => Math.min(prev + 1, totalSteps));
        // Scroll to top of the form smoothly
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      console.error("Validation error:", err);
      toast.error("Please check all required fields");
    }
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return <BasicInfoStep form={form} />;
      case 2:
        return <IdentityVerificationStep form={form} />;
      case 3:
        return <TeachingCertificationStep form={form} />;
      case 4:
        return <EducationStep form={form} />;
      case 5:
        return <ProfileDescriptionStep form={form} />;
      case 6:
        return <TargetAudienceStep form={form} />;
      case 7:
        return <ProblemsStep form={form} />;
      case 8:
        return <OutcomesStep form={form} />;
      case 9:
        return <ServicesAndPricingStep form={form} />;
      case 10:
        return <AvailabilityStep form={form} />;
      case 11:
        return <ProfileSetupStep form={form} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <OnboardingHeader />

      {/* Main Content Container */}
      <div className="px-4 pb-8 flex flex-col items-center">
        <div className="w-full max-w-5xl">
          <Card
            className="w-full bg-white border border-gray-200 overflow-hidden"
            style={{ boxShadow: "8px 8px 16px rgba(0, 0, 0, 0.15)" }}
          >
            {/* Gradient top border */}
            <div className="h-1 bg-gradient-to-r from-matepeak-primary via-matepeak-secondary to-orange-500"></div>

            <CardContent className="p-6 md:p-8 lg:p-10">
              <OnboardingProgress currentStep={step} totalSteps={totalSteps} />

              {/* Enhanced progress bar */}
              <div className="mt-5 mb-6">
                <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-0 h-full bg-gradient-to-r from-matepeak-primary via-matepeak-secondary to-orange-500 transition-all duration-700 ease-out rounded-full"
                    style={{ width: `${(step / totalSteps) * 100}%` }}
                  ></div>
                </div>
              </div>

              <TooltipProvider>
                <Form {...form}>
                  <form className="space-y-6">
                    <div className="animate-fade-in">{renderStep()}</div>

                    <StepNavigation
                      currentStep={step}
                      totalSteps={totalSteps}
                      onBack={handleBack}
                      onNext={handleNext}
                      isSubmitting={isSubmitting}
                    />
                  </form>
                </Form>
              </TooltipProvider>
            </CardContent>
          </Card>

          {/* Security badge */}
          <div className="mt-4 mb-6 flex items-center justify-center gap-2 text-xs text-gray-500">
            <svg
              className="w-3.5 h-3.5 text-green-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-medium">Secure & Encrypted</span>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <OnboardingSuccessModal
        isOpen={showSuccessModal}
        username={completedUsername}
        onClose={handleCloseSuccessModal}
      />
    </div>
  );
}
