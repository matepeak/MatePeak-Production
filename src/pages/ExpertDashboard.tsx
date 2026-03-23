import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Search, Calendar, Clock, Users, UserCircle, Gift, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/components/ui/sonner";

export default function ExpertDashboard() {
  const navigate = useNavigate();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string>("");
  const [upcomingBookings, setUpcomingBookings] = useState<any[]>([]);
  const [completedBookings, setCompletedBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/expert/login');
        return;
      }

      // Security: Check if user is a student
      const userRole = session.user.user_metadata?.role || session.user.user_metadata?.user_type;
      if (userRole === 'student') {
        toast.warning('This dashboard is for mentors only');
        navigate('/dashboard');
        return;
      }

      // Security: Verify user has expert profile
      const { data: expertCheck } = await supabase
        .from('expert_profiles')
        .select('id')
        .eq('id', session.user.id)
        .single();

      if (!expertCheck) {
        toast.warning('Expert profile not found. Please complete onboarding.');
        navigate('/expert/onboarding');
        return;
      }
      
      // Fetch expert profile with avatar from profiles table
      const { data: expertProfile } = await supabase
        .from("expert_profiles")
        .select(`
          full_name,
          profiles (
            avatar_url
          )
        `)
        .eq("id", session.user.id)
        .maybeSingle();

      if (expertProfile) {
        setFullName(expertProfile.full_name || "");
        // @ts-ignore - profiles is joined
        setProfileImage(expertProfile.profiles?.avatar_url || null);
      }

      // Fetch mentor's bookings with student details
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select(`
          *,
          profiles!bookings_user_id_fkey (
            full_name,
            avatar_url
          )
        `)
        .eq('expert_id', session.user.id)
        .order('scheduled_date', { ascending: true });

      if (bookingsData) {
        const now = new Date();
        const upcoming = bookingsData.filter(b => 
          new Date(b.scheduled_date) >= now && 
          (b.status === 'pending' || b.status === 'confirmed')
        );
        const completed = bookingsData.filter(b => b.status === 'completed');
        
        setUpcomingBookings(upcoming);
        setCompletedBookings(completed);
      }

      setLoading(false);
    };
    checkAuth();
  }, [navigate]);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("Signed out successfully");
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || "Failed to sign out");
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r relative flex flex-col">
        <div className="p-4 border-b flex items-center gap-3">
          <div className="relative group">
            <Avatar className="h-12 w-12 border-2 border-gray-200 cursor-pointer transition-all hover:border-matepeak-primary">
              <AvatarImage src={profileImage || undefined} alt={fullName} />
              <AvatarFallback className="bg-matepeak-primary/10 text-matepeak-primary font-semibold">
                {fullName ? fullName.charAt(0).toUpperCase() : 'M'}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs py-1 px-2 rounded whitespace-nowrap pointer-events-none">
              Change Photo
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-matepeak-primary truncate">{fullName || 'MatePeak'}</h1>
            <p className="text-xs text-gray-500 truncate">Expert Dashboard</p>
          </div>
        </div>
        <nav className="p-4 space-y-2 flex-1">
          <button className="flex items-center gap-3 w-full p-2 text-gray-700 hover:bg-gray-100 rounded-lg">
            <Search className="h-5 w-5" />
            <span>Home</span>
          </button>
          <button className="flex items-center gap-3 w-full p-2 text-gray-700 hover:bg-gray-100 rounded-lg">
            <Calendar className="h-5 w-5" />
            <span>Bookings</span>
          </button>
          <button className="flex items-center gap-3 w-full p-2 text-gray-700 hover:bg-gray-100 rounded-lg">
            <Users className="h-5 w-5" />
            <span>Find People</span>
          </button>
          <button className="flex items-center gap-3 w-full p-2 text-gray-700 hover:bg-gray-100 rounded-lg">
            <UserCircle className="h-5 w-5" />
            <span>Profile</span>
          </button>
          <button className="flex items-center gap-3 w-full p-2 text-gray-700 hover:bg-gray-100 rounded-lg">
            <Gift className="h-5 w-5" />
            <span>Rewards</span>
          </button>
        </nav>
        <div className="p-4 border-t bg-white">
          <button 
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-semibold">Home</h1>
            <div className="relative w-96">
              <Input
                type="text"
                placeholder="Ask topmate AI or Search"
                className="pl-4 pr-10"
              />
              <button className="absolute right-3 top-1/2 -translate-y-1/2">
                <Search className="h-5 w-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-lg p-6 border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Upcoming Sessions</p>
                  <h3 className="text-3xl font-bold text-matepeak-primary">{upcomingBookings.length}</h3>
                </div>
                <Calendar className="h-8 w-8 text-matepeak-primary opacity-80" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-6 border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Completed Sessions</p>
                  <h3 className="text-3xl font-bold text-matepeak-primary">{completedBookings.length}</h3>
                </div>
                <Clock className="h-8 w-8 text-matepeak-primary opacity-80" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-6 border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Students</p>
                  <h3 className="text-3xl font-bold text-matepeak-primary">
                    {new Set(upcomingBookings.concat(completedBookings).map(b => b.user_id)).size}
                  </h3>
                </div>
                <Users className="h-8 w-8 text-matepeak-primary opacity-80" />
              </div>
            </div>
          </div>

          {/* Upcoming Sessions */}
          {upcomingBookings.length > 0 && (
            <div className="bg-white rounded-lg p-6 border mb-6">
              <h3 className="font-semibold text-lg mb-4">Upcoming Sessions</h3>
              <div className="space-y-4">
                {upcomingBookings.slice(0, 3).map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <img
                        src={booking.profiles?.avatar_url || '/placeholder.svg'}
                        alt={booking.profiles?.full_name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div>
                        <h4 className="font-medium">{booking.session_type}</h4>
                        <p className="text-sm text-gray-600">
                          with {booking.profiles?.full_name || 'Student'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(booking.scheduled_date).toLocaleDateString()} at {booking.scheduled_time}
                        </p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      booking.status === 'confirmed' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
