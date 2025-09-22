"use client";

import { useEffect, useState } from 'react';
import { DataProvider } from './context/DataContext';
import { supabase } from '@/lib/supabaseClient';
import ConstructionDashboard from './components/ConstructionDashboard';
import PMDashboard from './components/PMDashboard';
import AuthScreen from './components/AuthScreen';

// Simple loading component
const ConstructionLoader = () => {

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-800">Loading...</h2>
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
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);

        if (session?.user) {
          // Simple role fetch without complex timeouts
          try {
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
          } catch {
            setRole(null);
          }
        } else {
          setRole(null);
        }
      } catch (error) {
        console.error('Error fetching session:', error);
        setSession(null);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    getSessionAndRole();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        // Quick role update
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
          })
          .catch(() => setRole(null));
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
