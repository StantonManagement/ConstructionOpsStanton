
import React from 'react';
import { Project } from '../app/context/DataContext';

type Props = {
  project: Project;
  onSelect?: (project: Project) => void;
  onBudgetClick?: (project: Project) => void;
  isLoading?: boolean;
};

const ProjectCard: React.FC<Props> = ({ project, onSelect, onBudgetClick, isLoading = false }) => {
  // Ensure consistent number handling
  const budget = project.budget ? Number(project.budget) : 0;
  const spent = project.spent ? Number(project.spent) : 0;
  const percent = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
  // Ensure small percentages are still visible (minimum 1% width for any spent amount)
  const displayPercent = spent > 0 && percent < 1 ? 1 : percent;
  
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

  const handleBudgetClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onBudgetClick) {
      onBudgetClick(project);
    }
  };

  const handleBudgetKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && onBudgetClick) {
      e.preventDefault();
      e.stopPropagation();
      onBudgetClick(project);
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
      className={`border border-border rounded-lg p-4 bg-card shadow-sm hover:shadow-md transition-all duration-200 ${
        onSelect ? 'cursor-pointer hover:shadow-lg hover:border-primary/50 focus:ring-2 focus:ring-primary/20' : ''
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

      {/* Budget Information - Clickable when onBudgetClick is provided */}
      <div 
        className={`mb-3 ${onBudgetClick ? 'cursor-pointer hover:bg-blue-50 rounded-lg p-2 -mx-2 transition-colors' : ''}`}
        onClick={onBudgetClick ? handleBudgetClick : undefined}
        onKeyDown={onBudgetClick ? handleBudgetKeyDown : undefined}
        role={onBudgetClick ? 'button' : undefined}
        tabIndex={onBudgetClick ? 0 : undefined}
        aria-label={onBudgetClick ? `View budget details for ${project.name}` : undefined}
      >
        <div className="flex justify-between items-center text-sm mb-2">
          <span className="text-gray-600 font-medium">Budget Progress</span>
          <span className="text-gray-900 font-semibold">${budget.toLocaleString()}</span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-3 mb-2 relative overflow-hidden">
          {isLoading ? (
            <div className="h-3 bg-gradient-to-r from-gray-300 to-gray-400 rounded-full animate-pulse"></div>
          ) : (
            <div
              className={`h-3 rounded-full transition-all duration-500 ease-out ${
                percent > 95 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                percent > 90 ? 'bg-gradient-to-r from-orange-500 to-orange-600' :
                percent > 75 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                'bg-gradient-to-r from-green-500 to-green-600'
              }`}
              style={{ 
                width: `${Math.min(displayPercent, 100)}%`,
                transition: 'width 0.5s ease-out'
              }}
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Budget utilization: ${percent.toFixed(2)}%`}
            >
              {/* Animated shimmer effect for high usage */}
              {(percent > 75) && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
              )}
            </div>
          )}
        </div>

        {/* Budget Details */}
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-600">
            Spent: <span className="font-medium text-gray-900">
              {isLoading ? (
                <span className="inline-block w-16 h-3 bg-gray-200 rounded animate-pulse"></span>
              ) : (
                `$${spent.toLocaleString()}`
              )}
            </span>
          </span>
          <span className="text-gray-600">
            Remaining: <span className="font-medium text-gray-900">
              {isLoading ? (
                <span className="inline-block w-16 h-3 bg-gray-200 rounded animate-pulse"></span>
              ) : (
                `$${(budget - spent).toLocaleString()}`
              )}
            </span>
          </span>
        </div>
        
        <div className="flex justify-between items-center text-xs mt-1">
          <span className="text-gray-600 font-medium">
            {percent < 0.01 ? '<0.01%' : percent.toFixed(2)}% utilized
          </span>
          <span className={`font-semibold ${statusInfo.color}`}>
            {statusInfo.text}
          </span>
        </div>
        
        {/* Budget click hint */}
        {onBudgetClick && (
          <div className="text-xs text-blue-600 mt-1 opacity-70">
            Click for budget details
          </div>
        )}
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
