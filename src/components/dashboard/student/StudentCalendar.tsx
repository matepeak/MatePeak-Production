import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { toast } from "@/components/ui/sonner";

interface StudentCalendarProps {
  studentProfile: any;
}

export default function StudentCalendar({ studentProfile }: StudentCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          expert_profiles (
            full_name,
            profile_picture_url,
            expertise
          )
        `)
        .eq('student_id', user.id)
        .neq('status', 'cancelled');

      if (error) throw error;
      setSessions(data || []);
    } catch (error: any) {
      console.error('Error fetching sessions:', error);
      toast.error('Failed to load calendar');
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const getSessionsForDate = (date: Date) => {
    return sessions.filter(session => {
      const sessionDate = new Date(session.session_date);
      return (
        sessionDate.getDate() === date.getDate() &&
        sessionDate.getMonth() === date.getMonth() &&
        sessionDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const exportToICS = () => {
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//MatePeak//Student Sessions//EN',
      ...sessions.map(session => {
        const start = new Date(session.session_date);
        const end = new Date(start.getTime() + (session.duration || 60) * 60000);
        
        return [
          'BEGIN:VEVENT',
          `DTSTART:${start.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
          `DTEND:${end.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
          `SUMMARY:Session with ${session.expert_profiles?.full_name || 'Mentor'}`,
          `DESCRIPTION:${session.message || 'Mentorship session'}`,
          `STATUS:${session.status.toUpperCase()}`,
          'END:VEVENT'
        ].join('\n');
      }).join('\n'),
      'END:VCALENDAR'
    ].join('\n');

    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'matepeak-sessions.ics';
    a.click();
    toast.success('Calendar exported successfully');
  };

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Calculate stats
  const monthSessions = sessions.filter(s => {
    const d = new Date(s.session_date);
    return d.getMonth() === month && d.getFullYear() === year;
  });
  const upcomingSessions = monthSessions.filter(s => new Date(s.session_date) > new Date()).length;
  const completedSessions = monthSessions.filter(s => s.status === 'completed').length;

  const renderCalendar = () => {
    const days = [];
    const totalCells = Math.ceil((daysInMonth + startingDayOfWeek) / 7) * 7;

    // Empty cells before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(
        <div key={`empty-${i}`} className="min-h-24 border border-gray-200 bg-gray-50"></div>
      );
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const daySessions = getSessionsForDate(date);
      const isToday = 
        date.getDate() === new Date().getDate() &&
        date.getMonth() === new Date().getMonth() &&
        date.getFullYear() === new Date().getFullYear();

      days.push(
        <div
          key={day}
          className={`min-h-24 border border-gray-200 p-2 hover:bg-gray-50 cursor-pointer transition-colors ${
            isToday ? 'bg-blue-50 border-blue-300' : 'bg-white'
          }`}
          onClick={() => daySessions.length > 0 && setSelectedSession(daySessions[0])}
        >
          <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
            {day}
          </div>
          <div className="space-y-1">
            {daySessions.slice(0, 2).map((session, idx) => (
              <div
                key={idx}
                className={`text-xs p-1 rounded truncate ${
                  session.status === 'confirmed'
                    ? 'bg-green-100 text-green-800'
                    : session.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {new Date(session.session_date).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}
                {' '}
                {session.expert_profiles?.full_name?.split(' ')[0]}
              </div>
            ))}
            {daySessions.length > 2 && (
              <div className="text-xs text-gray-500 font-medium">
                +{daySessions.length - 2} more
              </div>
            )}
          </div>
        </div>
      );
    }

    // Empty cells after month ends
    const remainingCells = totalCells - days.length;
    for (let i = 0; i < remainingCells; i++) {
      days.push(
        <div key={`empty-end-${i}`} className="min-h-24 border border-gray-200 bg-gray-50"></div>
      );
    }

    return days;
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-12 bg-gray-200 rounded"></div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{monthName}</h2>
          <div className="flex gap-4 mt-2 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <div className="h-3 w-3 rounded bg-green-100 border border-green-300"></div>
              Confirmed: {monthSessions.filter(s => s.status === 'confirmed').length}
            </span>
            <span className="flex items-center gap-1">
              <div className="h-3 w-3 rounded bg-yellow-100 border border-yellow-300"></div>
              Pending: {monthSessions.filter(s => s.status === 'pending').length}
            </span>
            <span className="flex items-center gap-1">
              <div className="h-3 w-3 rounded bg-blue-100 border border-blue-300"></div>
              Completed: {completedSessions}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={previousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={exportToICS}>
            Export to Calendar
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-4">
          {/* Week day headers */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm font-semibold text-gray-700 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-2">
            {renderCalendar()}
          </div>
        </CardContent>
      </Card>

      {/* Session Details Modal */}
      {selectedSession && (
        <Card className="border-blue-300 bg-blue-50">
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle className="text-lg">Session Details</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedSession(null)}
              >
                ×
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gray-300 overflow-hidden">
                {selectedSession.expert_profiles?.profile_picture_url ? (
                  <img
                    src={selectedSession.expert_profiles.profile_picture_url}
                    alt={selectedSession.expert_profiles.full_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-blue-600 text-white font-bold">
                    {selectedSession.expert_profiles?.full_name?.charAt(0) || 'M'}
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  {selectedSession.expert_profiles?.full_name || 'Mentor'}
                </h3>
                <p className="text-sm text-gray-600">
                  {selectedSession.expert_profiles?.expertise?.[0] || 'Expert'}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-700">
                <CalendarIcon className="h-4 w-4" />
                <span>
                  {new Date(selectedSession.session_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Clock className="h-4 w-4" />
                <span>
                  {new Date(selectedSession.session_date).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}
                  {' • '}
                  {selectedSession.duration || 60} minutes
                </span>
              </div>
            </div>

            <Badge className={
              selectedSession.status === 'confirmed'
                ? 'bg-green-100 text-green-800'
                : selectedSession.status === 'pending'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-blue-100 text-blue-800'
            }>
              {selectedSession.status}
            </Badge>

            {selectedSession.message && (
              <p className="text-sm text-gray-700 bg-white p-3 rounded border">
                {selectedSession.message}
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <Button className="flex-1">View Details</Button>
              <Button variant="outline" className="flex-1">Message Mentor</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
