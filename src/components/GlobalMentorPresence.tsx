import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMentorPresenceHeartbeat } from "@/hooks/useMentorPresence";

const GlobalMentorPresence = () => {
  const [mentorId, setMentorId] = useState<string | null>(null);

  useMentorPresenceHeartbeat(mentorId || undefined);

  useEffect(() => {
    let isMounted = true;

    const resolveMentorId = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (!session?.user?.id) {
        setMentorId(null);
        return;
      }

      const { data: mentorProfile, error } = await supabase
        .from("expert_profiles")
        .select("id")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (error || !mentorProfile?.id) {
        setMentorId(null);
        return;
      }

      setMentorId(mentorProfile.id);
    };

    void resolveMentorId();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void resolveMentorId();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return null;
};

export default GlobalMentorPresence;
