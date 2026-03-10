import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

interface AdminAuthContextType {
  adminUser: User | null;
  isAdminAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAdminSession();
  }, []);

  const checkAdminSession = async () => {
    try {
      setIsLoading(true);
      
      // Check if there's an existing session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Check if user has admin role
        const isAdmin = await verifyAdminRole(session.user.id);
        
        if (isAdmin) {
          setAdminUser(session.user);
          setIsAdminAuthenticated(true);
        } else {
          setAdminUser(null);
          setIsAdminAuthenticated(false);
        }
      }
    } catch (error) {
      console.error('Error checking admin session:', error);
      setAdminUser(null);
      setIsAdminAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyAdminRole = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

      if (error) {
        console.error('Error verifying admin role:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Error in verifyAdminRole:', error);
      return false;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      // Sign in with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        return { 
          success: false, 
          error: authError.message 
        };
      }

      if (!authData.user) {
        return { 
          success: false, 
          error: 'Login failed' 
        };
      }

      // Verify admin role
      const isAdmin = await verifyAdminRole(authData.user.id);

      if (!isAdmin) {
        // Sign out if not admin
        await supabase.auth.signOut();
        return { 
          success: false, 
          error: 'Access denied. Admin privileges required.' 
        };
      }

      // Set admin user
      setAdminUser(authData.user);
      setIsAdminAuthenticated(true);

      return { success: true };
    } catch (error: any) {
      console.error('Admin login error:', error);
      return { 
        success: false, 
        error: error.message || 'An error occurred during login' 
      };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setAdminUser(null);
      setIsAdminAuthenticated(false);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <AdminAuthContext.Provider 
      value={{ 
        adminUser, 
        isAdminAuthenticated, 
        isLoading, 
        login, 
        logout 
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return context;
}
