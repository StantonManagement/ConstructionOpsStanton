"use client";

import { useEffect, useState } from 'react';
import { DataProvider } from './context/DataContext';
import ConstructionDashboard from './components/ConstructionDashboard';
import PMDashboard from './components/PMDashboard';
import AuthScreen from './components/AuthScreen';
import { supabase } from '@/lib/supabaseClient';

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

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
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
