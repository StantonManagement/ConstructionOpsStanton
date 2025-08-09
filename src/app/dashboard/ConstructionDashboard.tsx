
"use client";

import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import OverviewView from './OverviewView';
import SubcontractorsView from './SubcontractorsView';
import ManageView from './ManageView';
import PaymentProcessingView from './PaymentProcessingView';
import ComplianceView from './ComplianceView';
import MetricsView from './MetricsView';
import Navigation from './Navigation';
import Header from './Header';

export default function ConstructionDashboard() {
  const [activeView, setActiveView] = useState('overview');
  const { state } = useData();

  const renderView = () => {
    switch (activeView) {
      case 'overview':
        return <OverviewView />;
      case 'subcontractors':
        return <SubcontractorsView />;
      case 'manage':
        return <ManageView />;
      case 'payment-processing':
        return <PaymentProcessingView />;
      case 'compliance':
        return <ComplianceView />;
      case 'metrics':
        return <MetricsView />;
      default:
        return <OverviewView />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Navigation activeView={activeView} onViewChange={setActiveView} />
      <main className="container mx-auto px-4 py-6">
        {renderView()}
      </main>
    </div>
  );
}
