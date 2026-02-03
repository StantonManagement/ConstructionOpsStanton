'use client';

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useProjects } from '@/hooks/queries/useProjects';
import { useDraws } from '@/hooks/queries/useDraws';
import { Loader2, Plus, FileText } from 'lucide-react';
import AppLayout from '@/app/components/AppLayout';
import PageContainer from '@/app/components/PageContainer';
import { formatCurrency } from '@/lib/theme';

function DrawsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const projectIdParam = searchParams.get('project_id');
  const projectId = projectIdParam ? parseInt(projectIdParam) : undefined;

  const { data: projects } = useProjects();
  const { data: draws, isLoading } = useDraws(projectId);

  const handleProjectChange = (value: string) => {
    if (value === 'all') {
      router.replace('/draws');
    } else {
      router.replace(`/draws?project_id=${value}`);
    }
  };

  const handleCreateDraw = () => {
    if (projectId) {
      router.push(`/draws/new?project_id=${projectId}`);
    } else {
      router.push('/draws/new');
    }
  };

  const handleDrawClick = (drawId: string) => {
    router.push(`/draws/${drawId}`);
  };

  return (
    <AppLayout>
      <PageContainer>
        {/* Header */}
        <div className="mb-3">
          <h1 className="text-xl font-bold text-foreground">Draw Requests</h1>
          <p className="text-xs text-muted-foreground">Manage construction draw requests across projects</p>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={projectId?.toString() || 'all'}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="w-[250px] px-2 py-1.5 text-xs border border-border rounded bg-background text-foreground focus:ring-1 focus:ring-ring focus:border-ring"
            >
              <option value="all">All Projects</option>
              {projects?.map((p) => (
                <option key={p.id} value={p.id.toString()}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleCreateDraw}
            disabled={!projectId}
            className="w-full sm:w-auto px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-3 h-3" />
            New Draw Request
          </button>
        </div>

        {/* Project Selection Prompt */}
        {!projectId ? (
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-center">
            <FileText className="w-8 h-8 mx-auto text-blue-600 dark:text-blue-400 mb-2" />
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">Select a Project</p>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Choose a project from the dropdown above to view and manage its draw requests.
            </p>
          </div>
        ) : (
          /* List */
          <div className="space-y-3">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : !draws || draws.length === 0 ? (
              <div className="text-center py-12 bg-muted rounded-lg border border-dashed border-border">
                <p className="text-xs text-muted-foreground mb-2">No draws found for this project</p>
                <button
                  onClick={handleCreateDraw}
                  className="px-3 py-1.5 text-xs border border-border rounded hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  Create First Draw
                </button>
              </div>
            ) : (
              draws.map((draw) => (
                <div
                  key={draw.id}
                  onClick={() => handleDrawClick(draw.id)}
                  className="bg-card text-card-foreground rounded-lg border border-border p-3 hover:shadow-md hover:border-primary/50 transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-foreground">
                          Draw #{draw.draw_number}
                        </h3>
                        <span
                          className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                            draw.status === 'draft'
                              ? 'bg-gray-100 text-gray-700'
                              : draw.status === 'submitted'
                              ? 'bg-blue-100 text-blue-700'
                              : draw.status === 'approved'
                              ? 'bg-green-100 text-green-700'
                              : draw.status === 'funded'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {draw.status.toUpperCase()}
                        </span>
                      </div>
                      {draw.notes && (
                        <p className="text-xs text-muted-foreground mb-2">{draw.notes}</p>
                      )}
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span>Created {new Date(draw.created_at).toLocaleDateString()}</span>
                        {draw.submitted_at && (
                          <span>Submitted {new Date(draw.submitted_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-3">
                      <div className="text-sm font-bold text-foreground">
                        {formatCurrency(draw.amount_requested)}
                      </div>
                      {draw.amount_approved && (
                        <div className="text-xs text-green-600 dark:text-green-400">
                          Approved: {formatCurrency(draw.amount_approved)}
                        </div>
                      )}
                      {draw.line_items && (
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {draw.line_items.length} line items
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </PageContainer>
    </AppLayout>
  );
}

export default function DrawsPage() {
  return (
    <Suspense fallback={
      <AppLayout>
        <PageContainer>
          <div className="flex items-center justify-center min-h-[50vh]">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </PageContainer>
      </AppLayout>
    }>
      <DrawsPageContent />
    </Suspense>
  );
}
