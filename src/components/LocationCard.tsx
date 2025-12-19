import React from 'react';
import { Location } from '@/types/schema';
import { LocationStatusBadge } from '@/components/StatusBadge';
import { Card } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';

interface Props {
  location: Location;
  onClick?: () => void;
}

export const LocationCard: React.FC<Props> = ({ location, onClick }) => {
  // Determine if blocked
  const isBlocked = location.status === 'on_hold';
  
  // Calculate progress
  const totalTasks = location.task_count || 0;
  const completedTasks = location.completed_task_count || 0;
  const progressPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <Card 
      className={`p-4 transition-all hover:shadow-md cursor-pointer border-l-4 ${
        isBlocked ? 'border-l-red-500' : 
        location.status === 'complete' ? 'border-l-green-500' : 
        'border-l-blue-500'
      }`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-semibold text-lg text-gray-900">{location.name}</h3>
          <p className="text-sm text-gray-500 capitalize">
            {location.type.replace('_', ' ')}
            {location.unit_type && ` • ${location.unit_type}`}
          </p>
        </div>
        <LocationStatusBadge status={location.status} />
      </div>

      {/* Blocked Warning */}
      {isBlocked && location.blocked_reason && (
        <div className="bg-red-50 text-red-700 p-2 rounded text-sm mb-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <span className="font-medium capitalize">{location.blocked_reason}:</span>{' '}
            {location.blocked_note || 'No details provided'}
          </div>
        </div>
      )}

      {/* Task Progress */}
      <div className="mt-3">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>{completedTasks} of {totalTasks} tasks verified</span>
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
