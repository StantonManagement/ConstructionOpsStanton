
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useData } from '../../app/context/DataContext';
import ProjectCard from '../ProjectCard';
import { Project } from '../../app/context/DataContext';

interface OverviewViewProps {
  onProjectSelect?: (project: Project) => void;
  onSwitchToPayments?: () => void;
  searchQuery?: string;
}

const OverviewView: React.FC<OverviewViewProps> = ({ onProjectSelect, onSwitchToPayments, searchQuery = '' }) => {
  const { projects } = useData();
  const [role, setRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getRole = async () => {
      try {
        setIsLoading(true);
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log("Session:", session, "Error:", sessionError);

        if (sessionError) {
          console.error("Session error:", sessionError);
          setRole("unknown");
          return;
        }

        if (session?.user) {
          const { data, error } = await supabase
            .from("users")
            .select("role")
            .eq("uuid", session.user.id)
            .single();

          console.log("User role fetch:", data, error);

          if (error) {
            console.error("Role fetch error:", error);
            setRole("pending");
          } else {
            setRole(data?.role || "user");
          }
        } else {
          setRole("unauthenticated");
        }
      } catch (err) {
        console.error("Error fetching user role:", err);
        setRole("unknown");
      } finally {
        setIsLoading(false);
      }
    };

    getRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        getRole();
      } else if (event === 'SIGNED_OUT') {
        setRole("unauthenticated");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Show main loader while role and initial data is loading
  if (isLoading || role === null) {
    return (
      <div className="space-y-8">
        {/* Loading Stats Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-4 animate-pulse">
              <div className="flex items-center justify-center gap-2 mb-1">
                <div className="w-5 h-5 bg-gray-200 rounded"></div>
                <div className="w-16 h-8 bg-gray-200 rounded"></div>
              </div>
              <div className="w-20 h-4 bg-gray-200 rounded mx-auto mb-1"></div>
              <div className="w-16 h-3 bg-gray-200 rounded mx-auto"></div>
            </div>
          ))}
        </div>

        {/* Loading Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
          {/* Loading Projects Section */}
          <div className="bg-white rounded-lg border shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gray-200 rounded animate-pulse"></div>
                <div className="w-40 h-6 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border rounded-lg p-4 bg-gray-50 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Loading Queue Section */}
          <div className="bg-white rounded-lg border shadow-sm p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-gray-200 rounded animate-pulse"></div>
              <div className="w-32 h-6 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="border rounded-lg p-4 bg-gray-50 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Loading Indicator */}
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <span className="text-gray-600 font-medium">Loading dashboard...</span>
          </div>
        </div>
      </div>
    );
  }

  // Handle different roles or unauthenticated state
  if (error) {
    return <div className="text-red-500 text-center py-8">Error loading dashboard: {error}</div>;
  }

  if (role === "unauthenticated") {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
        <h1 className="text-2xl font-bold mb-4">Welcome!</h1>
        <p className="text-lg mb-6">Please log in to access your dashboard.</p>
      </div>
    );
  }

  if (role === "pending") {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
        <h1 className="text-2xl font-bold mb-4">Welcome, please complete your profile!</h1>
        <p className="text-lg mb-6">Your account is being set up. Please check back later or contact support.</p>
      </div>
    );
  }

  // Filter projects based on search query
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const searchLower = searchQuery.toLowerCase();
    return projects.filter(project =>
      project.name.toLowerCase().includes(searchLower) ||
      project.client_name?.toLowerCase().includes(searchLower) ||
      project.current_phase?.toLowerCase().includes(searchLower)
    );
  }, [projects, searchQuery]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalProjects = filteredProjects.length;
    const activeProjects = filteredProjects.filter(p =>
      !p.current_phase?.toLowerCase().includes('complete') &&
      !p.current_phase?.toLowerCase().includes('closed')
    ).length;

    const totalBudget = filteredProjects.reduce((sum, p) => {
      const budget = Number(p.budget) || 0;
      return sum + budget;
    }, 0);

    const totalSpent = filteredProjects.reduce((sum, p) => {
      const spent = Number(p.spent) || 0;
      return sum + spent;
    }, 0);

    const remainingBudget = totalBudget - totalSpent;
    const utilizationRate = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100 * 10) / 10 : 0;

    return {
      totalProjects,
      activeProjects,
      totalBudget,
      totalSpent,
      remainingBudget,
      utilizationRate
    };
  }, [filteredProjects]);

  return (
    <div className="space-y-8">
      {/* Enhanced Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4 border flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500 font-medium">Total Projects</div>
            <div className="text-2xl font-bold">{stats.totalProjects}</div>
            <div className="text-xs text-gray-400">{stats.activeProjects} active</div>
          </div>
          <div className="bg-blue-100 rounded-full p-3">
            <span className="text-2xl">🏗️</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500 font-medium">Total Budget</div>
            <div className="text-2xl font-bold">${stats.totalBudget.toLocaleString()}</div>
          </div>
          <div className="bg-green-100 rounded-full p-3">
            <span className="text-2xl">💰</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500 font-medium">Total Spent</div>
            <div className="text-2xl font-bold">${stats.totalSpent.toLocaleString()}</div>
            <div className="text-xs text-gray-400">{stats.utilizationRate}% utilized</div>
          </div>
          <div className="bg-yellow-100 rounded-full p-3">
            <span className="text-2xl">💸</span>
          </div>
        </div>

        <div 
          className="bg-white rounded-lg shadow-sm p-4 border flex items-center justify-between cursor-pointer hover:shadow-md transition-all" 
          onClick={onSwitchToPayments}
        >
          <div>
            <div className="text-sm text-gray-500 font-medium">Remaining Budget</div>
            <div className="text-2xl font-bold">${stats.remainingBudget.toLocaleString()}</div>
            <div className="text-xs text-blue-600 font-medium">Click to view payments →</div>
          </div>
          <div className="bg-purple-100 rounded-full p-3">
            <span className="text-2xl">{stats.remainingBudget >= 0 ? "✅" : "⚠️"}</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        {/* Projects Section */}
        <div className="bg-white rounded-lg border shadow-sm p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏗️</span>
              <h2 className="text-lg font-semibold text-gray-800">Projects ({filteredProjects.length})</h2>
            </div>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredProjects.length > 0 ? (
              filteredProjects.map(project => (
                <ProjectCard key={project.id} project={project} onSelect={onProjectSelect} />
              ))
            ) : (
              <div className="text-gray-500 text-center py-8 flex flex-col items-center gap-2">
                <span className="text-2xl">📋</span>
                <span>{searchQuery ? 'No projects match your search' : 'No projects found'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Activity/Queue Section */}
        <div className="bg-white rounded-lg border shadow-sm p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">📋</span>
            <h2 className="text-lg font-semibold text-gray-800">Recent Activity</h2>
          </div>
          <div className="space-y-3">
            <div className="text-gray-500 text-center py-8 flex flex-col items-center gap-2">
              <span className="text-2xl">✅</span>
              <span>No recent activity</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewView;
