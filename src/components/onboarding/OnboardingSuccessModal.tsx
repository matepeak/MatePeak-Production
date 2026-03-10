import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import MentorCard from "@/components/MentorCard";
import { MentorProfile } from "@/components/MentorCard";
import { fetchMentorCardByUsername } from "@/services/mentorCardService";
import {
  Eye,
  Settings,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  Calendar,
} from "lucide-react";
import { showSuccessToast } from "@/utils/toast-helpers";
import confetti from "canvas-confetti";

interface OnboardingSuccessModalProps {
  isOpen: boolean;
  username: string;
  onClose: () => void;
}

const OnboardingSuccessModal = ({
  isOpen,
  username,
  onClose,
}: OnboardingSuccessModalProps) => {
  const navigate = useNavigate();
  const [mentorCard, setMentorCard] = useState<MentorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && username) {
      // Add a small delay to ensure database has committed the profile
      const timer = setTimeout(() => {
        loadMentorCard();
        triggerMinimalisticConfetti();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [isOpen, username]);

  const triggerMinimalisticConfetti = () => {
    const colors = ['#1f2937', '#374151', '#6b7280']; // Gray shades
    
    // Simple, elegant burst from center
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.4 },
      colors: colors,
      ticks: 100,
      gravity: 1.2,
      scalar: 0.8,
    });
  };

  const loadMentorCard = async () => {
    try {
      setLoading(true);
      const card = await fetchMentorCardByUsername(username);

      if (card) {
        setMentorCard(card);
      } else {
        // Retry once after a delay
        setTimeout(async () => {
          const retryCard = await fetchMentorCardByUsername(username);
          if (retryCard) {
            setMentorCard(retryCard);
          }
        }, 1000);
      }
    } catch (error) {
      console.error("Error loading mentor card:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleShareProfile = () => {
    const profileUrl = `${window.location.origin}/mentor/${username}`;
    navigator.clipboard.writeText(profileUrl);
    showSuccessToast("Profile link copied!");
  };

  const handleViewPublicProfile = () => {
    window.open(`/mentor/${username}`, "_blank");
  };

  const handleGoToDashboard = () => {
    navigate(`/dashboard/${username}`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-hidden p-0 gap-0 border-gray-200">
        {/* Success Header - Minimal & Clean */}
        <div className="relative bg-white border-b border-gray-100 px-6 pt-8 pb-6">
          <div className="text-center space-y-3">
            {/* Success Icon with subtle animation */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gray-900 rounded-full animate-ping opacity-20"></div>
                <div className="relative bg-gray-900 p-3 rounded-full">
                  <CheckCircle2 className="h-6 w-6 text-white" strokeWidth={2.5} />
                </div>
              </div>
            </div>
            
            <div className="space-y-1.5">
              <h2 className="text-xl font-semibold text-gray-900">
                Phase 1 Complete
              </h2>
              <p className="text-sm text-gray-600 max-w-sm mx-auto">
                Your profile is now live with access to mentor dashboard and public profile
              </p>
            </div>
          </div>
        </div>

        {/* Main Content - Scrollable */}
        <div className="px-6 py-6 space-y-6 overflow-y-auto max-h-[calc(85vh-180px)]">
          {/* Verification Status Notice */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <ShieldAlert className="h-4 w-4 text-gray-700" />
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-900">
                  Verification Status
                </h3>
                <div className="text-sm text-gray-600 leading-relaxed">
                  <p>
                    Your profile is <span className="font-medium text-gray-900">currently unverified</span>, limiting you to <span className="font-medium text-gray-900">3-5 bookings per week</span>. Complete Phase 2 for verification and unlimited bookings.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* What You Have Access To */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-900">
              What You Have Access To
            </h3>
            
            <div className="space-y-2">
              <div className="flex items-start gap-2.5 text-sm">
                <div className="w-1 h-1 rounded-full bg-gray-900 mt-2 flex-shrink-0" />
                <div className="flex-1">
                  <span className="font-medium text-gray-900">Mentor Dashboard</span>
                  <span className="text-gray-600"> — Manage bookings and settings</span>
                </div>
              </div>
              
              <div className="flex items-start gap-2.5 text-sm">
                <div className="w-1 h-1 rounded-full bg-gray-900 mt-2 flex-shrink-0" />
                <div className="flex-1">
                  <span className="font-medium text-gray-900">Public Profile</span>
                  <span className="text-gray-600"> — Students can discover and book</span>
                </div>
              </div>
              
              <div className="flex items-start gap-2.5 text-sm">
                <div className="w-1 h-1 rounded-full bg-gray-900 mt-2 flex-shrink-0" />
                <div className="flex-1">
                  <span className="font-medium text-gray-900">Limited Bookings</span>
                  <span className="text-gray-600"> — 3-5 per week (unverified)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="border-t border-gray-100 pt-4 space-y-3">
            <h3 className="text-sm font-medium text-gray-900">
              Next Steps
            </h3>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 text-sm text-gray-600">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span>Set up your availability</span>
              </div>
              
              <div className="flex items-center gap-2.5 text-sm text-gray-600">
                <Eye className="h-4 w-4 text-gray-400" />
                <span>Preview your public profile</span>
              </div>
              
              <div className="flex items-center gap-2.5 text-sm text-gray-600">
                <ShieldAlert className="h-4 w-4 text-gray-400" />
                <span>Complete Phase 2 for verification</span>
              </div>
            </div>
          </div>

        </div>
        
        {/* Action Buttons - Fixed at bottom */}
        <div className="border-t border-gray-100 px-6 py-4 bg-white">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleViewPublicProfile}
              className="flex-1 h-10 border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors text-sm"
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            
            <Button
              onClick={handleGoToDashboard}
              className="flex-1 h-10 bg-gray-900 hover:bg-gray-800 text-white transition-colors group text-sm"
            >
              Go to Dashboard
              <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingSuccessModal;
