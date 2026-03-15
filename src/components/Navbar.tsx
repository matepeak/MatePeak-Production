import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Link, useNavigate } from "react-router-dom";
import {
  Menu,
  X,
  LogOut,
  ChevronDown,
  LayoutDashboard,
  User,
  Search,
  FileEdit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import RoleSelectionModal from "./RoleSelectionModal";
import SignInRoleSelection from "./SignInRoleSelection";
import FeedbackModal from "./FeedbackModal";
import { toast } from "sonner";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [userRole, setUserRole] = useState<"student" | "mentor" | null>(null);
  const [isExploreDropdownOpen, setIsExploreDropdownOpen] = useState(false);
  const [onboardingDraft, setOnboardingDraft] = useState<{ phase: number; step: number; timestamp: number } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const role = session.user.user_metadata?.role as "student" | "mentor";
        setUserRole(role);
        fetchProfile(session.user.id, role);
        checkForOnboardingDraft(role);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const role = session.user.user_metadata?.role as "student" | "mentor";
        setUserRole(role);
        fetchProfile(session.user.id, role);
        checkForOnboardingDraft(role);
      } else {
        setProfile(null);
        setUserRole(null);
        setOnboardingDraft(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Debug effect - log state changes
  useEffect(() => {
    console.log("=== Navbar State Update ===");
    console.log("userRole:", userRole);
    console.log("profile:", profile);
    console.log("user:", user);
    console.log("========================");
  }, [userRole, profile, user]);

  const checkForOnboardingDraft = async (role: "student" | "mentor") => {
    if (role !== "mentor") {
      setOnboardingDraft(null);
      return;
    }

    try {
      // Get user's phase completion status from database
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setOnboardingDraft(null);
        return;
      }

      const { data: profileData } = await supabase
        .from('expert_profiles')
        .select('phase_1_complete, phase_2_complete')
        .eq('id', user.id)
        .maybeSingle();

      const phase1Complete = profileData?.phase_1_complete || false;
      const phase2Complete = profileData?.phase_2_complete || false;

      // Check for Phase 2 draft first if Phase 1 is complete
      const phase2Draft = localStorage.getItem('mentor-onboarding-phase2-draft');
      if (phase2Draft && phase1Complete && !phase2Complete) {
        try {
          const { step, timestamp, data } = JSON.parse(phase2Draft);
          // Show if user actually has any progress in Phase 2
          const hasPhase2Progress = step > 1 || 
            // Check if user filled any Phase 2 specific fields
            (data?.introduction || data?.teachingCertifications || 
             data?.education || data?.headline);
             
          if (hasPhase2Progress) {
            setOnboardingDraft({ phase: 2, step: step || 1, timestamp: timestamp || Date.now() });
            // Clean up old Phase 1 draft since Phase 1 is complete
            localStorage.removeItem('mentor-onboarding-phase1-draft');
            return;
          } else {
            // Clean up draft without progress
            localStorage.removeItem('mentor-onboarding-phase2-draft');
          }
        } catch (error) {
          console.error('Failed to parse phase 2 draft:', error);
          localStorage.removeItem('mentor-onboarding-phase2-draft');
        }
      }

      // Check for Phase 1 draft - only if Phase 1 is not complete
      if (!phase1Complete) {
        const phase1Draft = localStorage.getItem('mentor-onboarding-phase1-draft');
        if (phase1Draft) {
          try {
            const { step, timestamp, data } = JSON.parse(phase1Draft);
            // Only consider it a valid draft if step > 1 or has meaningful data
            const hasProgress = step > 1 || 
                               (data?.firstName && data?.lastName && data?.username && data?.category);
            if (hasProgress) {
              setOnboardingDraft({ phase: 1, step: step || 1, timestamp: timestamp || Date.now() });
              return;
            } else {
              // Clean up empty draft
              localStorage.removeItem('mentor-onboarding-phase1-draft');
            }
          } catch (error) {
            console.error('Failed to parse phase 1 draft:', error);
            localStorage.removeItem('mentor-onboarding-phase1-draft');
          }
        }
      } else {
        // Phase 1 is complete, clean up any Phase 1 drafts
        localStorage.removeItem('mentor-onboarding-phase1-draft');
      }

      setOnboardingDraft(null);
    } catch (error) {
      console.error('Error checking onboarding draft:', error);
      setOnboardingDraft(null);
    }
  };

  const fetchProfile = async (userId: string, role: "student" | "mentor") => {
    if (role === "mentor") {
      // Get expert profile - username presence indicates completed onboarding
      const { data: expertData, error } = await supabase
        .from("expert_profiles")
        .select("username, full_name, profile_picture_url, id")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Navbar - Error fetching expert profile:", error);
        return;
      }

      if (expertData) {
        console.log("Navbar - Fetched expert profile:", expertData);
        console.log("Navbar - username value:", expertData.username);
        // Get avatar from profiles table as fallback
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", userId)
          .single();
        const profileData = {
          username: expertData.username,
          full_name: expertData.full_name,
          avatar_url:
            expertData.profile_picture_url || profilesData?.avatar_url || null,
          type: "mentor" as const,
          // If username exists, onboarding is complete
          onboarding_complete: !!expertData.username,
        };
        console.log("Navbar - Setting profile state:", profileData);
        setProfile(profileData);
      } else {
        console.log("Navbar - No expert profile data found");
      }
    } else {
      // Get regular profile for student
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", userId)
        .maybeSingle();

      if (profileData) {
        setProfile({ ...profileData, type: "student" });
      }
    }
  };

  const handleGetStartedClick = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      // Check user role from profiles table
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (profile?.role === "mentor") {
        // Fetch username from expert_profiles for mentors
        const { data: expertProfile } = await supabase
          .from("expert_profiles")
          .select("username")
          .eq("id", session.user.id)
          .single();

        if (expertProfile?.username) {
          navigate(`/dashboard/${expertProfile.username}`);
        } else {
          navigate("/expert/dashboard"); // Fallback to old route
        }
      } else {
        navigate("/student/dashboard");
      }
    } else {
      setIsRoleModalOpen(true);
    }
  };

  const handleSignInClick = () => {
    setIsSignInModalOpen(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/");
  };

  const handleViewProfile = () => {
    if (userRole === "mentor" && profile?.username) {
      navigate(`/mentor/${profile.username}`);
    }
  };

  const handleDashboardClick = () => {
    console.log("Dashboard clicked - userRole:", userRole, "profile:", profile);
    if (userRole === "mentor" && profile?.username) {
      console.log("Navigating to:", `/dashboard/${profile.username}`);
      navigate(`/dashboard/${profile.username}`);
    } else if (userRole === "mentor") {
      // Fallback if username not loaded yet
      console.log("Fallback: Navigating to /expert/dashboard");
      navigate("/expert/dashboard");
    } else if (userRole === "student") {
      navigate("/dashboard");
    } else {
      // Fallback: try to determine from profile type
      if (profile?.type === "mentor" && profile?.username) {
        console.log(
          "Using profile type, navigating to:",
          `/dashboard/${profile.username}`
        );
        navigate(`/dashboard/${profile.username}`);
      } else if (profile?.type === "mentor") {
        navigate("/expert/dashboard");
      } else {
        navigate("/dashboard");
      }
    }
  };

  const handleResumeOnboarding = () => {
    if (!onboardingDraft) return;
    
    if (onboardingDraft.phase === 1) {
      navigate('/expert/onboarding');
      toast.info("Resuming your onboarding from where you left off...");
    } else if (onboardingDraft.phase === 2) {
      navigate('/expert/onboarding/phase2');
      toast.info("Resuming your onboarding from where you left off...");
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);

    navigate(`/explore?${params.toString()}`);
  };

  const handleBrowseAllMentors = () => {
    navigate("/mentors");
  };

  const handleBrowseCategories = () => {
    navigate("/explore");
  };

  const handleBrowseAdvice = () => {
    // Navigate to advice/articles section (you can create this page or redirect to a specific section)
    navigate("/explore?tab=advice");
  };

  const getInitials = (name: string) => {
    return name?.charAt(0)?.toUpperCase() || "U";
  };

  const getDisplayName = () => {
    if (profile?.full_name) {
      return profile.full_name;
    }
    // Fallback to role-based display
    if (userRole === "mentor") {
      return "Mentor";
    } else if (userRole === "student") {
      return "Student";
    }
    return "User";
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-matepeak-primary",
      "bg-matepeak-secondary",
      "bg-gradient-to-br from-matepeak-primary to-matepeak-secondary",
      "bg-gradient-to-br from-orange-500 to-red-500",
      "bg-gradient-to-br from-purple-500 to-pink-500",
      "bg-gradient-to-br from-teal-500 to-green-500",
    ];
    const index = (name?.charCodeAt(0) || 0) % colors.length;
    return colors[index];
  };

  const location = useLocation();
  const isMainPage = location.pathname === "/";
  return (
    <>
      <nav
        className={`${
          isMainPage ? "sticky top-0 z-50" : "relative"
        } border-b border-gray-100 bg-white pt-4 pb-4`}
      >
        <div className="container mx-auto px-6 sm:px-8 lg:px-12">
          <div className="flex items-center gap-4">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center gap-2 transition-transform duration-300 hover:scale-105"
            >
              <img
                src="/lovable-uploads/14bf0eea-1bc9-4675-9231-356df10eb82d.png"
                alt="MatePeak Logo"
                className="h-10 drop-shadow-sm mt-0.5"
              />
              <span className="text-2xl font-extrabold font-poppins text-gray-900">
                MatePeak
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center space-x-1 ml-8">
              <DropdownMenu
                open={isExploreDropdownOpen}
                onOpenChange={setIsExploreDropdownOpen}
              >
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-1 h-10 px-3 rounded-lg border-0 bg-transparent shadow-none hover:bg-transparent hover:text-gray-700 focus:bg-transparent active:bg-transparent data-[state=open]:bg-transparent data-[state=open]:border-transparent data-[state=open]:shadow-none transition-none text-gray-700 font-medium text-sm font-poppins focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    onMouseEnter={() => setIsExploreDropdownOpen(true)}
                  >
                    Explore
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-56 bg-white shadow-lg border border-gray-200 rounded-xl p-2"
                  align="start"
                  onMouseLeave={() => setIsExploreDropdownOpen(false)}
                >
                  <DropdownMenuItem
                    onClick={() => navigate("/explore")}
                    className="cursor-pointer hover:bg-gray-50 rounded-lg px-3 py-2.5 text-gray-700 focus:bg-gray-50 focus:text-gray-900 transition-colors"
                  >
                    <span className="text-sm font-medium">Popular</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate("/explore?filter=new")}
                    className="cursor-pointer hover:bg-gray-50 rounded-lg px-3 py-2.5 text-gray-700 focus:bg-gray-50 focus:text-gray-900 transition-colors"
                  >
                    <span className="text-sm font-medium">
                      New and Noteworthy{" "}
                      <span className="text-xs text-gray-400 ml-1">
                        (Under Development)
                      </span>
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-gray-200 my-1" />
                  <DropdownMenuItem
                    onClick={() => navigate("/explore?q=Career%20Growth")}
                    className="cursor-pointer hover:bg-gray-50 rounded-lg px-3 py-2.5 text-gray-700 focus:bg-gray-50 focus:text-gray-900 transition-colors"
                  >
                    <span className="text-sm">Career Growth</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate("/explore?q=Mental%20Health")}
                    className="cursor-pointer hover:bg-gray-50 rounded-lg px-3 py-2.5 text-gray-700 focus:bg-gray-50 focus:text-gray-900 transition-colors"
                  >
                    <span className="text-sm">Mental Health</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate("/explore?q=Academic%20Success")}
                    className="cursor-pointer hover:bg-gray-50 rounded-lg px-3 py-2.5 text-gray-700 focus:bg-gray-50 focus:text-gray-900 transition-colors"
                  >
                    <span className="text-sm">Academic Success</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate("/explore?q=Interview%20Prep")}
                    className="cursor-pointer hover:bg-gray-50 rounded-lg px-3 py-2.5 text-gray-700 focus:bg-gray-50 focus:text-gray-900 transition-colors"
                  >
                    <span className="text-sm">Interview Prep</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate("/explore?q=Skill%20Development")}
                    className="cursor-pointer hover:bg-gray-50 rounded-lg px-3 py-2.5 text-gray-700 focus:bg-gray-50 focus:text-gray-900 transition-colors"
                  >
                    <span className="text-sm">Skill Development</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate("/explore?q=Life%20Choices")}
                    className="cursor-pointer hover:bg-gray-50 rounded-lg px-3 py-2.5 text-gray-700 focus:bg-gray-50 focus:text-gray-900 transition-colors"
                  >
                    <span className="text-sm">Life Choices</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Desktop User Actions */}
            <div className="hidden md:flex items-center space-x-4 ml-auto">
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="flex items-center gap-2 h-11 px-3 rounded-xl hover:bg-gray-100 transition-all border-2 border-transparent data-[state=open]:border-black focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    >
                      <Avatar className="h-8 w-8 ring-2 ring-gray-200">
                        <AvatarImage
                          src={profile?.avatar_url}
                          alt={getDisplayName()}
                        />
                        <AvatarFallback
                          className={`${getAvatarColor(
                            getDisplayName()
                          )} text-white font-semibold text-sm`}
                        >
                          {getInitials(getDisplayName())}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-semibold text-gray-900">
                        {getDisplayName()}
                      </span>
                      <ChevronDown className="h-4 w-4 text-gray-600" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-56 bg-white shadow-lg border border-gray-200 rounded-xl p-2"
                    align="end"
                  >
                    <DropdownMenuLabel className="font-semibold text-gray-900 px-3 py-2">
                      My Account
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-gray-200 my-1" />

                    {/* Resume Onboarding - Only for mentors with saved drafts */}
                    {userRole === "mentor" && onboardingDraft && (
                      <DropdownMenuItem
                        onClick={() => {
                          handleResumeOnboarding();
                        }}
                        className="cursor-pointer hover:bg-amber-50 rounded-lg px-3 py-2.5 text-amber-700 focus:bg-amber-50 focus:text-amber-900 transition-colors"
                      >
                        <FileEdit className="mr-3 h-4 w-4 text-amber-600" />
                        <span className="text-sm font-medium">
                          Resume Onboarding
                        </span>
                      </DropdownMenuItem>
                    )}

                    {/* View Public Profile - Only for mentors with completed onboarding and username */}
                    {userRole === "mentor" &&
                      profile?.username &&
                      profile?.onboarding_complete === true && (
                        <DropdownMenuItem
                          onClick={() => {
                            handleViewProfile();
                          }}
                          className="cursor-pointer hover:bg-gray-50 rounded-lg px-3 py-2.5 text-gray-700 focus:bg-gray-50 focus:text-gray-900 transition-colors"
                        >
                          <User className="mr-3 h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium">
                            View Public Profile
                          </span>
                        </DropdownMenuItem>
                      )}

                    {/* Dashboard - Only for fully onboarded mentors or all students */}
                    {((userRole === "mentor" &&
                      profile?.onboarding_complete === true) ||
                      userRole === "student") && (
                      <DropdownMenuItem
                        onClick={handleDashboardClick}
                        className="cursor-pointer hover:bg-gray-50 rounded-lg px-3 py-2.5 text-gray-700 focus:bg-gray-50 focus:text-gray-900 transition-colors"
                      >
                        <LayoutDashboard className="mr-3 h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium">Dashboard</span>
                      </DropdownMenuItem>
                    )}

                    {/* Show separator only if there are menu items above */}
                    {((userRole === "mentor" &&
                      profile?.onboarding_complete === true) ||
                      userRole === "student") && (
                      <DropdownMenuSeparator className="bg-gray-200 my-1" />
                    )}

                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="cursor-pointer hover:bg-red-50 focus:bg-red-50 rounded-lg px-3 py-2.5 transition-colors"
                    >
                      <LogOut className="mr-3 h-4 w-4 text-red-600" />
                      <span className="text-red-600 font-semibold text-sm">
                        Log Out
                      </span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center space-x-3">
                  <Button
                    variant="ghost"
                    className="text-gray-700 hover:text-matepeak-primary font-medium h-10 px-4 rounded-lg transition-all font-poppins"
                    onClick={() => setIsFeedbackOpen(true)}
                  >
                    Share Your Feedback
                  </Button>
                  <span className="text-gray-300">|</span>
                  <Button
                    variant="outline"
                    className="bg-[#f2f2f2] text-matepeak-primary border-0 shadow-none hover:bg-[#e6e6e6] hover:text-matepeak-primary hover:shadow-none font-semibold h-10 px-6 rounded-full transition-colors duration-150 font-poppins"
                    onClick={handleSignInClick}
                  >
                    Sign In
                  </Button>
                  <Button
                    className="bg-gradient-to-r from-matepeak-primary to-matepeak-secondary text-white hover:from-matepeak-primary/90 hover:to-matepeak-secondary/90 font-bold rounded-full h-10 px-6 transition-all duration-300 font-poppins"
                    onClick={handleGetStartedClick}
                  >
                    Create account
                  </Button>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden absolute right-4">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-matepeak-primary hover:text-matepeak-secondary p-2 rounded-lg hover:bg-matepeak-primary/5 transition-all duration-300"
              >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden bg-white py-4 px-4 mt-2 shadow-lg border-t border-gray-200 rounded-b-xl">
            {user ? (
              <div className="flex flex-col space-y-2">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                  <Avatar className="h-10 w-10 ring-2 ring-gray-200">
                    <AvatarImage
                      src={profile?.avatar_url}
                      alt={getDisplayName()}
                    />
                    <AvatarFallback
                      className={`${getAvatarColor(
                        getDisplayName()
                      )} text-white font-semibold`}
                    >
                      {getInitials(getDisplayName())}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-gray-900 font-semibold text-sm">
                      {getDisplayName()}
                    </p>
                    <p className="text-gray-500 text-xs capitalize">
                      {userRole || "User"}
                    </p>
                  </div>
                </div>

                {/* Resume Onboarding - Only for mentors with saved drafts */}
                {userRole === "mentor" && onboardingDraft && (
                  <Button
                    variant="ghost"
                    className="text-amber-700 hover:bg-amber-50 w-full font-medium justify-start transition-all duration-200 rounded-xl h-11"
                    onClick={() => {
                      handleResumeOnboarding();
                      setIsMenuOpen(false);
                    }}
                  >
                    <FileEdit className="mr-3 h-4 w-4 text-amber-600" />
                    Resume Onboarding
                  </Button>
                )}

                {/* View Public Profile - Only for fully onboarded mentors with username */}
                {userRole === "mentor" &&
                  profile?.username &&
                  profile?.onboarding_complete === true && (
                    <Button
                      variant="ghost"
                      className="text-gray-700 hover:bg-gray-100 w-full font-medium justify-start transition-all duration-200 rounded-xl h-11"
                      onClick={() => {
                        handleViewProfile();
                        setIsMenuOpen(false);
                      }}
                    >
                      <User className="mr-3 h-4 w-4 text-gray-500" />
                      View Public Profile
                    </Button>
                  )}

                {/* Dashboard - Only for fully onboarded mentors or all students */}
                {((userRole === "mentor" &&
                  profile?.onboarding_complete === true) ||
                  userRole === "student") && (
                  <Button
                    variant="ghost"
                    className="text-gray-700 hover:bg-gray-100 w-full font-medium justify-start transition-all duration-200 rounded-xl h-11"
                    onClick={() => {
                      handleDashboardClick();
                      setIsMenuOpen(false);
                    }}
                  >
                    <LayoutDashboard className="mr-3 h-4 w-4 text-gray-500" />
                    Dashboard
                  </Button>
                )}

                <div className="pt-2 border-t border-gray-200">
                  <Button
                    variant="ghost"
                    className="text-red-600 hover:bg-red-50 w-full font-medium justify-start transition-all duration-200 rounded-xl h-11"
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                  >
                    <LogOut className="mr-3 h-4 w-4" />
                    Log Out
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col space-y-3">
                <Button
                  variant="outline"
                  className="text-matepeak-primary border border-matepeak-primary/30 hover:bg-matepeak-primary hover:text-white w-full font-semibold justify-center transition-all duration-300 rounded-full"
                  onClick={() => {
                    handleSignInClick();
                    setIsMenuOpen(false);
                  }}
                >
                  Sign In
                </Button>
                <Button
                  className="bg-gradient-to-r from-matepeak-primary to-matepeak-secondary text-white hover:from-matepeak-primary/90 hover:to-matepeak-secondary/90 w-full font-bold rounded-full h-12 transition-all duration-300"
                  onClick={() => {
                    handleGetStartedClick();
                    setIsMenuOpen(false);
                  }}
                >
                  Create account
                </Button>
              </div>
            )}
          </div>
        )}

        <RoleSelectionModal
          open={isRoleModalOpen}
          onOpenChange={setIsRoleModalOpen}
        />
        <SignInRoleSelection
          open={isSignInModalOpen}
          onOpenChange={setIsSignInModalOpen}
        />
        <FeedbackModal
          isOpen={isFeedbackOpen}
          onClose={() => setIsFeedbackOpen(false)}
        />
      </nav>
    </>
  );
};

export default Navbar;
