'use client';

import React, { useState } from 'react';
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

const ConstructionDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showProfile, setShowProfile] = useState(false);

  const handleLogout = async () => {
    await import('@/lib/supabaseClient').then(({ supabase }) => supabase.auth.signOut());
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Header onShowProfile={() => setShowProfile(true)} onLogout={handleLogout} />
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} setSelectedProject={setSelectedProject} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'overview' && <OverviewView />}
        {activeTab === 'payment' && (selectedProject ? <SubcontractorSelectionView selectedProject={selectedProject} setSelectedProject={setSelectedProject} /> : <PaymentProcessingView setSelectedProject={setSelectedProject} />)}
        {activeTab === 'subcontractors' && <SubcontractorsView />}
        {activeTab === 'compliance' && <ComplianceView />}
        {activeTab === 'metrics' && <MetricsView />}
        {activeTab === 'manage' && <ManageView />}
      </main>
      {showProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 relative w-full max-w-lg">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xl"
              onClick={() => setShowProfile(false)}
              aria-label="Close profile"
            >
              ×
            </button>
            <UserProfile />
          </div>
        </div>
      )}
    </div>
  );
};

export default ConstructionDashboard; 