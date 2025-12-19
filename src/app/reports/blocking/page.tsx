'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useBlockingReport } from '@/hooks/queries/useReports';
import { useUnblockLocation } from '@/hooks/queries/useLocations';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Construction, User, DollarSign, Link as LinkIcon, HelpCircle, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/theme';
import { StatusFilter } from '@/components/StatusFilter';

// Icons map for blocking reasons
const REASON_ICONS: Record<string, any> = {
  materials: Construction,
  labor: User,
  cash: DollarSign,
  dependency: LinkIcon,
  other: HelpCircle,
};

const REASON_LABELS: Record<string, string> = {
  materials: 'Materials',
  labor: 'Labor',
  cash: 'Cash Flow',
  dependency: 'Dependency',
  other: 'Other Issue',
};

function BlockingReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get('project_id');
  const projectId = projectIdParam ? parseInt(projectIdParam) : undefined;

  const { data, isLoading, refetch } = useBlockingReport(projectId);
  const { mutate: unblockLocation, isPending: isUnblocking } = useUnblockLocation();
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  const handleUnblock = (locationId: string) => {
    if (confirm('Are you sure you want to unblock this location?')) {
      setUnblockingId(locationId);
      unblockLocation(locationId, {
        onSuccess: () => {
          setUnblockingId(null);
          refetch();
        },
        onError: () => setUnblockingId(null)
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()} className="p-0 hover:bg-transparent">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
              Blocking Report
            </h1>
            <p className="text-gray-500">
              {data.total_blocked} blocked locations • Total impact: {formatCurrency(data.total_affected_cost)}
            </p>
          </div>
        </div>
        
        {projectId && (
          <Button variant="outline" onClick={() => router.push('/reports/blocking')}>
            View All Projects
          </Button>
        )}
      </div>

      {/* Grouped Lists */}
      <div className="space-y-6">
        {Object.entries(data.by_reason).map(([reason, group]) => {
          const Icon = REASON_ICONS[reason] || HelpCircle;
          
          return (
            <Card key={reason} className="border-gray-200 overflow-hidden">
              <CardHeader className="bg-gray-50 py-3 px-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5 text-gray-600" />
                    <CardTitle className="text-base font-semibold text-gray-900 capitalize">
                      {REASON_LABELS[reason] || reason}
                    </CardTitle>
                    <span className="text-sm text-gray-500 font-normal">
                      ({group.count} locations)
                    </span>
                  </div>
                  <div className="text-sm font-medium text-gray-700">
                    Impact: {formatCurrency(group.affected_cost)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100">
                  {group.items.map((item) => (
                    <div key={item.location_id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-900">{item.location_name}</h4>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            {item.project_name}
                          </span>
                        </div>
                        <p className="text-amber-700 text-sm font-medium">"{item.blocked_note}"</p>
                        <div className="text-xs text-gray-500 flex gap-3">
                          <span>Blocked since {new Date(item.blocked_since).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>{item.affected_tasks} tasks affected</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right hidden md:block">
                          <p className="text-sm font-medium text-gray-900">{formatCurrency(item.affected_cost)}</p>
                          <p className="text-xs text-gray-500">Value</p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-green-600 border-green-200 hover:bg-green-50"
                          onClick={() => handleUnblock(item.location_id)}
                          disabled={isUnblocking && unblockingId === item.location_id}
                        >
                          {isUnblocking && unblockingId === item.location_id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-1.5" />
                              Unblock
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {data.total_blocked === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900">No Blocking Issues</h3>
            <p className="text-gray-500">Everything is moving smoothly!</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BlockingReportPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <BlockingReportContent />
    </Suspense>
  );
}
