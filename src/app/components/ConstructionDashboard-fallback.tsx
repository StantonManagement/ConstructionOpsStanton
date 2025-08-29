'use client';

import React, { useState, useEffect, memo, useCallback } from 'react';
import Header from './Header';
import Navigation from './Navigation';
// Directly import the most critical components
import OverviewView from './OverviewView';
import PaymentProcessingView from './PaymentProcessingView';

// Lazy load less critical components
import { lazy, Suspense } from 'react';
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

import { Project } from '../context/DataContext';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, useSearchParams } from 'next/navigation';

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

  // URL-based tab management
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    const projectFromUrl = searchParams.get('project');
    
    if (tabFromUrl && ['overview', 'payment', 'payment-applications', 'projects', 'daily-logs', 'subcontractors', 'compliance', 'metrics', 'manage', 'user-management'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
    
    // Handle project selection from URL
    if (projectFromUrl && tabFromUrl === 'payment') {
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
      setSelectedProject(null);
    } else if (!projectFromUrl && tabFromUrl === 'payment') {
      setSelectedProject(null);
    }
  }, [searchParams]);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    
    if (tab !== 'payment') {
      params.delete('subtab');
      params.delete('project');
    }
    
    router.replace(`/?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  // Fetch user data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) return;

        const userMetadata = user.user_metadata || {};
        
        const { data: roleData, error: roleError } = await supabase
          .from('user_role')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (roleError) {
          console.error('Error fetching user role:', roleError);
        }

        setUserData({
          name: userMetadata.name || user.email?.split('@')[0] || 'User',
          email: user.email || '',
          avatar_url: userMetadata.avatar_url || '',
          role: roleData?.role || 'staff'
        });
      } catch (err) {
        console.error('Error fetching user data:', err);
      }
    };

    fetchUserData();
  }, []);

  const handleProjectSelect = useCallback((project: Project) => {
    setSelectedProject(project);
    setActiveTab('payment');
    const params = new URLSearchParams();
    params.set('tab', 'payment');
    params.set('project', project.id.toString());
    router.replace(`/?${params.toString()}`, { scroll: false });
  }, [router]);

  const handleSwitchToPayments = useCallback(() => {
    setSelectedProject(null);
    setActiveTab('payment');
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'payment');
    params.delete('project');
    router.replace(`/?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  const handleProfileUpdate = useCallback((profileData: any) => {
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
  }, []);

  // Simple loading component
  const SimpleLoader = () => (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading...</p>
      </div>
    </div>
  );

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
          {/* No Suspense for critical components */}
          {activeTab === 'overview' && <OverviewView onProjectSelect={handleProjectSelect} onSwitchToPayments={handleSwitchToPayments} searchQuery={searchQuery} />}
          {activeTab === 'payment' && (selectedProject ? 
            <Suspense fallback={<SimpleLoader />}>
              <SubcontractorSelectionView selectedProject={selectedProject} setSelectedProject={setSelectedProject} />
            </Suspense>
            : 
            <PaymentProcessingView setSelectedProject={setSelectedProject} searchQuery={searchQuery} />
          )}
          
          {/* Suspense for less critical components */}
          <Suspense fallback={<SimpleLoader />}>
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