import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
}

const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '', 
  width = 'w-full', 
  height = 'h-4', 
  rounded = 'md' 
}) => {
  const roundedClasses = {
    none: '',
    sm: 'rounded',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full'
  };

  return (
    <div 
      className={`${width} ${height} ${roundedClasses[rounded]} bg-secondary/80 animate-pulse ${className}`}
      aria-hidden="true"
    />
  );
};

interface CardSkeletonProps {
  lines?: number;
  className?: string;
}

const CardSkeleton: React.FC<CardSkeletonProps> = ({ lines = 3, className = '' }) => (
  <div className={`bg-white border rounded-lg p-4 ${className}`}>
    <div className="space-y-3">
      <Skeleton width="w-3/4" height="h-4" />
      {Array.from({ length: lines - 1 }).map((_, i) => (
        <Skeleton 
          key={i} 
          width={i === lines - 2 ? "w-1/2" : "w-full"} 
          height="h-3" 
        />
      ))}
    </div>
  </div>
);

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

const TableSkeleton: React.FC<TableSkeletonProps> = ({ 
  rows = 5, 
  columns = 4, 
  className = '' 
}) => (
  <div className={`bg-white border rounded-lg overflow-hidden ${className}`}>
    <div className="border-b bg-secondary px-6 py-3">
      <div className="flex space-x-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} width="w-20" height="h-4" />
        ))}
      </div>
    </div>
    <div className="divide-y">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="px-6 py-4">
          <div className="flex space-x-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton 
                key={colIndex} 
                width={colIndex === 0 ? "w-32" : "w-24"} 
                height="h-4" 
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

interface GridSkeletonProps {
  items?: number;
  columns?: number;
  className?: string;
}

const GridSkeleton: React.FC<GridSkeletonProps> = ({ 
  items = 6, 
  columns = 3, 
  className = '' 
}) => (
  <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} gap-6 ${className}`}>
    {Array.from({ length: items }).map((_, i) => (
      <CardSkeleton key={i} lines={4} />
    ))}
  </div>
);

export { Skeleton, CardSkeleton, TableSkeleton, GridSkeleton };
