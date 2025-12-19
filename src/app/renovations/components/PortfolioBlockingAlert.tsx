import React from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface PortfolioBlockingAlertProps {
  blockedCount: number;
  blockedByReason: Record<string, number>;
}

export const PortfolioBlockingAlert: React.FC<PortfolioBlockingAlertProps> = ({ 
  blockedCount, 
  blockedByReason 
}) => {
  const router = useRouter();

  if (blockedCount === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-semibold text-amber-900">
            {blockedCount} Blocked Locations require attention
          </h3>
          <p className="text-sm text-amber-700 mt-1">
            {Object.entries(blockedByReason)
              .filter(([_, count]) => count > 0)
              .map(([reason, count]) => (
                <span key={reason} className="mr-3 capitalize">
                  {reason}: <strong>{count}</strong>
                </span>
              ))}
          </p>
        </div>
      </div>
      
      <Button 
        variant="outline" 
        className="bg-white border-amber-300 text-amber-800 hover:bg-amber-50 hover:text-amber-900 whitespace-nowrap"
        onClick={() => router.push('/renovations/blocking')}
      >
        View Blocking Report
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
};
