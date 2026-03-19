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
  CalendarCheck,
  MessageSquare,
  Users,
  BookOpen,
  Search,
  Settings,
  GraduationCap,
  Clock,
} from "lucide-react";
import ClockPlus from "lucide-react/dist/esm/icons/clock-plus";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type StudentView = "overview" | "sessions" | "time-request" | "messages" | "mentors" | "reviews" | "profile";

interface StudentDashboardLayoutProps {
  activeView: StudentView;
  onViewChange: (view: StudentView) => void;
  studentProfile: any;
  user: any;
  children: React.ReactNode;
}

const StudentDashboardLayout = ({
  activeView,
  onViewChange,
  studentProfile,
  user,
  children,
}: StudentDashboardLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  // Grouped navigation structure for students
  const navigationGroups = [
    {
      label: "Main",
      items: [
        {
          id: "overview" as StudentView,
          label: "Overview",
          icon: LayoutDashboard,
          badge: null,
        },
      ],
    },
    {
      label: "Learning",
      items: [
        {
          id: "sessions" as StudentView,
          label: "My Sessions",
          icon: BookOpen,
          badge: null,
        },

        {
          id: "time-request" as StudentView,
          label: "Time Request",
          icon: ClockPlus,
          badge: null,
        },
        {
          id: "mentors" as StudentView,
          label: "My Mentors",
          icon: Users,
          badge: null,
        },
      ],
    },
    {
      label: "Connect",
      items: [
        {
          id: "messages" as StudentView,
          label: "Priority DM",
          icon: MessageSquare,
          badge: null,
        },
        {
          id: "reviews" as StudentView,
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
          id: "profile" as StudentView,
          label: "Profile",
          icon: User,
          badge: null,
        },
      ],
    },
  ];

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      toast.success("Signed out successfully");
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out. Please try again.");
    }
  };

  const getInitials = () => {
    const name = studentProfile?.full_name || "";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return name.charAt(0).toUpperCase() || "S";
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
              <NotificationBell
                recipientId={studentProfile.id}
                onNavigateToView={(view) => onViewChange(view as StudentView)}
              />
              
              {/* User Menu */}
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 px-3 h-11 rounded-xl hover:bg-gray-100 transition-all border-2 border-transparent data-[state=open]:border-black focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 group">
                    <div className="relative">
                      <Avatar className="h-8 w-8 ring-2 ring-gray-200">
                        <AvatarImage
                          src={studentProfile?.avatar_url || studentProfile?.profile_picture_url || ""}
                          alt={studentProfile?.full_name || "Student"}
                        />
                        <AvatarFallback className="bg-blue-600 text-white text-sm font-semibold">
                          {getInitials()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 rounded-full border-2 border-white" />
                    </div>
                    <div className="hidden md:block text-left">
                      <p className="text-sm font-semibold text-gray-900">
                        {studentProfile?.full_name || "Student"}
                      </p>
                    </div>
                    <ChevronDown className="hidden md:block h-4 w-4 text-gray-600 group-hover:text-gray-900 transition-colors" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72 bg-white shadow-lg border border-gray-200 rounded-xl p-0">
                  {/* User Info Header */}
                  <div className="px-4 py-4 bg-gray-50 rounded-t-xl">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 ring-2 ring-gray-200">
                        <AvatarImage
                          src={studentProfile?.avatar_url || studentProfile?.profile_picture_url || ""}
                          alt={studentProfile?.full_name || "Student"}
                        />
                        <AvatarFallback className="bg-blue-600 text-white font-semibold">
                          {getInitials()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">
                          {studentProfile?.full_name || "Student"}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          {studentProfile?.email}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
                          <span className="text-xs text-gray-600 font-medium">Active</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-1.5">
                    <DropdownMenuItem 
                      onClick={() => navigate('/explore')} 
                      className="cursor-pointer hover:bg-gray-50 rounded-lg px-3 py-2.5 focus:bg-gray-50"
                    >
                      <Search className="h-4 w-4 mr-3 text-gray-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Find Mentors</p>
                        <p className="text-xs text-gray-500 mt-0.5">Discover expert mentors</p>
                      </div>
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem 
                      onClick={() => onViewChange("profile")} 
                      className="cursor-pointer hover:bg-gray-50 rounded-lg px-3 py-2.5 focus:bg-gray-50"
                    >
                      <Settings className="h-4 w-4 mr-3 text-gray-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Settings & Profile</p>
                        <p className="text-xs text-gray-500 mt-0.5">Manage your account</p>
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

      {/* Sidebar - Desktop */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col pt-16">
        <div className="flex flex-col flex-grow bg-gray-50 overflow-y-auto">
          
          {/* Profile Card - Exact Mentor Style */}
          <div className="p-6 m-4 rounded-2xl bg-gray-100">
            <div className="flex flex-col items-center text-center mb-4">
              <Avatar className="h-20 w-20 ring-4 ring-white shadow-md mb-3">
                <AvatarImage
                  src={studentProfile?.avatar_url || studentProfile?.profile_picture_url || ""}
                  alt={studentProfile?.full_name || "Student"}
                />
                <AvatarFallback className="bg-blue-600 text-white text-xl font-bold">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <h3 className="text-base font-bold text-gray-900">
                {studentProfile?.full_name || "Student"}
              </h3>
              <p className="text-sm text-gray-600 font-medium mt-1">
                Learner
              </p>
              {studentProfile?.username && (
                <p className="text-xs text-gray-500 mt-0.5">
                  @{studentProfile.username}
                </p>
              )}
            </div>
            <button
              onClick={() => navigate('/explore')}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              <Search className="h-4 w-4" />
              <span>Find Mentors</span>
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
                        onClick={() => {
                          onViewChange(item.id);
                          setSidebarOpen(false);
                        }}
                        className={`
                          w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
                          ${isActive
                            ? 'bg-gray-300 text-gray-900'
                            : 'text-gray-700 hover:bg-gray-200'
                          }
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={`h-5 w-5 text-rose-400`} />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className={`
                            px-2 py-0.5 rounded-full text-xs font-semibold
                            ${isActive ? 'bg-gray-400 text-white' : 'bg-gray-200 text-gray-700'}
                          `}>
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="fixed inset-0 bg-gray-600 bg-opacity-75"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 flex w-72 flex-col bg-gray-50 shadow-xl">
            <div className="flex flex-col flex-grow pt-20 overflow-y-auto">
              {/* Mobile Profile Card - Exact Mentor Style */}
              <div className="p-6 m-4 rounded-2xl bg-gray-100">
                <div className="flex flex-col items-center text-center mb-4">
                  <Avatar className="h-20 w-20 ring-4 ring-white shadow-md mb-3">
                    <AvatarImage
                      src={studentProfile?.avatar_url || studentProfile?.profile_picture_url || ""}
                      alt={studentProfile?.full_name || "Student"}
                    />
                    <AvatarFallback className="bg-blue-600 text-white text-xl font-bold">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="text-base font-bold text-gray-900">
                    {studentProfile?.full_name || "Student"}
                  </h3>
                  <p className="text-sm text-gray-600 font-medium mt-1">
                    Learner
                  </p>
                  {studentProfile?.username && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      @{studentProfile.username}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    navigate('/explore');
                    setSidebarOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  <Search className="h-4 w-4" />
                  <span>Find Mentors</span>
                </button>
              </div>

              {/* Mobile Navigation */}
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
                            onClick={() => {
                              onViewChange(item.id);
                              setSidebarOpen(false);
                            }}
                            className={`
                              w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
                              ${isActive
                                ? 'bg-gray-300 text-gray-900'
                                : 'text-gray-700 hover:bg-gray-200'
                              }
                            `}
                          >
                            <div className="flex items-center gap-3">
                              <Icon className={`h-5 w-5 text-rose-400`} />
                              <span>{item.label}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <main className="lg:pl-72 pt-16">
        <div className="px-6 sm:px-8 lg:px-12 py-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default StudentDashboardLayout;
