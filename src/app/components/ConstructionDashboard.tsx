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
import { Project } from '../context/DataContext';

const ConstructionDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Header />
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} setSelectedProject={setSelectedProject} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'overview' && <OverviewView />}
        {activeTab === 'payment' && (selectedProject ? <SubcontractorSelectionView selectedProject={selectedProject} setSelectedProject={setSelectedProject} /> : <PaymentProcessingView setSelectedProject={setSelectedProject} />)}
        {activeTab === 'subcontractors' && <SubcontractorsView />}
        {activeTab === 'compliance' && <ComplianceView />}
        {activeTab === 'metrics' && <MetricsView />}
        {activeTab === 'manage' && <ManageView />}
      </main>
    </div>
  );
};

export default ConstructionDashboard; 