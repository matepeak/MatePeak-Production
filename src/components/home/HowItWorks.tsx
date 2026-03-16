import React, { useEffect, useRef, useState } from "react";
import { UserPlus, Search, Video, CheckCircle } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Create Account",
    description:
      "Sign up with email or social accounts. Complete your profile with learning goals and interests to get started.",
    icon: UserPlus,
    mockup: "form", // form, search, video, success
  },
  {
    number: "02",
    title: "Search for Mentors",
    description:
      "Browse verified mentors across various fields. Filter by skills, languages, and ratings to find your perfect match.",
    icon: Search,
    mockup: "search",
  },
  {
    number: "03",
    title: "Book Your Session",
    description:
      "Choose a convenient time slot from your mentor's calendar. Book instantly with secure payment and get confirmation.",
    icon: Video,
    mockup: "video",
  },
  {
    number: "04",
    title: "Start Learning",
    description:
      "Join your session via integrated video. Gain insights, receive feedback, and track your progress with ongoing support.",
    icon: CheckCircle,
    mockup: "success",
  },
];

const MockupCard = ({ type }: { type: string }) => {
  // All cards: force aspect-square, overflow-hidden, and scale content to fit
  const cardClass =
    "bg-white rounded-2xl shadow-2xl p-6 w-full max-w-[300px] aspect-square border border-gray-100 overflow-hidden flex flex-col items-center justify-center";

  if (type === "form") {
    // Abstract, step-based form style for 'Create Account', matching 'Book a Session' polish
    // Ultra-compact layout: minimal spacing to fit all elements without cropping
    return (
      <div
        className={
          cardClass + " relative bg-white p-0 flex flex-col justify-between"
        }
        style={{ minHeight: "0" }}
      >
        {/* Progress bar at top */}
        <div className="w-full flex justify-center pt-3 pb-1.5 bg-white border-b border-gray-100 z-10">
          <div className="w-32 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-matepeak-primary to-matepeak-secondary rounded-full w-2/3"></div>
          </div>
        </div>
        {/* Heading */}
        <div className="w-full flex justify-center z-10 mt-1.5">
          <h3 className="text-gray-900 font-bold text-sm text-center tracking-tight">
            Create Account
          </h3>
        </div>
        {/* Abstract form fields */}
        <div className="flex-1 w-full flex flex-col items-center justify-center px-8 z-10 min-h-0 relative py-1.5">
          <div className="w-full flex flex-col gap-2.5 z-10">
            <div className="h-8 bg-gray-100 rounded-lg w-full flex items-center px-3 gap-2 z-10">
              <svg width="14" height="14" fill="none" viewBox="0 0 16 16">
                <circle cx="8" cy="8" r="7" stroke="#818cf8" strokeWidth="2" />
                <circle cx="8" cy="7" r="2" fill="#a5b4fc" />
                <rect x="4" y="11" width="8" height="2" rx="1" fill="#c7d2fe" />
              </svg>
              <div className="h-2.5 w-20 bg-gray-200 rounded"></div>
            </div>
            <div className="h-8 bg-gray-100 rounded-lg w-full flex items-center px-3 gap-2 z-10">
              <svg width="14" height="14" fill="none" viewBox="0 0 16 16">
                <rect
                  x="2"
                  y="4"
                  width="12"
                  height="8"
                  rx="2"
                  stroke="#818cf8"
                  strokeWidth="2"
                />
                <rect x="5" y="7" width="6" height="2" rx="1" fill="#a5b4fc" />
              </svg>
              <div className="h-2.5 w-20 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
        {/* Abstract CTA button, always at bottom */}
        <div className="w-full flex justify-center pb-3 bg-white border-t border-gray-100 z-10 mt-0 relative pt-2.5">
          <button className="w-28 h-9 bg-gradient-to-r from-matepeak-primary to-matepeak-secondary rounded-lg flex items-center justify-center text-white font-semibold text-sm shadow hover:opacity-95 transition-all z-10">
            Create
          </button>
        </div>
      </div>
    );
  }

  if (type === "search") {
    return (
      <div className={cardClass}>
        <h3 className="text-gray-800 font-semibold mb-3 text-sm text-center">
          Search
        </h3>
        <div className="w-full max-w-xs mx-auto flex-1 flex flex-col justify-center gap-2.5">
          {/* Abstract Search Bar */}
          <div className="relative mb-1.5 flex items-center">
            <div className="w-full h-8 bg-gray-100 rounded-lg flex items-center pl-3 pr-10">
              <div className="h-3 w-20 bg-gray-200 rounded"></div>
            </div>
            <div className="absolute right-3 top-1.5">
              <div className="w-5 h-5 rounded-full bg-matepeak-primary flex items-center justify-center">
                <svg width="14" height="14" fill="none" viewBox="0 0 14 14">
                  <circle cx="6" cy="6" r="5" stroke="white" strokeWidth="2" />
                  <path
                    d="M11 11L9 9"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
          </div>
          {/* Abstract Result Cards */}
          <div className="flex flex-col gap-2 mt-1">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-2 bg-gray-50 rounded-lg border border-gray-100 px-3 py-2"
              >
                <div className="w-7 h-7 rounded-full bg-matepeak-primary/20 flex items-center justify-center">
                  <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
                    <rect
                      x="3"
                      y="3"
                      width="10"
                      height="10"
                      rx="2"
                      fill="#a5b4fc"
                    />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="h-3 w-24 bg-gray-200 rounded mb-1"></div>
                  <div className="h-2 w-16 bg-gray-100 rounded"></div>
                </div>
                <div className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center">
                  <svg width="10" height="10" fill="none" viewBox="0 0 10 10">
                    <path
                      d="M2 5h6"
                      stroke="#818cf8"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (type === "video") {
    // Match the Create Account mockup structure for perfect consistency
    return (
      <div
        className={
          cardClass + " relative bg-white p-0 flex flex-col justify-between"
        }
        style={{ minHeight: "0" }}
      >
        {/* Heading */}
        <div className="w-full flex justify-center z-10 mt-4">
          <h3 className="text-gray-900 font-bold text-sm text-center tracking-tight">
            Calendar
          </h3>
        </div>
        {/* Mentor preview and calendar grid */}
        <div className="flex-1 w-full flex flex-col items-center justify-center px-8 z-10 min-h-0 relative py-1.5">
          <div className="w-full flex flex-col gap-2.5 z-10">
            <div className="flex items-center gap-2 h-8 bg-gray-100 rounded-lg w-full px-3 z-10">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-matepeak-primary to-matepeak-secondary flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                <svg width="14" height="14" fill="none" viewBox="0 0 20 20">
                  <circle
                    cx="10"
                    cy="10"
                    r="10"
                    fill="currentColor"
                    className="text-matepeak-primary/40"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="h-2.5 w-20 bg-gray-200 rounded mb-1"></div>
                <div className="h-2 w-16 bg-gray-100 rounded"></div>
              </div>
            </div>
            <div className="bg-gray-100 rounded-lg w-full flex flex-col items-center py-2">
              <div className="grid grid-cols-7 gap-0.5">
                {[...Array(21)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-3 w-3 rounded ${
                      i === 10 ? "bg-matepeak-primary/80" : "bg-gray-200"
                    }`}
                  ></div>
                ))}
              </div>
            </div>
          </div>
        </div>
        {/* Book button, always at bottom */}
        <div className="w-full flex justify-center pb-3 bg-white border-t border-gray-100 z-10 mt-0 relative pt-2.5">
          <button className="w-28 h-9 bg-gradient-to-r from-matepeak-primary to-matepeak-secondary rounded-lg flex items-center justify-center text-white font-semibold text-sm shadow hover:opacity-95 transition-all z-10">
            Book
          </button>
        </div>
      </div>
    );
  }

  if (type === "success") {
    // Abstract, celebratory/achievement style for 'Start Learning'
    return (
      <div className={cardClass}>
        <div className="flex flex-col items-center justify-center h-full w-full relative">
          {/* Confetti/celebration effect */}
          <div className="absolute inset-0 flex items-start justify-center pointer-events-none select-none z-0">
            <svg
              width="120"
              height="40"
              viewBox="0 0 120 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="10" cy="10" r="3" fill="#a5b4fc" />
              <circle cx="30" cy="8" r="2" fill="#fbbf24" />
              <circle cx="60" cy="12" r="2.5" fill="#34d399" />
              <circle cx="90" cy="7" r="2" fill="#f472b6" />
              <circle cx="110" cy="13" r="2.5" fill="#818cf8" />
              <rect x="20" y="18" width="2" height="6" rx="1" fill="#fbbf24" />
              <rect x="50" y="20" width="2" height="6" rx="1" fill="#34d399" />
              <rect x="80" y="16" width="2" height="6" rx="1" fill="#f472b6" />
            </svg>
          </div>
          {/* Certificate/achievement card */}
          <div className="w-16 h-16 bg-gradient-to-br from-matepeak-primary/10 to-matepeak-secondary/10 rounded-xl flex items-center justify-center mb-3 z-10 border-2 border-matepeak-primary/20">
            <svg
              width="40"
              height="40"
              viewBox="0 0 40 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="6"
                y="10"
                width="28"
                height="20"
                rx="4"
                fill="#fff"
                stroke="#818cf8"
                strokeWidth="2"
              />
              <rect
                x="12"
                y="16"
                width="16"
                height="3"
                rx="1.5"
                fill="#a5b4fc"
              />
              <rect x="12" y="22" width="10" height="2" rx="1" fill="#c7d2fe" />
              <circle cx="30" cy="27" r="2" fill="#fbbf24" />
            </svg>
          </div>
          {/* Progress bar */}
          <div className="w-32 h-3 bg-gray-100 rounded-full mb-3 overflow-hidden z-10">
            <div className="h-3 bg-gradient-to-r from-matepeak-primary to-matepeak-secondary rounded-full w-4/5"></div>
          </div>
          {/* Heading */}
          <h3 className="text-gray-800 font-semibold mb-2 text-base z-10">
            Learning Started!
          </h3>
          {/* Description */}
          <p className="text-gray-500 text-xs leading-relaxed px-2 z-10 text-center">
            You’re now connected with your mentor.
            <br />
            Enjoy your personalized learning journey!
          </p>
        </div>
      </div>
    );
  }

  return null;
};

const HowItWorks = ({
  sectionRef,
}: {
  sectionRef: React.RefObject<HTMLDivElement>;
}) => {
  const [activeStep, setActiveStep] = useState<number>(0);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = stepRefs.current.indexOf(
            entry.target as HTMLDivElement
          );
          if (entry.isIntersecting && index !== -1) {
            setActiveStep(index);
          }
        });
      },
      {
        threshold: 0.5,
        rootMargin: "-100px 0px",
      }
    );

    stepRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => {
      stepRefs.current.forEach((ref) => {
        if (ref) observer.unobserve(ref);
      });
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="py-24 md:py-32 bg-gradient-to-b from-white via-blue-50/20 to-white relative overflow-visible"
    >
      <div className="w-full max-w-7xl mx-auto px-4 md:px-8 xl:px-0 relative z-10 overflow-visible">
        {/* Header */}
        <div className="text-center mb-16 md:mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-matepeak-primary/10 to-matepeak-secondary/10 rounded-full border border-matepeak-primary/20 mb-4">
            <span className="text-xs font-bold text-matepeak-primary tracking-wide uppercase">
              HOW IT WORKS
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 tracking-tight">
            Start Your Learning Journey
          </h2>
          <p className="text-base md:text-lg text-gray-600 font-light max-w-2xl mx-auto leading-relaxed">
            Connect with expert mentors in four simple steps and unlock your
            potential
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-24 md:space-y-32 relative">
          {steps.map((step, index) => (
            <div
              key={step.number}
              ref={(el) => (stepRefs.current[index] = el)}
              className={`flex flex-col ${
                index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
              } items-center gap-8 md:gap-12 relative overflow-visible transition-all duration-700 ${
                activeStep === index
                  ? "opacity-100 translate-y-0"
                  : activeStep > index
                  ? "opacity-60 -translate-y-4 scale-98"
                  : "opacity-0 translate-y-8"
              }`}
            >
              {/* Background Number with smooth transitions */}
              <div
                className={`absolute ${
                  index % 2 === 0 ? "left-0 md:-left-8" : "right-0 md:-right-8"
                } hidden md:block md:text-[180px] font-black leading-none pointer-events-none select-none z-0 transition-all duration-700 ${
                  activeStep === index
                    ? "opacity-20 scale-100"
                    : "opacity-10 scale-95"
                } text-gray-400`}
                style={{
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              >
                {step.number}
              </div>

              {/* Mockup Card with scroll animation */}
              <div
                className={`w-full md:w-1/2 flex justify-center relative z-10 ${
                  index % 2 === 0 ? "md:-mr-20" : "md:-ml-20"
                } transition-all duration-700 ${
                  activeStep === index
                    ? "scale-100 opacity-100"
                    : activeStep > index
                    ? "scale-95 opacity-50"
                    : "scale-90 opacity-0"
                }`}
              >
                <div
                  className={`transform transition-all duration-500 ${
                    activeStep === index ? "hover:scale-105 hover:rotate-1" : ""
                  }`}
                >
                  <MockupCard type={step.mockup} />
                </div>
              </div>

              {/* Text Content with scroll animation */}
              <div
                className={`w-full md:w-1/2 relative z-10 flex items-center justify-center ${
                  index % 2 === 0 ? "md:-ml-20" : "md:-mr-20"
                } transition-all duration-700 delay-150 ${
                  activeStep === index
                    ? "opacity-100 translate-x-0"
                    : activeStep > index
                    ? "opacity-50 translate-x-0"
                    : index % 2 === 0
                    ? "opacity-0 translate-x-12"
                    : "opacity-0 -translate-x-12"
                }`}
              >
                <div className="max-w-lg text-center md:text-left">
                  {/* Step badge */}
                  <div
                    className={`flex items-center justify-center md:justify-start gap-2 mb-3 transition-all duration-500 ${
                      activeStep === index ? "scale-100" : "scale-95"
                    }`}
                  >
                    <div className="flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-matepeak-primary/10 to-matepeak-secondary/10 rounded-full border border-matepeak-primary/30 shadow-sm">
                      <div className="p-0.5 bg-gradient-to-br from-matepeak-primary to-matepeak-secondary rounded-full">
                        <step.icon className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-[10px] font-bold text-matepeak-primary uppercase tracking-wide">
                        Step {step.number}
                      </span>
                    </div>
                  </div>

                  <h3
                    className={`text-2xl md:text-3xl font-bold mb-3 transition-all duration-500 leading-tight ${
                      activeStep === index
                        ? "bg-gradient-to-r from-matepeak-primary to-matepeak-secondary bg-clip-text text-transparent"
                        : "text-gray-900"
                    }`}
                  >
                    {step.title}
                  </h3>
                  <p className="text-sm md:text-base text-gray-600 font-normal leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-20 md:mt-28">
          <a href="/explore">
            <button className="bg-gradient-to-r from-matepeak-primary to-matepeak-secondary text-white hover:from-matepeak-primary/90 hover:to-matepeak-secondary/90 font-bold text-sm rounded-full h-11 px-6 transition-all duration-300 font-poppins">
              Get Started Today
            </button>
          </a>
          <p className="text-xs text-gray-500 mt-3">
            No credit card required • Free to get started
          </p>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
