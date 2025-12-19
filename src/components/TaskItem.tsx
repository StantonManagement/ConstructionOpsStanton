import React from 'react';
import { Task } from '@/types/schema';
import { TaskStatusBadge } from '@/components/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Calendar, DollarSign, User } from 'lucide-react';
import { formatCurrency } from '@/lib/theme';

interface Props {
  task: Task;
  onClick?: () => void;
}

export const TaskItem: React.FC<Props> = ({ task, onClick }) => {
  return (
    <div 
      className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-all cursor-pointer"
      onClick={onClick}
    >
      <div className="flex-1 min-w-0 mr-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-gray-900 truncate">{task.name}</span>
          <TaskStatusBadge status={task.status} className="text-[10px] px-1.5 py-0 h-5" />
          {task.priority === 'high' || task.priority === 'urgent' ? (
            <Badge variant={task.priority === 'urgent' ? 'destructive' : 'secondary'} className="text-[10px] px-1.5 py-0 h-5">
              {task.priority}
            </Badge>
          ) : null}
        </div>
        
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {task.contractor && (
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span>{task.contractor.name}</span>
            </div>
          )}
          {task.estimated_cost && (
            <div className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              <span>{formatCurrency(task.estimated_cost)}</span>
            </div>
          )}
          {task.scheduled_end && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>Due {new Date(task.scheduled_end).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
