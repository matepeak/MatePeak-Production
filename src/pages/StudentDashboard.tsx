import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import StudentDashboardLayout from '@/components/dashboard/student/StudentDashboardLayout';
import StudentOverview from '@/components/dashboard/student/StudentOverview';
import MySessions from '@/components/dashboard/student/MySessions';
import StudentMessaging from '@/components/dashboard/student/StudentMessaging';
import MyMentors from '@/components/dashboard/student/MyMentors';
import StudentReviews from '@/components/dashboard/student/StudentReviews';
import StudentProfile from '@/components/dashboard/student/StudentProfile';
import StudentTimeRequest from '@/components/dashboard/student/StudentTimeRequest';

type StudentView = "overview" | "sessions" | "time-request" | "messages" | "mentors" | "reviews" | "profile";

export default function StudentDashboard() {
  const [activeView, setActiveView] = useState<StudentView>('overview');
  const [user, setUser] = useState<any>(null);
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuthAndProfile();
  }, []);

  const checkAuthAndProfile = async () => {
    try {
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError || !session) {
        toast.warning('Please log in to access the dashboard');
        navigate('/student/login');
        return;
      }

      // Security: Check if user is a mentor
      const userRole = session.user.user_metadata?.role || session.user.user_metadata?.user_type;
      if (userRole === 'mentor' || userRole === 'expert') {
        toast.warning('This dashboard is for students only');
        navigate('/mentor-dashboard');
        return;
      }

      // Security: Ensure user is NOT in expert_profiles table
      const { data: expertProfile } = await supabase
        .from('expert_profiles')
        .select('id')
        .eq('id', session.user.id)
        .single();

      if (expertProfile) {
        toast.warning('Mentors cannot access the student dashboard');
        navigate('/mentor-dashboard');
        return;
      }

      // Security: Verify user has correct role
      if (userRole && userRole !== 'student') {
        toast.warning('Access denied. Student access only.');
        navigate('/');
        return;
      }

      setUser(session.user);

      // Fetch or create student profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Profile error:', profileError);
      }

      // If no profile exists, create a basic one
      if (!profile) {
        const newProfile = {
          id: session.user.id,
          email: session.user.email || '',
          full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || '',
          type: 'student',
          created_at: new Date().toISOString(),
        };

        const { data: createdProfile } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single();

        setStudentProfile(createdProfile || newProfile);
      } else {
        setStudentProfile(profile);
      }

      setLoading(false);
    } catch (error) {
      console.error('Auth check error:', error);
      toast.error('Authentication error. Please login again.');
      navigate('/student/login');
    }
  };

  const handleProfileUpdate = (updatedProfile: any) => {
    setStudentProfile(updatedProfile);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-900 mx-auto mb-4" />
          <p className="text-sm text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!studentProfile || !user) {
    return null;
  }

  return (
    <StudentDashboardLayout
      activeView={activeView}
      onViewChange={setActiveView}
      studentProfile={studentProfile}
      user={user}
    >
      {activeView === 'overview' && (
        <StudentOverview 
          studentProfile={studentProfile}
          onNavigate={(view) => setActiveView(view as StudentView)}
        />
      )}
      {activeView === 'sessions' && <MySessions studentProfile={studentProfile} />}
      {activeView === 'time-request' && <StudentTimeRequest studentProfile={studentProfile} />}
      {activeView === 'messages' && <StudentMessaging studentProfile={studentProfile} />}
      {activeView === 'mentors' && <MyMentors studentProfile={studentProfile} />}
      {activeView === 'reviews' && <StudentReviews studentProfile={studentProfile} />}
      {activeView === 'profile' && (
        <StudentProfile 
          studentProfile={studentProfile}
          onProfileUpdate={handleProfileUpdate}
        />
      )}
    </StudentDashboardLayout>
  );
}
