import React, { useState, useEffect } from 'react';
import { useTemplate, useUpdateTemplate, useDeleteTemplate, useAddTemplateTask, useUpdateTemplateTask, useDeleteTemplateTask, useReorderTemplateTasks } from '@/hooks/queries/useTemplates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Trash2, Plus, GripVertical, Loader2 } from 'lucide-react';
import { UnitType, CreateTemplateTaskInput, TemplateTask } from '@/types/schema';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Props {
  templateId: string;
  onBack: () => void;
}

interface SortableTaskRowProps {
  task: TemplateTask;
  index: number;
  templateId: string;
  onDelete: (params: { id: string; templateId: string }) => void;
}

const SortableTaskRow = ({ task, index, templateId, onDelete }: SortableTaskRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
    position: 'relative' as const,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={`p-4 border-b bg-white hover:bg-gray-50 transition-colors flex items-center justify-between group ${isDragging ? 'shadow-lg ring-1 ring-blue-500 rounded-md z-10' : ''}`}
    >
      <div className="flex items-center gap-3">
        <div 
          className="text-gray-400 cursor-move hover:text-gray-600 focus:outline-none"
          {...attributes} 
          {...listeners}
        >
          <GripVertical className="w-4 h-4" />
        </div>
        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
          {index + 1}
        </div>
        <div>
          <p className="font-medium text-gray-900">{task.name}</p>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            {task.default_duration_days && (
              <span>{task.default_duration_days} days</span>
            )}
            {task.estimated_cost && (
              <span>${task.estimated_cost}</span>
            )}
          </div>
        </div>
      </div>

      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
        <Button 
          size="icon" 
          variant="ghost" 
          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
          onClick={() => onDelete({ id: task.id, templateId })}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export const TemplateDetailView: React.FC<Props> = ({ templateId, onBack }) => {
  const { data: template, isLoading, error } = useTemplate(templateId);
  
  // Template mutations
  const { mutate: updateTemplate, isPending: isUpdating } = useUpdateTemplate();
  const { mutate: deleteTemplate, isPending: isDeleting } = useDeleteTemplate();
  
  // Task mutations
  const { mutate: addTask, isPending: isAddingTask } = useAddTemplateTask();
  const { mutate: updateTask } = useUpdateTemplateTask();
  const { mutate: deleteTask } = useDeleteTemplateTask();
  const { mutate: reorderTasks } = useReorderTemplateTasks();

  // Local state for template edit
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [headerForm, setHeaderForm] = useState({ name: '', description: '', unit_type: 'any' });

  // State for task creation modal
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTask, setNewTask] = useState<Partial<CreateTemplateTaskInput> & { depends_on_sort_order?: number }>({
    name: '',
    description: '',
    default_duration_days: 1,
    estimated_cost: undefined,
    depends_on_sort_order: undefined
  });

  // State for delete confirm
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Local state for tasks to handle dnd
  const [tasks, setTasks] = useState<TemplateTask[]>([]);

  // Sensors for dnd-kit
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Initialize header form and tasks when data loads
  React.useEffect(() => {
    if (template) {
      setHeaderForm({
        name: template.name,
        description: template.description || '',
        unit_type: template.unit_type || 'any'
      });
      if (template.tasks) {
        setTasks(template.tasks);
      }
    }
  }, [template]);

  if (isLoading) return <div className="p-8 text-center">Loading template...</div>;
  if (error || !template) return <div className="p-8 text-center text-red-500">Error loading template</div>;

  const handleUpdateHeader = () => {
    updateTemplate({
      id: templateId,
      data: {
        name: headerForm.name,
        description: headerForm.description,
        unit_type: headerForm.unit_type === 'any' ? null : (headerForm.unit_type as UnitType)
      }
    }, {
      onSuccess: () => setIsEditingHeader(false)
    });
  };

  const handleDeleteTemplate = () => {
    deleteTemplate(templateId, {
      onSuccess: onBack
    });
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.name) return;

    addTask({
      template_id: templateId,
      name: newTask.name,
      description: newTask.description,
      default_duration_days: newTask.default_duration_days,
      estimated_cost: newTask.estimated_cost,
      sort_order: tasks.length, // Use current length for sort order
      depends_on_sort_order: newTask.depends_on_sort_order
    } as any, { 
      onSuccess: () => {
        setShowTaskModal(false);
        setNewTask({ name: '', description: '', default_duration_days: 1, estimated_cost: undefined, depends_on_sort_order: undefined });
      }
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setTasks((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // Prepare updates for server
        // Recalculate sort_order based on new index
        const updates = newItems.map((task, index) => ({
          id: task.id,
          sort_order: index
        }));

        // Send to server
        reorderTasks({ templateId, tasks: updates });

        return newItems;
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} className="p-0 hover:bg-transparent">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Button>
          <div>
            {isEditingHeader ? (
              <div className="flex items-center gap-2">
                <Input 
                  value={headerForm.name} 
                  onChange={(e) => setHeaderForm(prev => ({ ...prev, name: e.target.value }))}
                  className="font-bold text-xl h-8 w-64"
                />
              </div>
            ) : (
              <h2 className="text-xl font-bold text-gray-900">{template.name}</h2>
            )}
            
            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
              {isEditingHeader ? (
                <Select 
                  value={headerForm.unit_type} 
                  onValueChange={(val) => setHeaderForm(prev => ({ ...prev, unit_type: val }))}
                >
                  <SelectTrigger className="h-6 w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any Unit</SelectItem>
                    <SelectItem value="studio">Studio</SelectItem>
                    <SelectItem value="1BR">1 Bedroom</SelectItem>
                    <SelectItem value="2BR">2 Bedroom</SelectItem>
                    <SelectItem value="3BR">3 Bedroom</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                  {template.unit_type || 'Any Unit Type'}
                </span>
              )}
              <span>•</span>
              <span>{tasks.length} Tasks</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEditingHeader ? (
            <>
              <Button size="sm" variant="ghost" onClick={() => setIsEditingHeader(false)}>Cancel</Button>
              <Button size="sm" onClick={handleUpdateHeader} disabled={isUpdating}>Save</Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={() => setIsEditingHeader(true)}>Edit Details</Button>
              <Button size="sm" variant="destructive" onClick={() => setShowDeleteConfirm(true)}>Delete</Button>
            </>
          )}
        </div>
      </div>

      {isEditingHeader && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <Label className="text-xs font-semibold uppercase text-gray-500 mb-1 block">Description</Label>
          <Input 
            value={headerForm.description} 
            onChange={(e) => setHeaderForm(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Template description..."
          />
        </div>
      )}

      {/* Tasks List */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <h3 className="font-semibold text-gray-900">Task List</h3>
          <Button size="sm" onClick={() => setShowTaskModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </Button>
        </div>

        <div className="divide-y">
          {tasks.length > 0 ? (
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext 
                items={tasks.map(t => t.id)}
                strategy={verticalListSortingStrategy}
              >
                {tasks.map((task, index) => (
                  <SortableTaskRow
                    key={task.id}
                    task={task}
                    index={index}
                    templateId={templateId}
                    onDelete={deleteTask}
                  />
                ))}
              </SortableContext>
            </DndContext>
          ) : (
            <div className="p-8 text-center text-gray-500">
              No tasks yet. Add a task to get started.
            </div>
          )}
        </div>
      </div>

      {/* Add Task Modal */}
      <Dialog open={showTaskModal} onOpenChange={setShowTaskModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Template Task</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddTask} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Task Name</Label>
              <Input 
                value={newTask.name}
                onChange={(e) => setNewTask(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Rough Plumbing"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label>Description</Label>
              <Input 
                value={newTask.description}
                onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Details..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration (Days)</Label>
                <Input 
                  type="number"
                  min="1"
                  value={newTask.default_duration_days}
                  onChange={(e) => setNewTask(prev => ({ ...prev, default_duration_days: parseInt(e.target.value) || 1 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Est. Cost ($)</Label>
                <Input 
                  type="number"
                  min="0"
                  step="0.01"
                  value={newTask.estimated_cost || ''}
                  onChange={(e) => setNewTask(prev => ({ ...prev, estimated_cost: parseFloat(e.target.value) || undefined }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Depends On (Optional)</Label>
              <Select 
                value={newTask.depends_on_sort_order?.toString() || "none"}
                onValueChange={(val) => setNewTask(prev => ({ 
                  ...prev, 
                  depends_on_sort_order: val === "none" ? undefined : parseInt(val) 
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No dependency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No dependency</SelectItem>
                  {tasks.map((t, i) => (
                    <SelectItem key={t.id} value={t.sort_order.toString()}>
                      {i + 1}. {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Task will be auto-scheduled after the selected task is verified.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowTaskModal(false)}>Cancel</Button>
              <Button type="submit" disabled={isAddingTask}>
                {isAddingTask ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Add Task'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Template Confirm */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template?</DialogTitle>
          </DialogHeader>
          <p className="py-4 text-gray-600">
            Are you sure you want to delete <b>{template.name}</b>? This cannot be undone.
            Locations that have already used this template will NOT be affected.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteTemplate} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
