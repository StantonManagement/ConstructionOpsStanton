'use client';

import React, { useState, useEffect, memo, useCallback, Suspense, lazy } from 'react';
import Header from './Header';
import Navigation from './Navigation';
import { LoadingSpinner } from './LoadingStates';
import { Project } from '../context/DataContext';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, useSearchParams } from 'next/navigation';
import { useProgressiveLoading } from '@/hooks/useProgressiveLoading';

// Lazy load heavy components
const OverviewView = lazy(() => import('./OverviewView'));
const PaymentProcessingView = lazy(() => import('./PaymentProcessingView'));
const PaymentApplicationsView = lazy(() => import('./PaymentApplicationsView'));
const ProjectsView = lazy(() => import('./ProjectsView'));
const DailyLogsView = lazy(() => import('./DailyLogsView'));
const SubcontractorsView = lazy(() => import('./SubcontractorsView'));
const ComplianceView = lazy(() => import('./ComplianceView'));
const MetricsView = lazy(() => import('./MetricsView'));
const ManageView = lazy(() => import('./ManageView'));
const SubcontractorSelectionView = lazy(() => import('./SubcontractorSelectionView'));
const UserProfile = lazy(() => import('./UserProfile'));
const UserManagementView = lazy(() => import('./UserManagementView'));

interface UserData {
  name: string;
  email: string;
  avatar_url: string;
  role: string;
}

const ConstructionDashboard: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Progressive loading for tabs
  const tabOrder = ['overview', 'payment', 'payment-applications', 'projects', 'daily-logs', 'subcontractors', 'compliance', 'metrics', 'manage', 'user-management'];
  const { isTabLoaded, isTabLoading } = useProgressiveLoading(activeTab, {
    delay: 150,
    staggerDelay: 100,
    enabledTabs: tabOrder
  });

  // URL-based tab management
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    const projectFromUrl = searchParams.get('project');
    const subtabFromUrl = searchParams.get('subtab');
    
    if (tabFromUrl && ['overview', 'payment', 'payment-applications', 'projects', 'daily-logs', 'subcontractors', 'compliance', 'metrics', 'manage', 'user-management'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
    
    // Handle project selection from URL
    if (projectFromUrl && tabFromUrl === 'payment') {
      // Fetch project data and set selected project
      const fetchProjectFromUrl = async () => {
        try {
          const { data: project, error } = await supabase
            .from('projects')
            .select('*')
            .eq('id', projectFromUrl)
            .single();
          
          if (!error && project) {
            setSelectedProject(project);
          }
        } catch (err) {
          console.error('Error fetching project from URL:', err);
        }
      };
      
      fetchProjectFromUrl();
    } else if (tabFromUrl && tabFromUrl !== 'payment') {
      // Clear selected project when switching away from payment tab
      setSelectedProject(null);
    } else if (!projectFromUrl && tabFromUrl === 'payment') {
      // Clear selected project when on payment tab but no project in URL
      setSelectedProject(null);
    }
  }, [searchParams]);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    // Update URL without page reload
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    
    // Clear irrelevant parameters based on the tab
    if (tab !== 'payment') {
      params.delete('subtab');
      params.delete('project');
    }
    
    router.replace(`/?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  // Fetch user data on component mount with caching
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Add timeout to prevent hanging
        const userPromise = supabase.auth.getUser();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('User fetch timeout')), 5000)
        );

        const userResult = await Promise.race([
          userPromise,
          timeoutPromise
        ]) as any;

        const user = userResult?.data?.user;
        const userError = userResult?.error;

        if (userError || !user) {
          // Set default user data to prevent loading indefinitely
          setUserData({
            name: 'User',
            email: '',
            avatar_url: '',
            role: 'staff'
          });
          return;
        }

        // Get user metadata from auth.users
        const userMetadata = user.user_metadata || {};

        // Get user role with timeout
        try {
          const rolePromise = supabase
            .from('user_role')
            .select('role')
            .eq('user_id', user.id)
            .single();
          const roleTimeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Role fetch timeout')), 3000)
          );

          const roleResult = await Promise.race([
            rolePromise,
            roleTimeoutPromise
          ]) as any;

          const roleData = roleResult?.data;
          const roleError = roleResult?.error;

          setUserData({
            name: userMetadata.name || user.email?.split('@')[0] || 'User',
            email: user.email || '',
            avatar_url: userMetadata.avatar_url || '',
            role: roleData?.role || 'staff'
          });
        } catch (roleErr) {
          console.warn('Role fetch failed, using default role:', roleErr);
          setUserData({
            name: userMetadata.name || user.email?.split('@')[0] || 'User',
            email: user.email || '',
            avatar_url: userMetadata.avatar_url || '',
            role: 'staff'
          });
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
        // Set fallback data to prevent infinite loading
        setUserData({
          name: 'User',
          email: '',
          avatar_url: '',
          role: 'staff'
        });
      }
    };

    fetchUserData();
  }, []);

  // Handle project selection and redirect to payments tab
  const handleProjectSelect = useCallback((project: Project) => {
    setSelectedProject(project);
    setActiveTab('payment');
    // Update URL with project parameter
    const params = new URLSearchParams();
    params.set('tab', 'payment');
    params.set('project', project.id.toString());
    router.replace(`/?${params.toString()}`, { scroll: false });
  }, [router]);

  // Handle switching to payments tab without selecting a specific project
  const handleSwitchToPayments = useCallback(() => {
    setSelectedProject(null);
    setActiveTab('payment');
    // Update URL without project parameter
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'payment');
    params.delete('project');
    router.replace(`/?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  const handleProfileUpdate = useCallback((profileData: any) => {
    // Update local user data when profile is updated
    setUserData({
      name: profileData.name,
      email: profileData.email,
      avatar_url: profileData.avatar_url,
      role: profileData.role
    });
  }, []);

  const handleLogout = useCallback(async () => {
    await import('@/lib/supabaseClient').then(({ supabase }) => supabase.auth.signOut());
    window.location.href = "/";
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    // If we're on the manage tab, we'll pass this search query to ManageView
    // For other tabs, we can implement specific search logic as needed
  }, []);



  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Header 
        onShowProfile={() => setShowProfile(true)} 
        onLogout={handleLogout} 
        userData={userData}
        onSearch={handleSearch}
        searchQuery={searchQuery}
      />

      <Navigation activeTab={activeTab} setActiveTab={handleTabChange} setSelectedProject={setSelectedProject} selectedProject={selectedProject} />
      <main className="lg:ml-64 transition-all duration-300 pt-20 lg:pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Suspense fallback={<LoadingSpinner size="lg" text="Loading..." className="py-20" />}>
            {/* Always show overview immediately - no progressive loading for main tab */}
            {activeTab === 'overview' && <OverviewView onProjectSelect={handleProjectSelect} onSwitchToPayments={handleSwitchToPayments} searchQuery={searchQuery} />}

            {/* Other tabs use progressive loading */}
            {activeTab === 'payment' && (selectedProject ? <SubcontractorSelectionView selectedProject={selectedProject} setSelectedProject={setSelectedProject} /> : <PaymentProcessingView setSelectedProject={setSelectedProject} searchQuery={searchQuery} />)}
            {activeTab === 'payment-applications' && <PaymentApplicationsView searchQuery={searchQuery} />}
            {activeTab === 'projects' && <ProjectsView searchQuery={searchQuery} />}
            {activeTab === 'daily-logs' && <DailyLogsView searchQuery={searchQuery} />}
            {activeTab === 'subcontractors' && <SubcontractorsView searchQuery={searchQuery} />}
            {activeTab === 'compliance' && <ComplianceView />}
            {activeTab === 'metrics' && <MetricsView />}
            {activeTab === 'manage' && <ManageView searchQuery={searchQuery} />}
            {activeTab === 'user-management' && <UserManagementView />}
          </Suspense>
        </div>
      </main>
      <Suspense fallback={null}>
        <UserProfile
          isOpen={showProfile}
          onClose={() => setShowProfile(false)}
          onProfileUpdate={handleProfileUpdate}
        />
      </Suspense>
    </div>
  );
};

export default memo(ConstructionDashboard); 