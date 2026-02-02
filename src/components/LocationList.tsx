import React, { useState } from 'react';
import { useLocations } from '@/hooks/queries/useLocations';
import { LocationCard } from '@/components/LocationCard';
import { Button } from '@/components/ui/button';
import { Plus, Search, CheckSquare, X, Copy } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ApplyTemplateModal } from '@/app/components/ApplyTemplateModal';
import { Checkbox } from '@/components/ui/checkbox';
import { StatusFilter } from '@/components/StatusFilter';
import { useSearchParams } from 'next/navigation';

interface Props {
  projectId: number | string;
  onLocationClick?: (locationId: string) => void;
  onAddLocation?: () => void;
}

export const LocationList: React.FC<Props> = ({ projectId, onLocationClick, onAddLocation }) => {
  const { data: locations, isLoading, error } = useLocations(typeof projectId === 'string' ? Number(projectId) : projectId);
  const searchParams = useSearchParams();
  const filterStatuses = searchParams.getAll('status');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selection state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showApplyTemplate, setShowApplyTemplate] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-gray-100 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
        Error loading locations: {error.message}
      </div>
    );
  }

  const filteredLocations = locations?.filter(loc => {
    const matchesStatus = filterStatuses.length === 0 || filterStatuses.includes('all') || filterStatuses.includes(loc.status);
    const matchesSearch = loc.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          loc.type.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (filteredLocations) {
      if (selectedIds.size === filteredLocations.length) {
        setSelectedIds(new Set());
      } else {
        setSelectedIds(new Set(filteredLocations.map(l => l.id)));
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-3 rounded-lg border shadow-sm">
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          {isSelectionMode ? (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
              <Button variant="ghost" size="sm" onClick={() => {
                setIsSelectionMode(false);
                setSelectedIds(new Set());
              }}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <div className="h-4 w-px bg-gray-300 mx-1" />
              <span className="text-sm font-medium text-blue-600">
                {selectedIds.size} Selected
              </span>
              <Button variant="outline" size="sm" onClick={selectAll}>
                {selectedIds.size === filteredLocations?.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
          ) : (
            <>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search locations..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <StatusFilter className="w-full sm:w-auto" />
            </>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {isSelectionMode ? (
            <Button 
              onClick={() => setShowApplyTemplate(true)} 
              disabled={selectedIds.size === 0}
              variant="secondary"
              className="w-full sm:w-auto"
            >
              <Copy className="w-4 h-4 mr-2" />
              Apply Template
            </Button>
          ) : (
            <Button 
              variant="outline" 
              onClick={() => setIsSelectionMode(true)}
              className="w-full sm:w-auto"
            >
              <CheckSquare className="w-4 h-4 mr-2" />
              Select
            </Button>
          )}

          {!isSelectionMode && onAddLocation && (
            <Button onClick={onAddLocation} className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Add Location
            </Button>
          )}
        </div>
      </div>

      {/* Grid */}
      {filteredLocations && filteredLocations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredLocations.map((location) => (
            <div key={location.id} className="relative group">
              <LocationCard
                location={location}
                onClick={isSelectionMode ? () => toggleSelection(location.id) : () => onLocationClick?.(location.id)}
              />
              {isSelectionMode && (
                <div className="absolute top-3 right-3 z-10">
                  <Checkbox 
                    checked={selectedIds.has(location.id)}
                    onCheckedChange={() => toggleSelection(location.id)}
                    className="h-5 w-5 bg-white border-2 border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <p className="text-gray-500 mb-2">No locations found</p>
          {onAddLocation && (
            <Button variant="outline" onClick={onAddLocation}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Location
            </Button>
          )}
        </div>
      )}

      {/* Apply Template Modal */}
      <ApplyTemplateModal
        isOpen={showApplyTemplate}
        onClose={() => setShowApplyTemplate(false)}
        locationIds={Array.from(selectedIds)}
        onSuccess={() => {
          setIsSelectionMode(false);
          setSelectedIds(new Set());
        }}
      />
    </div>
  );
};
