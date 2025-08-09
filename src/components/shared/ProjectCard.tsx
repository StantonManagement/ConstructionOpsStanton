
import React from 'react';
import { Project } from '../app/context/DataContext';

type Props = {
  project: Project;
  onSelect?: (project: Project) => void;
};

const ProjectCard: React.FC<Props> = ({ project, onSelect }) => {
  // Ensure consistent number handling
  const budget = project.budget ? Number(project.budget) : 0;
  const spent = project.spent ? Number(project.spent) : 0;
  const percent = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  
  const handleClick = () => {
    if (onSelect) {
      onSelect(project);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && onSelect) {
      e.preventDefault();
      onSelect(project);
    }
  };

  // Determine status based on completion percentage
  const getStatusInfo = () => {
    if (percent > 95) return { text: '⚠️ Over budget', color: 'text-red-600' };
    if (percent > 90) return { text: '⚠️ Near limit', color: 'text-orange-600' };
    if (percent > 75) return { text: '⚡ High usage', color: 'text-yellow-600' };
    return { text: '✅ On track', color: 'text-green-700' };
  };

  const statusInfo = getStatusInfo();

  return (
    <div 
      className={`border rounded-lg p-4 bg-white shadow hover:shadow-md transition-all duration-200 ${
        onSelect ? 'cursor-pointer hover:shadow-lg hover:border-blue-300 focus:ring-2 focus:ring-blue-400' : ''
      }`}
      onClick={onSelect ? handleClick : undefined}
      onKeyDown={onSelect ? handleKeyDown : undefined}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      aria-label={onSelect ? `View details for ${project.name}` : undefined}
    >
      {/* Project Header */}
      <div className="mb-3">
        <h4 className="font-semibold text-gray-900 text-lg mb-1 line-clamp-2">{project.name}</h4>
        <p className="text-sm text-gray-700 mb-1">{project.client_name || 'No client specified'}</p>
        <p className="text-xs text-blue-700 font-medium">
          Phase: {project.current_phase || 'Not specified'}
        </p>
      </div>

      {/* Budget Information */}
      <div className="mb-3">
        <div className="flex justify-between items-center text-sm mb-2">
          <span className="text-gray-600 font-medium">Budget Progress</span>
          <span className="text-gray-900 font-semibold">${budget.toLocaleString()}</span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
          <div
            className={`h-3 rounded-full transition-all duration-300 ${
              percent > 95 ? 'bg-red-500' :
              percent > 90 ? 'bg-orange-500' :
              percent > 75 ? 'bg-yellow-500' :
              'bg-green-500'
            }`}
            style={{ width: `${Math.min(percent, 100)}%` }}
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Budget utilization: ${percent}%`}
          ></div>
        </div>

        {/* Budget Details */}
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-600">
            Spent: <span className="font-medium text-gray-900">${spent.toLocaleString()}</span>
          </span>
          <span className="text-gray-600">
            Remaining: <span className="font-medium text-gray-900">${(budget - spent).toLocaleString()}</span>
          </span>
        </div>
        
        <div className="flex justify-between items-center text-xs mt-1">
          <span className="text-gray-600">{percent}% utilized</span>
          <span className={`font-medium ${statusInfo.color}`}>
            {statusInfo.text}
          </span>
        </div>
      </div>

      {/* Project Status Indicators */}
      <div className="flex flex-wrap gap-2 mb-3">
        {project.current_phase?.toLowerCase().includes('complete') && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            ✅ Completed
          </span>
        )}
        {(project as any).at_risk && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            ⚠️ At Risk
          </span>
        )}
        {percent > 90 && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            🔥 High Usage
          </span>
        )}
      </div>

      {/* Action Indicator */}
      {onSelect && (
        <div className="pt-2 border-t border-gray-100">
          <div className="text-xs text-blue-600 font-medium flex items-center gap-1">
            <span>👆</span>
            Click to view payments & details
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectCard;
