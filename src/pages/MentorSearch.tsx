import { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MentorCard from "@/components/MentorCard";
import { filterMentors } from "@/data/mentors";
import { MentorProfile } from "@/components/MentorCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const MentorSearch = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialCategory = queryParams.get("category") || "";
  const initialSearchTerm = queryParams.get("search") || "";
  const aiResultsParam = queryParams.get("aiResults");
  const initialAIResults = aiResultsParam
    ? JSON.parse(decodeURIComponent(aiResultsParam))
    : null;

  const [searchQuery, setSearchQuery] = useState("");
  const [filteredMentors, setFilteredMentors] = useState<MentorProfile[]>([]);
  const [dbMentors, setDbMentors] = useState<any[]>([]);
  const [searchFilters, setSearchFilters] = useState({
    searchTerm: initialSearchTerm,
    categories: initialCategory ? [initialCategory] : [],
    priceRange: [0, 2000],
    aiResults: initialAIResults,
  });

  // Fetch mentors from database
  useEffect(() => {
    fetchDatabaseMentors();
  }, []);

  const fetchDatabaseMentors = async () => {
    try {
      const { data, error } = await supabase
        .from("expert_profiles")
        .select(
          `
          *,
          profiles (
            avatar_url
          )
        `
        )
        .eq("onboarding_complete", true)
        .not("username", "is", null);

      if (error) throw error;
      console.log("Fetched database mentors:", data);
      setDbMentors(data || []);
    } catch (error) {
      console.error("Error fetching mentors:", error);
    }
  };

  // Filter database mentors based on search filters
  const getFilteredDbMentors = () => {
    if (!dbMentors.length) {
      console.log("No database mentors to filter");
      return [];
    }

    let filtered = [...dbMentors];
    console.log("Starting with mentors:", filtered.length);

    // Filter by search term (name, bio, expertise, skills)
    if (searchFilters.searchTerm) {
      const searchLower = searchFilters.searchTerm.toLowerCase();
      console.log("Filtering by search term:", searchLower);
      filtered = filtered.filter((mentor) => {
        const nameMatch = mentor.full_name?.toLowerCase().includes(searchLower);
        const bioMatch = mentor.bio?.toLowerCase().includes(searchLower);
        const expertiseMatch =
          Array.isArray(mentor.expertise) &&
          mentor.expertise.some((exp: string) =>
            exp?.toLowerCase().includes(searchLower)
          );
        const skillsMatch =
          Array.isArray(mentor.skills) &&
          mentor.skills.some((skill: string) =>
            skill?.toLowerCase().includes(searchLower)
          );
        const categoryMatch = mentor.category
          ?.toLowerCase()
          .includes(searchLower);

        return (
          nameMatch ||
          bioMatch ||
          expertiseMatch ||
          skillsMatch ||
          categoryMatch
        );
      });
      console.log("After search term filter:", filtered.length);
    }

    // Filter by categories
    if (searchFilters.categories.length > 0) {
      console.log("Filtering by categories:", searchFilters.categories);
      filtered = filtered.filter((mentor) =>
        searchFilters.categories.includes(mentor.category)
      );
      console.log("After category filter:", filtered.length);
    }

    console.log("Final filtered mentors:", filtered.length);
    return filtered;
  };

  useEffect(() => {
    console.log("=== MentorSearch URL params ===");
    console.log("initialSearchTerm:", initialSearchTerm);
    console.log("initialCategory:", initialCategory);
    console.log("initialAIResults:", initialAIResults);

    if (initialSearchTerm) {
      setSearchQuery(initialSearchTerm);
    }

    // Update search filters state
    const newFilters = {
      searchTerm: initialSearchTerm,
      categories: initialCategory ? [initialCategory] : [],
      priceRange: [0, 2000],
      aiResults: initialAIResults,
    };
    console.log("Setting search filters:", newFilters);
    setSearchFilters(newFilters);

    if (initialAIResults) {
      console.log("Using AI results:", initialAIResults.length, "mentors");
      setFilteredMentors(initialAIResults);
    } else if (initialSearchTerm || initialCategory) {
      console.log(
        "Using static filter for:",
        initialSearchTerm,
        initialCategory
      );
      const filteredResults = filterMentors(
        initialSearchTerm,
        initialCategory ? [initialCategory] : [],
        [0, 2000]
      );
      console.log("Filtered static mentors:", filteredResults.length);
      setFilteredMentors(filteredResults);
    }
  }, [initialSearchTerm, initialCategory, initialAIResults]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow">
        <div className="bg-mentor-light/50 py-12">
          <div className="container mx-auto px-4">
            <h1 className="text-3xl font-bold mb-2">
              Find Your Perfect Mentor
            </h1>
            <p className="text-gray-600 mb-6">
              Browse our curated selection of mentors
              {searchFilters.searchTerm && ` for "${searchFilters.searchTerm}"`}
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          {(() => {
            const filteredDbMentors = getFilteredDbMentors();
            const totalResults =
              filteredDbMentors.length + filteredMentors.length;

            return (
              <>
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-bold">
                    {totalResults} {totalResults === 1 ? "Mentor" : "Mentors"}{" "}
                    Available
                  </h2>
                  {searchFilters.searchTerm && (
                    <div className="text-gray-600">
                      Search results for:{" "}
                      <span className="font-medium">
                        {searchFilters.searchTerm}
                      </span>
                    </div>
                  )}
                </div>

                {/* Database Mentors */}
                {filteredDbMentors.length > 0 && (
                  <div className="mb-12">
                    <h2 className="text-2xl font-bold mb-6">
                      {searchFilters.searchTerm
                        ? "Matching Mentors"
                        : "Available Mentors"}{" "}
                      ({filteredDbMentors.length})
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {filteredDbMentors.map((mentor) => (
                        <Link key={mentor.id} to={`/mentor/${mentor.username}`}>
                          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                            <CardContent className="p-6">
                              <div className="flex flex-col items-center text-center">
                                <Avatar className="h-20 w-20 mb-4">
                                  <AvatarImage
                                    src={mentor.profiles?.avatar_url}
                                    alt={mentor.full_name}
                                  />
                                  <AvatarFallback className="bg-matepeak-primary text-white text-lg">
                                    {mentor.full_name
                                      .split(" ")
                                      .map((n: string) => n[0])
                                      .join("")}
                                  </AvatarFallback>
                                </Avatar>
                                <h3 className="font-bold text-lg mb-1">
                                  {mentor.full_name}
                                </h3>
                                <p className="text-sm text-gray-600 mb-3">
                                  @{mentor.username}
                                </p>
                                <Badge variant="secondary" className="mb-3">
                                  {mentor.category}
                                </Badge>
                                {mentor.expertise &&
                                  mentor.expertise.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-3 justify-center">
                                      {mentor.expertise
                                        .slice(0, 3)
                                        .map((exp: string, idx: number) => (
                                          <Badge
                                            key={idx}
                                            variant="outline"
                                            className="text-xs"
                                          >
                                            {exp}
                                          </Badge>
                                        ))}
                                    </div>
                                  )}
                                <p className="text-sm text-gray-700 line-clamp-2">
                                  {mentor.bio || "No bio available"}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Static Mentors */}
                {filteredMentors.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-bold mb-6">
                      Featured Mentors ({filteredMentors.length})
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {filteredMentors.map((mentor, idx) => (
                        <MentorCard
                          key={mentor.id}
                          mentor={mentor}
                          isNew={idx < 8}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* No Results */}
                {totalResults === 0 && (
                  <div className="text-center py-16">
                    <h3 className="text-xl font-medium mb-2">
                      No mentors found
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Try adjusting your search filters or browse all available
                      mentors.
                    </p>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default MentorSearch;
