'use client';

import React from 'react';
import { PortfolioStats } from './components/PortfolioStats';
import { PortfolioBlockingAlert } from './components/PortfolioBlockingAlert';
import { PropertyList } from './components/PropertyList';
import { usePortfolioStats } from '@/hooks/queries/usePortfolio';
import { Loader2 } from 'lucide-react';

export default function PortfolioPage() {
  const { data: stats, isLoading } = usePortfolioStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // If we have no stats yet or error, show something reasonable or just null (will flicker if we return null)
  // For now, let's show the layout with empty stats if data is missing but not loading
  if (!stats) return null;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Renovation Portfolio</h1>
        <p className="text-gray-500">Portfolio-wide overview of all renovation projects</p>
      </div>

      {/* Stats Cards */}
      <PortfolioStats stats={stats} />

      {/* Blocking Alert */}
      <PortfolioBlockingAlert 
        blockedCount={stats.blocked_locations} 
        blockedByReason={stats.blocked_by_reason} 
      />

      {/* Property List */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Properties</h2>
        <PropertyList />
      </div>
    </div>
  );
}
