import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Building, CheckSquare, DollarSign, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/theme';
import { PortfolioStats as IPortfolioStats } from '@/hooks/queries/usePortfolio';

interface PortfolioStatsProps {
  stats: IPortfolioStats;
  returnTo?: string;
}

export const PortfolioStats: React.FC<PortfolioStatsProps> = ({ stats, returnTo }) => {
  const router = useRouter();

  const locationProgress = stats.total_locations > 0 
    ? (stats.complete_locations / stats.total_locations) * 100 
    : 0;

  const taskProgress = stats.total_tasks > 0
    ? (stats.verified_tasks / stats.total_tasks) * 100
    : 0;

  const costProgress = stats.total_estimated_cost > 0
    ? (stats.verified_cost / stats.total_estimated_cost) * 100
    : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Locations Card */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500">LOCATIONS</p>
              <div className="flex items-baseline gap-1">
                <h3 className="text-2xl font-bold text-gray-900">{stats.complete_locations}</h3>
                <span className="text-sm text-gray-500">/ {stats.total_locations}</span>
              </div>
              <p className="text-xs text-gray-500">complete</p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg">
              <Building className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="space-y-1">
            <Progress value={locationProgress} className="h-2" />
            <p className="text-right text-xs font-medium text-gray-600">
              {Math.round(locationProgress)}%
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tasks Card */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500">TASKS</p>
              <div className="flex items-baseline gap-1">
                <h3 className="text-2xl font-bold text-gray-900">
                  {stats.verified_tasks.toLocaleString()}
                </h3>
                <span className="text-sm text-gray-500">
                  / {stats.total_tasks.toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-gray-500">verified</p>
            </div>
            <div className="p-2 bg-purple-50 rounded-lg">
              <CheckSquare className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <div className="space-y-1">
            <Progress value={taskProgress} className="h-2" />
            <p className="text-right text-xs font-medium text-gray-600">
              {Math.round(taskProgress)}%
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Financial Card */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500">VERIFIED VALUE</p>
              <div className="flex flex-col">
                <h3 className="text-2xl font-bold text-gray-900">
                  {formatCurrency(stats.verified_cost)}
                </h3>
                <span className="text-xs text-gray-500">
                  of {formatCurrency(stats.total_estimated_cost)}
                </span>
              </div>
            </div>
            <div className="p-2 bg-green-50 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <div className="space-y-1">
            <Progress value={costProgress} className="h-2" />
            <p className="text-right text-xs font-medium text-gray-600">
              {Math.round(costProgress)}%
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Blocked Card */}
      <Card 
        className={`cursor-pointer transition-colors ${
          stats.blocked_locations > 0 
            ? 'border-amber-200 bg-amber-50 hover:bg-amber-100' 
            : 'hover:bg-gray-50'
        }`}
        onClick={() => router.push(returnTo ? `/renovations/blocking?returnTo=${encodeURIComponent(returnTo)}` : '/renovations/blocking')}
      >
        <CardContent className="p-4 h-full flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500">BLOCKED</p>
              <h3 className={`text-2xl font-bold ${
                stats.blocked_locations > 0 ? 'text-amber-700' : 'text-gray-900'
              }`}>
                {stats.blocked_locations}
              </h3>
              <p className="text-xs text-gray-500">locations</p>
            </div>
            <div className={`p-2 rounded-lg ${
              stats.blocked_locations > 0 ? 'bg-amber-100' : 'bg-gray-100'
            }`}>
              <AlertTriangle className={`w-5 h-5 ${
                stats.blocked_locations > 0 ? 'text-amber-600' : 'text-gray-400'
              }`} />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <span className={`text-sm font-medium ${
              stats.blocked_locations > 0 ? 'text-amber-700' : 'text-gray-400'
            }`}>
              View Report →
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
