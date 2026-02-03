'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useBlockingReport } from '@/hooks/queries/useReports';
import { useUnblockLocation } from '@/hooks/queries/useLocations';
import { useProjects } from '@/hooks/queries/useProjects';
import { ArrowLeft, Construction, User, DollarSign, Link as LinkIcon, HelpCircle, AlertTriangle, CheckCircle, ChevronDown, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/theme';
import AppLayout from '@/app/components/AppLayout';
import PageContainer from '@/app/components/PageContainer';

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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get('project_id');
  const projectId = projectIdParam ? parseInt(projectIdParam) : undefined;
  const returnTo = searchParams.get('returnTo');

  const returnToParams = new URLSearchParams(searchParams.toString());
  returnToParams.delete('returnTo');
  const pageReturnTo = `${pathname || '/'}${returnToParams.toString() ? `?${returnToParams.toString()}` : ''}`;

  const { data, isLoading, refetch } = useBlockingReport(projectId);
  const { data: projects } = useProjects();
  const { mutate: unblockLocation, isPending: isUnblocking } = useUnblockLocation();
  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const [openReasons, setOpenReasons] = useState<Record<string, boolean>>({});

  const handleBackNavigation = () => {
    if (returnTo) {
      router.push(returnTo);
      return;
    }

    if (projectId) {
      router.push(`/projects?project=${projectId}&subtab=locations`);
      return;
    }

    router.push('/projects');
  };

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

  const handleProjectChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'all') {
      params.delete('project_id');
    } else {
      params.set('project_id', value);
    }
    params.set('returnTo', pageReturnTo);
    router.replace(`/reports/blocking?${params.toString()}`);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <PageContainer>
          <div className="flex items-center justify-center min-h-[50vh]">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        </PageContainer>
      </AppLayout>
    );
  }

  if (!data) return null;

  return (
    <AppLayout>
      <PageContainer>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button onClick={handleBackNavigation} className="p-1 hover:bg-gray-100 rounded transition-colors">
              <ArrowLeft className="w-4 h-4 text-gray-500" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                Blocking Report
              </h1>
              <p className="text-xs text-gray-500">
                {data.total_blocked} blocked • Impact: {formatCurrency(data.total_affected_cost)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Project:</span>
            <select
              value={projectId?.toString() || 'all'}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-xs"
            >
              <option value="all">All Projects</option>
              {projects?.map((p) => (
                <option key={p.id} value={p.id.toString()}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Grouped Lists */}
        <div className="space-y-3">
          {Object.entries(data.by_reason).map(([reason, group]) => {
            const Icon = REASON_ICONS[reason] || HelpCircle;
            const isOpen = openReasons[reason] !== false;

            return (
              <div key={reason} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <button
                  type="button"
                  className="w-full bg-gray-50 p-3 border-b border-gray-200 flex justify-between items-center hover:bg-gray-100 transition-colors"
                  onClick={() =>
                    setOpenReasons((prev) => ({
                      ...prev,
                      [reason]: !(prev[reason] !== false),
                    }))
                  }
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-bold text-gray-900 capitalize">
                      {REASON_LABELS[reason] || reason}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({group.count})
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-gray-700">
                      {formatCurrency(group.affected_cost)}
                    </span>
                    <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>
                {isOpen && (
                  <div className="divide-y divide-gray-100">
                    {group.items.map((item) => (
                      <div key={item.location_id} className="p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-gray-50 transition-colors">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-sm text-gray-900 truncate">{item.location_name}</h4>
                            <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded shrink-0">
                              {item.project_name}
                            </span>
                          </div>
                          <p className="text-amber-700 text-xs font-medium truncate">"{item.blocked_note}"</p>
                          <div className="text-[10px] text-gray-500 flex gap-2">
                            <span>Since {new Date(item.blocked_since).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>{item.affected_tasks} tasks</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right hidden md:block">
                            <p className="text-xs font-semibold text-gray-900">{formatCurrency(item.affected_cost)}</p>
                            <p className="text-[10px] text-gray-500">Value</p>
                          </div>
                          <button
                            onClick={() => handleUnblock(item.location_id)}
                            disabled={isUnblocking && unblockingId === item.location_id}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-green-600 border border-green-200 rounded hover:bg-green-50 transition-colors disabled:opacity-50"
                          >
                            {isUnblocking && unblockingId === item.location_id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="w-3 h-3" />
                                Unblock
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {data.total_blocked === 0 && (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-gray-900 mb-1">No Blocking Issues</h3>
              <p className="text-xs text-gray-500">Everything is moving smoothly!</p>
            </div>
          )}
        </div>
      </PageContainer>
    </AppLayout>
  );
}

export default function BlockingReportPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <BlockingReportContent />
    </Suspense>
  );
}
