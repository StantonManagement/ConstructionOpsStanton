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
    <Card 
      className={`p-4 transition-all hover:shadow-md cursor-pointer border-l-4 h-full flex flex-col ${
        isBlocked ? 'border-l-red-500' : 
        location.status === 'complete' ? 'border-l-green-500' : 
        'border-l-blue-500'
      }`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1 min-w-0 pr-2">
          <h3 className="font-semibold text-lg text-gray-900 truncate" title={location.name}>
            {location.name}
          </h3>
          <div className="flex items-center text-sm text-gray-500 gap-1 mt-0.5">
            <Building2 className="w-3 h-3" />
            <span className="truncate" title={location.property_name}>{location.property_name}</span>
          </div>
          <p className="text-xs text-gray-400 capitalize mt-1">
            {location.type.replace('_', ' ')}
            {location.unit_number && ` • #${location.unit_number}`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
           <LocationStatusBadge status={location.status} />
           {hasPending && (
             <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
               <Clock className="w-3 h-3 mr-1" />
               Verify
             </span>
           )}
        </div>
      </div>

      {/* Blocked Warning */}
      {isBlocked && (
        <div className="bg-red-50 text-red-700 p-2 rounded text-sm mb-3 flex items-start gap-2 mt-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <span className="font-medium capitalize block">{location.blocked_reason || 'Blocked'}:</span>
            <span className="text-xs line-clamp-2" title={location.blocked_note || ''}>
              {location.blocked_note || 'No details provided'}
            </span>
          </div>
        </div>
      )}

      {/* Task Progress */}
      <div className="mt-auto pt-3">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>{verifiedTasks}/{totalTasks} verified</span>
          <span>{Math.round(progressPercent)}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              isBlocked ? 'bg-red-400' :
              progressPercent === 100 ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </Card>
  );
};
