import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  User,
  Calendar,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Star,
  MessageSquare,
  Users,
  Clock,
  Search,
  Command,
  Home,
  ChevronRight,
  Zap,
  Settings,
  Eye,
  PackageOpen,
  CreditCard,
  HandCoins,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { NotificationBell } from "./NotificationBell";

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
  | "payouts";

interface DashboardLayoutProps {
  activeView: DashboardView;
  onViewChange: (view: DashboardView) => void;
  mentorProfile: any;
  user: any;
  children: React.ReactNode;
}

const DashboardLayout = ({
  activeView,
  onViewChange,
  mentorProfile,
  user,
  children,
}: DashboardLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Grouped navigation structure for better organization
  const navigationGroups = [
    {
      label: "Main",
      items: [
        {
          id: "overview" as DashboardView,
          label: "Overview",
          icon: LayoutDashboard,
          badge: null,
        },
      ],
    },
    {
      label: "Schedule",
      items: [
        {
          id: "sessions" as DashboardView,
          label: "Sessions",
          icon: Calendar,
          badge: null,
        },
        {
          id: "availability" as DashboardView,
          label: "Availability",
          icon: Clock,
          badge: null,
        },
        {
          id: "requests" as DashboardView,
          label: "Time Requests",
          icon: Clock,
          badge: null, // Can add pending count here
        },
      ],
    },
    {
      label: "Engage",
      items: [
        {
          id: "messages" as DashboardView,
          label: "Priority DM",
          icon: MessageSquare,
          badge: null, // Can add unread count here
        },
        {
          id: "students" as DashboardView,
          label: "Students",
          icon: Users,
          badge: null,
        },
        {
          id: "reviews" as DashboardView,
          label: "Reviews",
          icon: Star,
          badge: null,
        },
      ],
    },
    {
      label: "Settings",
      items: [
        {
          id: "profile" as DashboardView,
          label: "Profile",
          icon: User,
          badge: null,
        },
        {
          id: "services" as DashboardView,
          label: "Services",
          icon: PackageOpen,
          badge: null,
        },
      ],
    },
    {
      label: "Finance",
      items: [
        {
          id: "payments" as DashboardView,
          label: "Payments",
          icon: CreditCard,
          badge: null,
        },
        {
          id: "payouts" as DashboardView,
          label: "Payouts",
          icon: HandCoins,
          badge: null,
        },
      ],
    },
  ];

  // Keyboard shortcut for command palette
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowCommandPalette(true);
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      toast({
        title: "Signed out successfully",
        description: "You have been signed out of your account",
      });
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getInitials = () => {
    const firstName = mentorProfile?.first_name || "";
    const lastName = mentorProfile?.last_name || "";
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "M";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Clean Top Bar */}
      <nav className="bg-white border-b border-gray-200 fixed w-full z-30 top-0">
        <div className="px-6 sm:px-8 lg:px-12">
          <div className="flex justify-between h-16">
            {/* Left side */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                aria-label="Toggle menu"
              >
                {sidebarOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>

              <Link to="/" className="flex items-center group">
                <img
                  src="/lovable-uploads/14bf0eea-1bc9-4675-9231-356df10eb82d.png"
                  alt="MatePeak"
                  className="h-9 w-auto transition-transform group-hover:scale-105"
                />
                <span className="ml-3 text-2xl font-extrabold font-poppins text-gray-900">
                  MatePeak
                </span>
              </Link>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              <NotificationBell mentorId={mentorProfile.id} />

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 px-3 h-11 rounded-xl hover:bg-gray-100 transition-all border-2 border-transparent data-[state=open]:border-black focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 group">
                    <div className="relative">
                      <Avatar
                        className="h-8 w-8 ring-2 ring-gray-200"
                        key={mentorProfile?.profile_picture_url}
                      >
                        <AvatarImage
                          src={mentorProfile?.profile_picture_url || ""}
                          alt={`${mentorProfile?.first_name} ${mentorProfile?.last_name}`}
                        />
                        <AvatarFallback className="bg-gray-900 text-white text-sm font-semibold">
                          {getInitials()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 rounded-full border-2 border-white" />
                    </div>
                    <div className="hidden md:block text-left">
                      <p className="text-sm font-semibold text-gray-900">
                        {mentorProfile?.first_name} {mentorProfile?.last_name}
                      </p>
                    </div>
                    <ChevronDown className="hidden md:block h-4 w-4 text-gray-600 group-hover:text-gray-900 transition-colors" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-72 bg-white shadow-lg border border-gray-200 rounded-xl p-0"
                >
                  {/* User Info Header */}
                  <div className="px-4 py-4 bg-gray-50 rounded-t-xl">
                    <div className="flex items-center gap-3">
                      <Avatar
                        className="h-12 w-12 ring-2 ring-gray-200"
                        key={mentorProfile?.profile_picture_url}
                      >
                        <AvatarImage
                          src={mentorProfile?.profile_picture_url || ""}
                          alt={`${mentorProfile?.first_name} ${mentorProfile?.last_name}`}
                        />
                        <AvatarFallback className="bg-gray-900 text-white font-semibold">
                          {getInitials()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">
                          {mentorProfile?.full_name ||
                            `${mentorProfile?.first_name} ${mentorProfile?.last_name}`}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          @{mentorProfile?.username}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
                          <span className="text-xs text-gray-600 font-medium">
                            Active
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-1.5">
                    <DropdownMenuItem
                      onClick={() =>
                        navigate(`/mentor/${mentorProfile?.username}`)
                      }
                      className="cursor-pointer hover:bg-gray-50 rounded-lg px-3 py-2.5 focus:bg-gray-50"
                    >
                      <Eye className="h-4 w-4 mr-3 text-gray-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          View Public Profile
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          See how students see you
                        </p>
                      </div>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => onViewChange("profile")}
                      className="cursor-pointer hover:bg-gray-50 rounded-lg px-3 py-2.5 focus:bg-gray-50"
                    >
                      <Settings className="h-4 w-4 mr-3 text-gray-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          Settings & Profile
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Manage your account
                        </p>
                      </div>
                    </DropdownMenuItem>
                  </div>

                  <DropdownMenuSeparator className="my-1.5 bg-gray-200" />

                  <div className="p-1.5">
                    <DropdownMenuItem
                      onClick={handleSignOut}
                      className="cursor-pointer hover:bg-red-50 rounded-lg px-3 py-2.5 focus:bg-red-50 text-red-600 focus:text-red-600"
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      <span className="text-sm font-medium">Log Out</span>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar - Desktop (MentorLoop Style) */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col pt-16">
        <div className="flex flex-col flex-grow bg-gray-50 overflow-y-auto thin-scrollbar">
          {/* Enhanced Profile Card */}
          <div className="p-6 m-4 rounded-2xl bg-gray-100">
            <div className="flex flex-col items-center text-center mb-4">
              <Avatar
                className="h-20 w-20 ring-4 ring-white shadow-md mb-3"
                key={mentorProfile?.profile_picture_url}
              >
                <AvatarImage
                  src={mentorProfile?.profile_picture_url || ""}
                  alt={`${mentorProfile?.first_name} ${mentorProfile?.last_name}`}
                />
                <AvatarFallback className="bg-gray-800 text-white text-xl font-bold">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-base font-bold text-gray-900">
                  {mentorProfile?.first_name} {mentorProfile?.last_name}
                </h3>
              </div>
              <p className="text-sm text-gray-600 font-medium mt-1">Mentor</p>
              <p className="text-xs text-gray-500 mt-0.5">
                @{mentorProfile?.username}
              </p>
            </div>
            <button
              onClick={() => navigate(`/mentor/${mentorProfile?.username}`)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md"
            >
              <Eye className="h-4 w-4" />
              <span>View Public Profile</span>
            </button>
          </div>

          {/* Navigation Groups */}
          <nav className="flex-1 px-3 space-y-6 py-4">
            {navigationGroups.map((group, groupIdx) => (
              <div key={groupIdx}>
                <h3 className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {group.label}
                </h3>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeView === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => onViewChange(item.id)}
                        className={`
                          w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-xl transition-all group
                          ${
                            isActive
                              ? "bg-gray-300 text-gray-900"
                              : "text-gray-700 hover:bg-gray-200"
                          }
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-5 w-5 text-rose-400" />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <Badge variant="secondary" className="ml-auto">
                            {item.badge}
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Log Out Footer */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-red-600 rounded-xl text-sm font-medium transition-all group"
            >
              <LogOut className="h-5 w-5 text-rose-400 group-hover:text-red-600 transition-colors" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar (MentorLoop Style) */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 pt-16">
          <div
            className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <nav className="fixed top-16 left-0 bottom-0 w-80 bg-gray-50 shadow-xl overflow-y-auto thin-scrollbar">
            {/* Enhanced Mobile Profile Card */}
            <div className="p-6 border-b border-gray-200 bg-gray-100">
              <div className="flex flex-col items-center text-center mb-4">
                <Avatar
                  className="h-20 w-20 ring-4 ring-white shadow-md mb-3"
                  key={mentorProfile?.profile_picture_url}
                >
                  <AvatarImage
                    src={mentorProfile?.profile_picture_url || ""}
                    alt={`${mentorProfile?.first_name} ${mentorProfile?.last_name}`}
                  />
                  <AvatarFallback className="bg-gray-800 text-white text-xl font-bold">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <h3 className="text-base font-bold text-gray-900">
                  {mentorProfile?.first_name} {mentorProfile?.last_name}
                </h3>
                <p className="text-sm text-gray-600 font-medium mt-1">Mentor</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  @{mentorProfile?.username}
                </p>
              </div>
              <button
                onClick={() => {
                  navigate(`/mentor/${mentorProfile?.username}`);
                  setSidebarOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md"
              >
                <Eye className="h-4 w-4" />
                <span>View Public Profile</span>
              </button>
            </div>

            {/* Mobile Navigation */}
            <div className="px-3 py-4 space-y-6">
              {navigationGroups.map((group, groupIdx) => (
                <div key={groupIdx}>
                  <h3 className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {group.label}
                  </h3>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeView === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            onViewChange(item.id);
                            setSidebarOpen(false);
                          }}
                          className={`
                            w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-xl transition-all
                            ${
                              isActive
                                ? "bg-gray-300 text-gray-900"
                                : "text-gray-700 hover:bg-gray-200"
                            }
                          `}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className="h-5 w-5 text-rose-400" />
                            <span>{item.label}</span>
                          </div>
                          {item.badge && (
                            <Badge variant="secondary">{item.badge}</Badge>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </nav>
        </div>
      )}

      {/* Main Content Area - White Background */}
      <main className="lg:pl-72 pt-16 bg-white min-h-screen">
        <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-[1600px]">
          {/* Breadcrumb */}
          <div className="mb-6 flex items-center gap-2 text-sm text-gray-500">
            <Home className="h-4 w-4" />
            <ChevronRight className="h-4 w-4" />
            <span className="font-medium text-gray-900 capitalize">
              {activeView}
            </span>
          </div>

          {/* Content */}
          <div className="min-h-[calc(100vh-180px)]">{children}</div>
        </div>
      </main>

      {/* Command Palette Modal */}
      {showCommandPalette && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
          <div
            className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm"
            onClick={() => setShowCommandPalette(false)}
          />
          <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <Search className="h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Quick search for sessions, students, or navigate..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 border-0 focus:ring-0 text-base"
                  autoFocus
                />
                <kbd className="px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-100 rounded border border-gray-200">
                  ESC
                </kbd>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto p-2">
              {/* Quick Navigation */}
              <div className="mb-3">
                <p className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                  Quick Navigation
                </p>
                <div className="space-y-1">
                  {navigationGroups
                    .flatMap((group) => group.items)
                    .map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            onViewChange(item.id);
                            setShowCommandPalette(false);
                            setSearchQuery("");
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-gray-50 rounded-lg transition-colors text-left"
                        >
                          <Icon className="h-4 w-4 text-gray-400" />
                          <span className="flex-1 text-gray-700">
                            {item.label}
                          </span>
                          <ChevronRight className="h-4 w-4 text-gray-300" />
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <p className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                  Quick Actions
                </p>
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      navigate(`/mentor/${mentorProfile?.username}`);
                      setShowCommandPalette(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-gray-50 rounded-lg transition-colors text-left"
                  >
                    <Eye className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-700">View Public Profile</span>
                  </button>
                  <button
                    onClick={() => {
                      handleSignOut();
                      setShowCommandPalette(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-red-50 text-red-600 rounded-lg transition-colors text-left"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardLayout;
