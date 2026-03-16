import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Search, Loader2, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  listRequesterPriorityDm,
  markPriorityDmRead,
  type PriorityDmThread,
} from "@/services/priorityDmService";

interface StudentPriorityDmInboxProps {
  studentProfile: any;
}

export default function StudentPriorityDmInbox({ studentProfile }: StudentPriorityDmInboxProps) {
  const { toast } = useToast();
  const [threads, setThreads] = useState<PriorityDmThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingRead, setMarkingRead] = useState(false);

  const loadThreads = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }

      const result = await listRequesterPriorityDm();
      if (!result.success) {
        throw new Error(result.error || "Failed to load priority messages");
      }

      const items = result.data || [];
      setThreads(items);

      if (items.length === 0) {
        setSelectedThreadId(null);
      } else if (!selectedThreadId || !items.some((t) => t.id === selectedThreadId)) {
        setSelectedThreadId(items[0].id);
      }
    } catch (error: any) {
      console.error("Error loading requester priority DMs:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load messages",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!studentProfile?.id) {
      return;
    }

    loadThreads();
  }, [studentProfile?.id]);

  const filteredThreads = useMemo(() => {
    if (!searchQuery.trim()) {
      return threads;
    }

    const q = searchQuery.toLowerCase();
    return threads.filter(
      (thread) =>
        thread.requester_name.toLowerCase().includes(q) ||
        thread.message_text.toLowerCase().includes(q)
    );
  }, [threads, searchQuery]);

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) || null,
    [threads, selectedThreadId]
  );

  const handleMarkRead = async () => {
    if (!selectedThread || selectedThread.status !== "answered") {
      return;
    }

    try {
      setMarkingRead(true);
      const result = await markPriorityDmRead(selectedThread.id);
      if (!result.success) {
        throw new Error(result.error || "Failed to mark message as read");
      }

      toast({
        title: "Marked as read",
        description: "This message will be auto-deleted after 24 hours.",
      });

      await loadThreads(true);
    } catch (error: any) {
      console.error("Error marking message as read:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to mark message as read",
        variant: "destructive",
      });
    } finally {
      setMarkingRead(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Priority Messages</h1>
          <p className="text-gray-600 mt-1">Track paid priority messages and mentor replies.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setRefreshing(true);
            loadThreads(true);
          }}
          disabled={loading || refreshing}
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
                type="text"
                placeholder="Search your messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-sm text-gray-600">Loading messages...</div>
              ) : filteredThreads.length > 0 ? (
                filteredThreads.map((thread) => (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => setSelectedThreadId(thread.id)}
                    className={`w-full text-left p-4 border-b border-gray-200 hover:bg-gray-50 ${
                      selectedThreadId === thread.id ? "bg-gray-50" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{thread.requester_name}</p>
                        <p className="text-xs text-gray-500 mt-1 truncate">{thread.message_text}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDistanceToNow(new Date(thread.submitted_at), { addSuffix: true })}
                        </p>
                      </div>
                      <Badge variant="secondary" className="capitalize">{thread.status.replace(/_/g, " ")}</Badge>
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-10 text-center">
                  <MessageSquare className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600">No priority messages yet.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 lg:col-span-2">
          {selectedThread ? (
            <CardContent className="p-6 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-gray-900">Message Details</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Sent {formatDistanceToNow(new Date(selectedThread.submitted_at), { addSuffix: true })}
                  </p>
                </div>
                <Badge variant="secondary" className="capitalize">{selectedThread.status.replace(/_/g, " ")}</Badge>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-medium text-gray-600 mb-2">Your message</p>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedThread.message_text}</p>
              </div>

              <div className="rounded-lg border border-gray-200 p-4">
                <p className="text-xs font-medium text-gray-600 mb-2">Mentor reply</p>
                {selectedThread.mentor_reply_text ? (
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedThread.mentor_reply_text}</p>
                ) : (
                  <p className="text-sm text-gray-500">Waiting for mentor response.</p>
                )}
              </div>

              {selectedThread.status === "answered" && (
                <div className="flex justify-end">
                  <Button type="button" onClick={handleMarkRead} disabled={markingRead}>
                    {markingRead ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    Mark As Read
                  </Button>
                </div>
              )}

              {selectedThread.status === "read_by_requester" && selectedThread.delete_after && (
                <p className="text-xs text-amber-700">
                  This thread is scheduled for deletion {formatDistanceToNow(new Date(selectedThread.delete_after), { addSuffix: true })}.
                </p>
              )}
            </CardContent>
          ) : (
            <CardContent className="p-12 text-center">
              <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-sm font-medium text-gray-900">Select a message</p>
              <p className="text-sm text-gray-600 mt-1">Choose one thread from the left panel.</p>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
