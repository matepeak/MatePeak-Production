import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";
import { MessageSquare, Send, Loader2, Search, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import {
  listMentorPriorityDmPending,
  replyPriorityDm,
  type PriorityDmThread,
} from "@/services/priorityDmService";

interface MessagingProps {
  mentorProfile: any;
}

const MentorPriorityDmInbox = ({ mentorProfile }: MessagingProps) => {
  const [threads, setThreads] = useState<PriorityDmThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const loadPendingThreads = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }

      const result = await listMentorPriorityDmPending();
      if (!result.success) {
        throw new Error(result.error || "Failed to load pending messages");
      }

      const pending = result.data || [];
      setThreads(pending);

      if (pending.length === 0) {
        setSelectedThreadId(null);
      } else if (!selectedThreadId || !pending.some((t) => t.id === selectedThreadId)) {
        setSelectedThreadId(pending[0].id);
      }
    } catch (error: any) {
      console.error("Error loading priority DMs:", error);
      toast.error("Error", {
        description: error.message || "Failed to load priority messages",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!mentorProfile?.id) {
      return;
    }

    loadPendingThreads();

    // Set up realtime subscription for auto-refresh
    const channel = supabase
      .channel(`priority_dm_${mentorProfile.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "priority_dm_threads",
          filter: `mentor_id=eq.${mentorProfile.id}`,
        },
        () => {
          console.log("Priority DM thread change detected, refreshing...");
          loadPendingThreads(true);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [mentorProfile?.id]);

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) || null,
    [threads, selectedThreadId]
  );

  const filteredThreads = useMemo(() => {
    if (!searchQuery.trim()) {
      return threads;
    }

    const q = searchQuery.toLowerCase();
    return threads.filter(
      (thread) =>
        thread.requester_name.toLowerCase().includes(q) ||
        thread.requester_email.toLowerCase().includes(q)
    );
  }, [threads, searchQuery]);

  const handleSendReply = async () => {
    if (!selectedThread || !replyText.trim()) {
      return;
    }

    try {
      setSending(true);
      const result = await replyPriorityDm(selectedThread.id, replyText.trim());

      if (!result.success) {
        throw new Error(result.error || "Failed to send reply");
      }

      setReplyText("");
      toast.success("Reply sent", {
        description: "Your priority reply has been delivered.",
      });

      await loadPendingThreads(true);
    } catch (error: any) {
      console.error("Error replying to priority DM:", error);
      toast.error("Error", {
        description: error.message || "Failed to send reply",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Priority Messages</h1>
          <p className="text-gray-600 mt-1">
            Respond to paid priority messages from students and mentors.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setRefreshing(true);
            loadPendingThreads(true);
          }}
          disabled={refreshing || loading}
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-gray-200 lg:col-span-1">
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-sm text-gray-600">Loading pending threads...</div>
              ) : filteredThreads.length > 0 ? (
                filteredThreads.map((thread) => (
                  <button
                    key={thread.id}
                    onClick={() => setSelectedThreadId(thread.id)}
                    className={`w-full p-4 text-left border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                      selectedThreadId === thread.id ? "bg-gray-50" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">{thread.requester_name}</h4>
                        <p className="text-xs text-gray-500 truncate">{thread.requester_email}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Submitted {formatDistanceToNow(new Date(thread.submitted_at), { addSuffix: true })}
                        </p>
                      </div>
                      <Badge className="bg-amber-100 text-amber-800 border-0">pending</Badge>
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-10 text-center">
                  <MessageSquare className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600">No pending priority messages.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 lg:col-span-2">
          {selectedThread ? (
            <CardContent className="p-6 space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedThread.requester_name}</h3>
                  <p className="text-sm text-gray-600">{selectedThread.requester_email}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Submitted {formatDistanceToNow(new Date(selectedThread.submitted_at), { addSuffix: true })}
                  </p>
                </div>
                <Badge className="bg-amber-100 text-amber-800 border-0">{selectedThread.status}</Badge>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Message</p>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedThread.message_text}</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Your reply</p>
                <Input
                  placeholder="Write your reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendReply();
                    }
                  }}
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={handleSendReply}
                    disabled={!replyText.trim() || sending}
                    className="bg-gray-900 hover:bg-gray-800"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Send Reply
                  </Button>
                </div>
              </div>
            </CardContent>
          ) : (
            <CardContent className="p-12 text-center">
              <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-sm font-medium text-gray-900">Select a priority message</p>
              <p className="text-sm text-gray-600 mt-1">Pick an item from the left to view and reply.</p>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
};

export default MentorPriorityDmInbox;
