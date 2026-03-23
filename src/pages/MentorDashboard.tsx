import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardOverview from "@/components/dashboard/DashboardOverview";
import ProfileManagement from "@/components/dashboard/ProfileManagement";
import SessionManagement from "@/components/dashboard/SessionManagement";
import ReviewsManagement from "@/components/dashboard/ReviewsManagement";
import AvailabilityCalendar from "@/components/dashboard/AvailabilityCalendar";
import MentorPriorityDmInbox from "@/components/dashboard/MentorPriorityDmInbox";
import StudentDirectory from "@/components/dashboard/StudentDirectory";
import CustomTimeRequests from "@/components/dashboard/CustomTimeRequests";
import ServicesManagement from "@/components/dashboard/ServicesManagement";
import MentorPaymentsSetup from "@/components/dashboard/MentorPaymentsSetup";
import MentorPayoutsDashboard from "@/components/dashboard/MentorPayoutsDashboard";
import MentorEarnings from "@/components/dashboard/MentorEarnings";
import { toast } from "@/components/ui/sonner";

type DashboardView =
  | "overview"
  | "profile"
  | "sessions"
  | "reviews"
  | "availability"
  | "messages"
  | "students"
  | "requests"
  | "services"
  | "payments"
  | "payouts"
  | "earnings";

const MentorDashboard = () => {
  const navigate = useNavigate();
  const { username } = useParams<{ username: string }>();
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<DashboardView>("overview");
  const [mentorProfile, setMentorProfile] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuthAndProfile();
  }, [username]); // Re-run if username in URL changes

  const checkAuthAndProfile = async () => {
    try {
      // Check authentication
      const {
        data: { session },
        error: authError,
      } = await supabase.auth.getSession();

      if (authError || !session) {
        toast.error("Authentication required", {
          description: "Please sign in to access the dashboard",
        });
        navigate("/expert/login");
        return;
      }

      // Security: Check if user is a student
      const userRole =
        session.user.user_metadata?.role ||
        session.user.user_metadata?.user_type;
      if (userRole === "student") {
        toast.error("Access denied", {
          description: "This dashboard is for mentors only",
        });
        navigate("/dashboard");
        return;
      }

      setUser(session.user);

      // Fetch mentor profile
      const { data: profile, error: profileError } = await supabase
        .from("expert_profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Profile error:", profileError);
        throw profileError;
      }

      if (!profile) {
        // Profile doesn't exist, redirect to onboarding
        toast.info("Complete your profile", {
          description: "Please complete the onboarding process first",
        });
        navigate("/expert/onboarding");
        return;
      }

      // Fetch email from profiles table
      const { data: profileData } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", session.user.id)
        .maybeSingle();

      // Flatten the email from profiles
      const profileWithEmail = {
        ...profile,
        email: profileData?.email || session.user.email || "",
      };

      // Check if accessing via old route (/mentor/dashboard or /expert/dashboard)
      // and redirect to username-based route
      if (!username && profileWithEmail.username) {
        navigate(`/dashboard/${profileWithEmail.username}`, { replace: true });
        return;
      }

      // Security check: Verify the username in URL matches the logged-in user's profile
      if (username && profileWithEmail.username !== username) {
        toast.error("Access Denied", {
          description: "You can only access your own dashboard",
        });
        // Redirect to their own dashboard
        navigate(`/dashboard/${profileWithEmail.username}`, { replace: true });
        return;
      }

      setMentorProfile(profileWithEmail);
    } catch (error) {
      console.error("Error loading dashboard:", error);
      toast.error("Error", {
        description: "Failed to load dashboard. Please try again.",
      });
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = (updatedProfile: any) => {
    // Preserve the email when updating the profile
    setMentorProfile({
      ...updatedProfile,
      email: mentorProfile?.email || updatedProfile.email,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-900 mx-auto mb-4" />
          <p className="text-sm text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!mentorProfile || !user) {
    return null;
  }

  return (
    <DashboardLayout
      activeView={activeView}
      onViewChange={setActiveView}
      mentorProfile={mentorProfile}
      user={user}
    >
      {activeView === "overview" && (
        <DashboardOverview
          mentorProfile={mentorProfile}
          onNavigate={(view) => setActiveView(view as DashboardView)}
        />
      )}
      {activeView === "profile" && (
        <ProfileManagement
          mentorProfile={mentorProfile}
          onProfileUpdate={handleProfileUpdate}
        />
      )}
      {activeView === "sessions" && (
        <SessionManagement mentorProfile={mentorProfile} />
      )}
      {activeView === "reviews" && (
        <ReviewsManagement mentorProfile={mentorProfile} />
      )}
      {activeView === "availability" && (
        <AvailabilityCalendar mentorProfile={mentorProfile} />
      )}
      {activeView === "messages" && (
        <MentorPriorityDmInbox mentorProfile={mentorProfile} />
      )}
      {activeView === "students" && (
        <StudentDirectory mentorProfile={mentorProfile} />
      )}
      {activeView === "requests" && (
        <CustomTimeRequests mentorProfile={mentorProfile} />
      )}
      {activeView === "services" && (
        <ServicesManagement mentorId={mentorProfile.id} />
      )}
      {activeView === "payments" && (
        <MentorPaymentsSetup mentorProfile={mentorProfile} />
      )}
      {activeView === "payouts" && <MentorPayoutsDashboard />}
      {activeView === "earnings" && (
        <MentorEarnings mentorProfile={mentorProfile} />
      )}
    </DashboardLayout>
  );
};

export default MentorDashboard;
