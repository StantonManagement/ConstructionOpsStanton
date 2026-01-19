'use client';

/**
 * ProjectsSkeleton - Loading skeleton for projects grid
 * Shows placeholder cards while projects are loading
 */
export default function ProjectsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="h-8 w-32 bg-gray-200 rounded"></div>
          <div className="h-4 w-24 bg-gray-200 rounded mt-2"></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-10 w-32 bg-gray-200 rounded"></div>
          <div className="h-10 w-24 bg-gray-200 rounded"></div>
        </div>
      </div>

      {/* Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="h-6 w-3/4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 w-1/2 bg-gray-200 rounded"></div>
              </div>
              <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
              <div>
                <div className="h-3 w-16 bg-gray-200 rounded mb-2"></div>
                <div className="h-5 w-20 bg-gray-200 rounded"></div>
              </div>
              <div>
                <div className="h-3 w-16 bg-gray-200 rounded mb-2"></div>
                <div className="h-5 w-20 bg-gray-200 rounded"></div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <div className="h-3 w-20 bg-gray-200 rounded"></div>
                <div className="h-3 w-12 bg-gray-200 rounded"></div>
              </div>
              <div className="h-2 w-full bg-gray-200 rounded-full"></div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="h-4 w-24 bg-gray-200 rounded"></div>
              <div className="h-8 w-24 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
