"use client";

import { useEffect, useState } from 'react';
import { DataProvider, useData } from './context/DataContext';
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

// Component that waits for DataContext to load
const DashboardWithLoading = () => {
  const { loading, error, refreshData } = useData();

  if (loading) {
    return <ConstructionLoader />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-4">
            <div className="text-red-600 text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-red-900 mb-2">
              Data Loading Error
            </h2>
            <p className="text-sm text-red-700 mb-4">
              {error}
            </p>
            <div className="text-xs text-red-600 bg-red-100 p-3 rounded mb-4 text-left font-mono">
              Check the browser console (F12) for detailed error information.
            </div>
          </div>
          <button
            onClick={() => refreshData()}
            className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
          >
            Retry Loading Data
          </button>
          <div className="mt-4 text-sm text-gray-600">
            <p>Common issues:</p>
            <ul className="text-left mt-2 space-y-1">
              <li>• Database tables may not exist</li>
              <li>• RLS policies may be blocking access</li>
              <li>• Network connection issues</li>
              <li>• Invalid Supabase configuration</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return <ConstructionDashboard />;
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
              .from("user_role")
              .select("role")
              .eq("user_id", session.user.id)
              .single();
            
            // Handle role: default to 'staff' if no role found
            // PGRST116 is "no rows found" - expected when user has no role entry yet
            if (error) {
              if (error.code !== 'PGRST116') {
                console.error('Error fetching user role:', error);
              }
              setRole('staff'); // Default to staff
            } else {
              setRole(data?.role || 'staff');
            }
          } catch {
            setRole('staff'); // Default to staff on unexpected errors
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
        (async () => {
          try {
            const { data, error } = await supabase
              .from("user_role")
              .select("role")
              .eq("user_id", session.user.id)
              .single();
            
            // Handle role: default to 'staff' if no role found
            if (error) {
              if (error.code !== 'PGRST116') {
                console.error('Error fetching user role:', error);
              }
              setRole('staff');
            } else {
              setRole(data?.role || 'staff');
            }
          } catch {
            setRole('staff');
          }
        })();
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
      <DashboardWithLoading />
    </DataProvider>
  );
}
