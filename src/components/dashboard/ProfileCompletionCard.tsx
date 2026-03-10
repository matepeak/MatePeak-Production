import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  Circle, 
  TrendingUp, 
  Users, 
  Star,
  Award,
  Lock,
  Unlock
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ProfileCompletionCardProps {
  profileData: {
    profile_completion_percentage?: number;
    mentor_tier?: 'basic' | 'verified' | 'top';
    is_profile_live?: boolean;
    phase_1_complete?: boolean;
    phase_2_complete?: boolean;
    
    // Fields for completion tracking
    introduction?: string;
    teaching_experience?: string;
    motivation?: string;
    education?: any[];
    teaching_certifications?: any[];
    availability_json?: any;
    social_links?: any;
    verification_status?: string;
  };
  username: string;
}

export default function ProfileCompletionCard({ profileData, username }: ProfileCompletionCardProps) {
  const navigate = useNavigate();
  
  const completionPercentage = profileData.profile_completion_percentage || 0;
  const tier = profileData.mentor_tier || 'basic';
  const isLive = profileData.is_profile_live || false;
  const phase1Complete = profileData.phase_1_complete || false;
  const phase2Complete = profileData.phase_2_complete || false;

  // Calculate missing optional fields
  const missingFields = [];
  if (!profileData.introduction) missingFields.push("Introduction");
  if (!profileData.teaching_experience) missingFields.push("Teaching Experience");
  if (!profileData.motivation) missingFields.push("Why You Became a Mentor");
  if (!profileData.education || profileData.education.length === 0) missingFields.push("Education");
  if (!profileData.teaching_certifications || profileData.teaching_certifications.length === 0) missingFields.push("Certifications");
  if (!profileData.availability_json) missingFields.push("Availability Schedule");
  if (!profileData.social_links) missingFields.push("Social Links");

  const tierInfo = {
    basic: {
      color: "bg-gray-100 text-gray-700 border-gray-300",
      icon: Circle,
      label: "Basic Mentor",
      maxBookings: 5,
      benefits: ["Profile visible to students", "Up to 5 bookings/week"],
      nextTier: "verified",
      nextRequirements: ["Verify phone number", "Complete 5+ sessions", "Maintain 4.0+ rating"]
    },
    verified: {
      color: "bg-blue-100 text-blue-700 border-blue-300",
      icon: CheckCircle2,
      label: "Verified Mentor",
      maxBookings: 15,
      benefits: ["Priority in search", "Up to 15 bookings/week", "Better visibility"],
      nextTier: "top",
      nextRequirements: ["Maintain 4.5+ rating", "Complete 10+ sessions", "90%+ response rate"]
    },
    top: {
      color: "bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-700 border-orange-300",
      icon: Star,
      label: "Top Mentor",
      maxBookings: 999,
      benefits: ["Featured in top mentors", "Unlimited bookings", "Highest visibility", "Premium listing"],
      nextTier: null,
      nextRequirements: []
    }
  };

  const currentTierInfo = tierInfo[tier];
  const TierIcon = currentTierInfo.icon;

  return (
    <Card className="shadow-sm border border-gray-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Profile Strength</CardTitle>
          <Badge className={`${currentTierInfo.color} border px-2 py-0.5 text-xs`}>
            <TierIcon className="w-3 h-3 mr-1" />
            {currentTierInfo.label}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Completion Percentage */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-sm font-medium text-gray-900">
              {completionPercentage}% Complete
            </span>
            <span className="text-xs text-gray-500">
              {completionPercentage < 70 ? "Good start!" : 
               completionPercentage < 90 ? "Almost there!" : 
               "Excellent!"}
            </span>
          </div>
          <Progress value={completionPercentage} className="h-2" />
        </div>

        {/* Status and Booking Limit */}
        <div className="grid grid-cols-2 gap-2">
          {/* Status Indicator */}
          <div className={`p-3 rounded-lg flex flex-col justify-between h-full ${isLive ? 'bg-green-50' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-2 mb-1.5">
              {isLive ? (
                <>
                  <Unlock className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-xs text-gray-900">Profile is Live! 🎉</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-gray-600" />
                  <span className="font-medium text-xs text-gray-900">Profile Not Yet Live</span>
                </>
              )}
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              {isLive 
                ? "Students can find and book you now."
                : "Complete Phase 1 to go live."}
            </p>
          </div>
          
          {/* Booking Limit */}
          <div className="p-3 bg-blue-50 rounded-lg flex flex-col justify-between h-full">
            <div className="flex items-center gap-2 mb-1.5">
              <Users className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-xs text-gray-900">Weekly Limit</span>
            </div>
            <div>
              <p className="text-lg font-bold text-blue-900">{currentTierInfo.maxBookings}</p>
              <p className="text-xs text-gray-600">bookings/week</p>
            </div>
          </div>
        </div>

        <div className="h-px bg-gray-200"></div>

        {/* Three Column Layout */}
        <div className="grid grid-cols-3 gap-3">
          {/* Missing Fields */}
          {missingFields.length > 0 && (
            <div className="p-3 bg-gray-50 rounded-lg border-l-2 border-gray-900">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-gray-700" />
                <span className="font-medium text-xs text-gray-900">Boost Your Visibility</span>
              </div>
              <p className="text-xs text-gray-600 mb-2">
                Complete profiles get <strong>3x more bookings</strong>. Add:
              </p>
              <ul className="space-y-1">
                {missingFields.slice(0, 3).map((field) => (
                  <li key={field} className="flex items-center gap-1.5 text-xs text-gray-700">
                    <Circle className="w-2.5 h-2.5 text-gray-400" />
                    {field}
                  </li>
                ))}
                {missingFields.length > 3 && (
                  <li className="text-xs text-gray-600 font-medium ml-4">
                    + {missingFields.length - 3} more
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Current Tier Benefits */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-4 h-4 text-gray-700" />
              <span className="font-medium text-xs text-gray-900">Current Benefits</span>
            </div>
            <ul className="space-y-1.5">
              {currentTierInfo.benefits.map((benefit, idx) => (
                <li key={idx} className="flex items-center gap-1.5 text-xs text-gray-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          {/* Next Tier */}
          {currentTierInfo.nextTier && (
            <div className="p-3 bg-gray-50 rounded-lg border-l-2 border-gray-900">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-4 h-4 text-gray-700" />
                <span className="font-medium text-xs text-gray-900">
                  Unlock {tierInfo[currentTierInfo.nextTier].label}
                </span>
              </div>
              <ul className="space-y-1">
                {currentTierInfo.nextRequirements.map((req, idx) => (
                  <li key={idx} className="flex items-center gap-1.5 text-xs text-gray-700">
                    <Circle className="w-2.5 h-2.5 text-gray-400" />
                    {req}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Action Button - Optional Enhancement */}
        {missingFields.length > 0 && completionPercentage < 70 && (
          <div className="flex flex-col items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-600 text-center">
              <strong>Optional:</strong> Enhance your profile for better visibility
            </p>
            <Button
              onClick={() => navigate(`/mentor/dashboard/settings`)}
              variant="outline"
              className="h-8 text-xs px-4 border-gray-300"
            >
              Edit Profile Settings
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
