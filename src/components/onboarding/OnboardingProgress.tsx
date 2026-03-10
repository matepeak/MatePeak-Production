import { Check } from "lucide-react";

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
}

const steps = [
  { number: 1, title: "Basic Info", icon: "1" },
  { number: 2, title: "Verification", icon: "2" },
  { number: 3, title: "Certification", icon: "3" },
  { number: 4, title: "Education", icon: "4" },
  { number: 5, title: "Description", icon: "5" },
  { number: 6, title: "Audience", icon: "6" },
  { number: 7, title: "Problems", icon: "7" },
  { number: 8, title: "Outcomes", icon: "8" },
  { number: 9, title: "Services", icon: "9" },
  { number: 10, title: "Availability", icon: "10" },
  { number: 11, title: "Profile", icon: "11" },
];

export default function OnboardingProgress({
  currentStep,
  totalSteps,
}: OnboardingProgressProps) {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="mb-8">
      {/* Desktop view - horizontal */}
      <div className="hidden md:block overflow-x-auto">
        <div className="flex justify-between items-start mb-6 min-w-[850px]">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className="flex flex-col items-center flex-1 group min-w-[60px]"
            >
              <div className="flex items-center w-full mb-2">
                {index > 0 && (
                  <div
                    className={`h-0.5 flex-1 transition-all duration-500 ${
                      currentStep > step.number - 1
                        ? "bg-gradient-to-r from-matepeak-primary to-matepeak-secondary"
                        : "bg-gray-200"
                    }`}
                  />
                )}
                <div className="relative z-10">
                  <div
                    className={`relative flex items-center justify-center w-8 h-8 rounded-full transition-all duration-500 border-2 ${
                      currentStep > step.number
                        ? "bg-gradient-to-br from-green-400 to-green-600 border-green-600 text-white scale-100 shadow-lg shadow-green-500/30"
                        : currentStep === step.number
                        ? "bg-white border-gray-900 text-gray-900 scale-105 shadow-xl shadow-gray-900/20 animate-pulse-subtle"
                        : "bg-white border-gray-300 text-gray-400"
                    }`}
                  >
                    {currentStep > step.number ? (
                      <Check
                        className="w-4 h-4 animate-scale-in"
                        strokeWidth={3}
                      />
                    ) : (
                      <span className="text-[10px] font-bold">{step.icon}</span>
                    )}

                    {/* Outer ring for current step */}
                    {currentStep === step.number && (
                      <div className="absolute inset-0 rounded-full border-2 border-gray-900/20 animate-ping"></div>
                    )}
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 transition-all duration-500 ${
                      currentStep > step.number
                        ? "bg-gradient-to-r from-matepeak-secondary to-matepeak-primary"
                        : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
              <span
                className={`text-[9px] font-semibold transition-all duration-300 whitespace-nowrap text-center ${
                  currentStep === step.number
                    ? "text-gray-900 scale-105"
                    : currentStep > step.number
                    ? "text-green-600"
                    : "text-gray-500"
                }`}
              >
                {step.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile view - vertical */}
      <div className="md:hidden space-y-3 mb-6">
        {steps.map((step) => (
          <div
            key={step.number}
            className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 border-2 ${
              currentStep === step.number
                ? "bg-white border-gray-900 shadow-md"
                : currentStep > step.number
                ? "bg-green-50 border-green-200"
                : "bg-gray-50 border-gray-200"
            }`}
          >
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 border-2 ${
                currentStep > step.number
                  ? "bg-gradient-to-br from-green-400 to-green-600 border-green-600 text-white shadow-md"
                  : currentStep === step.number
                  ? "bg-white border-gray-900 text-gray-900 shadow-md"
                  : "bg-white border-gray-300 text-gray-400"
              }`}
            >
              {currentStep > step.number ? (
                <Check className="w-5 h-5" strokeWidth={3} />
              ) : (
                <span className="text-sm font-bold">{step.icon}</span>
              )}
            </div>
            <div className="flex-1">
              <span
                className={`text-sm font-semibold ${
                  currentStep === step.number
                    ? "text-gray-900"
                    : currentStep > step.number
                    ? "text-green-600"
                    : "text-gray-600"
                }`}
              >
                {step.title}
              </span>
            </div>
            {currentStep === step.number && (
              <span className="text-xs font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded-full border border-gray-300">
                In Progress
              </span>
            )}
            {currentStep > step.number && (
              <span className="text-xs font-medium text-green-600 bg-white px-2 py-1 rounded-full border border-green-300">
                ✓ Done
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Progress summary */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">
            Step {currentStep} of {totalSteps}
          </span>
          <span className="hidden sm:inline text-xs text-gray-500">
            • {steps[currentStep - 1]?.title}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold bg-gradient-to-r from-matepeak-primary to-matepeak-secondary bg-clip-text text-transparent">
            {Math.round(progress)}%
          </span>
          <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-matepeak-primary to-matepeak-secondary transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
