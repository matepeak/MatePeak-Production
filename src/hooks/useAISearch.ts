
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MentorProfile } from '@/components/MentorCard';
import { toast } from "@/components/ui/sonner";

export function useAISearch() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchMentors = async (query: string): Promise<MentorProfile[]> => {
    setIsLoading(true);
    setError(null);

    try {
      console.log("Sending search query to AI:", query);
      const { data, error } = await supabase.functions.invoke('ai-search', {
        body: { query }
      });

      if (error) {
        console.error("Supabase function error:", error);
        throw error;
      }
      
      if (!data || !data.mentors) {
        console.error("Unexpected response format:", data);
        throw new Error("Received invalid data format from search");
      }
      
      console.log("Search results:", data.mentors);
      return data.mentors;
    } catch (err) {
      console.error('AI Search error (feature not yet available):', err);
      setError('AI search is not available. Using standard search.');
      // Don't show error toast - let the calling component handle it gracefully
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  return { searchMentors, isLoading, error };
}
