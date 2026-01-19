'use client';

/**
 * PaymentsSkeleton - Loading skeleton for payment applications list
 * Shows placeholder rows while payment applications are loading
 */
export default function PaymentsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <div className="h-7 w-56 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 w-32 bg-gray-200 rounded"></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-10 w-32 bg-gray-200 rounded"></div>
          <div className="h-10 w-24 bg-gray-200 rounded"></div>
        </div>
      </div>

      {/* Filters Skeleton */}
      <div className="flex flex-wrap gap-2 mb-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-8 w-24 bg-gray-200 rounded-full"></div>
        ))}
      </div>

      {/* Cards Skeleton */}
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 space-y-2">
                <div className="h-6 w-48 bg-gray-200 rounded"></div>
                <div className="h-4 w-32 bg-gray-200 rounded"></div>
              </div>
              <div className="h-6 w-24 bg-gray-200 rounded-full"></div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div>
                <div className="h-3 w-20 bg-gray-200 rounded mb-2"></div>
                <div className="h-5 w-24 bg-gray-200 rounded"></div>
              </div>
              <div>
                <div className="h-3 w-20 bg-gray-200 rounded mb-2"></div>
                <div className="h-5 w-24 bg-gray-200 rounded"></div>
              </div>
              <div>
                <div className="h-3 w-20 bg-gray-200 rounded mb-2"></div>
                <div className="h-5 w-24 bg-gray-200 rounded"></div>
              </div>
              <div>
                <div className="h-3 w-20 bg-gray-200 rounded mb-2"></div>
                <div className="h-5 w-24 bg-gray-200 rounded"></div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="h-4 w-32 bg-gray-200 rounded"></div>
              <div className="flex gap-2">
                <div className="h-8 w-20 bg-gray-200 rounded"></div>
                <div className="h-8 w-20 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
