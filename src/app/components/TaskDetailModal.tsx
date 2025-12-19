import { useTaskDependencies, useAddDependency, useRemoveDependency } from '@/hooks/queries/useTaskDependencies';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTasks } from '@/hooks/queries/useTasks';
import { Link, Trash2, PlusCircle, AlertCircle } from 'lucide-react';

const DependenciesSection = ({ task }: { task: Task }) => {
  const { data: dependencies, isLoading } = useTaskDependencies(task.id);
  const { mutate: addDependency, isPending: isAdding } = useAddDependency();
  const { mutate: removeDependency, isPending: isRemoving } = useRemoveDependency();
  
  // Fetch other tasks in same location for adding dependency
  // We should ideally have a specific hook or pass them down, but useTasks with location filter works
  // Note: useTasks might fetch all, so be careful. For now assume we have access or fetch light list.
  // Let's rely on a specialized hook or efficient query if possible.
  // Since we don't have `useTasksByLocation`, we'll assume we can't easily add dependencies in this modal 
  // without fetching all tasks. 
  // Let's show existing dependencies first.
  
  if (isLoading) return <div className="text-sm text-gray-500">Loading dependencies...</div>;

  return (
    <div className="border-t pt-4 mt-2">
      <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
        <Link className="w-4 h-4 text-gray-500" />
        Dependencies
      </h4>
      
      <div className="space-y-2">
        {dependencies?.map((dep) => (
          <div key={dep.id} className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm">
            <div className="flex items-center gap-2">
               <span className={`w-2 h-2 rounded-full ${
                 dep.depends_on_task.status === 'verified' ? 'bg-green-500' : 
                 dep.depends_on_task.status === 'worker_complete' ? 'bg-purple-500' :
                 dep.depends_on_task.status === 'in_progress' ? 'bg-blue-500' : 'bg-gray-300'
               }`} />
               <span className="text-gray-700">{dep.depends_on_task.name}</span>
            </div>
            {task.status === 'not_started' && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 text-gray-400 hover:text-red-500"
                onClick={() => removeDependency({ taskId: task.id, dependsOnTaskId: dep.depends_on_task.id })}
                disabled={isRemoving}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        ))}
        
        {(!dependencies || dependencies.length === 0) && (
          <p className="text-xs text-gray-400 italic">No dependencies</p>
        )}
      </div>
    </div>
  );
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
  locationName: string;
  onBlockLocation?: () => void; // Trigger block location flow from here
}

export const TaskDetailModal: React.FC<Props> = ({ 
  isOpen, 
  onClose, 
  task, 
  locationName,
  onBlockLocation 
}) => {
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const { mutate: updateStatus, isPending } = useUpdateTaskStatus();

  const handleStatusChange = (newStatus: TaskStatus) => {
    if (newStatus === 'verified') {
      setShowVerifyModal(true);
      return;
    }

    updateStatus({
      id: task.id,
      status: newStatus
    }, {
      onSuccess: () => onClose()
    });
  };

  const getPrimaryAction = () => {
    switch (task.status) {
      case 'not_started':
        return (
          <Button 
            className="w-full bg-blue-600 hover:bg-blue-700"
            onClick={() => handleStatusChange('in_progress')}
            disabled={isPending}
          >
            <Play className="w-4 h-4 mr-2" />
            Start Task
          </Button>
        );
      case 'in_progress':
        return (
          <Button 
            className="w-full bg-green-600 hover:bg-green-700"
            onClick={() => handleStatusChange('worker_complete')}
            disabled={isPending}
          >
            <CheckSquare className="w-4 h-4 mr-2" />
            Mark Complete
          </Button>
        );
      case 'worker_complete':
        return (
          <Button 
            className="w-full bg-purple-600 hover:bg-purple-700"
            onClick={() => setShowVerifyModal(true)}
            disabled={isPending}
          >
            <Camera className="w-4 h-4 mr-2" />
            Verify with Photo
          </Button>
        );
      case 'verified':
        return (
          <Button variant="outline" className="w-full" disabled>
            <CheckSquare className="w-4 h-4 mr-2" />
            Verified
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex justify-between items-start mr-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">{locationName}</h4>
                <DialogTitle className="text-xl">{task.name}</DialogTitle>
              </div>
              <TaskStatusBadge status={task.status} />
            </div>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Primary Actions */}
            <div className="flex flex-col gap-3">
              {getPrimaryAction()}
              
              {task.status !== 'verified' && onBlockLocation && (
                <Button 
                  variant="outline" 
                  className="w-full text-amber-700 border-amber-200 hover:bg-amber-50"
                  onClick={() => {
                    onClose();
                    onBlockLocation();
                  }}
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Block Location
                </Button>
              )}
            </div>

            {/* Task Details */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Assigned To
                </span>
                <p className="font-medium text-gray-900">{task.contractor?.name || 'Unassigned'}</p>
              </div>

              <div className="space-y-1">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5" /> Estimated Cost
                </span>
                <p className="font-medium text-gray-900">
                  {task.estimated_cost ? formatCurrency(task.estimated_cost) : '-'}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Schedule
                </span>
                <p className="font-medium text-gray-900">
                  {task.scheduled_start ? new Date(task.scheduled_start).toLocaleDateString() : 'TBD'}
                  {' - '}
                  {task.scheduled_end ? new Date(task.scheduled_end).toLocaleDateString() : 'TBD'}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Duration
                </span>
                <p className="font-medium text-gray-900">
                  {task.duration_days ? `${task.duration_days} days` : '-'}
                </p>
              </div>
            </div>

            {/* Description */}
            {task.description && (
              <div className="bg-gray-50 p-3 rounded-md text-sm text-gray-700">
                {task.description}
              </div>
            )}

            {/* Verification Details */}
            {task.status === 'verified' && task.verification_photo_url && (
              <div className="border rounded-lg p-3 space-y-2">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Camera className="w-4 h-4 text-green-600" />
                  Verification
                </h4>
                <div className="relative aspect-video bg-gray-100 rounded overflow-hidden cursor-pointer group">
                  <img 
                    src={task.verification_photo_url} 
                    alt="Verification" 
                    className="w-full h-full object-cover" 
                  />
                  <a 
                    href={task.verification_photo_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-colors"
                  >
                    <ExternalLink className="text-white opacity-0 group-hover:opacity-100 w-6 h-6" />
                  </a>
                </div>
                {task.verified_at && (
                  <p className="text-xs text-gray-500">
                    Verified on {new Date(task.verified_at).toLocaleString()}
                  </p>
                )}
                {task.verification_notes && (
                  <p className="text-xs text-gray-600 italic">
                    "{task.verification_notes}"
                  </p>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <PhotoVerificationModal
        isOpen={showVerifyModal}
        onClose={() => setShowVerifyModal(false)}
        taskId={task.id}
        taskName={task.name}
        locationId={task.location_id}
        onSuccess={() => {
          setShowVerifyModal(false);
          onClose(); // Close details modal too on success
        }}
      />
    </>
  );
};
