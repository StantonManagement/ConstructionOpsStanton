'use client';

import React, { useState, useEffect, memo, useCallback, Suspense, lazy } from 'react';
import { BarChart2 } from 'lucide-react';
import Header from './Header';
import Navigation from './Navigation';
import { LoadingSpinner } from './LoadingStates';
import { Project } from '../context/DataContext';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, useSearchParams } from 'next/navigation';
// Removed progressive loading hook to fix refresh issues

// Lazy load heavy components
const OverviewView = lazy(() => import('./OverviewView'));
const PaymentsView = lazy(() => import('./PaymentsView'));
const ProjectsView = lazy(() => import('./ProjectsView'));
const FieldOpsView = lazy(() => import('./FieldOpsView'));
const DailyLogsView = lazy(() => import('./DailyLogsView'));
const BudgetDashboard = lazy(() => import('./BudgetDashboard'));
const ChangeOrdersView = lazy(() => import('./ChangeOrdersView'));
const SettingsView = lazy(() => import('./SettingsView'));
const ContractorsView = lazy(() => import('./ContractorsView'));
const UserProfile = lazy(() => import('./UserProfile'));

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

  // Removed progressive loading to fix refresh issues

  // URL-based tab management with redirects for old tab names
  useEffect(() => {
    let tabFromUrl = searchParams.get('tab');
    const projectFromUrl = searchParams.get('project');
    const subtabFromUrl = searchParams.get('subtab');
    
    // Redirect old tab names to new structure
    const redirects: Record<string, string> = {
      'payment-applications': 'payments',
      'payment': 'payments',
      'subcontractors': 'projects',
      'contracts': 'projects',
      'metrics': 'overview',
      'user-management': 'settings',
      'compliance': 'overview'
    };
    
    // Check if we need to redirect
    if (tabFromUrl && redirects[tabFromUrl]) {
      const newTab = redirects[tabFromUrl];
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', newTab);
      router.replace(`/?${params.toString()}`, { scroll: false });
      tabFromUrl = newTab;
    }
    
    // Validate and set active tab (new tab names only)
    if (tabFromUrl && ['overview', 'projects', 'field-ops', 'payments', 'contractors', 'change-orders', 'budget', 'settings', 'daily-logs'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
    
    // Clear selected project when switching tabs
    if (tabFromUrl && tabFromUrl !== 'payments') {
      setSelectedProject(null);
    }
  }, [searchParams, router]);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    // Update URL without page reload
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    
    // Clear irrelevant parameters based on the tab
    if (tab !== 'payments' && tab !== 'settings' && tab !== 'budget' && tab !== 'projects') {
      params.delete('subtab');
      params.delete('project');
    }
    
    router.replace(`/?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  // Simple user data fetch
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          setUserData({
            name: 'User',
            email: '',
            avatar_url: '',
            role: 'staff'
          });
          return;
        }

        const userMetadata = user.user_metadata || {};

        // Simple role fetch
        try {
          const { data: roleData, error: roleError } = await supabase
            .from('user_role')
            .select('role')
            .eq('user_id', user.id)
            .single();

          setUserData({
            name: userMetadata.name || user.email?.split('@')[0] || 'User',
            email: user.email || '',
            avatar_url: userMetadata.avatar_url || '',
            role: roleData?.role || 'staff'
          });
        } catch (roleErr) {
          console.warn('Role fetch failed, using default role');
          setUserData({
            name: userMetadata.name || user.email?.split('@')[0] || 'User',
            email: user.email || '',
            avatar_url: userMetadata.avatar_url || '',
            role: 'staff'
          });
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
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

  // Handle project selection and redirect to projects tab with project detail view
  const handleProjectSelect = useCallback((project: Project) => {
    setSelectedProject(project);
    setActiveTab('projects');
    // Update URL with project parameter
    const params = new URLSearchParams();
    params.set('tab', 'projects');
    params.set('project', project.id.toString());
    router.replace(`/?${params.toString()}`, { scroll: false });
  }, [router]);

  // Handle switching to payments tab without selecting a specific project
  const handleSwitchToPayments = useCallback(() => {
    setSelectedProject(null);
    setActiveTab('payments');
    // Update URL without project parameter
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'payments');
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
            {/* Overview Tab */}
            {activeTab === 'overview' && <OverviewView onProjectSelect={handleProjectSelect} onSwitchToPayments={handleSwitchToPayments} searchQuery={searchQuery} />}

            {/* Projects Tab */}
            {activeTab === 'projects' && <ProjectsView searchQuery={searchQuery} />}
            
            {/* Field Ops Tab */}
            {activeTab === 'field-ops' && <FieldOpsView />}
            
            {/* Payments Tab */}
            {activeTab === 'payments' && <PaymentsView searchQuery={searchQuery} />}
            
            {/* Contractors Tab */}
            {activeTab === 'contractors' && <ContractorsView searchQuery={searchQuery} />}
            
            {/* Change Orders Tab */}
            {activeTab === 'change-orders' && <ChangeOrdersView />}
            
            {/* Budget Dashboard Tab - Phase 3 Feature */}
            {activeTab === 'budget' && <BudgetDashboard />}
            
            {/* Settings Tab */}
            {activeTab === 'settings' && <SettingsView />}
            
            {/* Daily Logs Tab */}
            {activeTab === 'daily-logs' && <DailyLogsView searchQuery={searchQuery} />}
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