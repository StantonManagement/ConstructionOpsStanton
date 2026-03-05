'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  Calendar,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

export type BudgetHealth = 'healthy' | 'warning' | 'critical';
export type TimelineHealth = 'on_track' | 'at_risk' | 'behind';

export interface ProjectHealth {
  id: string;
  name: string;
  client_name: string;
  current_phase: string;
  status: string;

  // Budget metrics
  budget: number;
  spent: number;
  budgetPercentUsed: number;
  budgetRemaining: number;
  budgetHealth: BudgetHealth;

  // Timeline metrics
  start_date: string | null;
  target_completion_date: string | null;
  daysTotal: number | null;
  daysElapsed: number | null;
  daysRemaining: number | null;
  timelinePercentElapsed: number | null;
  timelineHealth: TimelineHealth;

  // Completion metrics
  completionPercentage: number;

  // Action items count
  openActionItemsCount: number;
  criticalActionItemsCount: number;

  // Overall health score (0-100)
  healthScore: number;
}

interface ProjectHealthCardProps {
  project: ProjectHealth;
}

/**
 * Get health score color and icon
 */
function getHealthScoreDisplay(score: number): {
  color: string;
  bgColor: string;
  icon: React.ReactNode;
  label: string;
} {
  if (score >= 80) {
    return {
      color: 'text-green-700 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-950',
      icon: <CheckCircle2 className="w-5 h-5" />,
      label: 'Healthy',
    };
  }
  if (score >= 60) {
    return {
      color: 'text-yellow-700 dark:text-yellow-400',
      bgColor: 'bg-yellow-100 dark:bg-yellow-950',
      icon: <AlertTriangle className="w-5 h-5" />,
      label: 'Needs Attention',
    };
  }
  return {
    color: 'text-red-700 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-950',
    icon: <AlertCircle className="w-5 h-5" />,
    label: 'Critical',
  };
}

/**
 * Get budget health display
 */
function getBudgetHealthDisplay(health: BudgetHealth): {
  color: string;
  icon: React.ReactNode;
  label: string;
} {
  switch (health) {
    case 'healthy':
      return {
        color: 'text-green-600 dark:text-green-400',
        icon: <CheckCircle2 className="w-4 h-4" />,
        label: 'Healthy',
      };
    case 'warning':
      return {
        color: 'text-orange-600 dark:text-orange-400',
        icon: <AlertTriangle className="w-4 h-4" />,
        label: 'Warning',
      };
    case 'critical':
      return {
        color: 'text-red-600 dark:text-red-400',
        icon: <AlertCircle className="w-4 h-4" />,
        label: 'Critical',
      };
  }
}

/**
 * Get timeline health display
 */
function getTimelineHealthDisplay(health: TimelineHealth): {
  color: string;
  icon: React.ReactNode;
  label: string;
} {
  switch (health) {
    case 'on_track':
      return {
        color: 'text-green-600 dark:text-green-400',
        icon: <TrendingUp className="w-4 h-4" />,
        label: 'On Track',
      };
    case 'at_risk':
      return {
        color: 'text-orange-600 dark:text-orange-400',
        icon: <Minus className="w-4 h-4" />,
        label: 'At Risk',
      };
    case 'behind':
      return {
        color: 'text-red-600 dark:text-red-400',
        icon: <TrendingDown className="w-4 h-4" />,
        label: 'Behind',
      };
  }
}

/**
 * Format currency
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * ProjectHealthCard Component
 *
 * Displays a visual card showing project health metrics including:
 * - Overall health score
 * - Budget health (spent vs remaining)
 * - Timeline health (on track, at risk, behind)
 * - Completion percentage
 * - Action items count
 */
export default function ProjectHealthCard({ project }: ProjectHealthCardProps) {
  const router = useRouter();
  const healthDisplay = getHealthScoreDisplay(project.healthScore);
  const budgetDisplay = getBudgetHealthDisplay(project.budgetHealth);
  const timelineDisplay = getTimelineHealthDisplay(project.timelineHealth);

  const handleCardClick = () => {
    router.push(`/projects/${project.id}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-all cursor-pointer group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-foreground truncate group-hover:text-primary transition-colors">
            {project.name}
          </h3>
          <p className="text-sm text-muted-foreground truncate">{project.client_name}</p>
        </div>

        {/* Overall Health Badge */}
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg ${healthDisplay.bgColor} ${healthDisplay.color} font-semibold text-sm whitespace-nowrap ml-4`}
        >
          {healthDisplay.icon}
          <span>{project.healthScore}</span>
        </div>
      </div>

      {/* Phase and Status */}
      <div className="flex items-center gap-3 mb-4 text-sm">
        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 rounded font-medium">
          {project.current_phase}
        </span>
        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400 rounded font-medium capitalize">
          {project.status}
        </span>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Budget Health */}
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${budgetDisplay.color}`}>
            <DollarSign className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium mb-1">Budget Health</p>
            <div className={`flex items-center gap-2 ${budgetDisplay.color} font-semibold text-sm`}>
              {budgetDisplay.icon}
              <span>{budgetDisplay.label}</span>
            </div>
            <div className="mt-2">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Spent: {formatCurrency(project.spent)}</span>
                <span>{project.budgetPercentUsed.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    project.budgetHealth === 'critical'
                      ? 'bg-red-500'
                      : project.budgetHealth === 'warning'
                      ? 'bg-orange-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(project.budgetPercentUsed, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Remaining: {formatCurrency(project.budgetRemaining)}
              </p>
            </div>
          </div>
        </div>

        {/* Timeline Health */}
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${timelineDisplay.color}`}>
            <Calendar className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium mb-1">Timeline Health</p>
            <div className={`flex items-center gap-2 ${timelineDisplay.color} font-semibold text-sm`}>
              {timelineDisplay.icon}
              <span>{timelineDisplay.label}</span>
            </div>
            {project.daysRemaining !== null && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>
                    {project.daysRemaining > 0
                      ? `${project.daysRemaining} days left`
                      : project.daysRemaining === 0
                      ? 'Due today'
                      : `${Math.abs(project.daysRemaining)} days overdue`}
                  </span>
                  <span>{project.timelinePercentElapsed?.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      project.timelineHealth === 'behind'
                        ? 'bg-red-500'
                        : project.timelineHealth === 'at_risk'
                        ? 'bg-orange-500'
                        : 'bg-green-500'
                    }`}
                    style={{
                      width: `${Math.min(project.timelinePercentElapsed || 0, 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
            {project.daysRemaining === null && (
              <p className="text-xs text-muted-foreground mt-2">No timeline set</p>
            )}
          </div>
        </div>
      </div>

      {/* Completion and Action Items */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex items-center gap-4 text-sm">
          {/* Completion */}
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              <span className="font-semibold text-foreground">{project.completionPercentage}%</span> complete
            </span>
          </div>

          {/* Action Items */}
          {project.openActionItemsCount > 0 && (
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              <span className="text-muted-foreground">
                <span className="font-semibold text-foreground">{project.openActionItemsCount}</span> action
                {project.openActionItemsCount === 1 ? '' : 's'}
                {project.criticalActionItemsCount > 0 && (
                  <span className="text-red-600 dark:text-red-400 font-semibold ml-1">
                    ({project.criticalActionItemsCount} critical)
                  </span>
                )}
              </span>
            </div>
          )}
        </div>

        {/* View Details Link */}
        <div className="flex items-center gap-1 text-primary font-medium text-sm group-hover:gap-2 transition-all">
          <span>View</span>
          <ArrowRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}
