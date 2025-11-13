"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: string | null;
  isLoading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('[Auth] Session error:', sessionError);
          setError(sessionError.message);
          setSession(null);
          setUser(null);
          setRole(null);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);

        // Fetch user role if authenticated
        if (session?.user) {
          await fetchUserRole(session.user.id);
        } else {
          setRole(null);
        }
      } catch (err) {
        console.error('[Auth] Initialization error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log('[Auth] State change:', _event);
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchUserRole(session.user.id);
        } else {
          setRole(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_role')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (error) {
        // PGRST116 = no rows found, user hasn't been assigned a role yet
        if (error.code === 'PGRST116') {
          console.log('[Auth] No role assigned, defaulting to staff');
          setRole('staff');
        } else {
          console.error('[Auth] Error fetching role:', error);
          setRole('staff'); // Default to staff on error
        }
      } else {
        setRole(data?.role || 'staff');
        console.log('[Auth] User role:', data?.role || 'staff');
      }
    } catch (err) {
      console.error('[Auth] Role fetch error:', err);
      setRole('staff'); // Default to staff on error
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setRole(null);
    } catch (err) {
      console.error('[Auth] Sign out error:', err);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    role,
    isLoading,
    error,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

