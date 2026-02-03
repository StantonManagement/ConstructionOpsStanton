import React from 'react';
import { LocationWithStats } from '@/hooks/queries/useRenovationLocations';
import { LocationCard } from './LocationCard';
import { Button } from '@/components/ui/button';
import { Loader2, Plus } from 'lucide-react';

interface Props {
  locations: LocationWithStats[];
  isLoading: boolean;
  onLocationClick: (id: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  view?: 'grid' | 'list';
}

export const RenovationLocationList: React.FC<Props> = ({ 
  locations, 
  isLoading, 
  onLocationClick,
  onLoadMore,
  hasMore,
  view = 'grid'
}) => {
  if (isLoading && locations.length === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div className="text-center py-16 bg-muted rounded-lg border border-dashed border-border">
        <p className="text-muted-foreground mb-2">No locations found matching your filters</p>
        <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {view === 'list' ? (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="divide-y divide-border">
            {locations.map((location) => (
              <button
                key={location.id}
                type="button"
                onClick={() => onLocationClick(location.id)}
                className="w-full text-left p-4 hover:bg-accent transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-semibold text-foreground truncate">{location.name}</div>
                    <div className="text-sm text-muted-foreground truncate">{location.property_name}</div>
                    <div className="text-xs text-muted-foreground capitalize mt-1">
                      {location.type.replace('_', ' ')}
                      {location.unit_number && ` • #${location.unit_number}`}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-xs text-muted-foreground">{location.verified_tasks || 0}/{location.total_tasks || 0} verified</div>
                    {(location.pending_verify_tasks || 0) > 0 && (
                      <div className="text-xs font-medium text-yellow-700 dark:text-yellow-400 mt-1">Verify</div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {locations.map((location) => (
            <LocationCard
              key={location.id}
              location={location}
              onClick={() => onLocationClick(location.id)}
            />
          ))}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button 
            variant="outline" 
            onClick={onLoadMore} 
            disabled={isLoading}
            className="w-full sm:w-auto min-w-[200px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              'Load More Locations'
            )}
          </Button>
        </div>
      )}
    </div>
  );
};
