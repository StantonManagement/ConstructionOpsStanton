'use client';

import React, { useState, useEffect } from 'react';
import Header from './Header';
import Navigation from './Navigation';
import OverviewView from './OverviewView';
import PaymentProcessingView from './PaymentProcessingView';
import SubcontractorsView from './SubcontractorsView';
import ComplianceView from './ComplianceView';
import MetricsView from './MetricsView';
import ManageView from './ManageView';
import SubcontractorSelectionView from './SubcontractorSelectionView';
import UserProfile from './UserProfile';
import { Project } from '../context/DataContext';
import { supabase } from '@/lib/supabaseClient';

interface UserData {
  name: string;
  email: string;
  avatar_url: string;
  role: string;
}

const ConstructionDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);

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
  };

  // Handle switching to payments tab without selecting a specific project
  const handleSwitchToPayments = () => {
    setSelectedProject(null);
    setActiveTab('payment');
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

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Header onShowProfile={() => setShowProfile(true)} onLogout={handleLogout} userData={userData} />
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} setSelectedProject={setSelectedProject} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'overview' && <OverviewView onProjectSelect={handleProjectSelect} onSwitchToPayments={handleSwitchToPayments} />}
        {activeTab === 'payment' && (selectedProject ? <SubcontractorSelectionView selectedProject={selectedProject} setSelectedProject={setSelectedProject} /> : <PaymentProcessingView setSelectedProject={setSelectedProject} />)}
        {activeTab === 'subcontractors' && <SubcontractorsView />}
        {activeTab === 'compliance' && <ComplianceView />}
        {activeTab === 'metrics' && <MetricsView />}
        {activeTab === 'manage' && <ManageView />}
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