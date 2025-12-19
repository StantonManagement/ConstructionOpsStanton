'use client';

import React, { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForecast } from '@/hooks/queries/useCashFlow';
import { useProjects } from '@/hooks/queries/useProjects';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Calendar, Loader2, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/theme';

function ForecastDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get('project_id');
  const projectId = projectIdParam ? parseInt(projectIdParam) : undefined;
  const returnTo = searchParams.get('returnTo');
  const [weeks, setWeeks] = useState(8); // Default to 8 weeks for detailed view

  const { data: projects } = useProjects();
  const { data: forecast, isLoading } = useForecast(projectId, weeks);

  const handleProjectChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('project_id', value);
    router.replace(`/cash-flow/forecast?${params.toString()}`);
  };

  const handleBackNavigation = () => {
    if (returnTo) {
      router.push(returnTo);
      return;
    }

    if (projectId) {
      router.push(`/?tab=projects&project=${projectId}&subtab=cashflow`);
      return;
    }

    router.push('/?tab=projects');
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleBackNavigation} className="p-0 hover:bg-transparent">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-blue-600" />
              Cash Flow Forecast
            </h1>
            {forecast && (
              <p className="text-gray-500">
                Total needed for next {weeks} weeks: <span className="font-semibold text-gray-900">{formatCurrency(forecast.total_forecast)}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
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
          
          <Select value={weeks.toString()} onValueChange={(v) => setWeeks(parseInt(v))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Duration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="4">4 Weeks</SelectItem>
              <SelectItem value="8">8 Weeks</SelectItem>
              <SelectItem value="12">12 Weeks</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {!projectId ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <Calendar className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-gray-500">Select a project to view cash flow forecast</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Weekly Breakdown */}
          {forecast?.weeks.map((week) => (
            <Card key={week.week_start} className="border-gray-200">
              <CardHeader className="bg-gray-50 py-3 px-4 border-b border-gray-200 flex flex-row items-center justify-between">
                <div className="font-semibold text-gray-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  Week of {new Date(week.week_start).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
                <div className="font-bold text-gray-900">
                  {formatCurrency(week.forecasted_cost)}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100">
                  {week.by_category.map((cat, idx) => (
                    <div key={idx} className="p-4 flex items-center justify-between hover:bg-gray-50/50">
                      <div>
                        <p className="font-medium text-gray-900">{cat.category}</p>
                        <p className="text-xs text-gray-500">{cat.task_count} tasks scheduled</p>
                      </div>
                      <span className="font-mono text-sm text-gray-700">
                        {formatCurrency(cat.cost)}
                      </span>
                    </div>
                  ))}
                  {week.by_category.length === 0 && (
                    <div className="p-4 text-center text-gray-500 text-sm italic">
                      No costs forecasted for this week
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          
          {(!forecast?.weeks || forecast.weeks.length === 0) && (
            <div className="text-center py-12">
              <p className="text-gray-500">No scheduled tasks found for the selected period.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ForecastPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <ForecastDetailContent />
    </Suspense>
  );
}
