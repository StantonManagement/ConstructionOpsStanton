import React, { useState } from 'react';
import { useForecast, useDrawEligibility } from '@/hooks/queries/useCashFlow';
import { useDraws } from '@/hooks/queries/useDraws';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Calendar, CircleDollarSign, FileText, Loader2, Plus, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/theme';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

interface Props {
  projectId: number;
}

export default function CashFlowView({ projectId }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const returnTo = `${pathname || '/'}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
  const { data: forecast, isLoading: isForecastLoading } = useForecast(projectId);
  const { data: eligibility, isLoading: isEligibilityLoading } = useDrawEligibility(projectId);
  const { data: draws, isLoading: isDrawsLoading } = useDraws(projectId);

  const handleCreateDraw = () => {
    router.push(`/draws/new?project_id=${projectId}&returnTo=${encodeURIComponent(returnTo)}`);
  };

  const isLoading = isForecastLoading || isEligibilityLoading || isDrawsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // Calculate next 4 weeks total
  const next4WeeksTotal = forecast?.total_forecast || 0;
  
  // Calculate eligible amount
  const eligibleAmount = eligibility?.total_eligible || 0;

  return (
    <div className="space-y-6">
      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Forecast Card */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              FORECAST (Next 4 Weeks)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 mb-4">
              {formatCurrency(next4WeeksTotal)}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => router.push(`/cash-flow/forecast?project_id=${projectId}&returnTo=${encodeURIComponent(returnTo)}`)}
            >
              View Forecast Details
            </Button>
          </CardContent>
        </Card>

        {/* Eligibility Card */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <CircleDollarSign className="w-4 h-4" />
              DRAW ELIGIBILITY
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 mb-4">
              {formatCurrency(eligibleAmount)}
            </div>
            <Button 
              onClick={handleCreateDraw} 
              disabled={eligibleAmount <= 0}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              Create New Draw
            </Button>
            {eligibleAmount <= 0 && (
              <p className="text-xs text-gray-500 text-center mt-2">
                No verified tasks eligible for draw
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Forecast Chart (Simplified as List) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-gray-500" />
            Upcoming Cash Needs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {forecast?.weeks.map((week) => {
              const weekStart = new Date(week.week_start).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
              // Simple progress bar relative to max week (assume 100k for now as max scale or logic)
              const maxScale = Math.max(...forecast.weeks.map(w => w.forecasted_cost), 1);
              const percentage = (week.forecasted_cost / maxScale) * 100;

              return (
                <div key={week.week_start} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-700">Week of {weekStart}</span>
                    <span className="text-gray-900 font-semibold">{formatCurrency(week.forecasted_cost)}</span>
                  </div>
                  <Progress value={percentage} className="h-2 bg-gray-100" />
                  <div className="text-xs text-gray-500 truncate">
                    {week.by_category.map(c => `${c.category} ($${Math.round(c.cost/1000)}k)`).join(', ')}
                  </div>
                </div>
              );
            })}
            {(!forecast?.weeks || forecast.weeks.length === 0) && (
              <p className="text-gray-500 text-center py-4">No scheduled tasks for next 4 weeks.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Draws */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-500" />
            Recent Draws
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-0 divide-y divide-gray-100">
            {draws?.map((draw) => (
              <div key={draw.id} className="py-3 flex items-center justify-between hover:bg-gray-50 -mx-4 px-4 transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">Draw #{draw.draw_number}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                      draw.status === 'funded' ? 'bg-green-100 text-green-700' :
                      draw.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                      draw.status === 'submitted' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {draw.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {draw.status === 'draft' ? `Created ${new Date(draw.created_at).toLocaleDateString()}` :
                     draw.status === 'submitted' ? `Submitted ${new Date(draw.submitted_at!).toLocaleDateString()}` :
                     draw.status === 'funded' ? `Funded ${new Date(draw.funded_at!).toLocaleDateString()}` : 
                     `Updated ${new Date(draw.created_at).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{formatCurrency(draw.amount_requested)}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-blue-600 hover:text-blue-800 p-0"
                    onClick={() => router.push(`/draws/${draw.id}?returnTo=${encodeURIComponent(returnTo)}`)}
                  >
                    View Details
                  </Button>
                </div>
              </div>
            ))}
            {(!draws || draws.length === 0) && (
              <p className="text-gray-500 text-center py-4">No draws found.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

