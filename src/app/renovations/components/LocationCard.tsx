import React from 'react';
import { LocationWithStats } from '@/hooks/queries/useRenovationLocations';
import { LocationStatusBadge } from '@/components/StatusBadge';
import { Card } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Clock, Building2 } from 'lucide-react';

interface Props {
  location: LocationWithStats;
  onClick?: () => void;
}

export const LocationCard: React.FC<Props> = ({ location, onClick }) => {
  // Determine if blocked
  const isBlocked = location.status === 'on_hold';

  // Calculate progress
  const totalTasks = location.total_tasks || 0;
  const verifiedTasks = location.verified_tasks || 0;
  const pendingTasks = location.pending_verify_tasks || 0;

  const progressPercent = totalTasks > 0 ? (verifiedTasks / totalTasks) * 100 : 0;

  // Pending verification badge calculation
  const hasPending = pendingTasks > 0;

  return (
    <div
      className="bg-card rounded-lg border border-border p-2 hover:shadow-md hover:border-primary/50 transition-all cursor-pointer"
      onClick={onClick}
    >
      {/* Compact Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-foreground truncate" title={location.name}>
            {location.name}
          </h3>
          <p className="text-xs text-muted-foreground truncate" title={location.property_name}>
            {location.property_name}
          </p>
        </div>
        <div className="flex gap-1 ml-2 shrink-0">
          {hasPending && (
            <span className="text-xs px-1.5 py-0.5 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 rounded">
              Verify
            </span>
          )}
          <span className={`text-xs px-1.5 py-0.5 rounded ${
            isBlocked ? 'bg-red-500/10 text-red-700 dark:text-red-400' :
            location.status === 'complete' ? 'bg-green-500/10 text-green-700 dark:text-green-400' :
            'bg-blue-500/10 text-blue-700 dark:text-blue-400'
          }`}>
            {location.status === 'on_hold' ? 'Blocked' :
             location.status === 'complete' ? 'Done' :
             location.status === 'not_started' ? 'New' :
             location.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Type and Unit */}
      <div className="text-xs text-muted-foreground mb-2 capitalize">
        {location.type.replace('_', ' ')}
        {location.unit_number && ` • #${location.unit_number}`}
      </div>

      {/* Blocked Warning - Compact */}
      {isBlocked && (
        <div className="bg-red-500/10 text-red-700 dark:text-red-400 p-1.5 rounded text-xs mb-2 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span className="truncate" title={location.blocked_note || ''}>
            {location.blocked_reason || 'Blocked'}
          </span>
        </div>
      )}

      {/* Compact Progress */}
      <div className="pt-2 border-t border-border">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>{verifiedTasks}/{totalTasks}</span>
          <span>{Math.round(progressPercent)}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all ${
              isBlocked ? 'bg-red-500' :
              progressPercent === 100 ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
};
