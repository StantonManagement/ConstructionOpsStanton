import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/theme';
import { Wallet, ArrowRight, Loader2 } from 'lucide-react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

interface Props {
  data?: {
    total_eligible: number;
    pending_draws_amount: number;
    pending_draws_count: number;
  };
  isLoading: boolean;
}

export const DrawStatsCards: React.FC<Props> = ({ data, isLoading }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const returnTo = `${pathname || '/'}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-32 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-32 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Eligible Card */}
      <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
        <CardContent className="p-5">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium text-blue-600 mb-1">ELIGIBLE TO DRAW</p>
              <h3 className="text-3xl font-bold text-gray-900">
                {formatCurrency(data?.total_eligible || 0)}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Verified work ready for funding
              </p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Wallet className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <Button 
            className="w-full justify-between group" 
            onClick={() => router.push(`/renovations/draws/new?returnTo=${encodeURIComponent(returnTo)}`)}
          >
            Create New Draw
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </CardContent>
      </Card>

      {/* Pending Card */}
      <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-100">
        <CardContent className="p-5">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium text-amber-600 mb-1">PENDING DRAWS</p>
              <h3 className="text-3xl font-bold text-gray-900">
                {formatCurrency(data?.pending_draws_amount || 0)}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {data?.pending_draws_count || 0} draw{(data?.pending_draws_count || 0) !== 1 ? 's' : ''} awaiting approval
              </p>
            </div>
            <div className="p-2 bg-amber-100 rounded-lg">
              <ClockIcon className="w-6 h-6 text-amber-600" />
            </div>
          </div>
          <Button 
            variant="outline" 
            className="w-full justify-between group border-amber-200 text-amber-800 hover:bg-amber-50 hover:text-amber-900"
            onClick={() => {
              // Filter list to pending (handled by parent or URL param)
              const params = new URLSearchParams(window.location.search);
              params.set('status', 'submitted');
              router.push(`/renovations/draws?${params.toString()}`);
            }}
          >
            View Pending Draws
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
