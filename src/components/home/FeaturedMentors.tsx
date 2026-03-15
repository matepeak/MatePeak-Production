import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, Sparkles } from "lucide-react";
import MentorCard, { MentorProfile } from "@/components/MentorCard";
import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  transformToMentorCard,
  ExpertProfileData,
} from "@/services/mentorCardService";
import { ConnectionStatus } from "@/components/ConnectionStatus";

interface FeaturedMentorsProps {
  sectionRef: React.RefObject<HTMLDivElement>;
}

// Mapping from onboarding expertise categories to Featured Mentor sections
const EXPERTISE_TO_CATEGORY_MAP: Record<string, string[]> = {
  "Career Development": ["Mock Interviews", "Resume Review"],
  "Academic Support": ["Academic Support"],
  "Mental Health": ["Health"],
  "Programming & Tech": ["Academic Support"],
  "Test Preparation": ["Academic Support"],
  "Creative Arts": ["Academic Support"],
  "Business & Finance": ["Mock Interviews", "Resume Review"],
  "Leadership & Development": ["Mock Interviews"],
};

// Mapping from expertise tags to Featured Mentor sections
const TAG_TO_CATEGORY_MAP: Record<string, string> = {
  // Career Development tags
  "Resume Writing": "Resume Review",
  "Interview Preparation": "Mock Interviews",
  "Mock Interviews": "Mock Interviews",
  "Career Counseling": "Mock Interviews",
  "Job Search Strategies": "Resume Review",
  "LinkedIn Profile Optimization": "Resume Review",

  // Academic Support tags
  Mathematics: "Academic Support",
  Science: "Academic Support",
  "Study Skills": "Academic Support",
  "Homework Help": "Academic Support",
  "Exam Preparation": "Academic Support",

  // Mental Health tags
  "Stress Management": "Health",
  "Anxiety Support": "Health",
  "Work-Life Balance": "Health",
  Mindfulness: "Health",

  // Programming & Tech tags
  "Web Development": "Academic Support",
  Python: "Academic Support",
  JavaScript: "Academic Support",
  "Data Science": "Academic Support",

  // Test Preparation tags
  SAT: "Academic Support",
  GRE: "Academic Support",
  GMAT: "Academic Support",
  IELTS: "Academic Support",

  // Creative Arts tags
  "Graphic Design": "Academic Support",
  "UI/UX Design": "Academic Support",
  "Creative Writing": "Academic Support",

  // Business & Finance tags
  Entrepreneurship: "Mock Interviews",
  "Financial Planning": "Resume Review",
  "Business Strategy": "Mock Interviews",

  // Leadership tags
  "Leadership Skills": "Mock Interviews",
  "Team Management": "Mock Interviews",
  "Communication Skills": "Mock Interviews",
};

const FeaturedMentors = ({ sectionRef }: FeaturedMentorsProps) => {
  const [visibleCategories, setVisibleCategories] = useState(2); // Show only 2 categories initially
  const [allMentors, setAllMentors] = useState<MentorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Get actual categories from mentors instead of hardcoding
  const categories = useMemo(() => {
    const allCategories = new Set<string>();
    
    allMentors.forEach((mentor) => {
      // Add categories from mentor
      if (mentor.categories && mentor.categories.length > 0) {
        mentor.categories.forEach(cat => allCategories.add(cat));
      }
      // Add from expertise_tags if no categories
      if ((!mentor.categories || mentor.categories.length === 0) && mentor.expertise_tags) {
        mentor.expertise_tags.forEach(tag => allCategories.add(tag));
      }
    });
    
    // If no categories found, use "All Mentors" as default
    return allCategories.size > 0 ? Array.from(allCategories).slice(0, 5) : ["All Mentors"];
  }, [allMentors]);

  // Fetch mentors from database
  useEffect(() => {
    const fetchMentors = async () => {
      try {
        setError(null); // Clear any previous errors
        
        // Fetch expert profiles first
        const { data: expertProfiles, error: expertError } = await supabase
          .from("expert_profiles")
          .select("*");

        if (expertError) {
          // Provide user-friendly error message
          if (expertError.message?.includes('timeout') || expertError.message?.includes('timed out')) {
            throw new Error(
              "Connection timeout: Unable to reach the server. Please check your internet connection or try again later."
            );
          }
          if (expertError.message?.includes('network') || expertError.message?.includes('fetch')) {
            throw new Error(
              "Network error: Cannot connect to the database. Please check your firewall settings or try using a different network."
            );
          }
          throw new Error(`Database error: ${expertError.message}`);
        }

        // Fetch profiles separately
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, avatar_url");

        if (profilesError) {
          console.warn("Could not fetch profile avatars (non-critical):", profilesError.message);
          // Continue without avatars - this is non-critical
        }

        // Create a map of profiles by id for quick lookup
        const profilesMap = new Map(
          (profiles || []).map((p: any) => [p.id, p])
        );

        // Transform to mentor cards and store with original data for categorization
        const mentorCards = (expertProfiles || []).map((profile: any) => {
          // Attach profile avatar if exists
          const userProfile = profilesMap.get(profile.id);
          const profileWithAvatar = {
            ...profile,
            profiles: userProfile
              ? { avatar_url: userProfile.avatar_url }
              : null,
          };

          const card = transformToMentorCard(profileWithAvatar);
          // Attach original profile data for education checking
          (card as any)._profileData = profile;
          return card;
        });

        console.log("Fetched mentors:", mentorCards.length, mentorCards);
        setAllMentors(mentorCards);
      } catch (err) {
        console.error("Error fetching mentors:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    };

    fetchMentors();
  }, []);

  // Memoize mentor filtering to prevent recalculation on every render
  const categorizedMentors = useMemo(() => {
    // Check if mentor is a recent graduate based on education data
    const isRecentGraduate = (mentor: MentorProfile) => {
      const profileData = (mentor as any)._profileData;
      if (!profileData?.education || profileData.education.length === 0) {
        return false;
      }

      const currentYear = new Date().getFullYear();

      // Check each education entry
      return profileData.education.some((edu: any) => {
        // Recent graduate if graduated within last 2 years OR currently studying
        if (edu.currentlyStudying) return true;

        const yearTo = edu.yearTo || edu.year;
        if (yearTo) {
          return yearTo >= currentYear - 2;
        }

        return false;
      });
    };

    // Get categories for a mentor based on their expertise
    const getMentorCategories = (mentor: MentorProfile) => {
      const mentorCategories = new Set<string>();

      // 1. Check if they're a recent graduate
      if (isRecentGraduate(mentor)) {
        mentorCategories.add("Recent Graduates");
      }

      // 2. Map from expertise tags (most specific)
      if (mentor.expertise_tags && mentor.expertise_tags.length > 0) {
        mentor.expertise_tags.forEach((tag) => {
          const mappedCategory = TAG_TO_CATEGORY_MAP[tag];
          if (mappedCategory) {
            mentorCategories.add(mappedCategory);
          }
        });
      }

      // 3. Map from categories (broader expertise areas)
      if (mentor.categories && mentor.categories.length > 0) {
        mentor.categories.forEach((category) => {
          const mappedCategories = EXPERTISE_TO_CATEGORY_MAP[category];
          if (mappedCategories) {
            mappedCategories.forEach((cat) => mentorCategories.add(cat));
          }
        });
      }

      // 4. Fallback: Map old single category field (for backward compatibility)
      if (mentorCategories.size === 0 && mentor.title) {
        // If mentor has no new categories but has a title, try to map it
        const mappedCategories = EXPERTISE_TO_CATEGORY_MAP[mentor.title];
        if (mappedCategories) {
          mappedCategories.forEach((cat) => mentorCategories.add(cat));
        }
      }

      // 5. Final fallback: If still no categories, add to Academic Support as default
      if (mentorCategories.size === 0) {
        mentorCategories.add("Academic Support");
      }

      return Array.from(mentorCategories);
    };

    return categories.map((category) => {
      // For each mentor, check if they should be in this category
      let categoryMentors: MentorProfile[];
      
      if (category === "All Mentors") {
        // Show all mentors if no categories found
        categoryMentors = allMentors.slice(0, 4);
      } else {
        categoryMentors = allMentors
          .filter((mentor) => {
            // Check if mentor has this category or expertise tag
            const hasCategory = mentor.categories?.includes(category);
            const hasExpertise = mentor.expertise_tags?.includes(category);
            const matchesDerivedCategory = getMentorCategories(mentor).includes(category);
            
            return hasCategory || hasExpertise || matchesDerivedCategory;
          })
          .slice(0, 4); // Limit to 4 mentors per category
      }

      console.log(`Category "${category}":`, categoryMentors.length, "mentors");

      return {
        category,
        mentors: categoryMentors,
      };
    });
  }, [allMentors]);

  const handleLoadMore = () => {
    setVisibleCategories((prev) => Math.min(prev + 2, categories.length));
  };

  const hasMore = visibleCategories < categories.length;

  return (
    <section className="py-20 md:py-28" ref={sectionRef}>
      <div className="w-full max-w-7xl mx-auto px-4 md:px-8 xl:px-0">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-matepeak-primary/10 px-4 py-2 rounded-full mb-4">
            <Users className="h-5 w-5 text-matepeak-primary" />
            <span className="text-sm font-semibold text-matepeak-primary">
              Top Rated
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-matepeak-primary via-matepeak-secondary to-orange-500 bg-clip-text text-transparent">
            Our Mentors
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto font-light">
            Connect with our top-rated mentors across various categories who are
            ready to help you succeed.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-matepeak-primary"></div>
              <p className="text-gray-600 font-light">Loading mentors...</p>
            </div>
          </div>
        ) : error ? (
          <ConnectionStatus 
            error={error} 
            onRetry={() => window.location.reload()} 
            isRetrying={false}
          />
        ) : (
          <>
            {categorizedMentors
              .slice(0, visibleCategories)
              .map(({ category, mentors: categoryMentors }) => (
                <div key={category} className="mb-16">
                  <h3 className="text-2xl font-semibold mb-8 text-gray-900">
                    {category}
                  </h3>

                  {categoryMentors.length > 0 ? (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        {categoryMentors.map((mentor) => (
                          <MentorCard key={mentor.id} mentor={mentor} />
                        ))}
                      </div>
                      <div className="text-center mt-8">
                        <Link to={`/explore?q=${encodeURIComponent(category)}`}>
                          <Button
                            variant="outline"
                            className="group h-10 rounded-full border-0 bg-[#f2f2f2] px-5 text-gray-900 shadow-none hover:bg-[#f2f2f2] hover:text-gray-900 transition-colors duration-200"
                          >
                            View more
                            <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                          </Button>
                        </Link>
                      </div>
                    </>
                  ) : (
                    <div className="bg-white border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center">
                      <div className="flex justify-center mb-4">
                        <div className="bg-gradient-to-br from-matepeak-primary/10 to-matepeak-yellow/10 rounded-full p-6">
                          <Users className="h-12 w-12 text-matepeak-primary" />
                        </div>
                      </div>
                      <h4 className="text-xl font-bold text-gray-800 mb-2">
                        Mentors Coming Soon
                      </h4>
                      <p className="text-gray-600 mb-6 max-w-md mx-auto">
                        We're actively onboarding expert mentors in {category}.
                        Check back soon for amazing mentors!
                      </p>
                      <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                        <Sparkles className="h-4 w-4 text-matepeak-secondary" />
                        <span>New mentors are joining every week</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}

            {hasMore && (
              <div className="text-center mb-12">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  className="border-matepeak-secondary text-matepeak-secondary hover:bg-matepeak-secondary hover:text-white transition-all duration-200"
                >
                  Load More Categories
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}

        {/* View All Mentors button removed as per request */}
      </div>
    </section>
  );
};

export default FeaturedMentors;
