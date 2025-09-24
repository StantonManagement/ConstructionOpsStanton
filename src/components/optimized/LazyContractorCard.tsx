'use client';

import React, { memo } from 'react';
import LazyCard from './LazyCard';
import OptimizedContractorCard from './OptimizedContractorCard';
import type { Subcontractor } from '@/app/context/DataContext';

interface LazyContractorCardProps {
  contractor: Subcontractor;
  onSendSMS?: (contractor: Subcontractor) => void;
  onEdit?: (contractor: Subcontractor) => void;
  className?: string;
}

const ContractorCardPlaceholder = memo(() => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
    {/* Header */}
    <div className="flex items-start justify-between mb-4">
      <div>
        <div className="flex items-center space-x-3 mb-2">
          <div className="h-5 bg-gray-200 rounded w-32"></div>
          <div className="h-5 w-5 bg-gray-200 rounded-full"></div>
        </div>
        <div className="h-3 bg-gray-200 rounded w-24"></div>
      </div>
      <div className="flex items-center space-x-2">
        <div className="h-6 bg-gray-200 rounded-full w-20"></div>
        <div className="h-6 bg-gray-200 rounded w-6"></div>
      </div>
    </div>

    {/* Contact Info */}
    <div className="space-y-2 mb-4">
      <div className="flex items-center space-x-2">
        <div className="h-4 w-4 bg-gray-200 rounded"></div>
        <div className="h-3 bg-gray-200 rounded w-28"></div>
      </div>
      <div className="flex items-center space-x-2">
        <div className="h-4 w-4 bg-gray-200 rounded"></div>
        <div className="h-3 bg-gray-200 rounded w-36"></div>
      </div>
    </div>

    {/* Financial Info */}
    <div className="grid grid-cols-2 gap-4 mb-4">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-2">
          <div className="h-4 w-4 bg-gray-200 rounded"></div>
          <div>
            <div className="h-3 bg-gray-200 rounded w-12 mb-1"></div>
            <div className="h-3 bg-gray-200 rounded w-16"></div>
          </div>
        </div>
      ))}
    </div>

    {/* Progress Bar */}
    <div className="mb-4">
      <div className="flex justify-between text-sm mb-1">
        <div className="h-3 bg-gray-200 rounded w-20"></div>
        <div className="h-3 bg-gray-200 rounded w-8"></div>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2"></div>
    </div>

    {/* Compliance */}
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center space-x-2">
        <div className="h-6 bg-gray-200 rounded-full w-20"></div>
        <div className="h-6 bg-gray-200 rounded-full w-16"></div>
      </div>
      <div className="h-3 bg-gray-200 rounded w-16"></div>
    </div>

    {/* Edit Button */}
    <div className="pt-4 border-t border-gray-200">
      <div className="h-8 bg-gray-200 rounded-md w-full"></div>
    </div>
  </div>
));

ContractorCardPlaceholder.displayName = 'ContractorCardPlaceholder';

const LazyContractorCard = memo<LazyContractorCardProps>(({
  contractor,
  onSendSMS,
  onEdit,
  className = ''
}) => {
  return (
    <LazyCard
      height={320}
      className={className}
      placeholder={<ContractorCardPlaceholder />}
      threshold={0.1}
      rootMargin="100px" // Load cards 100px before they come into view
      fadeIn={true}
    >
      <OptimizedContractorCard
        contractor={contractor}
        onSendSMS={onSendSMS}
        onEdit={onEdit}
      />
    </LazyCard>
  );
});

LazyContractorCard.displayName = 'LazyContractorCard';

export default LazyContractorCard;