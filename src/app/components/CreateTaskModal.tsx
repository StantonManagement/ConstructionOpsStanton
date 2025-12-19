import React, { useState } from 'react';
import { useCreateTask } from '@/hooks/queries/useTasks';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PriorityLevel, CreateTaskInput } from '@/types/schema';

interface Props {
  locationId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreateTaskModal: React.FC<Props> = ({ locationId, isOpen, onClose, onSuccess }) => {
  const { mutate: createTask, isPending } = useCreateTask();
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<CreateTaskInput>>({
    name: '',
    description: '',
    priority: 'medium',
    status: 'not_started',
    estimated_cost: undefined,
    duration_days: 1
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name) {
      setError('Name is required');
      return;
    }

    createTask(
      {
        location_id: locationId,
        name: formData.name,
        description: formData.description,
        priority: formData.priority as PriorityLevel,
        status: 'not_started',
        estimated_cost: formData.estimated_cost,
        duration_days: formData.duration_days,
        // Optional fields not yet in UI but part of type
        scheduled_start: undefined,
        scheduled_end: undefined
      } as CreateTaskInput,
      {
        onSuccess: () => {
          onSuccess?.();
          onClose();
          // Reset form
          setFormData({
            name: '',
            description: '',
            priority: 'medium',
            status: 'not_started',
            estimated_cost: undefined,
            duration_days: 1
          });
        },
        onError: (err) => {
          setError(err.message);
        }
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Task</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Task Name</Label>
            <Input
              id="name"
              placeholder="e.g. Install Kitchen Cabinets"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Details about the task..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="priority">Priority</Label>
              <Select 
                value={formData.priority} 
                onValueChange={(val) => setFormData(prev => ({ ...prev, priority: val as PriorityLevel }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="duration">Est. Duration (Days)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                value={formData.duration_days}
                onChange={(e) => setFormData(prev => ({ ...prev, duration_days: parseInt(e.target.value) || 1 }))}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="cost">Estimated Cost (Optional)</Label>
            <Input
              id="cost"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={formData.estimated_cost || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, estimated_cost: parseFloat(e.target.value) || undefined }))}
            />
          </div>

          {error && (
            <div className="text-sm text-red-500 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <DialogFooter className="pt-4">
            <Button variant="outline" type="button" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Creating...' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
