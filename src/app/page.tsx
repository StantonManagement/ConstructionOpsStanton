"use client";

import { useEffect, useState } from 'react';
import { DataProvider } from './context/DataContext';
import { supabase } from '@/lib/supabaseClient';
import ConstructionDashboard from './components/ConstructionDashboard';
import PMDashboard from './components/PMDashboard';
import AuthScreen from './components/AuthScreen';

// Construction-themed loading component
const ConstructionLoader = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      <div className="text-center">
        {/* Construction Site Animation */}
        <div className="relative mb-8">
          {/* Sky background */}
          <div className="w-80 h-48 bg-gradient-to-b from-blue-200 to-blue-100 rounded-t-lg relative overflow-hidden">
            {/* Clouds */}
            <div className="absolute top-4 left-8 w-12 h-6 bg-white rounded-full opacity-80 animate-pulse"></div>
            <div className="absolute top-6 right-12 w-8 h-4 bg-white rounded-full opacity-60 animate-pulse delay-500"></div>
            
            {/* Sparkling effects */}
            <div className="absolute top-8 left-20 w-1 h-1 bg-yellow-300 rounded-full animate-ping"></div>
            <div className="absolute top-12 right-20 w-1 h-1 bg-yellow-400 rounded-full animate-ping delay-700"></div>
            <div className="absolute top-16 left-32 w-0.5 h-0.5 bg-white rounded-full animate-pulse delay-1000"></div>
            
            {/* Construction Crane */}
            <div className="absolute bottom-0 right-8">
              {/* Crane base */}
              <div className="w-2 h-16 bg-yellow-600 relative">
                {/* Crane arm */}
                <div className="absolute -top-1 -left-8 w-16 h-1 bg-yellow-600 origin-left transform animate-pulse"></div>
                {/* Crane cable */}
                <div className="absolute top-0 left-6 w-0.5 h-8 bg-gray-800 animate-pulse"></div>
                {/* Hook */}
                <div className="absolute top-8 left-5 w-2 h-1 bg-gray-600 rounded animate-bounce delay-300"></div>
              </div>
            </div>
            
            {/* Building under construction */}
            <div className="absolute bottom-0 left-12">
              {/* Foundation */}
              <div className="w-20 h-4 bg-gray-600"></div>
              {/* Floors being built */}
              <div className="w-20 h-8 bg-gray-400 animate-pulse"></div>
              <div className="w-20 h-8 bg-gray-300 animate-pulse delay-200"></div>
              <div className="w-16 h-6 bg-gray-200 animate-pulse delay-500"></div>
            </div>
          </div>
          
          {/* Ground */}
          <div className="w-80 h-12 bg-gradient-to-b from-amber-200 to-amber-300 rounded-b-lg relative">
            {/* Construction vehicles */}
            <div className="absolute top-2 left-4 flex items-end space-x-2">
              {/* Bulldozer */}
              <div className="relative">
                <div className="w-8 h-4 bg-yellow-500 rounded animate-bounce delay-700"></div>
                <div className="w-2 h-2 bg-black rounded-full mt-1 animate-spin"></div>
              </div>
              
              {/* Dump truck */}
              <div className="relative animate-bounce delay-1000">
                <div className="w-10 h-5 bg-orange-500 rounded"></div>
                <div className="flex space-x-2 mt-1">
                  <div className="w-2 h-2 bg-black rounded-full animate-spin"></div>
                  <div className="w-2 h-2 bg-black rounded-full animate-spin"></div>
                </div>
              </div>
            </div>
            
            {/* Construction materials */}
            <div className="absolute top-1 right-8 flex space-x-1">
              <div className="w-2 h-3 bg-amber-600 animate-pulse"></div>
              <div className="w-2 h-4 bg-amber-700 animate-pulse delay-200"></div>
              <div className="w-2 h-2 bg-amber-800 animate-pulse delay-400"></div>
            </div>
            
            {/* Dust particles */}
            <div className="absolute top-4 left-16 w-0.5 h-0.5 bg-amber-400 rounded-full animate-bounce delay-300 opacity-60"></div>
            <div className="absolute top-6 left-24 w-1 h-1 bg-amber-300 rounded-full animate-ping delay-800 opacity-40"></div>
            <div className="absolute top-3 right-16 w-0.5 h-0.5 bg-yellow-600 rounded-full animate-pulse delay-600 opacity-50"></div>
          </div>
        </div>
        
        {/* Loading text with construction theme */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center justify-center gap-2">
            <span className="animate-bounce">🏗️</span>
            Building Your Dashboard
            <span className="animate-bounce delay-300">⚡</span>
          </h2>
          
          {/* Progress bar */}
          <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden mx-auto">
            <div className="h-full bg-gradient-to-r from-orange-400 to-yellow-400 rounded-full animate-pulse relative">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-ping"></div>
            </div>
          </div>
          
          {/* Loading dots */}
          <div className="flex justify-center space-x-1">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce delay-100"></div>
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce delay-200"></div>
          </div>
          
          <p className="text-gray-600 text-sm animate-pulse">
            Setting up your construction management tools...
          </p>
          
          {/* Construction tools icons */}
          <div className="flex justify-center space-x-4 mt-6 text-2xl">
            <span className="animate-bounce delay-100">🔨</span>
            <span className="animate-bounce delay-300">⚒️</span>
            <span className="animate-bounce delay-500">🏗️</span>
            <span className="animate-bounce delay-700">👷</span>
            <span className="animate-bounce delay-900">🚧</span>
          </div>
        </div>
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
