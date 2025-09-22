"use client";

import { useEffect, useState } from 'react';
import { DataProvider } from './context/DataContext';
import { supabase } from '@/lib/supabaseClient';
import ConstructionDashboard from './components/ConstructionDashboard';
import PMDashboard from './components/PMDashboard';
import AuthScreen from './components/AuthScreen';

// Optimized loading component - less resource intensive
const ConstructionLoader = () => {
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Loading...');

  useEffect(() => {
    // Simplified progress - just show loading without complex animations
    const timer = setTimeout(() => {
      setProgress(30);
      setLoadingText('Connecting...');
    }, 300);

    const timer2 = setTimeout(() => {
      setProgress(70);
      setLoadingText('Almost ready...');
    }, 1000);

    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
    };
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center max-w-md w-full px-4">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500 mx-auto mb-6"></div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Loading Dashboard
        </h2>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
          <div 
            className="bg-gradient-to-r from-orange-500 to-yellow-500 h-3 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        
        {/* Progress Text */}
        <p className="text-gray-600 mb-2">{loadingText}</p>
        <p className="text-sm text-gray-500">{progress}% Complete</p>
      </div>
    </div>
  );
};

export default function Page() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Set a hard timeout for the entire auth process
        const authTimeout = setTimeout(() => {
          console.warn('Auth process taking too long, proceeding with defaults');
          setSession(null);
          setRole(null);
          setLoading(false);
        }, 8000); // 8 second max timeout

        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);

        if (session?.user) {
          // Quick role fetch with shorter timeout
          try {
            const result = await Promise.race([
              supabase.from("users").select("role").eq("uuid", session.user.id).single(),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Role timeout')), 2000))
            ]) as any;
            setRole(result?.data?.role || null);
          } catch {
            setRole(null); // Default role on timeout
          }
        } else {
          setRole(null);
        }

        clearTimeout(authTimeout);
        setLoading(false);
      } catch (error) {
        console.error('Auth initialization failed:', error);
        setSession(null);
        setRole(null);
        setLoading(false);
      }
    };

    initAuth();

    // Simplified auth state listener
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (!session) {
        setRole(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (loading) return <ConstructionLoader />;
  if (!session) return <AuthScreen />;

  if (role === "pm") {
    return <PMDashboard />;
  }
  return (
    <DataProvider>
      <ConstructionDashboard />
    </DataProvider>
  );
}
