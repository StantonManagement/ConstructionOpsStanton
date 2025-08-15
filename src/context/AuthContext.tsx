'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth, AuthContext as AuthContextType, UserProfile, SystemConfig } from '@/lib/auth';
import { supabase } from '@/lib/supabaseClient';

interface AuthContextValue extends AuthContextType {
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, name: string, systemAccess?: string[]) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<{ success: boolean; error?: string }>;
  switchSystem: (systemId: string) => Promise<{ success: boolean; error?: string }>;
  hasPermission: (feature: string, systemId?: string) => Promise<boolean>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [currentSystem, setCurrentSystem] = useState<string | null>(null);
  const [availableSystems, setAvailableSystems] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshUser = async () => {
    try {
      const currentUser = await auth.getCurrentUser();
      setUser(currentUser);
      
      if (currentUser) {
        const systems = await auth.getAvailableSystems();
        setAvailableSystems(systems);
        
        // Set current system if not already set
        if (!currentSystem && systems.length > 0) {
          const defaultSystem = systems.find(s => s.id === 'construction') || systems[0];
          setCurrentSystem(defaultSystem.id);
          auth.setCurrentSystem(defaultSystem.id);
        }
      } else {
        setAvailableSystems([]);
        setCurrentSystem(null);
      }
    } catch (err) {
      console.error('Error refreshing user:', err);
      setError('Failed to refresh user data');
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await auth.signIn(email, password);
      
      if (result.success) {
        await refreshUser();
      } else {
        setError(result.error || 'Sign in failed');
      }
      
      return result;
    } catch (err) {
      const errorMessage = 'An unexpected error occurred during sign in';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string, systemAccess: string[] = ['construction']) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await auth.signUp(email, password, name, systemAccess);
      
      if (result.success) {
        await refreshUser();
      } else {
        setError(result.error || 'Sign up failed');
      }
      
      return result;
    } catch (err) {
      const errorMessage = 'An unexpected error occurred during sign up';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    
    try {
      const result = await auth.signOut();
      
      if (result.success) {
        setUser(null);
        setCurrentSystem(null);
        setAvailableSystems([]);
        setError(null);
      } else {
        setError(result.error || 'Sign out failed');
      }
      
      return result;
    } catch (err) {
      const errorMessage = 'An unexpected error occurred during sign out';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const switchSystem = async (systemId: string) => {
    try {
      const result = await auth.switchSystem(systemId);
      
      if (result.success) {
        setCurrentSystem(systemId);
        auth.setCurrentSystem(systemId);
      } else {
        setError(result.error || 'Failed to switch system');
      }
      
      return result;
    } catch (err) {
      const errorMessage = 'An unexpected error occurred while switching systems';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const hasPermission = async (feature: string, systemId?: string) => {
    try {
      return await auth.hasPermission(feature, systemId);
    } catch (err) {
      console.error('Error checking permission:', err);
      return false;
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    setLoading(true);
    
    try {
      const result = await auth.updateProfile(updates);
      
      if (result.success) {
        await refreshUser();
      } else {
        setError(result.error || 'Failed to update profile');
      }
      
      return result;
    } catch (err) {
      const errorMessage = 'An unexpected error occurred while updating profile';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await refreshUser();
      } catch (err) {
        console.error('Error initializing auth:', err);
        setError('Failed to initialize authentication');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await refreshUser();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setCurrentSystem(null);
        setAvailableSystems([]);
        setError(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const value: AuthContextValue = {
    user,
    currentSystem,
    availableSystems,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    switchSystem,
    hasPermission,
    updateProfile,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
