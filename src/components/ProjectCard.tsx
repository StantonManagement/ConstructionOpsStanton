
import React from 'react';
import { Project } from '@/context/DataContext';

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
      className={`border border-border rounded-lg p-2 bg-card hover:shadow-sm transition-all max-w-full overflow-hidden ${
        onSelect ? 'cursor-pointer hover:border-primary/50' : ''
      }`}
      onClick={onSelect ? handleClick : undefined}
      onKeyDown={onSelect ? handleKeyDown : undefined}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      aria-label={onSelect ? `View details for ${project.name}` : undefined}
    >
      {/* Compact Header - Single Line */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm text-gray-900 truncate">{project.name}</h4>
          <p className="text-xs text-gray-500 truncate">{project.client_name || 'No client'}</p>
        </div>
        <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded ml-2 whitespace-nowrap">
          {project.current_phase || 'N/A'}
        </span>
      </div>

      {/* Compact Budget - Single Line with Progress */}
      <div className="mb-1.5">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-gray-600">${budget.toLocaleString()}</span>
          <span className={`font-medium ${statusInfo.color}`}>
            {percent < 0.01 ? '<0.01%' : percent.toFixed(1)}%
          </span>
        </div>

        {/* Thin Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-1.5 relative overflow-hidden">
          {isLoading ? (
            <div className="h-1.5 bg-gray-300 rounded-full animate-pulse"></div>
          ) : (
            <div
              className={`h-1.5 rounded-full transition-all ${
                percent > 95 ? 'bg-red-500' :
                percent > 90 ? 'bg-orange-500' :
                percent > 75 ? 'bg-yellow-500' :
                'bg-green-500'
              }`}
              style={{ width: `${Math.min(displayPercent, 100)}%` }}
            />
          )}
        </div>
      </div>

      {/* Minimal Status Badges */}
      <div className="flex items-center gap-1.5 text-xs">
        {percent > 90 && (
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-orange-100 text-orange-700">
            High Usage
          </span>
        )}
        {(project as any).at_risk && (
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-100 text-red-700">
            At Risk
          </span>
        )}
      </div>
    </div>
  );
};

export default ProjectCard;
