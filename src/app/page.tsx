"use client";

import { useEffect, useState } from 'react';
import { DataProvider } from './context/DataContext';
import { supabase } from '@/lib/supabaseClient';
import ConstructionDashboard from './components/ConstructionDashboard';
import PMDashboard from './components/PMDashboard';
import AuthScreen from './components/AuthScreen';

// Fast, simple loading component with progress
const ConstructionLoader = () => {
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Initializing...');

  useEffect(() => {
    const steps = [
      { progress: 20, text: 'Loading authentication...' },
      { progress: 40, text: 'Connecting to database...' },
      { progress: 60, text: 'Fetching user data...' },
      { progress: 80, text: 'Loading dashboard...' },
      { progress: 95, text: 'Almost ready...' }
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setProgress(steps[currentStep].progress);
        setLoadingText(steps[currentStep].text);
        currentStep++;
      } else {
        clearInterval(interval);
      }
    }, 500); // Update every 500ms

    return () => clearInterval(interval);
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
    const getSessionAndRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session?.user) {
        // Fetch user role from users table
        const { data, error } = await supabase
          .from("users")
          .select("role")
          .eq("uuid", session.user.id)
          .single();
        if (!error && data?.role) {
          setRole(data.role);
        } else {
          setRole(null);
        }
      } else {
        setRole(null);
      }
      setLoading(false);
    };
    getSessionAndRole();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        supabase
          .from("users")
          .select("role")
          .eq("uuid", session.user.id)
          .single()
          .then(({ data, error }) => {
            if (!error && data?.role) {
              setRole(data.role);
            } else {
              setRole(null);
            }
          });
      } else {
        setRole(null);
      }
    });
    return () => {
      listener.subscription.unsubscribe();
    };
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
