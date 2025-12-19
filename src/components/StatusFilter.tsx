import React from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

interface Props {
  className?: string;
  paramName?: string;
}

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'worker_complete', label: 'Needs Verify' },
  { value: 'verified', label: 'Verified' },
  { value: 'on_hold', label: 'Blocked' },
];

export const StatusFilter: React.FC<Props> = ({ className, paramName = 'status' }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const currentValues = searchParams.getAll(paramName);
  const value = currentValues.length > 0 ? currentValues : ['all'];

  const handleValueChange = (newValues: string[]) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(paramName);
    
    if (newValues.includes('all') && !currentValues.includes('all')) {
        // If "All" was just selected, clear others
        params.set(paramName, 'all');
    } else if (newValues.length === 0) {
        // Default to all
        params.set(paramName, 'all');
    } else {
        // Remove "all" if other specific filters are selected
        const filtered = newValues.filter(v => v !== 'all');
        if (filtered.length === 0) {
            params.set(paramName, 'all');
        } else {
            filtered.forEach(v => params.append(paramName, v));
        }
    }

    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <ToggleGroup 
        type="multiple" 
        value={value} 
        onValueChange={handleValueChange}
        className={`justify-start flex-wrap ${className}`}
    >
      {FILTERS.map((filter) => (
        <ToggleGroupItem 
            key={filter.value} 
            value={filter.value}
            className="data-[state=on]:bg-blue-100 data-[state=on]:text-blue-700 border border-transparent data-[state=on]:border-blue-200"
            aria-label={`Filter by ${filter.label}`}
        >
          {filter.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
};
