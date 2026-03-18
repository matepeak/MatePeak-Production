import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Star,
  MapPin,
  Calendar,
  MessageCircle,
  Linkedin,
  Twitter,
  Globe,
  Share2,
  Users,
  Heart,
  Palette,
  Briefcase,
  GraduationCap,
  Code,
  BookOpen,
  TrendingUp,
} from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMentorLiveStatus } from "@/hooks/useMentorPresence";
import PresenceDot from "@/components/PresenceDot";

interface ProfileHeaderProps {
  mentor: any;
  stats: {
    averageRating: number;
    reviewCount: number;
    totalSessions: number;
    completedSessions: number;
  };
  isOwnProfile?: boolean;
  onOpenBooking?: () => void;
}

export default function ProfileHeader({
  mentor,
  stats,
  isOwnProfile = false,
  onOpenBooking,
}: ProfileHeaderProps) {
  const navigate = useNavigate();
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const { isOnline: isMentorOnline } = useMentorLiveStatus(
    mentor?.id,
    mentor?.last_seen
  );

  const handleBookingClick = async () => {
    setIsCheckingAuth(true);

    try {
      // Check if user is authenticated
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        // User is not logged in, show login dialog
        setShowLoginDialog(true);
        setIsCheckingAuth(false);
        return;
      }

      // Check if user is trying to book their own profile
      if (user.id === mentor.id) {
        toast.warning("You cannot book a session with yourself");
        setIsCheckingAuth(false);
        return;
      }

      // User is authenticated, open booking dialog
      if (onOpenBooking) {
        onOpenBooking();
      }
    } catch (error) {
      console.error("Auth check error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const handleLoginConfirm = () => {
    setShowLoginDialog(false);
    navigate("/student/login", {
      state: {
        returnTo: window.location.pathname,
        message: "Login to book a session with this mentor",
      },
    });
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${mentor.full_name} - Mentor Profile`,
          text: `Check out ${mentor.full_name}'s mentor profile on MatePeak`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Profile link copied to clipboard!");
      }
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const memberSince = new Date(mentor.created_at).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  // Map categories to their icons
  const categoryIcons: Record<string, any> = {
    "Mental Health": Heart,
    "Creative Arts": Palette,
    "Career Coaching": Briefcase,
    "Academic Support": GraduationCap,
    "Programming & Tech": Code,
    "Test Preparation": BookOpen,
    "Business & Finance": TrendingUp,
    "Leadership & Development": Users,
  };

  const getIconForCategory = (category: string) => {
    return categoryIcons[category] || Briefcase;
  };

  return (
    <>
      <Card className="shadow-sm border-0 bg-white rounded-2xl overflow-hidden">
        <CardContent className="p-6">
          {/* Avatar */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Avatar className="h-28 w-28 border-2 border-gray-100">
                <AvatarImage
                  src={
                    mentor.profile_picture_url || mentor.profiles?.avatar_url
                  }
                  alt={mentor.full_name}
                  className="object-cover"
                />
                <AvatarFallback className="text-2xl bg-gray-900 text-white font-bold">
                  {getInitials(mentor.full_name)}
                </AvatarFallback>
              </Avatar>
              {/* Live indicator */}
              {mentor.is_profile_live && isMentorOnline && (
                <PresenceDot className="absolute bottom-1 right-1" />
              )}
            </div>
          </div>

          {/* Name and Username */}
          <div className="text-center mb-4 space-y-1">
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-lg font-bold text-gray-900">
                {mentor.full_name}
              </h1>
            </div>
            {mentor.headline && (
              <p className="text-sm text-gray-600 leading-tight">
                {mentor.headline}
              </p>
            )}
            <div className="flex items-center justify-center gap-2 pt-1">
              <p className="text-xs text-gray-500">@{mentor.username}</p>
              {isOwnProfile && (
                <Badge
                  variant="outline"
                  className="border-blue-300 text-blue-700 bg-blue-50 text-xs py-0"
                >
                  Your Profile
                </Badge>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 mb-4">
            {isOwnProfile ? (
              // Show dashboard button for own profile
              <Link to={`/dashboard/${mentor.username}`} className="block">
                <Button className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium text-sm">
                  Go to Dashboard
                </Button>
              </Link>
            ) : (
              // Show booking and message buttons for other mentors
              <>
                <Button
                  onClick={handleBookingClick}
                  disabled={isCheckingAuth}
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium text-sm disabled:opacity-50"
                >
                  {isCheckingAuth
                    ? "Checking..."
                    : `Book ${mentor.full_name.split(" ")[0]}`}
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 font-medium text-sm"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Message{" "}
                  <span className="text-xs text-gray-400 ml-1">
                    (Under Development)
                  </span>
                </Button>
              </>
            )}
          </div>

          <Separator className="my-4" />

          {/* Expertise & Specializations - Two Column Layout */}
          <div className="mb-4 space-y-4">
            {/* Expert In (Categories) */}
            {mentor.categories && mentor.categories.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">
                  Expert in:
                </p>
                <div className="space-y-2">
                  {mentor.categories.slice(0, 2).map((category: string) => {
                    const IconComponent = getIconForCategory(category);
                    return (
                      <div
                        key={category}
                        className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 text-gray-900 text-xs"
                      >
                        <div className="flex-shrink-0 h-6 w-6 rounded bg-white border border-gray-200 flex items-center justify-center">
                          <IconComponent className="h-3.5 w-3.5 text-gray-700" />
                        </div>
                        <span className="font-medium">{category}</span>
                      </div>
                    );
                  })}
                  {mentor.categories.length > 2 && (
                    <p className="text-xs text-gray-500 pl-2">
                      +{mentor.categories.length - 2} more
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Skills */}
            {((mentor.skills && mentor.skills.length > 0) || (mentor.expertise_tags && mentor.expertise_tags.length > 0)) && (
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">
                  Skills:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {/* Show skills field (from current onboarding) or fallback to expertise_tags (from old onboarding) */}
                  {(mentor.skills && mentor.skills.length > 0 ? mentor.skills : mentor.expertise_tags).slice(0, 6).map((skill: string) => (
                    <Badge
                      key={skill}
                      variant="secondary"
                      className="px-2 py-0.5 bg-gray-100 text-gray-700 border-0 font-normal text-xs"
                    >
                      {skill}
                    </Badge>
                  ))}
                  {(mentor.skills && mentor.skills.length > 0 ? mentor.skills : mentor.expertise_tags).length > 6 && (
                    <Badge
                      variant="secondary"
                      className="px-2 py-0.5 bg-gray-100 text-gray-500 border-0 font-normal text-xs"
                    >
                      +{(mentor.skills && mentor.skills.length > 0 ? mentor.skills : mentor.expertise_tags).length - 6}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>

          <Separator className="my-4" />

          {/* Quick Stats */}
          <div className="space-y-2.5">
            {stats.averageRating > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Rating</span>
                <div className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold text-gray-900">
                    {stats.averageRating.toFixed(1)}{" "}
                    <span className="text-gray-500 font-normal">
                      ({stats.reviewCount})
                    </span>
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Sessions</span>
              <span className="font-semibold text-gray-900">
                {stats.completedSessions}
              </span>
            </div>

            {mentor.experience > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Experience</span>
                <span className="font-semibold text-gray-900">
                  {mentor.experience}+ years
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Member Since</span>
              <span className="font-semibold text-gray-900">{memberSince}</span>
            </div>
          </div>

          {/* Social Links */}
          {mentor.social_links &&
            Object.keys(mentor.social_links).some(
              (key) => mentor.social_links[key]
            ) && (
              <>
                <Separator className="my-4" />
                <div className="flex gap-2 justify-center">
                  {mentor.social_links.linkedin && (
                    <a
                      href={mentor.social_links.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                      title="LinkedIn"
                    >
                      <Linkedin className="h-4 w-4 text-gray-600" />
                    </a>
                  )}
                  {mentor.social_links.twitter && (
                    <a
                      href={mentor.social_links.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                      title="Twitter"
                    >
                      <Twitter className="h-4 w-4 text-gray-600" />
                    </a>
                  )}
                  {mentor.social_links.website && (
                    <a
                      href={mentor.social_links.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                      title="Website"
                    >
                      <Globe className="h-4 w-4 text-gray-600" />
                    </a>
                  )}
                </div>
              </>
            )}
        </CardContent>
      </Card>

      {/* Login Confirmation Dialog */}
      <AlertDialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Login Required</AlertDialogTitle>
            <AlertDialogDescription>
              You need to be logged in to book a session with this mentor. Would
              you like to login or create an account?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLoginConfirm}
              className="bg-matepeak-primary hover:bg-matepeak-secondary text-white"
            >
              Go to Login
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
