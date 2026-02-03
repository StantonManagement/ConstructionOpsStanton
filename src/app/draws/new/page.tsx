'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDrawEligibility } from '@/hooks/queries/useCashFlow';
import { useProjects } from '@/hooks/queries/useProjects';
import { useCreateDraw, useAddDrawLineItem } from '@/hooks/queries/useDraws';
import { ArrowLeft, CheckCircle2, CircleDollarSign, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/theme';
import AppLayout from '@/app/components/AppLayout';
import PageContainer from '@/app/components/PageContainer';

function NewDrawContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get('project_id');
  const projectId = projectIdParam ? parseInt(projectIdParam) : undefined;
  const returnTo = searchParams.get('returnTo');

  const { data: projects } = useProjects();
  const { data: eligibility, isLoading: isEligibilityLoading } = useDrawEligibility(projectId);
  const { mutateAsync: createDraw, isPending: isCreating } = useCreateDraw();
  const { mutateAsync: addLineItem } = useAddDrawLineItem();

  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleProjectChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('project_id', value);
    router.replace(`/draws/new?${params.toString()}`);
    setSelectedTaskIds(new Set()); // Clear selection on project change
  };

  const handleBackNavigation = () => {
    if (returnTo) {
      router.push(returnTo);
      return;
    }

    if (projectId) {
      router.push(`/projects?project=${projectId}&subtab=cashflow`);
      return;
    }

    router.push('/projects');
  };

  const toggleTask = (taskId: string) => {
    const newSelected = new Set(selectedTaskIds);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTaskIds(newSelected);
  };

  const selectAll = () => {
    if (!eligibility) return;
    if (selectedTaskIds.size === eligibility.eligible_tasks.length) {
      setSelectedTaskIds(new Set());
    } else {
      setSelectedTaskIds(new Set(eligibility.eligible_tasks.map(t => t.task_id)));
    }
  };

  const handleCreateDraw = async () => {
    if (!projectId || selectedTaskIds.size === 0) return;

    setIsSubmitting(true);
    try {
      // 1. Create Draw
      const drawRes = await createDraw({ project_id: projectId, notes });
      const drawId = drawRes.data.id;

      // 2. Add Line Items
      // We process them in parallel batches to avoid overwhelming the browser/network too much
      const taskIds = Array.from(selectedTaskIds);
      const batchSize = 5;
      
      for (let i = 0; i < taskIds.length; i += batchSize) {
        const batch = taskIds.slice(i, i + batchSize);
        await Promise.all(batch.map(taskId => addLineItem({ drawId, taskId })));
      }

      // 3. Redirect
      router.push(returnTo ? `/draws/${drawId}?returnTo=${encodeURIComponent(returnTo)}` : `/draws/${drawId}`);
    } catch (error) {
      console.error('Failed to create draw:', error);
      setIsSubmitting(false);
      // Ideally show toast error here
    }
  };

  // Calculate totals for selected
  const selectedTotal = eligibility?.eligible_tasks
    .filter(t => selectedTaskIds.has(t.task_id))
    .reduce((sum, t) => sum + t.cost, 0) || 0;

  if (isEligibilityLoading && projectId) {
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

  return (
    <AppLayout>
      <PageContainer>
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <button onClick={handleBackNavigation} className="p-1 hover:bg-gray-100 rounded transition-colors">
            <ArrowLeft className="w-4 h-4 text-gray-500" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Create New Draw Request</h1>
            <p className="text-xs text-gray-500 mt-0.5">Select verified tasks to request payment</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column: Form & Selection */}
          <div className="lg:col-span-2 space-y-3">
            {/* Project Details */}
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Project Details</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Select Project</label>
                  <select
                    value={projectId?.toString() || ''}
                    onChange={(e) => handleProjectChange(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary focus:border-primary"
                  >
                    <option value="">Select Project</option>
                    {projects?.map((p) => (
                      <option key={p.id} value={p.id.toString()}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Notes (Optional)</label>
                  <input
                    type="text"
                    placeholder="E.g., Draw #4 for Framing and MEP Rough-in"
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary focus:border-primary"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Eligible Tasks */}
            {projectId && (
              <div className="bg-white rounded-lg border border-gray-200 p-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">Eligible Tasks</h3>
                  {eligibility?.eligible_tasks.length ? (
                    <button
                      onClick={selectAll}
                      className="text-xs text-primary hover:text-primary/90"
                    >
                      {selectedTaskIds.size === eligibility.eligible_tasks.length ? 'Deselect All' : 'Select All'}
                    </button>
                  ) : null}
                </div>

                {!eligibility?.eligible_tasks.length ? (
                  <div className="text-center py-6 text-xs text-gray-500">
                    No verified tasks eligible for draw.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                    {eligibility.eligible_tasks.map((task) => (
                      <div
                        key={task.task_id}
                        className={`flex items-center justify-between p-2 rounded border cursor-pointer transition-colors ${
                          selectedTaskIds.has(task.task_id)
                            ? 'bg-blue-50 border-blue-200'
                            : 'bg-white border-gray-100 hover:bg-gray-50'
                        }`}
                        onClick={() => toggleTask(task.task_id)}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={selectedTaskIds.has(task.task_id)}
                            onChange={() => toggleTask(task.task_id)}
                            className="w-3 h-3 rounded border-gray-300"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-xs text-gray-900 truncate">{task.task_name}</p>
                            <p className="text-xs text-gray-500 truncate">
                              {task.location_name} • Verified {new Date(task.verified_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-xs font-medium text-gray-900 ml-2 shrink-0">
                          {formatCurrency(task.cost)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 border-l-4 border-l-blue-500 p-3 sticky top-6">
              <div className="flex items-center gap-2 mb-3">
                <CircleDollarSign className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-semibold text-gray-900">Draw Summary</h3>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Selected Tasks</span>
                  <span className="font-medium">{selectedTaskIds.size}</span>
                </div>

                <div className="pt-3 border-t border-gray-100">
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-semibold text-gray-700">Total Request</span>
                    <span className="text-lg font-bold text-gray-900">{formatCurrency(selectedTotal)}</span>
                  </div>
                </div>

                <button
                  className="w-full px-3 py-2 text-xs bg-primary text-white rounded hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                  disabled={!projectId || selectedTaskIds.size === 0 || isSubmitting}
                  onClick={handleCreateDraw}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Creating Draw...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3 h-3" />
                      Create Draft Draw
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </PageContainer>
    </AppLayout>
  );
}

export default function NewDrawPage() {
  return (
    <Suspense fallback={
      <AppLayout>
        <PageContainer>
          <div className="flex items-center justify-center min-h-[50vh]">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        </PageContainer>
      </AppLayout>
    }>
      <NewDrawContent />
    </Suspense>
  );
}
