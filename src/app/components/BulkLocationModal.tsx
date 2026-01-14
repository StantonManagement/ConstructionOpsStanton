import React, { useState } from 'react';
import { useBulkCreateLocations } from '@/hooks/queries/useLocations';
import { useTemplates } from '@/hooks/queries/useTemplates';
import { useProperties } from '@/hooks/queries/useProperties';
import { useProjects } from '@/hooks/queries/useProjects';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LocationType, UnitType, BulkLocationInput } from '@/types/schema';
import { AlertCircle, Loader2 } from 'lucide-react';

interface Props {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const BulkLocationModal: React.FC<Props> = ({ projectId, isOpen, onClose, onSuccess }) => {
  const { mutate: bulkCreate, isPending } = useBulkCreateLocations();
  const { data: templates } = useTemplates(true);
  const { data: properties } = useProperties();
  const { data: projects } = useProjects();
  const [error, setError] = useState<string | null>(null);

  const currentProject = projects?.find(p => p.id === projectId);
  const portfolioId = currentProject?.portfolio_id;
  const filteredProperties = portfolioId 
    ? properties?.filter(p => p.portfolio_id === portfolioId)
    : properties;

  const [formData, setFormData] = useState<Partial<BulkLocationInput>>({
    start_number: 101,
    end_number: 110,
    prefix: 'Unit ',
    type: 'unit',
    unit_type: '1BR',
    floor: 1,
    template_id: undefined,
    property_id: ''
  });

  const count = (formData.end_number || 0) - (formData.start_number || 0) + 1;
  const selectedTemplate = templates?.find(t => t.id === formData.template_id);
  const totalTasks = count * (selectedTemplate?.task_count || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.start_number || !formData.end_number) {
      setError('Start and end numbers are required');
      return;
    }

    if (formData.start_number > formData.end_number) {
      setError('Start number must be less than or equal to end number');
      return;
    }

    if (count > 100) {
      setError('Cannot create more than 100 locations at once');
      return;
    }

    if (!formData.property_id) {
      setError('Property is required');
      return;
    }

    bulkCreate(
      {
        project_id: projectId,
        property_id: formData.property_id,
        start_number: formData.start_number,
        end_number: formData.end_number,
        prefix: formData.prefix,
        type: formData.type as LocationType,
        unit_type: formData.type === 'unit' ? formData.unit_type as UnitType : undefined,
        floor: formData.floor,
        template_id: formData.template_id === 'none' ? undefined : formData.template_id
      } as BulkLocationInput,
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
          <DialogTitle>Bulk Create Locations</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="property">Property (Building) *</Label>
            <Select 
              value={formData.property_id} 
              onValueChange={(val) => setFormData(prev => ({ ...prev, property_id: val }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select property" />
              </SelectTrigger>
              <SelectContent>
                {(filteredProperties || []).map(property => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.name} {property.address && `- ${property.address}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_number">Start Number</Label>
              <Input
                id="start_number"
                type="number"
                value={formData.start_number}
                onChange={(e) => setFormData(prev => ({ ...prev, start_number: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_number">End Number</Label>
              <Input
                id="end_number"
                type="number"
                value={formData.end_number}
                onChange={(e) => setFormData(prev => ({ ...prev, end_number: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prefix">Name Prefix</Label>
              <Input
                id="prefix"
                value={formData.prefix}
                onChange={(e) => setFormData(prev => ({ ...prev, prefix: e.target.value }))}
                placeholder="e.g. Unit "
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="floor">Floor</Label>
              <Input
                id="floor"
                type="number"
                value={formData.floor}
                onChange={(e) => setFormData(prev => ({ ...prev, floor: parseInt(e.target.value) || 1 }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select 
                value={formData.type} 
                onValueChange={(val) => setFormData(prev => ({ ...prev, type: val as LocationType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unit">Unit</SelectItem>
                  <SelectItem value="common_area">Common Area</SelectItem>
                  <SelectItem value="exterior">Exterior</SelectItem>
                  <SelectItem value="building_system">Building System</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {formData.type === 'unit' && (
              <div className="space-y-2">
                <Label htmlFor="unit_type">Unit Type</Label>
                <Select 
                  value={formData.unit_type} 
                  onValueChange={(val) => setFormData(prev => ({ ...prev, unit_type: val as UnitType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="studio">Studio</SelectItem>
                    <SelectItem value="1BR">1 Bedroom</SelectItem>
                    <SelectItem value="2BR">2 Bedroom</SelectItem>
                    <SelectItem value="3BR">3 Bedroom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="template">Apply Template (Optional)</Label>
            <Select 
              value={formData.template_id || 'none'} 
              onValueChange={(val) => setFormData(prev => ({ ...prev, template_id: val === 'none' ? undefined : val }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a template..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {templates?.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} ({t.task_count} tasks)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preview */}
          <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800 border border-blue-200">
            <p className="font-semibold">Summary:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Creating {count > 0 ? count : 0} locations</li>
              <li>{formData.prefix}{formData.start_number} to {formData.prefix}{formData.end_number}</li>
              {formData.template_id && (
                <li>Generating {totalTasks} tasks total ({selectedTemplate?.task_count} per location)</li>
              )}
            </ul>
          </div>

          {error && (
            <div className="bg-red-50 text-red-800 p-3 rounded-lg flex items-start gap-2 text-sm border border-red-200">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button variant="outline" type="button" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || count <= 0}>
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Locations'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
