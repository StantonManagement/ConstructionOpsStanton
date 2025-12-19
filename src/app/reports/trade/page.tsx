'use client';

import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTradeReport } from '@/hooks/queries/useReports';
import { useProjects } from '@/hooks/queries/useProjects';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, BarChart2, CheckCircle, CircleDollarSign, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/theme';

function TradeReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get('project_id');
  const projectId = projectIdParam ? parseInt(projectIdParam) : undefined;
  const returnTo = searchParams.get('returnTo');

  const { data: projects } = useProjects();
  const { data: report, isLoading } = useTradeReport(projectId);

  const handleBackNavigation = () => {
    if (returnTo) {
      router.push(returnTo);
      return;
    }

    if (projectId) {
      router.push(`/?tab=projects&project=${projectId}&subtab=budget`);
      return;
    }

    router.push('/?tab=projects');
  };

  const handleProjectChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'all') {
      params.delete('project_id');
    } else {
      params.set('project_id', value);
    }
    if (returnTo) {
      params.set('returnTo', returnTo);
    }
    router.replace(`/reports/trade?${params.toString()}`);
  };

  if (!projectId && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <BarChart2 className="w-12 h-12 text-gray-300" />
        <h2 className="text-xl font-semibold text-gray-700">Select a Project</h2>
        <p className="text-gray-500">Please select a project to view trade progress.</p>
        <Select onValueChange={handleProjectChange}>
          <SelectTrigger className="w-[280px]">
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
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleBackNavigation} className="p-0 hover:bg-transparent">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart2 className="w-6 h-6 text-blue-600" />
              Trade Progress
            </h1>
            {report?.unassigned_count ? (
              <p className="text-sm text-amber-600 mt-1">
                {report.unassigned_count} tasks have no budget category assigned
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 whitespace-nowrap">Project:</span>
          <Select value={projectId?.toString()} onValueChange={handleProjectChange}>
            <SelectTrigger className="w-[200px]">
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

      {/* Trade Cards */}
      <div className="grid gap-4">
        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-2 text-sm font-medium text-gray-500 uppercase tracking-wider">
          <div className="col-span-4">Budget Category</div>
          <div className="col-span-4">Progress</div>
          <div className="col-span-4 text-right">Cost</div>
        </div>

        {report?.trades.map((trade) => {
          const progress = trade.total_tasks > 0 
            ? Math.round((trade.verified_tasks / trade.total_tasks) * 100) 
            : 0;
            
          const costProgress = trade.total_estimated_cost > 0
            ? Math.round((trade.verified_cost / trade.total_estimated_cost) * 100)
            : 0;

          return (
            <Card key={trade.category_id} className="border-gray-200 hover:shadow-sm transition-shadow">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  {/* Category Name */}
                  <div className="md:col-span-4">
                    <h3 className="font-semibold text-gray-900">{trade.category_name}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {trade.total_tasks} tasks • {trade.verified_tasks} verified
                    </p>
                  </div>

                  {/* Task Progress */}
                  <div className="md:col-span-4 space-y-2">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Completion
                      </span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2 bg-blue-100" />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>{trade.in_progress_tasks} in progress</span>
                      <span>{trade.not_started_tasks} not started</span>
                    </div>
                  </div>

                  {/* Cost Progress */}
                  <div className="md:col-span-4 md:text-right space-y-2">
                    <div className="flex justify-between md:justify-end gap-4 text-sm font-medium">
                      <span className="text-gray-500 md:hidden">Cost:</span>
                      <span>
                        {formatCurrency(trade.verified_cost)} 
                        <span className="text-gray-400 font-normal mx-1">/</span> 
                        {formatCurrency(trade.total_estimated_cost)}
                      </span>
                    </div>
                    <div className="md:pl-12">
                      <Progress value={costProgress} className="h-1.5 bg-green-100" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {report?.trades.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <p className="text-gray-500">No trade data available for this project.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TradeReportPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <TradeReportContent />
    </Suspense>
  );
}
