'use client';

import React, { useState, useEffect } from 'react';
import Header from './Header';
import Navigation from './Navigation';
import OverviewView from './OverviewView';
import PaymentProcessingView from './PaymentProcessingView';
import PaymentApplicationsView from './PaymentApplicationsView';
import ProjectsView from './ProjectsView';
import DailyLogsView from './DailyLogsView';
import SubcontractorsView from './SubcontractorsView';
import ComplianceView from './ComplianceView';
import MetricsView from './MetricsView';
import ManageView from './ManageView';
import SubcontractorSelectionView from './SubcontractorSelectionView';
import UserProfile from './UserProfile';
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
    const subtabFromUrl = searchParams.get('subtab');
    
    if (tabFromUrl && ['overview', 'payment', 'payment-applications', 'projects', 'daily-logs', 'subcontractors', 'compliance', 'metrics', 'manage'].includes(tabFromUrl)) {
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

  const handleTabChange = (tab: string) => {
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
  };

  // Fetch user data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) return;

        const { data, error } = await supabase
          .from('users')
          .select('name, email, avatar_url, role')
          .eq('uuid', user.id)
          .single();

        if (!error && data) {
          setUserData({
            name: data.name || '',
            email: data.email || user.email || '',
            avatar_url: data.avatar_url || '',
            role: data.role || ''
          });
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
      }
    };

    fetchUserData();
  }, []);

  // Handle project selection and redirect to payments tab
  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
    setActiveTab('payment');
    // Update URL with project parameter
    const params = new URLSearchParams();
    params.set('tab', 'payment');
    params.set('project', project.id.toString());
    router.replace(`/?${params.toString()}`, { scroll: false });
  };

  // Handle switching to payments tab without selecting a specific project
  const handleSwitchToPayments = () => {
    setSelectedProject(null);
    setActiveTab('payment');
    // Update URL without project parameter
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'payment');
    params.delete('project');
    router.replace(`/?${params.toString()}`, { scroll: false });
  };

  const handleProfileUpdate = (profileData: any) => {
    // Update local user data when profile is updated
    setUserData({
      name: profileData.name,
      email: profileData.email,
      avatar_url: profileData.avatar_url,
      role: profileData.role
    });
  };

  const handleLogout = async () => {
    await import('@/lib/supabaseClient').then(({ supabase }) => supabase.auth.signOut());
    window.location.href = "/";
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // If we're on the manage tab, we'll pass this search query to ManageView
    // For other tabs, we can implement specific search logic as needed
  };

  const handleNavigateToPM = () => {
    window.location.href = '/pm-dashboard';
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Header 
        onShowProfile={() => setShowProfile(true)} 
        onLogout={handleLogout} 
        userData={userData}
        onSearch={handleSearch}
        searchQuery={searchQuery}
      />
      {userData?.role === 'pm' && (
        <div className="fixed bottom-4 right-4 z-50">
          <button
            onClick={handleNavigateToPM}
            className="bg-green-600 hover:bg-green-700 text-white p-3 rounded-full shadow-lg transition-colors"
            title="Go to PM Dashboard"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </button>
        </div>
      )}
      <Navigation activeTab={activeTab} setActiveTab={handleTabChange} setSelectedProject={setSelectedProject} selectedProject={selectedProject} />
      <main className="lg:ml-64 transition-all duration-300 pt-20 lg:pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {activeTab === 'overview' && <OverviewView onProjectSelect={handleProjectSelect} onSwitchToPayments={handleSwitchToPayments} searchQuery={searchQuery} />}
          {activeTab === 'payment' && (selectedProject ? <SubcontractorSelectionView selectedProject={selectedProject} setSelectedProject={setSelectedProject} /> : <PaymentProcessingView setSelectedProject={setSelectedProject} searchQuery={searchQuery} />)}
          {activeTab === 'payment-applications' && <PaymentApplicationsView searchQuery={searchQuery} />}
          {activeTab === 'projects' && <ProjectsView searchQuery={searchQuery} />}
          {activeTab === 'daily-logs' && <DailyLogsView searchQuery={searchQuery} />}
          {activeTab === 'subcontractors' && <SubcontractorsView searchQuery={searchQuery} />}
          {activeTab === 'compliance' && <ComplianceView />}
          {activeTab === 'metrics' && <MetricsView />}
          {activeTab === 'manage' && <ManageView searchQuery={searchQuery} />}
        </div>
      </main>
      <UserProfile 
        isOpen={showProfile} 
        onClose={() => setShowProfile(false)}
        onProfileUpdate={handleProfileUpdate}
      />
    </div>
  );
};

export default ConstructionDashboard; 