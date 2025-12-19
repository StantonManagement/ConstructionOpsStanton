import React, { useState } from 'react';
import { useApplyTemplate, useTemplates } from '@/hooks/queries/useTemplates';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Loader2, Copy } from 'lucide-react';

interface Props {
  locationIds: string[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ApplyTemplateModal: React.FC<Props> = ({ locationIds, isOpen, onClose, onSuccess }) => {
  const { mutate: applyTemplate, isPending } = useApplyTemplate();
  const { data: templates } = useTemplates(true); // Fetch active templates
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const selectedTemplate = templates?.find(t => t.id === selectedTemplateId);
  const taskCount = selectedTemplate?.task_count || 0;
  const totalTasks = locationIds.length * taskCount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedTemplateId) {
      setError('Please select a template');
      return;
    }

    if (locationIds.length === 0) {
      setError('No locations selected');
      return;
    }

    applyTemplate(
      {
        templateId: selectedTemplateId,
        locationIds: locationIds
      },
      {
        onSuccess: () => {
          onSuccess?.();
          onClose();
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
          <DialogTitle>Apply Template</DialogTitle>
          <DialogDescription>
            Applying a template will add tasks to the selected locations. Existing tasks will not be deleted.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="bg-blue-50 p-4 rounded-lg flex items-center gap-3 text-blue-800 border border-blue-200">
            <Copy className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-semibold">{locationIds.length} Locations Selected</p>
              <p className="text-xs mt-0.5 opacity-80">Ready to receive tasks</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="template">Select Template</Label>
            <Select 
              value={selectedTemplateId} 
              onValueChange={setSelectedTemplateId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a scope template..." />
              </SelectTrigger>
              <SelectContent>
                {templates?.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} ({t.task_count} tasks)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedTemplateId && (
            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-200">
              <p>This will create <span className="font-bold text-gray-900">{totalTasks} tasks</span> total.</p>
              <p className="text-xs mt-1 text-gray-500">
                ({locationIds.length} locations × {taskCount} tasks/template)
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-800 p-3 rounded-lg flex items-start gap-2 text-sm border border-red-200">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !selectedTemplateId}>
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Applying...
                </>
              ) : (
                'Apply Template'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
