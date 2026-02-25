import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Loader2 } from "lucide-react";
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
      <section className="py-20 md:py-28" ref={sectionRef}>
        <div className="w-full max-w-7xl mx-auto px-4 md:px-8 xl:px-0">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-matepeak-primary/10 px-4 py-2 rounded-full mb-4">
              <Sparkles className="h-5 w-5 text-matepeak-primary" />
              <span className="text-sm font-semibold text-matepeak-primary">
                Just Joined
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-matepeak-primary via-matepeak-secondary to-orange-500 bg-clip-text text-transparent">
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
      <section className="py-20 md:py-28" ref={sectionRef}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-matepeak-primary/10 px-4 py-2 rounded-full mb-4">
              <Sparkles className="h-5 w-5 text-matepeak-primary" />
              <span className="text-sm font-semibold text-matepeak-primary">
                Just Joined
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-matepeak-primary via-matepeak-secondary to-orange-500 bg-clip-text text-transparent">
              New Mentors
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto mb-8 font-light">
              Welcome our newest mentors to the platform! Connect with fresh
              perspectives and expertise.
            </p>
            <p className="text-gray-500 font-light">
              Be the first to connect with mentors as they join!
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 md:py-28" ref={sectionRef}>
      <div className="w-full max-w-7xl mx-auto px-4 md:px-8 xl:px-0">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-matepeak-primary/10 px-4 py-2 rounded-full mb-4">
            <Sparkles className="h-5 w-5 text-matepeak-primary" />
            <span className="text-sm font-semibold text-matepeak-primary">
              Just Joined
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-matepeak-primary via-matepeak-secondary to-orange-500 bg-clip-text text-transparent">
            New Mentors
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto font-light">
            Welcome our newest mentors to the platform! Connect with fresh
            perspectives and expertise.
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-matepeak-primary" />
          </div>
        )}

        {/* Mentor Cards Grid */}
        {!loading && newMentors.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
              {newMentors.map((mentor, index) => (
                <MentorCard
                  key={mentor.id || index}
                  mentor={mentor}
                  isNew={true}
                />
              ))}
            </div>

            {/* View All Button */}
            <div className="text-center">
              <Link to="/explore">
                <Button className="bg-gradient-to-r from-matepeak-primary to-matepeak-secondary hover:opacity-90 text-white transition-all duration-200 shadow-lg hover:shadow-xl">
                  Explore All Mentors
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default NewMentors;
