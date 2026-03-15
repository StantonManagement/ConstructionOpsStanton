"use client";

import { Suspense, useState, useMemo } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { useAllDailyLogs } from '@/hooks/useDailyLogs';
import { useProjects } from '@/hooks/useProjects';
import AppLayout from '@/app/components/AppLayout';
import LoadingAnimation from '@/app/components/LoadingAnimation';
import { Calendar, Camera, Mic, Plus, Building, Filter } from 'lucide-react';
import Link from 'next/link';

// Force dynamic rendering since we rely on client-side auth
export const dynamic = 'force-dynamic';

function DailyLogsContent() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [selectedProjectId, setSelectedProjectId] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // IMPORTANT: Always call hooks before any conditional returns
  const { data: logs, isLoading: logsLoading } = useAllDailyLogs();
  const { data: projects } = useProjects();

  // Filter logs by project and search query
  const filteredLogs = useMemo(() => {
    if (!logs) return [];

    let filtered = logs;

    // Filter by project
    if (selectedProjectId !== 'all') {
      filtered = filtered.filter(log => log.project_id === selectedProjectId);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(log =>
        log.notes?.toLowerCase().includes(query)
      );
    }

    // Sort by date (newest first)
    return filtered.sort((a, b) =>
      new Date(b.log_date).getTime() - new Date(a.log_date).getTime()
    );
  }, [logs, selectedProjectId, searchQuery]);

  // Get project name by ID
  const getProjectName = (projectId: number) => {
    return projects?.find(p => p.id === projectId)?.name || 'Unknown Project';
  };

  // Redirect to login if not authenticated
  if (!authLoading && !user) {
    router.replace('/');
    return <LoadingAnimation fullScreen />;
  }

  // Show loading state while auth is initializing
  if (authLoading) {
    return <LoadingAnimation fullScreen />;
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground mb-2">Daily Logs</h1>
            <p className="text-muted-foreground">View and manage daily field logs across all projects</p>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            {/* Project Filter */}
            <div className="flex-1">
              <label htmlFor="project-filter" className="block text-sm font-medium text-foreground mb-2">
                <Filter className="w-4 h-4 inline mr-2" />
                Filter by Project
              </label>
              <select
                id="project-filter"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="all">All Projects</option>
                {projects?.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div className="flex-1">
              <label htmlFor="search" className="block text-sm font-medium text-foreground mb-2">
                Search Notes
              </label>
              <input
                id="search"
                type="text"
                placeholder="Search in notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-2xl font-bold text-foreground">{filteredLogs.length}</div>
              <div className="text-sm text-muted-foreground">Total Logs</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">
                {filteredLogs.filter(l => l.status === 'submitted').length}
              </div>
              <div className="text-sm text-muted-foreground">Submitted</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-2xl font-bold text-yellow-600">
                {filteredLogs.filter(l => l.status === 'draft').length}
              </div>
              <div className="text-sm text-muted-foreground">Drafts</div>
            </div>
          </div>

          {/* Logs List */}
          {logsLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : !filteredLogs || filteredLogs.length === 0 ? (
            <div className="text-center p-12 border border-dashed border-border rounded-lg bg-card">
              <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium text-foreground mb-2">No daily logs found</p>
              <p className="text-sm text-muted-foreground mb-6">
                {selectedProjectId !== 'all'
                  ? 'No logs for this project yet. Create one from the project page.'
                  : 'Get started by creating a daily log from a project page.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLogs.map((log) => {
                const returnToPath = encodeURIComponent(`/daily-logs`);

                return (
                  <Link
                    key={log.id}
                    href={`/daily-logs/${log.id}?returnTo=${returnToPath}`}
                    className="block bg-card border border-border rounded-lg p-4 hover:shadow-md hover:border-primary/50 transition-all"
                  >
                    {/* Project Name */}
                    <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                      <Building className="w-4 h-4" />
                      <span className="font-medium">{getProjectName(log.project_id)}</span>
                    </div>

                    {/* Date & Status */}
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-semibold text-foreground">
                        {new Date(log.log_date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          log.status === 'submitted'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}
                      >
                        {log.status}
                      </span>
                    </div>

                    {/* Notes Preview */}
                    {log.notes && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {log.notes}
                      </p>
                    )}

                    {/* Attachments Count */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {(log.photos && log.photos.length > 0) && (
                        <div className="flex items-center gap-1">
                          <Camera className="w-3 h-3" />
                          <span>{log.photos.length} photo{log.photos.length !== 1 ? 's' : ''}</span>
                        </div>
                      )}
                      {(log.audio && log.audio.length > 0) && (
                        <div className="flex items-center gap-1">
                          <Mic className="w-3 h-3" />
                          <span>{log.audio.length} audio</span>
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default function DailyLogsPage() {
  return (
    <Suspense fallback={<LoadingAnimation fullScreen />}>
      <DailyLogsContent />
    </Suspense>
  );
}
