import { useState, useEffect, useRef } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MentorCard from "@/components/MentorCard";
import { MentorProfile } from "@/components/MentorCard";
import { fetchMentorCards } from "@/services/mentorCardService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MentorFetchDebug } from "@/components/MentorFetchDebug";

// Add near the top of your JSX, before the mentor grid:
import {
  Loader2,
  Search,
  SlidersHorizontal,
  X,
  Users,
  Filter,
  TrendingUp,
  Clock,
  AlertCircle,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { showWarningToast } from "@/utils/toast-helpers";
import { Session } from "@supabase/supabase-js";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import SEO from "@/components/SEO";

const Explore = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const initialSearchQuery = queryParams.get("q") || "";
  const initialExpertise = queryParams.get("expertise") || "";
  const initialCategory = "all-categories"; // Categories now use the search query

  const [mentorCards, setMentorCards] = useState<MentorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(initialSearchQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedExpertise, setSelectedExpertise] = useState(initialExpertise);
  const [sortBy, setSortBy] = useState<
    "newest" | "rating" | "price-low" | "price-high" | "relevance"
  >("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState("all");
  const [minRating, setMinRating] = useState(0);

  // Production-ready search features
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeFetchIdRef = useRef(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const MIN_SEARCH_LENGTH = 2;
  const MAX_RETRY_ATTEMPTS = 3;

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalMentors, setTotalMentors] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const MENTORS_PER_PAGE = 20;

  // Available categories and expertise
  const categories = [
    "all-categories",
    "Recent Graduates",
    "Academic Support",
    "Mock Interviews",
    "Resume Review",
    "Career Guidance",
    "Programming",
    "Data Science",
    "Business",
    "Design",
    "Health",
  ];

  const expertiseOptions = [
    "all",
    "Computer Science",
    "Mathematics",
    "Physics",
    "Engineering",
    "Business Strategy",
    "Career Coaching",
    "Interview Prep",
    "Resume Writing",
  ];

  const languageOptions = [
    "all",
    "English",
    "Hindi",
    "Spanish",
    "French",
    "German",
    "Chinese",
    "Japanese",
    "Korean",
    "Arabic",
  ];

  const ratingOptions = [
    { label: "All Ratings", value: 0 },
    { label: "4+ Stars", value: 4 },
    { label: "4.5+ Stars", value: 4.5 },
    { label: "5 Stars", value: 5 },
  ];

  // Load search history from localStorage
  useEffect(() => {
    const history = localStorage.getItem("searchHistory");
    if (history) {
      try {
        setSearchHistory(JSON.parse(history));
      } catch (e) {
        console.error("Failed to parse search history", e);
      }
    }

    // Check authentication and load favorites
    const initAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);

      // Only load favorites if user is logged in
      if (session) {
        const savedFavorites = localStorage.getItem("favoriteMentors");
        if (savedFavorites) {
          try {
            setFavorites(JSON.parse(savedFavorites));
          } catch (e) {
            console.error("Failed to parse favorites", e);
          }
        }
      }
    };

    initAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);

      // Clear favorites if user logs out
      if (!session) {
        setShowFavoritesOnly(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Save search to history
  const saveToHistory = (query: string) => {
    if (!query.trim() || query.length < MIN_SEARCH_LENGTH) return;

    const updatedHistory = [
      query,
      ...searchHistory.filter((q) => q !== query),
    ].slice(0, 10); // Keep only last 10 searches

    setSearchHistory(updatedHistory);
    localStorage.setItem("searchHistory", JSON.stringify(updatedHistory));
  };

  // Fetch mentors from database on initial load and when filters change
  useEffect(() => {
    fetchDatabaseMentors();
  }, [selectedCategory, selectedExpertise]);

  // Update filters when URL params change (for navbar dropdown navigation)
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const urlExpertise = queryParams.get("expertise") || "all";
    const urlSearch = queryParams.get("q") || "";

    if (urlExpertise !== selectedExpertise) {
      setSelectedExpertise(urlExpertise);
    }
    if (urlSearch !== searchInput) {
      setSearchInput(urlSearch);
    }
  }, [location.search]);

  // Fetch autocomplete suggestions
  useEffect(() => {
    if (searchInput.length < MIN_SEARCH_LENGTH) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        const search = searchInput.toLowerCase().trim();
        const searchWords = search
          .split(/\s+/)
          .filter((word) => word.length > 0);

        // Fetch suggestions with fuzzy matching and partial word support
        const { data, error } = await supabase
          .from("mentor_profiles")
          .select("name, expertise, bio")
          .limit(10); // Get more results for better fuzzy matching

        if (error) throw error;

        const suggestionSet = new Set<string>();
        const scoredSuggestions: Array<{ text: string; score: number }> = [];

        data?.forEach((item) => {
          const fields = [
            item.name || "",
            item.expertise || "",
            item.bio || "",
          ].map((f) => f.toLowerCase());

          searchWords.forEach((word) => {
            fields.forEach((field) => {
              // Calculate match score for fuzzy matching
              let score = 0;

              // Exact match (highest priority)
              if (field === word) score = 100;
              // Starts with (high priority)
              else if (field.startsWith(word)) score = 80;
              // Contains (medium priority)
              else if (field.includes(word)) score = 60;
              // Fuzzy match - check if word is similar (typo tolerance)
              else {
                const similarity = calculateSimilarity(word, field);
                if (similarity > 0.7) score = 40; // 70% similarity threshold
              }

              if (score > 0) {
                // Add the full field value as suggestion
                const suggestion = item.name || item.expertise;
                if (suggestion && !suggestionSet.has(suggestion)) {
                  suggestionSet.add(suggestion);
                  scoredSuggestions.push({ text: suggestion, score });
                }
              }
            });
          });
        });

        // Sort by score and take top 5
        const topSuggestions = scoredSuggestions
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)
          .map((s) => s.text);

        setSuggestions(topSuggestions);
        setShowSuggestions(true);
      } catch (err) {
        console.error("Error fetching suggestions:", err);
      }
    }, 300); // Faster for autocomplete

    return () => clearTimeout(timeoutId);
  }, [searchInput]);

  // Calculate string similarity for fuzzy matching (Levenshtein-based)
  const calculateSimilarity = (str1: string, str2: string): number => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    // Check if shorter is substring of longer
    if (longer.includes(shorter)) return 0.8;

    // Simple edit distance calculation
    const editDistance = levenshteinDistance(str1, str2);
    return (longer.length - editDistance) / longer.length;
  };

  // Levenshtein distance for typo tolerance
  const levenshteinDistance = (str1: string, str2: string): number => {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  };

  // Real-time search with debouncing and request cancellation
  useEffect(() => {
    if (!searchInput || searchInput.length < MIN_SEARCH_LENGTH) {
      if (searchInput.length === 0) {
        fetchDatabaseMentors();
      }
      return;
    }

    const timeoutId = setTimeout(() => {
      if (searchInput !== initialSearchQuery) {
        fetchDatabaseMentors();
        saveToHistory(searchInput);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchInput]);

  // Helper function to check if mentor is a recent graduate
  const isRecentGraduate = (mentor: any) => {
    const education = mentor.education;
    if (!education || education.length === 0) {
      return false;
    }

    const currentYear = new Date().getFullYear();

    // Check each education entry
    return education.some((edu: any) => {
      // Recent graduate if graduated within last 2 years OR currently studying
      if (edu.currentlyStudying) return true;

      const yearTo = edu.yearTo || edu.year;
      if (yearTo) {
        return yearTo >= currentYear - 2;
      }

      return false;
    });
  };

  const fetchDatabaseMentors = async (
    page = 1,
    append = false,
    retry = 0,
    searchQueryOverride?: string
  ) => {
    const fetchId = ++activeFetchIdRef.current;
    const effectiveSearchQuery = searchQueryOverride ?? searchInput;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setCurrentPage(1);
    }

    setError(null);

    try {
      console.log("🔎 Explore page fetching with:", {
        category: selectedCategory,
        expertise: selectedExpertise,
        searchQuery: effectiveSearchQuery,
        page,
        limit: MENTORS_PER_PAGE,
      });

      // Special handling for "Recent Graduates" - it's a computed category
      const isRecentGraduatesSearch =
        effectiveSearchQuery?.toLowerCase().trim() === "recent graduates";

      const result = await fetchMentorCards(
        {
          category:
            selectedCategory !== "all-categories"
              ? selectedCategory
              : undefined,
          expertise:
            selectedExpertise !== "all" ? selectedExpertise : undefined,
          // Don't pass searchQuery if it's "Recent Graduates" - we'll filter client-side
          searchQuery: isRecentGraduatesSearch
            ? undefined
            : effectiveSearchQuery || undefined,
          priceRange: priceRange,
          page,
          limit: MENTORS_PER_PAGE,
        },
        abortControllerRef.current.signal
      );

      console.log(
        "📋 Explore page received:",
        result.data.length,
        "mentor cards (page",
        page,
        "of",
        Math.ceil(result.total / MENTORS_PER_PAGE),
        ")"
      );

      let filteredData = result.data;

      // Apply client-side filtering for "Recent Graduates"
      if (isRecentGraduatesSearch) {
        console.log("🎓 Filtering for Recent Graduates...");
        filteredData = result.data.filter((mentor: any) => {
          const isRecent = isRecentGraduate(mentor);
          return isRecent;
        });
        console.log(
          `📊 Found ${filteredData.length} recent graduates out of ${result.data.length} mentors`
        );
      }

      if (fetchId !== activeFetchIdRef.current) {
        return;
      }

      if (append) {
        setMentorCards((prev) => [...prev, ...filteredData]);
      } else {
        setMentorCards(filteredData);
      }

      // Update total count for Recent Graduates filter
      setTotalMentors(
        isRecentGraduatesSearch ? filteredData.length : result.total
      );
      setHasMore(isRecentGraduatesSearch ? false : result.hasMore); // No pagination for filtered results
      setCurrentPage(page);
      setRetryCount(0);
    } catch (error: any) {
      // Don't show error for aborted requests
      if (error.name === "AbortError") {
        console.log("Request aborted");
        return;
      }

      if (fetchId !== activeFetchIdRef.current) {
        return;
      }

      console.error("❌ Error fetching mentors in Explore page:", error);

      // Retry logic
      if (retry < MAX_RETRY_ATTEMPTS) {
        console.log(`🔄 Retrying... (${retry + 1}/${MAX_RETRY_ATTEMPTS})`);
        setRetryCount(retry + 1);
        setTimeout(() => {
          fetchDatabaseMentors(page, append, retry + 1, searchQueryOverride);
        }, 1000 * (retry + 1)); // Exponential backoff
      } else {
        setError(
          new Error("Failed to load mentors. Please check your connection and try again.")
        );
      }
    } finally {
      if (fetchId === activeFetchIdRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  };

  // Load more mentors (infinite scroll or "Load More" button)
  const loadMoreMentors = () => {
    if (!loadingMore && hasMore) {
      fetchDatabaseMentors(currentPage + 1, true);
    }
  };

  // Handle search
  const handleSearch = () => {
    if (searchInput.length > 0 && searchInput.length < MIN_SEARCH_LENGTH) {
      setError(
        new Error(`Please enter at least ${MIN_SEARCH_LENGTH} characters to search`)
      );
      return;
    }

    fetchDatabaseMentors(1, false, 0, searchInput);
    saveToHistory(searchInput);
    setShowSuggestions(false);

    // Update URL
    const params = new URLSearchParams();
    if (searchInput) params.set("q", searchInput);
    if (selectedCategory !== "all-categories")
      params.set("category", selectedCategory);
    if (selectedExpertise !== "all") params.set("expertise", selectedExpertise);
    navigate(`/explore?${params.toString()}`, { replace: true });
  };

  const searchWithQuery = (query: string) => {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) return;

    setSearchInput(normalizedQuery);
    setSelectedCategory("all-categories");
    setShowSuggestions(false);
    saveToHistory(normalizedQuery);
    fetchDatabaseMentors(1, false, 0, normalizedQuery);

    const params = new URLSearchParams();
    params.set("q", normalizedQuery);
    if (selectedExpertise !== "all") params.set("expertise", selectedExpertise);
    navigate(`/explore?${params.toString()}`, { replace: true });
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    searchWithQuery(suggestion);
  };

  // Clear search history
  const clearSearchHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem("searchHistory");
  };

  // Handle clear filters
  const handleClearFilters = () => {
    setSearchInput("");
    setSelectedCategory("all-categories");
    setSelectedExpertise("all");
    setSortBy("newest");
    setPriceRange([0, 10000]);
    setShowFavoritesOnly(false);
    setSelectedLanguage("all");
    setMinRating(0);
    navigate("/explore", { replace: true });
    fetchDatabaseMentors();
  };

  // Toggle favorite - only for logged-in users
  const toggleFavorite = (mentorId: string) => {
    // Check if user is logged in
    if (!session) {
      showWarningToast("Sign in required", {
        description: "Please sign in to save mentors to your favorites",
        action: {
          label: "Sign In",
          onClick: () => navigate("/student/login"),
        },
      });
      return;
    }

    const newFavorites = favorites.includes(mentorId)
      ? favorites.filter((id) => id !== mentorId)
      : [...favorites, mentorId];

    setFavorites(newFavorites);
    localStorage.setItem("favoriteMentors", JSON.stringify(newFavorites));
  };

  // Calculate relevance score for sorting
  const calculateRelevance = (mentor: MentorProfile): number => {
    if (!searchInput) return 0;

    const searchLower = searchInput.toLowerCase();
    let score = 0;

    // Name match (highest weight)
    if (mentor.name.toLowerCase().includes(searchLower)) score += 100;

    // Category exact match
    if (mentor.categories.some((cat) => cat.toLowerCase() === searchLower))
      score += 80;

    // Category partial match
    if (
      mentor.categories.some((cat) => cat.toLowerCase().includes(searchLower))
    )
      score += 50;

    // Bio match
    if (mentor.bio.toLowerCase().includes(searchLower)) score += 30;

    // Headline/tagline match
    if (mentor.tagline?.toLowerCase().includes(searchLower)) score += 40;

    return score;
  };

  // Sort mentors with relevance support
  const sortedMentors = [...mentorCards]
    .filter((mentor) =>
      showFavoritesOnly ? favorites.includes(mentor.id) : true
    )
    .filter((mentor) => {
      // Filter by minimum rating - only filter mentors who actually have ratings
      // Mentors without ratings (rating = 0 or no reviews) should still be shown
      if (minRating > 0 && mentor.rating > 0 && mentor.rating < minRating) {
        return false;
      }
      return true;
    })
    .filter((mentor) => {
      // Filter by language
      if (selectedLanguage !== "all") {
        // Check if mentor has languages data (assuming it's in mentor object)
        // This might need adjustment based on actual data structure
        const mentorLanguages = (mentor as any).languages;
        if (!mentorLanguages) return false;

        // If languages is an array of objects with language property
        if (Array.isArray(mentorLanguages)) {
          return mentorLanguages.some(
            (lang: any) => lang.language === selectedLanguage
          );
        }
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "relevance":
          return calculateRelevance(b) - calculateRelevance(a);
        case "rating":
          return b.rating - a.rating;
        case "price-low":
          return a.price - b.price;
        case "price-high":
          return b.price - a.price;
        case "newest":
        default:
          return 0;
      }
    });

  const hasActiveFilters =
    selectedCategory !== "all-categories" ||
    selectedExpertise !== "all" ||
    searchInput !== "" ||
    priceRange[0] !== 0 ||
    priceRange[1] !== 10000 ||
    showFavoritesOnly ||
    selectedLanguage !== "all" ||
    minRating > 0;

  // Render component
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <SEO
        title="Explore Mentors | MatePeak"
        description="Browse verified mentors by expertise, category, language, and ratings. Discover the right 1-on-1 mentor for your goals on MatePeak."
        canonicalPath="/explore"
      />
      <Navbar />

      <main className="flex-grow">
        {/* Clean Search Section with MatePeak Touch */}
        <div className="bg-white pt-8 pb-6 border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-4">
            {/* Clean Search Bar with Autocomplete and History */}
            <div className="mb-4 max-w-4xl">
              <div className="relative">
                <div className="flex items-center gap-2.5 px-3.5 py-1.5 border border-gray-200 bg-white rounded-full">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0 h-9 sm:h-10">
                    <Search className="h-4.5 w-4.5 text-gray-400 flex-shrink-0" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search by name, expertise, skills, or institution..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      onFocus={() => {
                        setIsSearchActive(true);
                        if (
                          searchInput.length >= MIN_SEARCH_LENGTH ||
                          searchHistory.length > 0
                        ) {
                          setShowSuggestions(true);
                        }
                      }}
                      onBlur={() =>
                        setTimeout(() => {
                          setShowSuggestions(false);
                          setIsSearchActive(false);
                        }, 200)
                      }
                      className="explore-search-input w-full h-full bg-transparent border-0 outline-none ring-0 focus:outline-none focus:ring-0 text-gray-900 font-poppins text-sm sm:text-base placeholder:text-gray-500"
                    />
                  </div>

                  {(isSearchActive || searchInput.trim().length > 0) && (
                    <>
                      <button
                        onClick={() => {
                          setSearchInput("");
                          setSuggestions([]);
                          setShowSuggestions(false);
                          fetchDatabaseMentors();
                        }}
                        className="h-9 w-9 sm:h-10 sm:w-10 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors flex-shrink-0"
                        aria-label="Clear search"
                      >
                        <X className="h-5 w-5" />
                      </button>

                      <div className="h-8 w-px bg-gray-200" />
                    </>
                  )}

                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="h-9 w-9 sm:h-10 sm:w-10 rounded-md flex items-center justify-center text-gray-500 hover:text-matepeak-primary hover:bg-gray-50 transition-colors flex-shrink-0"
                    aria-label="Open filters"
                  >
                    <SlidersHorizontal className="h-4.5 w-4.5" />
                  </button>
                </div>

                {/* Autocomplete Dropdown */}
                {showSuggestions &&
                  (searchInput.length >= MIN_SEARCH_LENGTH ||
                    searchHistory.length > 0) && (
                    <div className="absolute top-full mt-2 w-full bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden">
                      {/* Search Suggestions */}
                      {suggestions.length > 0 && (
                        <div className="py-2">
                          <div className="px-4 py-2 text-xs font-medium text-gray-500 font-poppins">
                            Suggestions
                          </div>
                          {suggestions.map((suggestion, index) => (
                            <button
                              key={index}
                              onClick={() => handleSuggestionClick(suggestion)}
                              className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 font-poppins"
                            >
                              <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
                              <span className="text-sm text-gray-700">
                                {suggestion}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Search History */}
                      {searchHistory.length > 0 &&
                        searchInput.length < MIN_SEARCH_LENGTH && (
                          <div className="py-2 border-t border-gray-100">
                            <div className="px-4 py-2 text-xs font-medium text-gray-500 font-poppins flex items-center justify-between">
                              <span>Recent searches</span>
                              <button
                                onClick={clearSearchHistory}
                                className="text-blue-600 hover:text-blue-700 text-xs"
                              >
                                Clear
                              </button>
                            </div>
                            {searchHistory.slice(0, 5).map((item, index) => (
                              <button
                                key={index}
                                onClick={() => handleSuggestionClick(item)}
                                className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 font-poppins"
                              >
                                <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                <span className="text-sm text-gray-700">
                                  {item}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                    </div>
                  )}

                {/* Filters Dropdown */}
                {showFilters && (
                  <>
                    {/* Backdrop to close dropdown */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowFilters(false)}
                    />

                    {/* Dropdown Content */}
                    <div className="absolute top-full mt-2 right-0 w-[min(420px,calc(100vw-2rem))] bg-white rounded-xl border border-gray-200 shadow-xl z-50 p-5 max-md:fixed max-md:left-4 max-md:right-4 max-md:top-auto max-md:bottom-4 max-md:mt-0 max-md:w-auto max-md:max-h-[75vh] max-md:overflow-y-auto">
                      <div className="space-y-4">
                        {/* Category Filter */}
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block font-poppins">
                            Category
                          </label>
                          <Select
                            value={selectedCategory}
                            onValueChange={setSelectedCategory}
                          >
                            <SelectTrigger className="font-poppins">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((cat) => (
                                <SelectItem
                                  key={cat}
                                  value={cat}
                                  className="font-poppins"
                                >
                                  {cat === "all-categories"
                                    ? "All Categories"
                                    : cat}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Expertise Filter */}
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block font-poppins">
                            Expertise
                          </label>
                          <Select
                            value={selectedExpertise}
                            onValueChange={setSelectedExpertise}
                          >
                            <SelectTrigger className="font-poppins">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {expertiseOptions.map((exp) => (
                                <SelectItem
                                  key={exp}
                                  value={exp}
                                  className="font-poppins"
                                >
                                  {exp === "all" ? "All Expertise" : exp}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Sort Filter */}
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block font-poppins">
                            Sort by
                          </label>
                          <Select
                            value={sortBy}
                            onValueChange={(value: any) => setSortBy(value)}
                          >
                            <SelectTrigger className="font-poppins">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {searchInput && (
                                <SelectItem
                                  value="relevance"
                                  className="font-poppins"
                                >
                                  Most Relevant
                                </SelectItem>
                              )}
                              <SelectItem
                                value="newest"
                                className="font-poppins"
                              >
                                Newest First
                              </SelectItem>
                              <SelectItem
                                value="rating"
                                className="font-poppins"
                              >
                                Highest Rated
                              </SelectItem>
                              <SelectItem
                                value="price-low"
                                className="font-poppins"
                              >
                                Price: Low to High
                              </SelectItem>
                              <SelectItem
                                value="price-high"
                                className="font-poppins"
                              >
                                Price: High to Low
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Price Range Filter */}
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block font-poppins">
                            Price Range (₹/session)
                          </label>
                          <div className="space-y-3">
                            <div className="flex gap-3 items-center">
                              <Input
                                type="number"
                                placeholder="Min"
                                value={priceRange[0]}
                                onChange={(e) =>
                                  setPriceRange([
                                    Number(e.target.value),
                                    priceRange[1],
                                  ])
                                }
                                className="font-poppins"
                                min={0}
                              />
                              <span className="text-gray-500">to</span>
                              <Input
                                type="number"
                                placeholder="Max"
                                value={priceRange[1]}
                                onChange={(e) =>
                                  setPriceRange([
                                    priceRange[0],
                                    Number(e.target.value),
                                  ])
                                }
                                className="font-poppins"
                                min={0}
                              />
                            </div>
                            <p className="text-xs text-gray-500 font-poppins">
                              ₹{priceRange[0]} - ₹{priceRange[1]}
                            </p>
                          </div>
                        </div>

                        {/* Language Filter */}
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block font-poppins">
                            Language
                          </label>
                          <Select
                            value={selectedLanguage}
                            onValueChange={setSelectedLanguage}
                          >
                            <SelectTrigger className="font-poppins">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {languageOptions.map((lang) => (
                                <SelectItem
                                  key={lang}
                                  value={lang}
                                  className="font-poppins"
                                >
                                  {lang === "all" ? "All Languages" : lang}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Rating Filter */}
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block font-poppins">
                            Minimum Rating
                          </label>
                          <Select
                            value={minRating.toString()}
                            onValueChange={(value) =>
                              setMinRating(Number(value))
                            }
                          >
                            <SelectTrigger className="font-poppins">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ratingOptions.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value.toString()}
                                  className="font-poppins"
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Favorites Toggle - Only for logged-in users */}
                        {session && (
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-700 font-poppins">
                              Show Favorites Only
                            </label>
                            <button
                              onClick={() =>
                                setShowFavoritesOnly(!showFavoritesOnly)
                              }
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                showFavoritesOnly
                                  ? "bg-matepeak-primary"
                                  : "bg-gray-200"
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  showFavoritesOnly
                                    ? "translate-x-6"
                                    : "translate-x-1"
                                }`}
                              />
                            </button>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-3 border-t border-gray-100">
                          {hasActiveFilters && (
                            <Button
                              onClick={() => {
                                handleClearFilters();
                                setShowFilters(false);
                              }}
                              variant="ghost"
                              size="sm"
                              className="text-gray-600 hover:text-gray-900 font-poppins flex-1"
                            >
                              Clear all
                            </Button>
                          )}
                          <Button
                            onClick={() => {
                              handleSearch();
                              setShowFilters(false);
                            }}
                            className="bg-matepeak-primary hover:bg-matepeak-secondary text-white font-poppins flex-1"
                            size="sm"
                          >
                            Apply
                          </Button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="mt-3">
                  <ConnectionStatus 
                    error={error} 
                    onRetry={() => fetchDatabaseMentors()} 
                    isRetrying={loading}
                  />
                </div>
              )}

              {/* Search Tips */}
              {searchInput.length > 0 &&
                searchInput.length < MIN_SEARCH_LENGTH && (
                  <div className="mt-2 text-sm text-gray-500 font-poppins">
                    Enter at least {MIN_SEARCH_LENGTH} characters to search
                  </div>
                )}
            </div>

            {/* Clean Category Pills */}
            <div className="w-full overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex w-full items-center gap-1.5 sm:gap-2.5 flex-nowrap pr-1">
                <span className="text-[11px] sm:text-sm font-bold text-gray-900 font-poppins whitespace-nowrap leading-none">
                  Try:
                </span>
                <div className="flex items-center gap-1 sm:gap-2 flex-nowrap">
                  {[
                    "Career Growth",
                    "Mental Health",
                    "Interview Prep",
                    "Academic Success",
                  ].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => searchWithQuery(cat)}
                      className={`h-6 sm:h-8 inline-flex items-center justify-center text-[10px] sm:text-sm px-2 sm:px-3.5 rounded-full bg-white border transition-all font-poppins whitespace-nowrap leading-none ${
                        searchInput === cat
                          ? "border-matepeak-primary bg-matepeak-primary/5 text-matepeak-primary"
                          : "border-gray-200 text-gray-700 hover:border-matepeak-primary hover:text-matepeak-primary"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="max-w-6xl mx-auto px-4 py-10">
          {/* Results */}
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-matepeak-primary/10">
                  <Search className="h-4 w-4 text-matepeak-primary" />
                </div>
                <div className="mx-auto mb-4 flex items-center justify-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-matepeak-primary/50 animate-pulse [animation-delay:-300ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-matepeak-primary/70 animate-pulse [animation-delay:-150ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-matepeak-primary animate-pulse" />
                </div>
                <p className="text-gray-600 font-poppins">Finding mentors...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Results Count */}
              {sortedMentors.length > 0 && (
                <div className="mb-6">
                  <p className="text-sm text-gray-600 font-poppins">
                    About {totalMentors.toLocaleString()} results
                  </p>
                </div>
              )}

              {/* Mentor Grid */}
              {sortedMentors.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                    {sortedMentors.map((mentor) => (
                      <MentorCard
                        key={mentor.id}
                        mentor={mentor}
                        isFavorite={favorites.includes(mentor.id)}
                        onToggleFavorite={toggleFavorite}
                      />
                    ))}
                  </div>

                  {/* Load More Button */}
                  {hasMore && (
                    <div className="flex justify-center mb-12">
                      <Button
                        onClick={loadMoreMentors}
                        disabled={loadingMore}
                        className="bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 shadow-sm font-poppins px-8"
                        variant="outline"
                      >
                        {loadingMore ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          "Show more results"
                        )}
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-20">
                  <Search className="h-16 w-16 text-gray-300 mx-auto mb-6" />
                  <h3 className="text-xl font-medium text-gray-900 mb-2 font-poppins">
                    {showFavoritesOnly
                      ? "No favorites yet"
                      : "No results found"}
                  </h3>
                  <p className="text-gray-600 font-poppins text-sm mb-6">
                    {showFavoritesOnly ? (
                      "Start adding mentors to your favorites by clicking the heart icon on their cards."
                    ) : searchInput ? (
                      <>
                        Your search for{" "}
                        <span className="font-semibold">"{searchInput}"</span>{" "}
                        did not match any mentors.
                      </>
                    ) : (
                      "Try different keywords or adjust your filters."
                    )}
                  </p>

                  {/* Helpful suggestions */}
                  {searchInput && !showFavoritesOnly && (
                    <div className="max-w-md mx-auto mb-6">
                      <p className="text-sm font-medium text-gray-700 mb-3 font-poppins">
                        Try these suggestions:
                      </p>
                      <ul className="text-sm text-gray-600 space-y-2 text-left">
                        <li className="flex items-start gap-2">
                          <span className="text-matepeak-primary mt-0.5">
                            •
                          </span>
                          <span>
                            Check your spelling or try different keywords
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-matepeak-primary mt-0.5">
                            •
                          </span>
                          <span>
                            Use more general terms (e.g., "Career" instead of
                            "Career Coaching")
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-matepeak-primary mt-0.5">
                            •
                          </span>
                          <span>Try browsing popular categories below</span>
                        </li>
                      </ul>

                      {/* Popular suggestions */}
                      <div className="mt-6 flex flex-wrap gap-2 justify-center">
                        <p className="text-xs text-gray-500 w-full mb-2">
                          Popular searches:
                        </p>
                        {[
                          "Career Guidance",
                          "Interview Prep",
                          "Mental Health",
                          "Programming",
                        ].map((term) => (
                          <button
                            key={term}
                            onClick={() => {
                              setSearchInput(term);
                              navigate(
                                `/explore?q=${encodeURIComponent(term)}`
                              );
                            }}
                            className="px-3 py-1.5 text-sm rounded-full bg-gray-100 hover:bg-matepeak-primary hover:text-white transition-all font-poppins"
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {hasActiveFilters && !showFavoritesOnly && (
                    <Button
                      onClick={handleClearFilters}
                      className="bg-matepeak-primary hover:bg-matepeak-secondary text-white font-poppins"
                    >
                      Clear all filters
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Explore;
