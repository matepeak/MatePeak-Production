import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Search,
  Calendar,
  MessageSquare,
  ChevronDown,
  Loader2,
  Save,
  Activity,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Student {
  student_id: string;
  student_name: string;
  student_avatar_url?: string;
  first_session: string;
  last_session: string;
  total_sessions: number;
  completed_sessions: number;
  upcoming_sessions: number;
  notes?: string;
  tags?: string[];
}

interface StudentDirectoryProps {
  mentorProfile: any;
}

const StudentDirectory = ({ mentorProfile }: StudentDirectoryProps) => {
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, [mentorProfile]);

  const fetchStudents = async () => {
    try {
      setLoading(true);

      if (!mentorProfile?.id) {
        setStudents([]);
        return;
      }

      const mentorIds = Array.from(
        new Set([
          mentorProfile.id,
          mentorProfile.user_id,
          mentorProfile.profile_id,
        ].filter(Boolean))
      );

      if (mentorIds.length === 0) {
        setStudents([]);
        return;
      }

      // Fetch all bookings for this mentor
      const { data: bookings, error } = await supabase
        .from("bookings")
        .select(
          "id, user_id, student_name, student_email, status, scheduled_date, scheduled_time, created_at"
        )
        .in("expert_id", mentorIds)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!bookings || bookings.length === 0) {
        setStudents([]);
        return;
      }

      const uniqueUserIds = Array.from(
        new Set(bookings.map((b) => b.user_id).filter(Boolean))
      );

      // Best effort profile enrichment by user id only.
      // Do not fail the whole directory if profiles access is restricted.
      const { data: profilesByIdData } =
        uniqueUserIds.length > 0
          ? await supabase
              .from("profiles")
              .select("id, full_name, avatar_url")
              .in("id", uniqueUserIds)
          : { data: [] };

      const profileById = new Map(
        (profilesByIdData || []).map((profile) => [profile.id, profile])
      );

      // Group bookings by student
      const studentMap = new Map<string, Student>();

      bookings?.forEach((booking) => {
        const studentProfile = booking.user_id
          ? profileById.get(booking.user_id)
          : undefined;
        const studentName =
          studentProfile?.full_name ||
          booking.student_name ||
          (booking.student_email
            ? String(booking.student_email)
                .split("@")[0]
                .replace(/[._-]/g, " ")
                .trim()
            : "Student");
        const normalizedName = studentName.toLowerCase();
        const studentId = booking.user_id || `name:${normalizedName}`;
        const scheduledDate = booking.scheduled_date || booking.created_at;
        
        if (!studentMap.has(studentId)) {
          studentMap.set(studentId, {
            student_id: studentId,
            student_name: studentName,
            student_avatar_url: studentProfile?.avatar_url || undefined,
            first_session: scheduledDate,
            last_session: scheduledDate,
            total_sessions: 0,
            completed_sessions: 0,
            upcoming_sessions: 0,
            notes: "",
            tags: [],
          });
        }

        const student = studentMap.get(studentId)!;
        student.total_sessions++;
        if (!student.student_avatar_url && studentProfile?.avatar_url) {
          student.student_avatar_url = studentProfile.avatar_url;
        }
        if (student.student_name === "Student" && studentName) {
          student.student_name = studentName;
        }

        if (booking.status === "completed") {
          student.completed_sessions++;
        }

        const sessionDate = new Date(
          `${booking.scheduled_date}T${booking.scheduled_time || "00:00"}`
        );
        const now = new Date();

        if (sessionDate > now && booking.status === "confirmed") {
          student.upcoming_sessions++;
        }

        // Update first and last session dates
        if (scheduledDate < student.first_session) {
          student.first_session = scheduledDate;
        }
        if (scheduledDate > student.last_session) {
          student.last_session = scheduledDate;
        }
      });

      // Fetch notes from student_notes table
      const { data: notesData } = await supabase
        .from("student_notes")
        .select("*")
        .eq("expert_id", mentorProfile.id);

      notesData?.forEach((note) => {
        if (studentMap.has(note.student_id)) {
          const student = studentMap.get(note.student_id)!;
          student.notes = note.notes;
          student.tags = note.tags || [];
        }
      });

      const sortedStudents = Array.from(studentMap.values()).sort(
        (a, b) =>
          new Date(b.last_session).getTime() - new Date(a.last_session).getTime()
      );

      setStudents(sortedStudents);
    } catch (error: any) {
      console.error("Error fetching students:", error);
      toast({
        title: "Error",
        description: "Failed to load students",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotes = async (studentId: string) => {
    try {
      setSavingNotes(true);

      const { error } = await supabase
        .from("student_notes")
        .upsert({
          expert_id: mentorProfile.id,
          student_id: studentId,
          notes: notesText.trim(),
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Notes saved successfully",
      });

      setEditingNotes(null);
      fetchStudents();
    } catch (error: any) {
      console.error("Error saving notes:", error);
      toast({
        title: "Error",
        description: "Failed to save notes",
        variant: "destructive",
      });
    } finally {
      setSavingNotes(false);
    }
  };

  const filteredStudents = students.filter((student) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return student.student_name.toLowerCase().includes(query);
  });

  const getStudentInitials = (name: string) => {
    const parts = name.split(" ");
    return parts
      .map((p) => p[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Directory</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage your students and track their progress
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white border border-gray-200 rounded-2xl shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-3xl font-bold text-gray-900 mb-1.5">
                  {students.length}
                </p>
                <p className="text-sm font-medium text-gray-600">
                  Total Students
                </p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-gray-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200 rounded-2xl shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-3xl font-bold text-gray-900 mb-1.5">
                  {students.filter((s) => s.upcoming_sessions > 0).length}
                </p>
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Active Students
                  </p>
                  <p className="text-xs text-gray-500 mt-1">With upcoming sessions</p>
                </div>
              </div>
              <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center">
                <Activity className="h-5 w-5 text-gray-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200 rounded-2xl shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-3xl font-bold text-gray-900 mb-1.5">
                  {students.reduce((sum, s) => sum + s.total_sessions, 0)}
                </p>
                <p className="text-sm font-medium text-gray-600">
                  Total Sessions
                </p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-gray-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
        <Input
          placeholder="Search students by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-white border border-gray-200 rounded-xl h-11"
        />
      </div>

      {/* Students List - 2 Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="bg-white border border-gray-200 rounded-2xl shadow-sm">
              <CardContent className="p-6">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))
        ) : filteredStudents.length > 0 ? (
          filteredStudents.map((student) => (
            <Collapsible
              key={student.student_id}
              open={expandedStudent === student.student_id}
              onOpenChange={(open) =>
                setExpandedStudent(open ? student.student_id : null)
              }
            >
              <Card className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md hover:border-gray-300 transition-all group">
                <CollapsibleTrigger className="w-full">
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          {/* Avatar */}
                          <Avatar className="h-12 w-12 border border-gray-200">
                            <AvatarImage
                              src={student.student_avatar_url || ""}
                              alt={student.student_name}
                            />
                            <AvatarFallback className="bg-gray-100 text-gray-700 font-semibold">
                              {getStudentInitials(student.student_name)}
                            </AvatarFallback>
                          </Avatar>

                          {/* Info */}
                          <div className="text-left min-w-0 flex-1">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {student.student_name}
                            </h3>
                          </div>
                        </div>

                        {/* Expand Icon */}
                        <ChevronDown
                          className={`h-5 w-5 text-gray-400 transition-transform flex-shrink-0 ml-2 group-hover:text-gray-600 ${
                            expandedStudent === student.student_id
                              ? "transform rotate-180"
                              : ""
                          }`}
                        />
                      </div>

                      {/* Stats Row */}
                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        <span className="text-xs font-medium text-gray-700 bg-gray-100 rounded-md px-2.5 py-1">
                          {student.total_sessions} session{student.total_sessions !== 1 ? "s" : ""}
                        </span>
                        <span className="text-xs font-medium text-gray-700 bg-gray-100 rounded-md px-2.5 py-1">
                          {student.completed_sessions} completed
                        </span>
                        {student.upcoming_sessions > 0 && (
                          <Badge className="text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-md">
                            {student.upcoming_sessions} upcoming
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="border-t border-gray-200 p-6 space-y-4 bg-gray-50/70">
                    {/* Session Stats */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
                        <p className="text-2xl font-bold text-gray-900">
                          {student.total_sessions}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">Total</p>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
                        <p className="text-2xl font-bold text-blue-600">
                          {student.completed_sessions}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">Completed</p>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
                        <p className="text-2xl font-bold text-green-600">
                          {student.upcoming_sessions}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">Upcoming</p>
                      </div>
                    </div>

                    {/* Notes Section */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          Private Notes
                        </h4>
                        {editingNotes !== student.student_id && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingNotes(student.student_id);
                              setNotesText(student.notes || "");
                            }}
                          >
                            Edit Notes
                          </Button>
                        )}
                      </div>

                      {editingNotes === student.student_id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={notesText}
                            onChange={(e) => setNotesText(e.target.value)}
                            placeholder="Add private notes about this student..."
                            rows={4}
                            className="resize-none"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleSaveNotes(student.student_id)}
                              disabled={savingNotes}
                              className="bg-gray-900 hover:bg-gray-800"
                            >
                              {savingNotes ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <Save className="h-4 w-4 mr-2" />
                                  Save Notes
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingNotes(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : student.notes ? (
                        <div className="p-3 bg-white rounded-lg border border-gray-200">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {student.notes}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">
                          No notes yet. Click "Edit Notes" to add some.
                        </p>
                      )}
                    </div>

                    {/* Session History */}
                    <div>
                      <p className="text-sm font-medium text-gray-900 mb-2">
                        Session History
                      </p>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>
                          First session:{" "}
                          {new Date(student.first_session).toLocaleDateString()}
                        </p>
                        <p>
                          Last session:{" "}
                          {new Date(student.last_session).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))
        ) : (
          <Card className="bg-white border border-gray-200 rounded-2xl shadow-sm md:col-span-2">
            <CardContent className="p-12 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm font-medium text-gray-900">
                {searchQuery ? "No students found" : "No students yet"}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {searchQuery
                  ? "Try a different search term"
                  : "Students will appear here after they book sessions"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default StudentDirectory;
