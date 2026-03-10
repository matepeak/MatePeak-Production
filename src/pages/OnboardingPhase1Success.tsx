import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  Eye,
  Calendar,
  ArrowRight,
  ShieldAlert,
  Settings,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const OnboardingPhase1Success = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState<string>("");
  const [fullName, setFullName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const hasShownConfetti = useRef(false);

  useEffect(() => {
    fetchUserProfile();
    
    // Trigger confetti celebration only once
    if (!hasShownConfetti.current) {
      hasShownConfetti.current = true;
      
      const confettiTimer = setTimeout(() => {
        setShowConfetti(true);
      }, 300);

      // Hide confetti after animation
      const hideTimer = setTimeout(() => {
        setShowConfetti(false);
      }, 3000);

      return () => {
        clearTimeout(confettiTimer);
        clearTimeout(hideTimer);
      };
    }
  }, []);

  const fetchUserProfile = async () => {
    try {
      setIsLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("expert_profiles")
        .select("username, full_name")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        setUsername(profile.username || "");
        setFullName(profile.full_name || "");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewProfile = () => {
    if (!username) {
      toast.error("Unable to load profile. Please try again.");
      return;
    }
    window.open(`/mentor/${username}`, "_blank");
  };

  const handleGoToDashboard = () => {
    navigate("/mentor/dashboard");
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      <main className="flex-grow">
        <div className="container mx-auto px-4 py-8 sm:py-12">
          <div className="max-w-3xl mx-auto">
            {/* Success Header */}
            <div className="text-center mb-12 bg-green-50 rounded-2xl p-8 relative overflow-hidden">
              {/* Confetti Spray from Both Sides */}
              {showConfetti && (
                <>
                  {/* Left Side Confetti */}
                  <div className="absolute left-0 top-0 bottom-0 w-full pointer-events-none">
                    {[...Array(40)].map((_, i) => {
                      const size = Math.random() * 8 + 4;
                      const isRectangle = i % 3 === 0;
                      const delay = i * 0.02;
                      const duration = 1.2 + Math.random() * 0.8;
                      const startY = Math.random() * 100;

                      return (
                        <div
                          key={`left-${i}`}
                          className="absolute"
                          style={{
                            left: `-10px`,
                            top: `${startY}%`,
                            width: isRectangle ? `${size * 1.5}px` : `${size}px`,
                            height: isRectangle ? `${size * 0.6}px` : `${size}px`,
                            backgroundColor: [
                              "#10b981",
                              "#3b82f6",
                              "#f59e0b",
                              "#ef4444",
                              "#8b5cf6",
                              "#ec4899",
                              "#22d3ee",
                              "#fb923c",
                              "#14b8a6",
                              "#f97316",
                            ][i % 10],
                            borderRadius: isRectangle ? "2px" : "50%",
                            animation: `confettiLeft-${i} ${duration}s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`,
                            animationDelay: `${delay}s`,
                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                          }}
                        />
                      );
                    })}
                  </div>

                  {/* Right Side Confetti */}
                  <div className="absolute right-0 top-0 bottom-0 w-full pointer-events-none">
                    {[...Array(40)].map((_, i) => {
                      const size = Math.random() * 8 + 4;
                      const isRectangle = i % 3 === 0;
                      const delay = i * 0.02;
                      const duration = 1.2 + Math.random() * 0.8;
                      const startY = Math.random() * 100;

                      return (
                        <div
                          key={`right-${i}`}
                          className="absolute"
                          style={{
                            right: `-10px`,
                            top: `${startY}%`,
                            width: isRectangle ? `${size * 1.5}px` : `${size}px`,
                            height: isRectangle ? `${size * 0.6}px` : `${size}px`,
                            backgroundColor: [
                              "#10b981",
                              "#3b82f6",
                              "#f59e0b",
                              "#ef4444",
                              "#8b5cf6",
                              "#ec4899",
                              "#22d3ee",
                              "#fb923c",
                              "#14b8a6",
                              "#f97316",
                            ][i % 10],
                            borderRadius: isRectangle ? "2px" : "50%",
                            animation: `confettiRight-${i} ${duration}s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`,
                            animationDelay: `${delay}s`,
                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                          }}
                        />
                      );
                    })}
                  </div>
                </>
              )}

              <div className="relative inline-block mb-6">
                <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-7 w-7 text-white" strokeWidth={2} />
                </div>
              </div>

              <h1 className="text-3xl sm:text-4xl font-bold mb-3 text-gray-900">
                Phase 1 Complete
              </h1>
              <p className="text-base text-gray-600 max-w-2xl mx-auto">
                {fullName ? `${fullName}, y` : "Y"}ou've successfully completed your essential profile setup.
              </p>
            </div>

            {/* What You've Accomplished */}
            <div className="mb-12">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                What You've Accomplished
              </h2>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1">
                      Profile Created
                    </h3>
                    <p className="text-sm text-gray-600">
                      Your essential information is now live
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1">
                      Expertise Added
                    </h3>
                    <p className="text-sm text-gray-600">
                      Students can find you by your skills
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1">
                      Services Set Up
                    </h3>
                    <p className="text-sm text-gray-600">
                      Your pricing and offerings are ready
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1">
                      Availability Configured
                    </h3>
                    <p className="text-sm text-gray-600">
                      Students can book at your convenience
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="h-px bg-gray-200 mb-12"></div>

            {/* Verification Status */}
            <div className="mb-12">
              <div className="flex gap-4 p-6 bg-gray-50 rounded-lg">
                <ShieldAlert className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Verification Status: Unverified
                  </h3>
                  <p className="text-gray-700 mb-2 text-sm">
                    Your profile is currently unverified. You can accept up to <strong>Max 5 bookings per week</strong>.
                  </p>
                  <p className="text-gray-700 text-sm">
                    Complete Phase 2 verification to unlock unlimited bookings and get the verified badge.
                  </p>
                </div>
              </div>
            </div>

            {/* What You Have Access To */}
            <div className="mb-12">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                What You Have Access To
              </h2>

              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 border-l-2 border-green-500">
                  <Settings className="h-5 w-5 text-gray-700 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 mb-1">
                      Mentor Dashboard
                    </h3>
                    <p className="text-sm text-gray-600">
                      Manage bookings, availability, earnings, and profile settings.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 border-l-2 border-green-500">
                  <Eye className="h-5 w-5 text-gray-700 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 mb-1">
                      Public Mentor Profile
                    </h3>
                    <p className="text-sm text-gray-600">
                      Your profile is visible to students who can discover and book sessions.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 border-l-2 border-green-500">
                  <Calendar className="h-5 w-5 text-gray-700 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 mb-1">
                      Limited Bookings
                    </h3>
                    <p className="text-sm text-gray-600">
                      Accept Max 5 bookings per week. Complete Phase 2 for unlimited bookings.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="h-px bg-gray-200 mb-12"></div>

            {/* Next Steps */}
            <div className="mb-12">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Recommended Next Steps
              </h2>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-white">1</span>
                  </div>
                  <p className="text-sm text-gray-700 pt-0.5">
                    Review your public profile to ensure everything looks perfect
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-white">2</span>
                  </div>
                  <p className="text-sm text-gray-700 pt-0.5">
                    Familiarize yourself with your mentor dashboard
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-white">3</span>
                  </div>
                  <p className="text-sm text-gray-700 pt-0.5">
                    Double-check your availability schedule
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-white">4</span>
                  </div>
                  <p className="text-sm text-gray-700 pt-0.5">
                    Complete Phase 2 verification for unlimited bookings
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
              <Button
                onClick={handleGoToDashboard}
                className="bg-gray-900 hover:bg-gray-800 text-white px-8 h-12 text-base group"
              >
                Go to Dashboard
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>

              <Button
                onClick={handleViewProfile}
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-50 px-8 h-12 text-base"
                disabled={isLoading || !username}
              >
                <Eye className="mr-2 h-5 w-5" />
                Preview Profile
              </Button>
            </div>

            {/* Additional Info */}
            <div className="text-center">
              <p className="text-sm text-gray-500">
                Need help? Check out our{" "}
                <Link to="/how-it-works" className="text-gray-900 hover:underline font-medium">
                  How It Works
                </Link>{" "}
                guide or contact support.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Confetti Animations */}
      <style>{`
        ${[...Array(40)]
          .map((_, i) => {
            const endX = 100 + Math.random() * 250;
            const midY = Math.random() * 150 - 75;
            const endY = Math.random() * 400 - 200;
            const rotation = Math.random() * 1440 - 720;

            return `
            @keyframes confettiLeft-${i} {
              0% {
                transform: translateX(0) translateY(0) rotate(0deg) scale(1);
                opacity: 1;
              }
              30% {
                transform: translateX(${endX * 0.3}px) translateY(${midY}px) rotate(${rotation * 0.3}deg) scale(1.1);
                opacity: 1;
              }
              70% {
                transform: translateX(${endX * 0.7}px) translateY(${midY + (endY - midY) * 0.7}px) rotate(${rotation * 0.7}deg) scale(1);
                opacity: 0.6;
              }
              100% {
                transform: translateX(${endX}px) translateY(${endY}px) rotate(${rotation}deg) scale(0.8);
                opacity: 0;
              }
            }
          `;
          })
          .join("\n")}
        
        ${[...Array(40)]
          .map((_, i) => {
            const endX = -(100 + Math.random() * 250);
            const midY = Math.random() * 150 - 75;
            const endY = Math.random() * 400 - 200;
            const rotation = Math.random() * 1440 - 720;

            return `
            @keyframes confettiRight-${i} {
              0% {
                transform: translateX(0) translateY(0) rotate(0deg) scale(1);
                opacity: 1;
              }
              30% {
                transform: translateX(${endX * 0.3}px) translateY(${midY}px) rotate(${rotation * 0.3}deg) scale(1.1);
                opacity: 1;
              }
              70% {
                transform: translateX(${endX * 0.7}px) translateY(${midY + (endY - midY) * 0.7}px) rotate(${rotation * 0.7}deg) scale(1);
                opacity: 0.6;
              }
              100% {
                transform: translateX(${endX}px) translateY(${endY}px) rotate(${rotation}deg) scale(0.8);
                opacity: 0;
              }
            }
          `;
          })
          .join("\n")}
      `}</style>
    </div>
  );
};

export default OnboardingPhase1Success;
