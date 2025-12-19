import React, { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle, Circle, AlertTriangle, Clock } from 'lucide-react';
import { formatCurrency } from '@/lib/theme';
import { Button } from '@/components/ui/button';
import { Task } from '@/types/schema';

interface Props {
  task: Task;
  onUpdateStatus: (id: string, status: string) => void;
}

export const MobileTaskRow: React.FC<Props> = ({ task, onUpdateStatus }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified': return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'worker_complete': return <AlertTriangle className="w-6 h-6 text-amber-500" />;
      case 'in_progress': return <div className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin-static relative"><div className="absolute inset-0 rounded-full border-2 border-blue-500 opacity-20"></div></div>;
      default: return <Circle className="w-6 h-6 text-gray-300" />;
    }
  };

  const renderMainAction = () => {
    if (task.status === 'worker_complete') {
      return (
        <Button 
          className="w-full h-14 bg-amber-500 hover:bg-amber-600 text-white font-bold text-lg shadow-sm"
          onClick={(e) => {
            e.stopPropagation();
            onUpdateStatus(task.id, 'verified');
          }}
        >
          <Clock className="w-5 h-5 mr-2" />
          VERIFY
        </Button>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-2 last:mb-0 overflow-hidden">
      <div 
        className="p-4 flex items-center gap-3 active:bg-gray-50 transition-colors cursor-pointer min-h-[64px]"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="shrink-0 pt-1">
          {getStatusIcon(task.status)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <h4 className={`text-base font-medium truncate pr-2 ${
              task.status === 'verified' ? 'text-gray-500 line-through' : 'text-gray-900'
            }`}>
              {task.name}
            </h4>
            {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400 shrink-0" /> : <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />}
          </div>
          
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
            <span className="capitalize">{task.status.replace('_', ' ')}</span>
            {task.contractor?.name && (
              <>
                <span>•</span>
                <span className="truncate max-w-[120px]">{task.contractor.name}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {(task.status === 'worker_complete') && !isExpanded && (
        <div className="px-4 pb-4 animate-in slide-in-from-top-2">
          {renderMainAction()}
        </div>
      )}

      {isExpanded && (
        <div className="px-4 pb-4 pt-0 space-y-4 animate-in slide-in-from-top-2">
          <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Estimated Cost</span>
              <span className="font-medium text-gray-900">{formatCurrency(task.estimated_cost || 0)}</span>
            </div>
            {task.actual_cost && (
              <div className="flex justify-between">
                <span className="text-gray-500">Actual Cost</span>
                <span className="font-medium text-gray-900">{formatCurrency(task.actual_cost)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Contractor</span>
              <span className="font-medium text-gray-900 truncate ml-2">
                {task.contractor?.name || 'Unassigned'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {task.status === 'not_started' && (
              <Button 
                variant="outline" 
                className="w-full border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateStatus(task.id, 'in_progress');
                }}
              >
                Start Task
              </Button>
            )}
            
            {task.status === 'in_progress' && (
              <Button 
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateStatus(task.id, 'worker_complete');
                }}
              >
                Mark Complete
              </Button>
            )}

            {task.status !== 'verified' && (
               <Button
                 variant="ghost"
                 className="text-gray-500"
                 onClick={(e) => {
                   e.stopPropagation();
                 }}
               >
                 Edit Details
               </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
