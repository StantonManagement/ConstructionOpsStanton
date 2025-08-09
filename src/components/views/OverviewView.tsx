import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useData } from './dataContext';
import ProjectCard from './ProjectCard';
import ActivityFeed from './ActivityFeed';
import { Project } from './types';

interface OverviewViewProps {
  onProjectSelect: (project: Project) => void;
  onSwitchToPayments: () => void;
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
            // If user doesn't exist in users table, assume they need to be set up
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
        {/* Consider adding a login button or redirect here */}
      </div>
    );
  }

  if (role === "pending") {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
        <h1 className="text-2xl font-bold mb-4">Welcome, please complete your profile!</h1>
        <p className="text-lg mb-6">Your account is being set up. Please check back later or contact support.</p>
        {/* Consider adding a button to complete profile setup */}
      </div>
    );
  }

  // Render the main dashboard content if authenticated and role is determined
  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Enhanced Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        {/* Example Stat Card - Replace with actual stats */}
        <div className="bg-white rounded-lg shadow-sm p-4 border flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500 font-medium">Total Projects</div>
            <div className="text-2xl font-bold">{projects.length}</div>
          </div>
          <div className="bg-blue-100 rounded-full p-3">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 19a2 2 0 017 0v1a3 3 0 006 0v-1a2 2 0 017 0v-1a2 2 0 00-2-2H7a2 2 0 00-2 2v1zM8.5 15a2.5 2.5 0 015 0v1a2 2 0 004 0v-1a2 2 0 013.5-1.357L19 16.5s3 0 3 3v1a2 2 0 01-2 2H4a2 2 0 01-2-2v-1a2 2 0 013.5-1.357"></path></svg>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500 font-medium">Active Projects</div>
            <div className="text-2xl font-bold">{filteredProjects.length}</div>
          </div>
          <div className="bg-green-100 rounded-full p-3">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a10.75 10.75 0 001.283 7.768c.466.916.904 1.827 1.304 2.656M6.005 10.387a6.575 6.575 0 002.881 5.903M10.5 16.5a3.75 3.75 0 10-7.5 0v1.5m7.5-1.5h1.5m-7.5 0a3.75 3.75 0 017.5 0v1.5m-7.5 0H10.5"></path></svg>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500 font-medium">Tasks Completed</div>
            <div className="text-2xl font-bold">85%</div> {/* Placeholder */}
          </div>
          <div className="bg-yellow-100 rounded-full p-3">
            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12.75l3 3 6-6m7.5 5.25a4.5 4.5 0 01-1.414 3.174c-.872.738-1.985.872-3.037.872c-1.053 0-2.165-.134-3.037-.872a4.5 4.5 0 01-1.414-3.174c0-1.053.134-2.165.872-3.037a4.5 4.5 0 013.174-1.414c1.053 0 2.165.134 3.037.872.738.872.872 1.985.872 3.037z"></path></svg>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border flex items-center justify-between cursor-pointer" onClick={onSwitchToPayments}>
          <div>
            <div className="text-sm text-gray-500 font-medium">Total Revenue</div>
            <div className="text-2xl font-bold">$1,234.56</div> {/* Placeholder */}
          </div>
          <div className="bg-purple-100 rounded-full p-3">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m0 0h10m-3.5-6a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM4.5 19a2.5 2.5 0 005 0h-5z"></path></svg>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        {/* Projects Section */}
        <div className="bg-white rounded-lg border shadow-sm p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l2-2-2-2M2 12l3-3m0 0L2 12m3 3l-3-3M7 14h3m-3 0h3m-3 0h3M12 14h3m-3 0h3m-3 0h3M15 14v-1a2 2 0 00-2-2h-3a2 2 0 00-2 2v1"></path></svg>
              <h2 className="text-lg font-semibold text-gray-800">Projects</h2>
            </div>
            {/* Search Input */}
            <input
              type="text"
              placeholder="Search projects..."
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchQuery}
              onChange={(e) => { /* Handle search query change if needed, assuming it's managed by parent */ }}
            />
          </div>
          <div className="space-y-3">
            {filteredProjects.length > 0 ? (
              filteredProjects.map(project => (
                <ProjectCard key={project.id} project={project} onProjectSelect={onProjectSelect} />
              ))
            ) : (
              <p className="text-center text-gray-500 py-4">No projects found matching your search.</p>
            )}
          </div>
        </div>

        {/* Activity Feed Section */}
        <div className="bg-white rounded-lg border shadow-sm p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <h2 className="text-lg font-semibold text-gray-800">Recent Activity</h2>
          </div>
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
};

export default OverviewView;