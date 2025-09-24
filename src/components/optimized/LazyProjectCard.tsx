'use client';

import React, { memo } from 'react';
import LazyCard from './LazyCard';
import OptimizedProjectCard from './OptimizedProjectCard';

interface Project {
  id: number;
  name: string;
  client_name: string;
  current_phase?: string;
  budget?: number;
  spent?: number;
  start_date?: string;
  end_date?: string;
  status?: string;
}

interface LazyProjectCardProps {
  project: Project;
  onClick?: (project: Project) => void;
  onView?: (project: Project) => void;
  className?: string;
}

const ProjectCardPlaceholder = memo(() => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
    {/* Header */}
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-gray-200 rounded-lg w-10 h-10"></div>
        <div>
          <div className="h-5 bg-gray-200 rounded w-32 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-24"></div>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <div className="h-6 bg-gray-200 rounded-full w-16"></div>
        <div className="h-6 bg-gray-200 rounded w-6"></div>
      </div>
    </div>

    {/* Grid content */}
    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-2">
          <div className="h-4 w-4 bg-gray-200 rounded"></div>
          <div>
            <div className="h-3 bg-gray-200 rounded w-12 mb-1"></div>
            <div className="h-3 bg-gray-200 rounded w-16"></div>
          </div>
        </div>
      ))}
    </div>

    {/* Progress bar */}
    <div className="space-y-2">
      <div className="flex justify-between">
        <div className="h-3 bg-gray-200 rounded w-16"></div>
        <div className="h-3 bg-gray-200 rounded w-8"></div>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2"></div>
    </div>
  </div>
));

ProjectCardPlaceholder.displayName = 'ProjectCardPlaceholder';

const LazyProjectCard = memo<LazyProjectCardProps>(({
  project,
  onClick,
  onView,
  className = ''
}) => {
  return (
    <LazyCard
      height={240}
      className={className}
      placeholder={<ProjectCardPlaceholder />}
      threshold={0.1}
      rootMargin="100px" // Load cards 100px before they come into view
      fadeIn={true}
    >
      <OptimizedProjectCard
        project={project}
        onClick={onClick}
        onView={onView}
      />
    </LazyCard>
  );
});

LazyProjectCard.displayName = 'LazyProjectCard';

export default LazyProjectCard;