import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_ONLINE_THRESHOLD_MS = 2 * 60 * 1000;
const HEARTBEAT_INTERVAL_MS = 30 * 1000;

const toTimestamp = (value: string | null | undefined) => {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
};

export const isMentorOnlineFromLastSeen = (
  lastSeen?: string | null,
  onlineThresholdMs: number = DEFAULT_ONLINE_THRESHOLD_MS,
  nowMs: number = Date.now()
) => {
  const lastSeenTs = toTimestamp(lastSeen);
  if (!lastSeenTs) return false;
  return nowMs - lastSeenTs <= onlineThresholdMs;
};

export const useMentorPresenceHeartbeat = (mentorId?: string) => {
  useEffect(() => {
    if (!mentorId) return;

    let isCancelled = false;

    const sendHeartbeat = async () => {
      if (isCancelled) return;

      const { error } = await supabase
        .from("expert_profiles")
        .update({ last_seen: new Date().toISOString() })
        .eq("id", mentorId);

      if (error) {
        console.warn("[presence] heartbeat update failed", error.message);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void sendHeartbeat();
      }
    };

    const handleFocus = () => {
      void sendHeartbeat();
    };

    void sendHeartbeat();

    const intervalId = window.setInterval(() => {
      void sendHeartbeat();
    }, HEARTBEAT_INTERVAL_MS);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [mentorId]);
};

export const useMentorLiveStatus = (
  mentorId?: string,
  initialLastSeen?: string | null,
  onlineThresholdMs: number = DEFAULT_ONLINE_THRESHOLD_MS
) => {
  const [lastSeen, setLastSeen] = useState<string | null>(initialLastSeen || null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setLastSeen(initialLastSeen || null);
  }, [initialLastSeen]);

  useEffect(() => {
    if (!mentorId) return;

    let isMounted = true;

    const fetchInitialPresence = async () => {
      const { data, error } = await supabase
        .from("expert_profiles")
        .select("last_seen")
        .eq("id", mentorId)
        .maybeSingle();

      if (!isMounted) return;

      if (error) {
        console.warn("[presence] initial fetch failed", error.message);
        return;
      }

      if (data?.last_seen) {
        setLastSeen(data.last_seen);
      }
    };

    void fetchInitialPresence();

    const channel = supabase
      .channel(`mentor-presence-${mentorId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "expert_profiles",
          filter: `id=eq.${mentorId}`,
        },
        (payload) => {
          const nextLastSeen = (payload.new as { last_seen?: string | null })
            ?.last_seen;
          setLastSeen(nextLastSeen || null);
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
    };
  }, [mentorId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 15 * 1000);

    return () => window.clearInterval(timer);
  }, []);

  const isOnline = useMemo(() => {
    return isMentorOnlineFromLastSeen(lastSeen, onlineThresholdMs, now);
  }, [lastSeen, now, onlineThresholdMs]);

  return {
    isOnline,
    lastSeen,
  };
};

export const useMentorPresenceMap = (
  mentors: Array<{
    id: string;
    last_seen?: string | null;
    is_profile_live?: boolean;
  }>,
  onlineThresholdMs: number = DEFAULT_ONLINE_THRESHOLD_MS
) => {
  const [presenceMap, setPresenceMap] = useState<Record<string, boolean>>({});
  const [now, setNow] = useState(() => Date.now());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const mentorIds = useMemo(
    () => mentors.map((mentor) => mentor.id).filter(Boolean),
    [mentors]
  );

  useEffect(() => {
    let isMounted = true;

    const syncCurrentUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) return;
      setCurrentUserId(session?.user?.id || null);
    };

    void syncCurrentUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUserId(session?.user?.id || null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const nextMap: Record<string, boolean> = {};
    mentors.forEach((mentor) => {
      const isProfileLive = Boolean(mentor.is_profile_live);
      nextMap[mentor.id] =
        mentor.id === currentUserId
          ? isProfileLive
          : isProfileLive &&
            isMentorOnlineFromLastSeen(mentor.last_seen, onlineThresholdMs, now);
    });
    setPresenceMap(nextMap);
  }, [mentors, onlineThresholdMs, now, currentUserId]);

  useEffect(() => {
    if (!mentorIds.length) return;

    let isMounted = true;
    const mentorIdSet = new Set(mentorIds);

    const refreshPresence = async () => {
      const { data, error } = await supabase
        .from("expert_profiles")
        .select("id, last_seen, is_profile_live")
        .in("id", mentorIds);

      if (!isMounted || error || !data) {
        if (error) {
          console.warn("[presence-map] refresh failed", error.message);
        }
        return;
      }

      setPresenceMap((prev) => {
        const next = { ...prev };
        data.forEach((mentor) => {
          const isProfileLive = Boolean(mentor.is_profile_live);
          next[mentor.id] =
            mentor.id === currentUserId
              ? isProfileLive
              : isProfileLive &&
                isMentorOnlineFromLastSeen(mentor.last_seen, onlineThresholdMs);
        });
        return next;
      });
    };

    void refreshPresence();

    const channel = supabase
      .channel(`mentor-presence-map-${mentorIds.length}-${mentorIds[0]}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "expert_profiles",
        },
        (payload) => {
          const nextMentor = payload.new as {
            id?: string;
            last_seen?: string | null;
            is_profile_live?: boolean;
          };

          if (!nextMentor?.id || !mentorIdSet.has(nextMentor.id)) return;

          setPresenceMap((prev) => ({
            ...prev,
            [nextMentor.id]:
              nextMentor.id === currentUserId
                ? Boolean(nextMentor.is_profile_live)
                : Boolean(nextMentor.is_profile_live) &&
                  isMentorOnlineFromLastSeen(nextMentor.last_seen, onlineThresholdMs),
          }));
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
    };
  }, [mentorIds, onlineThresholdMs, currentUserId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 15 * 1000);

    return () => window.clearInterval(timer);
  }, []);

  return presenceMap;
};
