import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useBlockLocation } from '@/hooks/queries/useLocations';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  locationId: string;
  locationName?: string;
  currentReason?: string;
  currentNote?: string;
}

export const BlockLocationModal: React.FC<Props> = ({ 
  isOpen, 
  onClose, 
  locationId, 
  locationName,
  currentReason,
  currentNote
}) => {
  const [reason, setReason] = useState<string>(currentReason || 'materials');
  const [note, setNote] = useState(currentNote || '');
  const [error, setError] = useState<string | null>(null);

  // Reset state when opening/changing props
  React.useEffect(() => {
    if (isOpen) {
      setReason(currentReason || 'materials');
      setNote(currentNote || '');
    }
  }, [isOpen, currentReason, currentNote]);

  const { mutate: blockLocation, isPending } = useBlockLocation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!note.trim()) {
      setError('Please provide a brief note about the issue.');
      return;
    }

    blockLocation({
      id: locationId,
      reason,
      note: note.trim()
    }, {
      onSuccess: () => {
        onClose();
        setNote('');
        setReason('materials');
      },
      onError: (err) => {
        setError(err.message);
      }
    });
  };

  const reasons = [
    { value: 'materials', label: 'Materials (Waiting on delivery)', icon: '🏗️' },
    { value: 'labor', label: 'Labor (No workers available)', icon: '👷' },
    { value: 'cash', label: 'Cash (Payment issue)', icon: '💰' },
    { value: 'dependency', label: 'Dependency (Waiting on other task)', icon: '🔗' },
    { value: 'other', label: 'Other', icon: '❓' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="w-5 h-5" />
            Block Location
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="bg-amber-50 p-3 rounded-md text-sm text-amber-800 border border-amber-200">
            Blocking <strong>{locationName}</strong> will mark it as "On Hold" and notify the project manager.
          </div>

          <div className="space-y-3">
            <Label>Reason for Blockage</Label>
            <RadioGroup value={reason} onValueChange={setReason} className="space-y-2">
              {reasons.map((r) => (
                <div key={r.value} className="flex items-center space-x-2 border p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value={r.value} id={r.value} />
                  <Label htmlFor={r.value} className="flex items-center gap-2 cursor-pointer w-full font-normal">
                    <span className="text-xl">{r.icon}</span>
                    {r.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note (Required)</Label>
            <Input
              id="note"
              placeholder="E.g., Missing tiles for shower floor..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Blocking...
                </>
              ) : (
                'Block Location'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
