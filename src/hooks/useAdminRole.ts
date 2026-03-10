import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AdminRoleResult {
  isAdmin: boolean;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to check if the current user has admin role
 * @returns {AdminRoleResult} Object containing admin status, loading state, and error
 */
export function useAdminRole(): AdminRoleResult {
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    checkAdminRole();
  }, []);

  const checkAdminRole = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      if (!user) {
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      // Check if user has admin role
      const { data, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (roleError) throw roleError;

      setIsAdmin(!!data);
    } catch (err) {
      console.error('Error checking admin role:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  };

  return { isAdmin, isLoading, error };
}

/**
 * Alternative hook that returns a promise-based function to check admin role
 * Useful for one-time checks or when you need to trigger the check manually
 */
export async function checkIsAdmin(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    return !!data;
  } catch (error) {
    console.error('Error checking admin role:', error);
    return false;
  }
}
