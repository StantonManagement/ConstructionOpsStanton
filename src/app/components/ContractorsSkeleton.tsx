'use client';

/**
 * ContractorsSkeleton - Loading skeleton for contractors list
 * Shows placeholder rows while contractors are loading
 */
export default function ContractorsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="h-8 w-40 bg-gray-200 rounded"></div>
          <div className="h-4 w-56 bg-gray-200 rounded mt-2"></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-10 w-32 bg-gray-200 rounded"></div>
          <div className="h-10 w-24 bg-gray-200 rounded"></div>
        </div>
      </div>

      {/* Search Bar Skeleton */}
      <div className="h-10 w-full max-w-md bg-gray-200 rounded"></div>

      {/* Table Skeleton */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* Table Header */}
        <div className="border-b border-gray-200 bg-gray-50 p-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="h-4 w-24 bg-gray-200 rounded"></div>
            <div className="h-4 w-20 bg-gray-200 rounded"></div>
            <div className="h-4 w-28 bg-gray-200 rounded"></div>
            <div className="h-4 w-16 bg-gray-200 rounded"></div>
          </div>
        </div>

        {/* Table Rows */}
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="border-b border-gray-100 p-4">
            <div className="grid grid-cols-4 gap-4 items-center">
              <div className="space-y-2">
                <div className="h-5 w-32 bg-gray-200 rounded"></div>
                <div className="h-3 w-24 bg-gray-200 rounded"></div>
              </div>
              <div className="h-4 w-28 bg-gray-200 rounded"></div>
              <div className="h-4 w-36 bg-gray-200 rounded"></div>
              <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
