import React from 'react';
import { useProjectStats } from '@/hooks/queries/useProjectStats';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, ArrowRight, BarChart2, CheckCircle2, CircleDollarSign, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { formatCurrency } from '@/lib/theme';

interface Props {
  projectId: number | string;
}

export const ProjectStatsCard: React.FC<Props> = ({ projectId }) => {
  const { data: stats, isLoading } = useProjectStats(typeof projectId === 'string' ? Number(projectId) : projectId);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const returnToParams = new URLSearchParams(searchParams.toString());
  returnToParams.delete('returnTo');
  const returnTo = `${pathname || '/'}${returnToParams.toString() ? `?${returnToParams.toString()}` : ''}`;

  if (isLoading) {
    return <div className="h-48 bg-muted animate-pulse rounded-lg border border-border" />;
  }

  if (!stats) return null;

  // Calculate percentages
  const unitProgress = stats.total_locations > 0
    ? Math.round((stats.complete_locations / stats.total_locations) * 100)
    : 0;

  const taskProgress = stats.total_tasks > 0
    ? Math.round((stats.verified_tasks / stats.total_tasks) * 100)
    : 0;

  const costProgress = stats.total_estimated_cost > 0
    ? Math.round((stats.verified_cost / stats.total_estimated_cost) * 100)
    : 0;

  return (
    <Card className="border-border shadow-sm mb-6 overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row">
          {/* Stats Section */}
          <div className="flex-1 p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Units Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <LayoutDashboard className="w-4 h-4" /> Units
                  </span>
                  <span className="text-foreground font-semibold">
                    {stats.complete_locations}/{stats.total_locations}
                  </span>
                </div>
                <Progress value={unitProgress} className="h-2" />
                <p className="text-xs text-muted-foreground text-right">{unitProgress}% Complete</p>
              </div>

              {/* Tasks Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Tasks
                  </span>
                  <span className="text-foreground font-semibold">
                    {stats.verified_tasks}/{stats.total_tasks}
                  </span>
                </div>
                <Progress value={taskProgress} className="h-2" />
                <p className="text-xs text-muted-foreground text-right">{taskProgress}% Verified</p>
              </div>

              {/* Cost Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <CircleDollarSign className="w-4 h-4" /> Verified Cost
                  </span>
                  <span className="text-foreground font-semibold">
                    {formatCurrency(stats.verified_cost)}
                  </span>
                </div>
                <Progress value={costProgress} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Total: {formatCurrency(stats.total_estimated_cost)}</span>
                  <span>{costProgress}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Blocked Section */}
          {stats.blocked_locations > 0 && (
            <div className="bg-yellow-500/10 p-6 md:w-72 border-t md:border-t-0 md:border-l border-yellow-500/20 flex flex-col justify-center">
              <div className="flex items-start gap-3 mb-3">
                <div className="bg-yellow-500/20 p-2 rounded-full">
                  <AlertTriangle className="w-5 h-5 text-yellow-700 dark:text-yellow-400" />
                </div>
                <div>
                  <h4 className="text-yellow-900 dark:text-yellow-400 font-bold text-lg">{stats.blocked_locations} Blocked Units</h4>
                  <p className="text-yellow-700 dark:text-yellow-500 text-sm mt-1">Requires attention</p>
                </div>
              </div>

              <Link href={`/reports/blocking?project_id=${projectId}&returnTo=${encodeURIComponent(returnTo)}`} passHref>
                <Button variant="outline" className="w-full bg-card border-yellow-500/30 text-yellow-800 dark:text-yellow-400 hover:bg-yellow-500/20">
                  View Blocking Report
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
