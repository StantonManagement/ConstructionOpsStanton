import React from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Filter, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface FilterState {
  status: string[];
  type: string;
  blocked: string;
  pending_verify?: string;
}

interface Props {
  filters: FilterState;
  onFilterChange: (newFilters: any) => void;
  count: number;
}

export const MobileFilterSheet: React.FC<Props> = ({ filters, onFilterChange, count }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [draftFilters, setDraftFilters] = React.useState<FilterState>(filters);
 
  React.useEffect(() => {
    if (isOpen) {
      setDraftFilters(filters);
    }
  }, [filters, isOpen]);
 
  const defaultFilters: FilterState = {
    status: [],
    type: 'all',
    blocked: 'any_state',
    pending_verify: 'any_state',
  };
  
  const activeFiltersCount = 
    (draftFilters.status.length > 0 ? 1 : 0) + 
    (draftFilters.type !== 'all' ? 1 : 0) + 
    (draftFilters.blocked !== 'any_state' ? 1 : 0) +
    (draftFilters.pending_verify && draftFilters.pending_verify !== 'any_state' ? 1 : 0);

  const toggleStatus = (status: string) => {
    const current = draftFilters.status;
    const isSelected = current.includes(status);
    let next: string[];
    
    if (status === 'all') {
      next = [];
    } else {
      if (isSelected) {
        next = current.filter(s => s !== status);
      } else {
        next = [...current, status];
      }
    }
    setDraftFilters({ ...draftFilters, status: next });
  };

  const applyPreset = (preset: 'needs_attention' | 'blocked' | 'ready') => {
    switch (preset) {
      case 'needs_attention':
        setDraftFilters({ ...draftFilters, status: ['on_hold', 'in_progress'], blocked: 'any_state', pending_verify: 'any_state' });
        break;
      case 'blocked':
        setDraftFilters({ ...draftFilters, blocked: 'any', status: ['on_hold'], pending_verify: 'any_state' });
        break;
      case 'ready':
        setDraftFilters({ ...draftFilters, status: ['in_progress'], blocked: 'none', pending_verify: 'any' });
        break;
    }
  };

  const clearAll = () => {
    setDraftFilters(defaultFilters);
  };

  const handleApply = () => {
    onFilterChange(draftFilters);
    setIsOpen(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Filter className="w-4 h-4 mr-2" />
          Filters
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full bg-blue-100 text-blue-800">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-xl">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>Filters ({count} results)</SheetTitle>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </SheetHeader>

        <div className="py-6 space-y-6 overflow-y-auto max-h-[calc(80vh-140px)]">
          {/* Presets */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Quick Filters</h4>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => applyPreset('needs_attention')}>
                Needs Attention
              </Button>
              <Button variant="outline" size="sm" onClick={() => applyPreset('blocked')} className="text-amber-700 border-amber-200 bg-amber-50">
                Blocked
              </Button>
              <Button variant="outline" size="sm" onClick={() => applyPreset('ready')} className="text-blue-700 border-blue-200 bg-blue-50">
                Ready to Verify
              </Button>
            </div>
          </div>

          <div className="h-px bg-gray-100" />

          {/* Status */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Status</h4>
            <div className="flex flex-wrap gap-2">
              {['not_started', 'in_progress', 'on_hold', 'complete'].map(status => (
                <Button
                  key={status}
                  variant={draftFilters.status.includes(status) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleStatus(status)}
                  className="capitalize"
                >
                  {status.replace('_', ' ')}
                </Button>
              ))}
            </div>
          </div>

          <div className="h-px bg-gray-100" />

          {/* Type */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Type</h4>
            <div className="flex flex-wrap gap-2">
              {['all', 'unit', 'common_area', 'exterior', 'building_wide'].map(type => (
                <Button
                  key={type}
                  variant={draftFilters.type === type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDraftFilters({ ...draftFilters, type })}
                  className="capitalize"
                >
                  {type.replace('_', ' ')}
                </Button>
              ))}
            </div>
          </div>

          <div className="h-px bg-gray-100" />

          {/* Blocked */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Blocking Status</h4>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'any_state', label: 'Any' },
                { key: 'none', label: 'Not Blocked' },
                { key: 'any', label: 'Blocked (Any)' },
                { key: 'materials', label: 'Materials' },
                { key: 'labor', label: 'Labor' },
                { key: 'cash', label: 'Cash' },
                { key: 'dependency', label: 'Dependency' },
              ].map(({ key, label }) => (
                <Button
                  key={key}
                  variant={draftFilters.blocked === key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDraftFilters({ ...draftFilters, blocked: key })}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          <div className="h-px bg-gray-100" />

          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Verification</h4>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'any_state', label: 'Any' },
                { key: 'any', label: 'Ready' },
                { key: 'none', label: 'Not Ready' },
              ].map(({ key, label }) => (
                <Button
                  key={key}
                  variant={(draftFilters.pending_verify || 'any_state') === key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDraftFilters({ ...draftFilters, pending_verify: key })}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200">
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={clearAll}
              disabled={activeFiltersCount === 0}
            >
              Clear All
            </Button>
            <Button className="flex-1" onClick={handleApply}>
              Apply ({count})
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
