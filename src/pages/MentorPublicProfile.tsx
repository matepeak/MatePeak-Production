import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileTabs from "@/components/profile/ProfileTabs";
import ProfileOverview from "@/components/profile/ProfileOverview";
import ProfileAvailability from "@/components/profile/ProfileAvailability";
import ProfileExperiences from "@/components/profile/ProfileExperiences";
import ProfileReviews from "@/components/profile/ProfileReviews";
import ProfileAbout from "@/components/profile/ProfileAbout";
import AvailabilityPreview from "@/components/profile/AvailabilityPreview";

export type ProfileTab =
  | "overview"
  | "availability"
  | "experiences"
  | "reviews"
  | "about";

interface MentorProfileData {
  id: string;
  full_name: string;
  username: string;
  category: string;
  categories: string[];
  expertise_tags: string[];
  languages: Array<{ language: string; level: string }>;
  bio: string;
  headline: string;
  introduction: string;
  teaching_experience: string;
  motivation: string;
  experience: number;
  pricing: number;
  ispaid: boolean;
  profile_picture_url: string;
  social_links: any;
  services: any;
  service_pricing: any;
  education: any[];
  teaching_certifications: any[];
  has_no_certificate: boolean;
  timezone?: string;
  created_at: string;
  profiles?: {
    avatar_url?: string;
    email?: string;
  };
}

export default function MentorPublicProfile() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const [mentor, setMentor] = useState<MentorProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [stats, setStats] = useState({
    averageRating: 0,
    reviewCount: 0,
    totalSessions: 0,
    completedSessions: 0,
  });

  useEffect(() => {
    if (username) {
      fetchMentorProfile();
    }
  }, [username]);

  const fetchMentorProfile = async () => {
    try {
      setLoading(true);

      console.log("Fetching profile for username:", username);

      // Check if user is logged in and get their profile
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Fetch mentor profile by username
      const { data: profileData, error: profileError } = await supabase
        .from("expert_profiles")
        .select("*, service_pricing")
        .eq("username", username)
        .single();

      if (profileError) {
        console.error("Profile fetch error:", profileError);
        throw profileError;
      }

      if (!profileData) {
        console.error("No profile data found");
        toast.error("Mentor profile not found");
        navigate("/mentors");
        return;
      }

      console.log("Profile data fetched:", profileData);
      console.log("📊 Service pricing data:", profileData.service_pricing);
      setMentor(profileData as any);

      // Check if the logged-in user is viewing their own profile
      if (user && profileData.id === user.id) {
        setIsOwnProfile(true);
      }

      // Fetch reviews and calculate stats
      const { data: reviews, error: reviewsError } = await supabase
        .from("reviews")
        .select("rating, comment, created_at, mentor_reply, user_id")
        .eq("expert_id", profileData.id)
        .order("created_at", { ascending: false });

      if (!reviewsError && reviews) {
        const reviewCount = reviews.length;
        const avgRating =
          reviewCount > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
            : 0;

        // Fetch session stats
        const { data: sessions } = await supabase
          .from("bookings")
          .select("status")
          .eq("expert_id", profileData.id);

        const totalSessions = sessions?.length || 0;
        const completedSessions =
          sessions?.filter((s) => s.status === "completed").length || 0;

        setStats({
          averageRating: avgRating,
          reviewCount,
          totalSessions,
          completedSessions,
        });
      }
    } catch (error: any) {
      console.error("Error fetching mentor profile:", error);
      setError(error.message || "Failed to load mentor profile");
      toast.error(error.message || "Failed to load mentor profile");
      // Don't navigate away, stay on page to show error
    } finally {
      setLoading(false);
    }
  };

  const handleBookFromAvailability = (
    date: Date,
    time: string,
    timezone: string
  ) => {
    if (mentor) {
      // Navigate to booking page with pre-selected date/time as query params
      const dateStr = date.toISOString().split("T")[0];
      navigate(
        `/booking?mentorId=${
          mentor.id
        }&date=${dateStr}&time=${encodeURIComponent(
          time
        )}&timezone=${encodeURIComponent(timezone)}`
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-matepeak-primary mx-auto mb-4" />
            <p className="text-sm text-gray-600">Loading mentor profile...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!mentor && !loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="mb-6">
              <div className="h-20 w-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="h-10 w-10 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Profile Not Found
              </h2>
              <p className="text-gray-600 mb-6">
                {error ||
                  "We couldn't find the mentor profile you're looking for. The username may be incorrect or the profile may not exist."}
              </p>
              {/* Browse All Mentors button removed as per request */}
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!mentor) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-grow py-8">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Sidebar - Profile Header (Sticky) */}
            <div className="lg:col-span-3">
              <div className="lg:sticky lg:top-6">
                <ProfileHeader
                  mentor={mentor}
                  stats={stats}
                  isOwnProfile={isOwnProfile}
                  onOpenBooking={() => {
                    navigate(`/booking?mentorId=${mentor.id}`);
                  }}
                />
              </div>
            </div>

            {/* Main Content Area - White Background */}
            <div className="lg:col-span-9">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="space-y-6">
                  <ProfileTabs
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                  />

                  <div
                    className={
                      activeTab === "overview"
                        ? "grid grid-cols-1 lg:grid-cols-3 gap-6"
                        : ""
                    }
                  >
                    {/* Main Content */}
                    <div
                      className={
                        activeTab === "overview" ? "lg:col-span-2" : ""
                      }
                    >
                      {activeTab === "overview" && (
                        <ProfileOverview mentor={mentor} stats={stats} />
                      )}
                      {activeTab === "availability" && (
                        <ProfileAvailability
                          mentorId={mentor.id}
                          mentorName={mentor.full_name}
                          mentorTimezone={mentor.timezone || "UTC"}
                          onBookSlot={handleBookFromAvailability}
                        />
                      )}
                      {activeTab === "experiences" && (
                        <ProfileExperiences mentor={mentor} />
                      )}
                      {activeTab === "reviews" && (
                        <ProfileReviews mentorId={mentor.id} stats={stats} />
                      )}
                      {activeTab === "about" && (
                        <ProfileAbout mentor={mentor} />
                      )}
                    </div>

                    {/* Right Sidebar - Availability (Only on Overview Tab) */}
                    {activeTab === "overview" && (
                      <div className="lg:col-span-1">
                        <AvailabilityPreview
                          mentorId={mentor.id}
                          mentor={mentor}
                          onSeeMore={() => setActiveTab("availability")}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
