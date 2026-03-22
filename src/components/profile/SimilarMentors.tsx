import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users,
  Star,
  Heart,
  Palette,
  Briefcase,
  GraduationCap,
  Code,
  BookOpen,
  TrendingUp,
  Users as UsersIcon
} from "lucide-react";

interface SimilarMentorsProps {
  currentMentorId: string;
  categories: string[];
  expertiseTags: string[];
}

interface SimilarMentor {
  id: string;
  full_name: string;
  username: string;
  profile_picture_url: string;
  categories: string[];
  averageRating: number;
  reviewCount: number;
}

export default function SimilarMentors({ currentMentorId, categories, expertiseTags }: SimilarMentorsProps) {
  const [similarMentors, setSimilarMentors] = useState<SimilarMentor[]>([]);
  const [loading, setLoading] = useState(true);

  // Map categories to their icons
  const categoryIcons: Record<string, any> = {
    "Mental Health": Heart,
    "Creative Arts": Palette,
    "Career Coaching": Briefcase,
    "Academic Support": GraduationCap,
    "Programming & Tech": Code,
    "Test Preparation": BookOpen,
    "Business & Finance": TrendingUp,
    "Leadership & Development": UsersIcon,
  };

  const getIconForCategory = (category: string) => {
    return categoryIcons[category] || Briefcase;
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  useEffect(() => {
    fetchSimilarMentors();
  }, [currentMentorId, categories]);

  const fetchSimilarMentors = async () => {
    try {
      setLoading(true);

      // Fetch mentors with matching categories
      const { data: mentorsData, error: mentorsError } = await supabase
        .from("expert_profiles")
        .select("id, full_name, username, profile_picture_url, categories, expertise_tags")
        .neq("id", currentMentorId)
        .limit(20);

      if (mentorsError) throw mentorsError;

      if (!mentorsData || mentorsData.length === 0) {
        setSimilarMentors([]);
        setLoading(false);
        return;
      }

      // Score mentors based on similarity
      const scoredMentors = mentorsData.map((mentor) => {
        let score = 0;
        
        // Score based on matching categories
        if (mentor.categories && categories) {
          const matchingCategories = mentor.categories.filter((cat: string) => 
            categories.includes(cat)
          );
          score += matchingCategories.length * 3;
        }

        // Score based on matching expertise tags
        if (mentor.expertise_tags && expertiseTags) {
          const matchingTags = mentor.expertise_tags.filter((tag: string) => 
            expertiseTags.includes(tag)
          );
          score += matchingTags.length;
        }

        return { ...mentor, score };
      });

      // Sort by score and take top 3
      const topMentors = scoredMentors
        .filter(m => m.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      // Fetch reviews for each mentor
      const mentorsWithRatings = await Promise.all(
        topMentors.map(async (mentor) => {
          const { data: reviews } = await supabase
            .from("reviews")
            .select("rating")
            .eq("expert_id", mentor.id);

          const reviewCount = reviews?.length || 0;
          const averageRating = reviewCount > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
            : 0;

          return {
            id: mentor.id,
            full_name: mentor.full_name,
            username: mentor.username,
            profile_picture_url: mentor.profile_picture_url,
            categories: mentor.categories || [],
            averageRating,
            reviewCount,
          };
        })
      );

      setSimilarMentors(mentorsWithRatings);
    } catch (error) {
      console.error("Error fetching similar mentors:", error);
      setSimilarMentors([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="shadow-none border-0 bg-gray-50 rounded-2xl">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-5 w-5 text-gray-600" />
            <h2 className="text-sm font-semibold text-gray-900">Similar Mentors</h2>
          </div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-3 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-gray-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-32" />
                    <div className="h-3 bg-gray-200 rounded w-24" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (similarMentors.length === 0) {
    return null;
  }

  return (
    <Card className="shadow-none border-0 bg-gray-50 rounded-2xl">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-5 w-5 text-gray-600" />
          <h2 className="text-sm font-semibold text-gray-900">Similar Mentors</h2>
        </div>

        <div className="space-y-2">
          {similarMentors.map((mentor) => (
            <Link
              key={mentor.id}
              to={`/mentor/${mentor.username}`}
              className="block bg-white rounded-lg border border-gray-200 p-3 hover:border-gray-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <Avatar className="h-11 w-11 border-2 border-gray-100 flex-shrink-0">
                  <AvatarImage
                    src={mentor.profile_picture_url}
                    alt={mentor.full_name}
                    className="object-cover"
                  />
                  <AvatarFallback className="text-sm bg-matepeak-primary text-white font-semibold">
                    {getInitials(mentor.full_name)}
                  </AvatarFallback>
                </Avatar>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Name and Rating */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900 text-sm truncate">
                      {mentor.full_name}
                    </h3>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Star
                        className={`h-3.5 w-3.5 ${
                          mentor.averageRating > 0
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                      <span className="text-xs font-medium text-gray-700">
                        {mentor.averageRating > 0 ? mentor.averageRating.toFixed(1) : "New"}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({mentor.reviewCount})
                      </span>
                    </div>
                  </div>

                  {/* Expertise badges without label */}
                  {mentor.categories && mentor.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {mentor.categories.slice(0, 2).map((category) => {
                        const IconComponent = getIconForCategory(category);
                        return (
                          <div
                            key={category}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-gray-300 bg-white text-gray-700 text-xs font-medium"
                          >
                            <IconComponent className="h-3 w-3" />
                            <span>{category}</span>
                          </div>
                        );
                      })}
                      {mentor.categories.length > 2 && (
                        <div className="inline-flex items-center px-2.5 py-1 rounded-lg border border-gray-300 bg-white text-gray-700 text-xs font-medium">
                          +{mentor.categories.length - 2}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
