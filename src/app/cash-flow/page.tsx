'use client';

import React, { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { useProjects } from '@/hooks/queries/useProjects';
import CashFlowView from '@/app/components/CashFlowView';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ArrowLeft, DollarSign, Loader2 } from 'lucide-react';
import AppLayout from '../components/AppLayout';

function CashFlowDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get('project_id');
  const projectId = projectIdParam ? parseInt(projectIdParam) : undefined;
  const returnTo = searchParams.get('returnTo');

  const returnToParams = new URLSearchParams(searchParams.toString());
  returnToParams.delete('returnTo');
  const pageReturnTo = `/cash-flow${returnToParams.toString() ? `?${returnToParams.toString()}` : ''}`;

  const { data: projects, isLoading: isProjectsLoading } = useProjects();

  const handleProjectChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('project_id', value);
    params.set('returnTo', returnTo || pageReturnTo);
    router.replace(`/cash-flow?${params.toString()}`);
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

  if (isProjectsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleBackNavigation} className="p-0 hover:bg-transparent">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-green-600" />
              Cash Flow Dashboard
            </h1>
            <p className="text-gray-500">Manage forecasts and draw requests</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 whitespace-nowrap">Project:</span>
          <Select value={projectId?.toString()} onValueChange={handleProjectChange}>
            <SelectTrigger className="w-[250px]">
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

      {projectId ? (
        <CashFlowView projectId={projectId} />
      ) : (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <DollarSign className="w-12 h-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Select a Project</h3>
            <p className="text-gray-500 max-w-sm mt-2">
              Choose a project from the dropdown above to view its cash flow forecast, draw eligibility, and draw history.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function CashFlowDashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return <div className="p-8 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  if (!user) {
    return <div className="p-8 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  return (
    <AppLayout>
      <Suspense fallback={<div className="p-8">Loading...</div>}>
        <CashFlowDashboardContent />
      </Suspense>
    </AppLayout>
  );
}
