import React, { useState } from 'react';
import { useCreateLocation } from '@/hooks/queries/useLocations';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LocationType, UnitType, CreateLocationInput } from '@/types/schema';

interface Props {
  projectId: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreateLocationModal: React.FC<Props> = ({ projectId, isOpen, onClose, onSuccess }) => {
  const { mutate: createLocation, isPending } = useCreateLocation();
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<CreateLocationInput>>({
    name: '',
    type: 'unit',
    unit_type: '1BR',
    unit_number: '',
    floor: 1,
    status: 'not_started'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name) {
      setError('Name is required');
      return;
    }

    createLocation(
      {
        project_id: projectId,
        name: formData.name,
        type: formData.type as LocationType,
        unit_type: formData.type === 'unit' ? formData.unit_type as UnitType : undefined,
        unit_number: formData.type === 'unit' ? formData.unit_number : undefined,
        floor: formData.floor,
        status: 'not_started'
      } as CreateLocationInput,
      {
        onSuccess: () => {
          onSuccess?.();
          onClose();
          // Reset form
          setFormData({
            name: '',
            type: 'unit',
            unit_type: '1BR',
            unit_number: '',
            floor: 1,
            status: 'not_started'
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Location</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="type">Location Type</Label>
            <Select 
              value={formData.type} 
              onValueChange={(val) => setFormData(prev => ({ ...prev, type: val as LocationType }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unit">Unit</SelectItem>
                <SelectItem value="common_area">Common Area</SelectItem>
                <SelectItem value="exterior">Exterior</SelectItem>
                <SelectItem value="building_wide">Building Wide</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="e.g. Unit 101 or Main Lobby"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          {formData.type === 'unit' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="unit_number">Unit Number</Label>
                  <Input
                    id="unit_number"
                    placeholder="101"
                    value={formData.unit_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, unit_number: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="floor">Floor</Label>
                  <Input
                    id="floor"
                    type="number"
                    value={formData.floor}
                    onChange={(e) => setFormData(prev => ({ ...prev, floor: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="unit_type">Unit Layout</Label>
                <Select 
                  value={formData.unit_type} 
                  onValueChange={(val) => setFormData(prev => ({ ...prev, unit_type: val as UnitType }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select layout" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="studio">Studio</SelectItem>
                    <SelectItem value="1BR">1 Bedroom</SelectItem>
                    <SelectItem value="2BR">2 Bedroom</SelectItem>
                    <SelectItem value="3BR">3 Bedroom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

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
              {isPending ? 'Creating...' : 'Create Location'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
