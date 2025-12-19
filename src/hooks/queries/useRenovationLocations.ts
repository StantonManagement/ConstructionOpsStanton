import { useQuery } from '@tanstack/react-query';
import { Location } from '@/types/schema';

export interface LocationWithStats extends Location {
  property_name?: string;
  total_tasks: number;
  verified_tasks: number;
  pending_verify_tasks: number;
  in_progress_tasks: number;
  not_started_tasks: number;
  total_estimated_cost: number;
  verified_cost: number;
}

interface UseLocationsOptions {
  property_id?: string;
  status?: string[];
  type?: string;
  blocked?: string;
  pending_verify?: string;
  search?: string;
  limit?: number;
  offset?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export function useRenovationLocations(options: UseLocationsOptions) {
  return useQuery<{ locations: LocationWithStats[]; total: number; filtered_total?: number; limit: number; offset: number }>({
    queryKey: ['renovation-locations', options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options.property_id) params.set('property_id', options.property_id);
      if (options.status && options.status.length > 0) params.set('status', options.status.join(','));
      if (options.type) params.set('type', options.type);
      if (options.blocked) params.set('blocked', options.blocked);
      if (options.pending_verify) params.set('pending_verify', options.pending_verify);
      if (options.search) params.set('search', options.search);
      if (options.limit) params.set('limit', options.limit.toString());
      if (options.offset) params.set('offset', options.offset.toString());
      if (options.sort) params.set('sort', options.sort);
      if (options.order) params.set('order', options.order);

      const res = await fetch(`/api/renovations/locations?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch locations');
      return res.json();
    },
    placeholderData: (previousData) => previousData, // Keep data while fetching new filter results
  });
}
