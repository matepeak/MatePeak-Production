import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Star, 
  MessageSquare, 
  Calendar,
  Search,
  MapPin,
  DollarSign,
  TrendingUp,
  Users
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface MyMentorsProps {
  studentProfile: any;
}

export default function MyMentors({ studentProfile }: MyMentorsProps) {
  const [mentors, setMentors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchMyMentors();
  }, []);

  const fetchMyMentors = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all bookings with mentor info
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
          expert_id,
          expert_profiles (
            id,
            full_name,
            username,
            profile_picture_url,
            headline
          )
        `)
        .eq('student_id', user.id);

      if (error) throw error;

      // Get unique mentors
      const uniqueMentorsMap = new Map();
      bookings?.forEach((booking: any) => {
        if (booking.expert_profiles && !uniqueMentorsMap.has(booking.expert_id)) {
          uniqueMentorsMap.set(booking.expert_id, booking.expert_profiles);
        }
      });

      const mentorsList = Array.from(uniqueMentorsMap.values());
      
      // Get session counts for each mentor
      const mentorsWithStats = await Promise.all(
        mentorsList.map(async (mentor: any) => {
          const { count: totalSessions } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', user.id)
            .eq('expert_id', mentor.id);

          const { count: upcomingSessions } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', user.id)
            .eq('expert_id', mentor.id)
            .gte('session_date', new Date().toISOString())
            .neq('status', 'cancelled');

          const { data: reviews } = await supabase
            .from('reviews')
            .select('rating')
            .eq('expert_id', mentor.id);

          const avgRating = reviews && reviews.length > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
            : 0;

          return {
            ...mentor,
            totalSessions: totalSessions || 0,
            upcomingSessions: upcomingSessions || 0,
            avgRating: avgRating ? avgRating.toFixed(1) : 'N/A',
            reviewCount: reviews?.length || 0
          };
        })
      );

      setMentors(mentorsWithStats);

    } catch (error: any) {
      console.error('Error fetching mentors:', error);
      toast.error('Failed to load mentors');
    } finally {
      setLoading(false);
    }
  };

  const filteredMentors = mentors.filter(mentor =>
    mentor.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    mentor.expertise?.some((e: string) => 
      e.toLowerCase().includes(searchQuery.toLowerCase())
    ) ||
    mentor.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-40 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Search */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900">My Mentors</h2>
          <p className="text-gray-600 mt-1">
            {mentors.length} mentor{mentors.length !== 1 ? 's' : ''} you've worked with
          </p>
        </div>
        <div className="relative w-64 flex-shrink-0">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search mentors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Mentors Grid */}
      {filteredMentors.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchQuery ? 'No mentors found' : 'No mentors yet'}
            </h3>
            <p className="text-gray-600 text-center mb-6">
              {searchQuery 
                ? 'Try adjusting your search query'
                : 'Book your first session to start building relationships with mentors'
              }
            </p>
            {!searchQuery && (
              <Button onClick={() => navigate('/explore')}>
                Find Mentors
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMentors.map((mentor) => (
            <Card key={mentor.id} className="hover:shadow-lg transition-all group">
              <CardContent className="p-6">
                {/* Header with Avatar */}
                <div className="flex items-start justify-between mb-4">
                  <div 
                    className="h-16 w-16 rounded-full bg-gray-300 overflow-hidden cursor-pointer"
                    onClick={() => navigate(`/mentor/${mentor.username || mentor.id}`)}
                  >
                    {mentor.profile_picture_url ? (
                      <img
                        src={mentor.profile_picture_url}
                        alt={mentor.full_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-blue-600 text-white text-2xl font-bold">
                        {mentor.full_name?.charAt(0) || 'M'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Mentor Info */}
                <div className="mb-4">
                  <h3 
                    className="font-semibold text-lg text-gray-900 mb-1 cursor-pointer hover:text-blue-600"
                    onClick={() => navigate(`/mentor/${mentor.username || mentor.id}`)}
                  >
                    {mentor.full_name || 'Mentor'}
                  </h3>
                  
                  {/* Headline */}
                  {mentor.headline && (
                    <p className="text-sm text-gray-600 truncate mb-2">
                      {mentor.headline}
                    </p>
                  )}

                  {/* Rating */}
                  <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{mentor.avgRating}</span>
                    <span>({mentor.reviewCount} reviews)</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {mentor.totalSessions}
                    </div>
                    <div className="text-xs text-gray-600">Total Sessions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {mentor.upcomingSessions}
                    </div>
                    <div className="text-xs text-gray-600">Upcoming</div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex items-center gap-1"
                    onClick={() => navigate(`/mentor/${mentor.username || mentor.id}`)}
                  >
                    <Calendar className="h-4 w-4" />
                    Book Again
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Message
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
