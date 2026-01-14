'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDrawEligibility } from '@/hooks/queries/useCashFlow';
import { useProjects } from '@/hooks/queries/useProjects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, CircleDollarSign, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/theme';

function DrawEligibilityDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get('project_id');
  const projectId = projectIdParam ? parseInt(projectIdParam) : undefined;
  const returnTo = searchParams.get('returnTo');

  const { data: projects } = useProjects();
  const { data: eligibility, isLoading } = useDrawEligibility(projectId);

  const handleProjectChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('project_id', value);
    params.set('returnTo', `/cash-flow?project_id=${value}`);
    router.replace(`/cash-flow/draw-eligibility?${params.toString()}`);
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

  if (isLoading && projectId) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleBackNavigation} className="p-0 hover:bg-transparent">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <CircleDollarSign className="w-6 h-6 text-green-600" />
              Draw Eligibility
            </h1>
            {eligibility ? (
              <p className="text-gray-500">
                Eligible now:{' '}
                <span className="font-semibold text-gray-900">{formatCurrency(eligibility.total_eligible || 0)}</span>
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Select value={projectId?.toString()} onValueChange={handleProjectChange}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select Project" />
            </SelectTrigger>
            <SelectContent>
              {projects?.map((p) => (
                <SelectItem key={p.id} value={p.id.toString()}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!projectId ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <CircleDollarSign className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-gray-500">Select a project to view draw eligibility</p>
        </div>
      ) : !eligibility ? null : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-gray-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Total Verified Cost</CardTitle>
              </CardHeader>
              <CardContent className="text-xl font-bold text-gray-900">
                {formatCurrency(eligibility.total_verified_cost || 0)}
              </CardContent>
            </Card>
            <Card className="border-gray-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Already Drawn</CardTitle>
              </CardHeader>
              <CardContent className="text-xl font-bold text-gray-900">
                {formatCurrency(eligibility.total_already_drawn || 0)}
              </CardContent>
            </Card>
            <Card className="border-gray-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Eligible Now</CardTitle>
              </CardHeader>
              <CardContent className="text-xl font-bold text-green-700">
                {formatCurrency(eligibility.total_eligible || 0)}
              </CardContent>
            </Card>
          </div>

          <Card className="border-gray-200">
            <CardHeader className="bg-gray-50 border-b border-gray-200">
              <CardTitle className="text-base font-semibold text-gray-900">By Category</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {eligibility.by_category?.map((row, idx) => (
                  <div key={`${row.category}-${idx}`} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{row.category || 'Unassigned'}</p>
                      <p className="text-xs text-gray-500">{row.verified_task_count} verified tasks</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-700">Verified: {formatCurrency(row.verified_cost || 0)}</div>
                      <div className="text-sm text-gray-700">Drawn: {formatCurrency(row.already_drawn || 0)}</div>
                      <div className="text-sm font-semibold text-green-700">Eligible: {formatCurrency(row.eligible || 0)}</div>
                    </div>
                  </div>
                ))}
                {(!eligibility.by_category || eligibility.by_category.length === 0) && (
                  <div className="p-6 text-center text-gray-500">No eligible categories.</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardHeader className="bg-gray-50 border-b border-gray-200">
              <CardTitle className="text-base font-semibold text-gray-900">Eligible Tasks</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {eligibility.eligible_tasks?.map((t) => (
                  <div key={t.task_id} className="p-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-gray-900">{t.task_name}</p>
                      <p className="text-xs text-gray-500">{t.location_name}</p>
                      <p className="text-xs text-gray-400">Verified {new Date(t.verified_at).toLocaleDateString()}</p>
                    </div>
                    <div className="font-mono text-sm text-gray-800">{formatCurrency(t.cost || 0)}</div>
                  </div>
                ))}
                {(!eligibility.eligible_tasks || eligibility.eligible_tasks.length === 0) && (
                  <div className="p-6 text-center text-gray-500">No eligible tasks.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function DrawEligibilityPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <DrawEligibilityDetailContent />
    </Suspense>
  );
}
