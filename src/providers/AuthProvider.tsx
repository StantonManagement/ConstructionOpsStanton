"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
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
  
  // Track if we're currently fetching role to prevent race conditions
  const isFetchingRole = useRef(false);

  // Define signOut function
  const signOut = useCallback(async () => {
    try {
      // Clear role cache from sessionStorage
      if (user?.id) {
        sessionStorage.removeItem(`user_role_${user.id}`);
      }
      
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setRole(null);
    } catch (err) {
      console.error('[Auth] Sign out error:', err);
    }
  }, [user?.id]);

  // Move fetchUserRole outside useEffect to fix stale closure bug
  const fetchUserRole = useCallback(async (userId: string, forceRefresh: boolean = false) => {
    // Prevent concurrent role fetches
    if (isFetchingRole.current) {
      console.log('[Auth] Role fetch already in progress, skipping');
      return;
    }

    // Check sessionStorage cache first (unless force refresh)
    if (!forceRefresh) {
      const cachedRole = sessionStorage.getItem(`user_role_${userId}`);
      if (cachedRole) {
        console.log('[Auth] Using cached role:', cachedRole);
        setRole(cachedRole);
        setError(null);
        return;
      }
    }

    isFetchingRole.current = true;
    
    try {
      console.log('[Auth] Fetching role for user:', userId);

      // Query user_role table (RLS ensures users can only see their own role)
      const { data, error } = await supabase
        .from('user_role')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle(); // Use maybeSingle() to avoid error if no rows found

      if (error) {
        console.error('[Auth] Error fetching role:', error);
        setRole('staff'); // Default to staff on error
        setError(`Failed to fetch user role: ${error.message}`);
      } else if (!data) {
        // No role assigned yet
        console.log('[Auth] No role assigned, defaulting to staff');
        const defaultRole = 'staff';
        setRole(defaultRole);
        sessionStorage.setItem(`user_role_${userId}`, defaultRole);
      } else {
        const fetchedRole = data.role || 'staff';
        setRole(fetchedRole);
        // Cache the role in sessionStorage
        sessionStorage.setItem(`user_role_${userId}`, fetchedRole);
        console.log('[Auth] User role set to:', fetchedRole);
        setError(null); // Clear any previous errors on success
      }
    } catch (err) {
      console.error('[Auth] Role fetch error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error fetching role';
      setError(errorMessage);
      setRole('staff'); // Default to staff on error
    } finally {
      isFetchingRole.current = false;
    }
  }, []);

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
        // Always set loading to false, even on error
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] State change:', event);
        
        // Handle TOKEN_REFRESHED without causing issues
        if (event === 'TOKEN_REFRESHED') {
          console.log('[Auth] Token refreshed, maintaining current session');
          setSession(session);
          // Don't refetch role on token refresh, just maintain state
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);

        // Wrap role fetching in try-catch to prevent hanging
        if (session?.user) {
          try {
            await fetchUserRole(session.user.id);
          } catch (err) {
            console.error('[Auth] Error in onAuthStateChange role fetch:', err);
            // Error already handled in fetchUserRole, just log here
          }
        } else {
          setRole(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserRole]);

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

