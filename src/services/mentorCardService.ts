import { supabase } from "@/integrations/supabase/client";
import { SERVICE_CONFIG } from "@/config/serviceConfig";
import { normalizeServiceType } from "@/config/serviceConfig";
import { MentorProfile } from "@/components/MentorCard";

/**
 * Service to sync expert_profiles data with mentor cards
 * Transforms database profiles into MentorCard format
 */

export interface ExpertProfileData {
  id: string;
  full_name: string;
  username: string;
  average_rating?: number;
  total_reviews?: number;
  category?: string;
  categories?: string[];
  expertise_tags?: string[];
  bio?: string;
  profile_picture_url?: string;
  service_pricing?: any;
  services?: any;
  profiles?: {
    avatar_url?: string;
  };
  experience?: number;
  education?: Array<{
    institution?: string;
    degree?: string;
    field?: string;
    year?: number;
  }>;
  headline?: string;
  mentor_tier?: 'basic' | 'verified' | 'top';
  verification_status?: string;
  is_profile_live?: boolean;
  last_seen?: string | null;
}

/**
 * Generate a professional tagline based on mentor's credentials
 * Format: "Experience Level @ Institution | Field/Category"
 * Examples:
 * - "Senior @ IIT Delhi | Computer Science"
 * - "5+ years @ Google | Software Engineering"
 * - "Expert @ MIT | Data Science"
 */
function generateTagline(profile: ExpertProfileData): string {
  const parts: string[] = [];

  // Experience level
  if (profile.experience) {
    if (profile.experience >= 10) {
      parts.push("Senior");
    } else if (profile.experience >= 5) {
      parts.push(`${profile.experience}+ years`);
    } else if (profile.experience >= 2) {
      parts.push(`${profile.experience} years`);
    }
  }

  // Institution from education (use most recent/first entry)
  let institution = "";
  if (profile.education && profile.education.length > 0) {
    const latestEducation = profile.education[0];
    if (latestEducation.institution) {
      // Extract short form if it's a long name (e.g., "Indian Institute of Technology Delhi" -> "IIT Delhi")
      institution = latestEducation.institution;

      // Common abbreviations
      institution = institution
        .replace(/Indian Institute of Technology/gi, "IIT")
        .replace(/National Institute of Technology/gi, "NIT")
        .replace(/International Institute of Information Technology/gi, "IIIT")
        .replace(/Indian Institute of Management/gi, "IIM")
        .replace(/Massachusetts Institute of Technology/gi, "MIT")
        .replace(/University of California/gi, "UC")
        .replace(/Indian Institute of Science/gi, "IISc");
    }
  }

  // Field of study or main category
  let field = "";
  if (
    profile.education &&
    profile.education.length > 0 &&
    profile.education[0].field
  ) {
    field = profile.education[0].field;
  } else if (profile.categories && profile.categories.length > 0) {
    field = profile.categories[0];
  } else if (profile.category) {
    field = profile.category;
  }

  // Build tagline
  let tagline = "";

  if (parts.length > 0 && institution) {
    tagline = `${parts.join(" ")} @ ${institution}`;
  } else if (institution) {
    tagline = institution;
  } else if (parts.length > 0) {
    tagline = parts.join(" ");
  }

  if (field) {
    if (tagline) {
      tagline += ` | ${field}`;
    } else {
      tagline = field;
    }
  }

  return tagline;
}

/**
 * Transform expert profile data into MentorCard format
 */
export function transformToMentorCard(
  profile: ExpertProfileData
): MentorProfile {
  const isServiceEnabled = (enabled: unknown) =>
    enabled === true || enabled === "true" || enabled === 1 || enabled === "1";

  const toValidPrice = (value: unknown): number | null => {
    if (value === null || value === undefined || value === "") return null;
    const parsed = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) return null;
    return parsed;
  };

  // Calculate starting price as minimum effective price across enabled services.
  const getLowestPrice = () => {
    if (!profile.service_pricing || typeof profile.service_pricing !== "object") {
      return toValidPrice((profile as any).pricing) ?? 0;
    }

    const prices: number[] = [];

    Object.entries(profile.service_pricing).forEach(([, service]: [string, any]) => {
      if (!isServiceEnabled(service?.enabled)) {
        return;
      }

      const effectivePrice =
        toValidPrice(service?.discount_price) ?? toValidPrice(service?.price);

      if (effectivePrice !== null) {
        prices.push(effectivePrice);
      }
    });

    if (prices.length > 0) {
      return Math.min(...prices);
    }

    return toValidPrice((profile as any).pricing) ?? 0;
  };

  // Extract service names + type metadata from service_pricing
  const getConnectionOptionDetails = () => {
    const options: Array<{ name: string; serviceKey?: string; serviceType?: string }> = [];

    if (profile.service_pricing && typeof profile.service_pricing === 'object') {
      // Use service_pricing (new unified system)
      Object.entries(profile.service_pricing).forEach(([key, service]: [string, any]) => {
        if (service?.enabled) {
          const normalizedType = normalizeServiceType(key);
          const mentorDefinedName = typeof service?.name === "string" ? service.name.trim() : "";
          const fallbackName =
            (normalizedType && SERVICE_CONFIG[normalizedType]?.name) ||
            key;

          options.push({
            name: mentorDefinedName || fallbackName,
            serviceKey: key,
            serviceType: normalizedType || "custom",
          });
        }
      });
    } else if (profile.services) {
      // Fallback to old services system for backward compatibility
      if (profile.services.oneOnOneSession) {
        options.push({
          name: SERVICE_CONFIG.oneOnOneSession.name,
          serviceKey: "oneOnOneSession",
          serviceType: "oneOnOneSession",
        });
      }
      if (profile.services.priorityDm) {
        options.push({
          name: SERVICE_CONFIG.priorityDm.name,
          serviceKey: "priorityDm",
          serviceType: "priorityDm",
        });
      }
      if (profile.services.digitalProducts) {
        options.push({
          name: SERVICE_CONFIG.digitalProducts.name,
          serviceKey: "digitalProducts",
          serviceType: "digitalProducts",
        });
      }
    }

    return options.length > 0
      ? options
      : [{ name: SERVICE_CONFIG.oneOnOneSession.name, serviceKey: "oneOnOneSession", serviceType: "oneOnOneSession" }];
  };

  const connectionOptionDetails = getConnectionOptionDetails();

  // Use categories array or fallback to single category
  const categories =
    profile.categories && profile.categories.length > 0
      ? profile.categories
      : profile.category
      ? [profile.category]
      : [];

  return {
    id: profile.id,
    name: profile.full_name,
    title: profile.category || categories[0] || "Expert",
    image: profile.profile_picture_url || profile.profiles?.avatar_url || "",
    categories: categories,
    rating: Number(profile.average_rating || 0),
    reviewCount: Number(profile.total_reviews || 0),
    price: getLowestPrice(),
    bio: profile.bio || "",
    connectionOptions: connectionOptionDetails.map((option) => option.name),
    connectionOptionDetails,
    username: profile.username,
    expertise_tags: profile.expertise_tags || [],
    tagline: profile.headline || generateTagline(profile),
    mentor_tier: profile.mentor_tier || 'basic', // Include mentor tier for verified badge
    is_profile_live: !!profile.is_profile_live,
    last_seen: profile.last_seen || null,
  };
}

/**
 * Fetch active mentor profiles with server-side pagination and filtering
 */
export async function fetchMentorCards(
  filters?: {
    category?: string;
    expertise?: string;
    searchQuery?: string;
    priceRange?: [number, number];
    page?: number;
    limit?: number;
  },
  signal?: AbortSignal
): Promise<{
  data: MentorProfile[];
  total: number;
  hasMore: boolean;
  page: number;
}> {
  try {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20; // Default 20 mentors per page
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    console.log("🔍 Fetching mentors with filters:", {
      ...filters,
      page,
      limit,
      from,
      to,
    });

    // Check if request was aborted
    if (signal?.aborted) {
      throw new DOMException("Request aborted", "AbortError");
    }

    // Build query with server-side filtering for scalability
    let query = supabase
      .from("expert_profiles")
      .select("*", { count: "exact" })
      .abortSignal(signal as any);

    // Server-side search filtering (O(log n) with proper indexes)
    if (filters?.searchQuery) {
      const search = filters.searchQuery.trim();
      const searchLower = search.toLowerCase();

      // Split search query into words for better partial matching
      const searchWords = searchLower
        .split(/\s+/)
        .filter((word) => word.length > 0);

      if (searchWords.length > 0) {
        const searchPatterns: string[] = [];

        // Strategy: Use text search that will find the terms in any field
        // This uses PostgreSQL's text search which is more flexible

        // 1. Search for full phrase in all text fields
        searchPatterns.push(`full_name.ilike.%${search}%`);
        searchPatterns.push(`bio.ilike.%${search}%`);
        searchPatterns.push(`headline.ilike.%${search}%`);

        // 2. Search in category field (convert array to text for partial matching)
        // PostgreSQL will search if any category contains the search term
        searchPatterns.push(`category.ilike.%${search}%`);

        // 3. For multi-word searches, also search individual words in categories
        // This allows "Career Growth" to match categories containing "Career" or "Growth"
        if (searchWords.length > 1) {
          searchWords.forEach((word) => {
            if (word.length >= 3) {
              // Only meaningful words
              searchPatterns.push(`category.ilike.%${word}%`);
              searchPatterns.push(`bio.ilike.%${word}%`);
            }
          });
        }

        // Combine all patterns with OR
        const searchPattern = searchPatterns.join(",");
        query = query.or(searchPattern);
      }
    }

    // Server-side category filtering using GIN index on array
    if (filters?.category && filters.category !== "all-categories") {
      query = query.contains("categories", [filters.category]);
    }

    // Server-side expertise filtering using GIN index on array
    if (filters?.expertise && filters.expertise !== "all") {
      query = query.contains("expertise_tags", [filters.expertise]);
    }

    // Price range filtering - client-side for now (can be optimized with materialized view)
    // Note: We'll filter after transforming to get the lowest price
    // For production, consider adding a computed column for min_price

    // Apply pagination - critical for scalability
    query = query
      .range(from, to)
      .order("created_at", { ascending: false })
      .limit(limit);

    const { data, error, count } = await query;

    // Check if request was aborted during fetch
    if (signal?.aborted) {
      throw new DOMException("Request aborted", "AbortError");
    }

    if (error) {
      console.error("❌ Database query error:", error);
      
      // Provide user-friendly error messages
      if (error.message?.includes('timeout') || error.message?.includes('timed out')) {
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

    console.log(
      `📊 Found ${data?.length || 0} mentors (page ${page}, total: ${count})`
    );

    // Fetch profiles in batch for avatar_url - only for returned mentors
    const mentorIds = (data || []).map((m) => m.id);
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, avatar_url")
      .in("id", mentorIds)
      .abortSignal(signal as any);

    if (profilesError) {
      console.warn("⚠️ Could not fetch profile avatars (non-critical):", profilesError.message);
      // Continue without avatars - this is non-critical
    }

    // Create a map of profiles by id for O(1) lookup
    const profilesMap = new Map((profiles || []).map((p: any) => [p.id, p]));

    // Transform to MentorCard format
    const mentorCards = (data || [])
      .map((profile, index) => {
        try {
          // Attach profile avatar if exists
          const userProfile = profilesMap.get(profile.id);
          const profileWithAvatar = {
            ...profile,
            profiles: userProfile
              ? { avatar_url: userProfile.avatar_url }
              : null,
          };

          return transformToMentorCard(profileWithAvatar);
        } catch (err) {
          console.error(
            `⚠️ Error transforming mentor profile at index ${index}:`,
            err,
            profile
          );
          return null;
        }
      })
      .filter(Boolean) as MentorProfile[];

    // Client-side price filtering (server-side would require JSONB queries)
    let filteredCards = mentorCards;
    if (filters?.priceRange) {
      const [minPrice, maxPrice] = filters.priceRange;
      filteredCards = mentorCards.filter((card) => {
        const price = card.price || 0;
        return price >= minPrice && price <= maxPrice;
      });
      console.log(`✅ After price filtering: ${filteredCards.length} mentors`);
    }

    return {
      data: filteredCards,
      total: count || 0,
      hasMore: (count || 0) > to + 1,
      page,
    };
  } catch (error) {
    console.error("Error fetching mentor cards:", error);
    return {
      data: [],
      total: 0,
      hasMore: false,
      page: filters?.page || 1,
    };
  }
}

/**
 * Fetch single mentor card by username or ID
 */
export async function fetchMentorCardByUsername(
  username: string
): Promise<MentorProfile | null> {
  try {
    console.log("Fetching mentor card for username:", username);

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
      .eq("username", username)
      .single();

    if (error) {
      console.error("Supabase error fetching mentor card:", error);
      throw error;
    }

    if (!data) {
      console.warn("No data found for username:", username);
      return null;
    }

    console.log("Raw mentor data:", data);
    const card = transformToMentorCard(data);
    console.log("Transformed mentor card:", card);

    return card;
  } catch (error) {
    console.error("Error fetching mentor card:", error);
    return null;
  }
}

/**
 * Update mentor card rating when new reviews are added
 */
export async function updateMentorRating(mentorId: string): Promise<void> {
  try {
    // Fetch average rating and count from reviews
    const { data, error } = await supabase
      .from("reviews")
      .select("rating")
      .eq("expert_id", mentorId);

    if (error) throw error;

    if (data && data.length > 0) {
      const totalRating = data.reduce((sum, review) => sum + review.rating, 0);
      const averageRating = totalRating / data.length;

      await supabase
        .from("expert_profiles")
        .update({
          average_rating: Number(averageRating.toFixed(2)),
          total_reviews: data.length,
        })
        .eq("id", mentorId);

      console.log(
        `Mentor ${mentorId} rating updated: ${averageRating} (${data.length} reviews)`
      );
    } else {
      await supabase
        .from("expert_profiles")
        .update({
          average_rating: 0,
          total_reviews: 0,
        })
        .eq("id", mentorId);
    }
  } catch (error) {
    console.error("Error updating mentor rating:", error);
  }
}

/**
 * Validate mentor profile completeness for card display
 */
export function validateMentorProfile(profile: ExpertProfileData): {
  isComplete: boolean;
  missingFields: string[];
  warnings: string[];
} {
  const missingFields: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!profile.full_name) missingFields.push("Full Name");
  if (!profile.username) missingFields.push("Username");
  if (
    !profile.category &&
    (!profile.categories || profile.categories.length === 0)
  ) {
    missingFields.push("Category/Expertise");
  }

  // Recommended fields
  if (!profile.bio) warnings.push("Bio/Description");
  if (!profile.profile_picture_url && !profile.profiles?.avatar_url) {
    warnings.push("Profile Picture");
  }
  if (!profile.services || Object.keys(profile.services).length === 0) {
    warnings.push("Service Types");
  }
  if (
    !profile.service_pricing ||
    Object.keys(profile.service_pricing).length === 0
  ) {
    warnings.push("Pricing Information");
  }

  return {
    isComplete: missingFields.length === 0,
    missingFields,
    warnings,
  };
}

/**
 * Get mentor profile completeness score (0-100)
 */
export function getMentorProfileScore(profile: ExpertProfileData): number {
  let score = 0;
  const weights = {
    required: 60, // 60% for required fields
    recommended: 40, // 40% for recommended fields
  };

  // Required fields (15 points each = 60 total)
  if (profile.full_name) score += 15;
  if (profile.username) score += 15;
  if (profile.category || (profile.categories && profile.categories.length > 0))
    score += 15;
  if (profile.bio && profile.bio.length > 50) score += 15;

  // Recommended fields (10 points each = 40 total)
  if (profile.profile_picture_url || profile.profiles?.avatar_url) score += 10;
  if (profile.services && Object.keys(profile.services).length > 0) score += 10;
  if (
    profile.service_pricing &&
    Object.keys(profile.service_pricing).length > 0
  )
    score += 10;
  if (profile.expertise_tags && profile.expertise_tags.length > 0) score += 10;

  return Math.min(score, 100);
}
