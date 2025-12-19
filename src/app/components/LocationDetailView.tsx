import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocation } from '@/hooks/queries/useLocations';
import { useTasks } from '@/hooks/queries/useTasks';
import { LocationStatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, AlertTriangle, AlertCircle } from 'lucide-react';
import { TaskItem } from '@/components/TaskItem';
import { CreateTaskModal } from './CreateTaskModal';
import { TaskDetailModal } from './TaskDetailModal';
import { BlockLocationModal } from './BlockLocationModal';
import { StatusFilter } from '@/components/StatusFilter';
import { Task } from '@/types/schema';

interface Props {
  locationId: string;
  onBack: () => void;
}

export const LocationDetailView: React.FC<Props> = ({ locationId, onBack }) => {
  const searchParams = useSearchParams();
  const { data: location, isLoading: isLoadingLocation } = useLocation(locationId);
  const { data: tasks, isLoading: isLoadingTasks } = useTasks(locationId);
  
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showBlockModal, setShowBlockModal] = useState(false);

  // Filter tasks
  const filterStatuses = searchParams.getAll('task_status');
  const filteredTasks = tasks?.filter(task => {
    if (!filterStatuses.length || filterStatuses.includes('all')) return true;
    return filterStatuses.includes(task.status);
  });

  if (isLoadingLocation) {
    return <div className="p-8 text-center text-gray-500">Loading location details...</div>;
  }

  if (!location) {
    return <div className="p-8 text-center text-red-500">Location not found</div>;
  }

  const isBlocked = location.status === 'on_hold';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} className="p-0 hover:bg-transparent">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Button>
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
              {location.name}
              <LocationStatusBadge status={location.status} />
            </h2>
            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
              <span className="capitalize">{location.type.replace('_', ' ')}</span>
              {location.unit_type && <span>• {location.unit_type}</span>}
              {location.floor && <span>• Floor {location.floor}</span>}
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          {!isBlocked && (
            <Button 
              variant="outline" 
              className="text-amber-700 border-amber-200 hover:bg-amber-50"
              onClick={() => setShowBlockModal(true)}
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Block
            </Button>
          )}
          <Button onClick={() => setShowCreateTaskModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Blocked Warning */}
      {isBlocked && location.blocked_reason && (
        <div className="bg-red-50 text-red-800 p-4 rounded-lg border border-red-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0 text-red-600" />
          <div>
            <h4 className="font-semibold capitalize mb-1">{location.blocked_reason} Issue</h4>
            <p className="text-sm text-red-700">{location.blocked_note || 'No additional details provided.'}</p>
          </div>
        </div>
      )}

      {/* Tasks List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Tasks</h3>
        
        {isLoadingTasks ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : tasks && tasks.length > 0 ? (
          <div className="space-y-2">
            {tasks.map(task => (
              <TaskItem 
                key={task.id} 
                task={task} 
                onClick={() => setSelectedTask(task)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <p className="text-gray-500 mb-2">No tasks yet</p>
            <Button variant="outline" onClick={() => setShowCreateTaskModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Task
            </Button>
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      <CreateTaskModal
        locationId={locationId}
        isOpen={showCreateTaskModal}
        onClose={() => setShowCreateTaskModal(false)}
        onSuccess={() => {
          // React Query handles invalidation
        }}
      />

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          task={selectedTask}
          locationName={location.name}
          onBlockLocation={() => setShowBlockModal(true)}
        />
      )}

      {/* Block Location Modal */}
      <BlockLocationModal
        isOpen={showBlockModal}
        onClose={() => setShowBlockModal(false)}
        locationId={locationId}
        locationName={location.name}
      />
    </div>
  );
};
