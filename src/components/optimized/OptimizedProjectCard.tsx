'use client';

import React, { memo } from 'react';
import { Building, Users, DollarSign, Calendar, AlertCircle, CheckCircle, Clock, Eye } from 'lucide-react';

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

interface OptimizedProjectCardProps {
  project: Project;
  onClick?: (project: Project) => void;
  onView?: (project: Project) => void;
}

const formatCurrency = (amount: number | null | undefined): string => {
  if (amount == null) return '-';
  return `$${amount.toLocaleString()}`;
};

const formatDate = (dateString?: string) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const OptimizedProjectCard = memo<OptimizedProjectCardProps>(({
  project,
  onClick,
  onView
}) => {
  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'completed': return 'text-primary bg-blue-100';
      case 'on-hold': return 'text-yellow-600 bg-yellow-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const handleClick = () => onClick?.(project);
  const handleView = (e: React.MouseEvent) => {
    e.stopPropagation();
    onView?.(project);
  };

  return (
    <div
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Building className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
            <p className="text-sm text-gray-600">{project.client_name}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {project.status && (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
              {project.status}
            </span>
          )}
          <button
            onClick={handleView}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="View details"
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <div>
            <span className="text-gray-500">Phase:</span>
            <span className="ml-1 font-medium">{project.current_phase || 'N/A'}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <DollarSign className="h-4 w-4 text-gray-400" />
          <div>
            <span className="text-gray-500">Budget:</span>
            <span className="ml-1 font-medium">{formatCurrency(project.budget)}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4 text-gray-400" />
          <div>
            <span className="text-gray-500">Start:</span>
            <span className="ml-1 font-medium">{formatDate(project.start_date)}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <CheckCircle className="h-4 w-4 text-gray-400" />
          <div>
            <span className="text-gray-500">Spent:</span>
            <span className="ml-1 font-medium">{formatCurrency(project.spent)}</span>
          </div>
        </div>
      </div>

      {project.budget && project.spent && (
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progress</span>
            <span>{Math.round((project.spent / project.budget) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full"
              style={{ width: `${Math.min((project.spent / project.budget) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
});

OptimizedProjectCard.displayName = 'OptimizedProjectCard';

export default OptimizedProjectCard;