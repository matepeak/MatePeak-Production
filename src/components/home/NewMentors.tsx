import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import MentorCard from "@/components/MentorCard";
import { MentorProfile } from "@/components/MentorCard";
import { supabase } from "@/integrations/supabase/client";
import { transformToMentorCard } from "@/services/mentorCardService";
import { ConnectionStatus } from "@/components/ConnectionStatus";

interface NewMentorsProps {
  sectionRef?: React.RefObject<HTMLDivElement>;
}

const NewMentors = ({ sectionRef }: NewMentorsProps) => {
  const [newMentors, setNewMentors] = useState<MentorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchNewMentors();
  }, []);

  const fetchNewMentors = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch the 4 most recently created mentors
      // Note: expert_profiles.id = profiles.id (both reference auth.users.id)
      const { data, error } = await supabase
        .from("expert_profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(4);

      if (error) {
        console.error("Error fetching new mentors:", error);
        
        // Provide user-friendly error message
        if (error.message?.includes('timeout') || error.message?.includes('timed out') || error.message?.includes('Failed to fetch')) {
          throw new Error(
            "Connection timeout: Unable to reach the server. Please check your internet connection or try again later."
          );
        }
        if (error.message?.includes('network') || error.message?.includes('fetch')) {
          throw new Error(
            "Network error: Cannot connect to the database. Please check your firewall settings or try using a different network."
          );
        }
        throw new Error(`Database error: ${error.message}`);
      }

      if (data && data.length > 0) {
        // Fetch corresponding profile avatars
        const profileIds = data.map((p) => p.id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, avatar_url")
          .in("id", profileIds);

        // Create a map of profile id to avatar_url
        const avatarMap = new Map(
          profilesData?.map((p) => [p.id, p.avatar_url]) || []
        );

        // Transform profiles with avatar data
        const mentorCards = data.map((profile) => {
          const profileWithAvatar = {
            ...profile,
            profiles: {
              avatar_url: avatarMap.get(profile.id),
            },
          };
          return transformToMentorCard(profileWithAvatar);
        });

        setNewMentors(mentorCards);
      }
    } catch (err) {
      console.error("Error in fetchNewMentors:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  };

  // Show error if present
  if (error) {
    return (
      <section className="w-full bg-white py-24 sm:py-32" ref={sectionRef}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-medium text-gray-400 tracking-widest uppercase mb-4">
              Just Joined
            </p>
            <h2 className="text-4xl sm:text-5xl font-semibold text-gray-900 tracking-tight leading-tight">
              New Mentors
            </h2>
          </div>
          <ConnectionStatus
            error={error}
            onRetry={fetchNewMentors}
            isRetrying={loading}
          />
        </div>
      </section>
    );
  }

  // Don't render section if no new mentors and not loading
  if (!loading && newMentors.length === 0) {
    return (
      <section className="w-full bg-white py-24 sm:py-32" ref={sectionRef}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-400 tracking-widest uppercase mb-4">
              Just Joined
            </p>
            <h2 className="text-4xl sm:text-5xl font-semibold text-gray-900 tracking-tight leading-tight">
              New Mentors
            </h2>
            <p className="mt-5 text-base text-gray-500 max-w-xl mx-auto leading-relaxed">
              Welcome our newest mentors to the platform. Connect with fresh
              perspectives and expertise.
            </p>
            <p className="mt-4 text-sm text-gray-400">
              Be the first to connect as they join.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full bg-white py-24 sm:py-32" ref={sectionRef}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <p className="text-sm font-medium text-gray-400 tracking-widest uppercase mb-4">
            Just Joined
          </p>
          <h2 className="text-4xl sm:text-5xl font-semibold text-gray-900 tracking-tight leading-tight">
            New Mentors
          </h2>
          <p className="mt-5 text-base text-gray-500 max-w-xl mx-auto leading-relaxed">
            Welcome our newest mentors to the platform. Connect with fresh
            perspectives and expertise.
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        )}

        {/* Mentor Cards Grid */}
        {!loading && newMentors.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-14">
              {newMentors.map((mentor, index) => (
                <MentorCard
                  key={mentor.id || index}
                  mentor={mentor}
                  isNew={true}
                />
              ))}
            </div>

            {/* View All Link */}
            <div className="text-center">
              <Link
                to="/explore"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-900 border border-gray-200 rounded-full px-6 py-2.5 hover:bg-gray-50 transition-all duration-200 active:scale-95"
              >
                Explore all mentors
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default NewMentors;
