"use client";

import { Suspense, useState, useMemo } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { useProjects } from '@/hooks/useProjects';
import { useDailyLogs } from '@/hooks/useDailyLogs';
import AppLayout from '@/app/components/AppLayout';
import LoadingAnimation from '@/app/components/LoadingAnimation';
import { Building, ChevronRight, FileText, Search, Calendar, Camera, Mic, ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';

// Force dynamic rendering since we rely on client-side auth
export const dynamic = 'force-dynamic';

function DailyLogsContent() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  // IMPORTANT: Always call hooks before any conditional returns
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const { data: logs, isLoading: logsLoading } = useDailyLogs(selectedProjectId || undefined);

  // Filter projects by search
  const filteredProjects = useMemo(() => {
    if (!projects) return [];

    if (!searchQuery.trim()) return projects;

    const query = searchQuery.toLowerCase();
    return projects.filter(p =>
      p.name?.toLowerCase().includes(query) ||
      p.client_name?.toLowerCase().includes(query)
    );
  }, [projects, searchQuery]);

  // Get selected project details
  const selectedProject = useMemo(() => {
    if (!selectedProjectId || !projects) return null;
    return projects.find(p => p.id === selectedProjectId);
  }, [selectedProjectId, projects]);

  // Redirect to login if not authenticated
  if (!authLoading && !user) {
    router.replace('/');
    return <LoadingAnimation fullScreen />;
  }

  // Show loading state while auth is initializing
  if (authLoading) {
    return <LoadingAnimation fullScreen />;
  }

  // If a project is selected, show its logs
  if (selectedProjectId && selectedProject) {
    const returnToPath = encodeURIComponent(`/daily-logs`);

    return (
      <AppLayout>
        <div className="min-h-screen bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header with Back Button */}
            <div className="mb-6">
              <button
                onClick={() => setSelectedProjectId(null)}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Projects</span>
              </button>
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-foreground mb-2">{selectedProject.name}</h1>
                  <p className="text-muted-foreground">Daily field logs for this project</p>
                </div>
                <Link
                  href={`/daily-logs/new?project=${selectedProjectId}&returnTo=${returnToPath}`}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  New Log
                </Link>
              </div>
            </div>

            {/* Logs List */}
            {logsLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : !logs || logs.length === 0 ? (
              <div className="text-center p-12 border border-dashed border-border rounded-lg bg-card">
                <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-foreground mb-2">No daily logs yet</p>
                <p className="text-sm text-muted-foreground mb-6">
                  Create your first daily log for this project
                </p>
                <Link
                  href={`/daily-logs/new?project=${selectedProjectId}&returnTo=${returnToPath}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  New Log
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {logs.map((log) => (
                  <Link
                    key={log.id}
                    href={`/daily-logs/${log.id}?returnTo=${returnToPath}`}
                    className="block bg-card border border-border rounded-lg p-4 hover:shadow-md hover:border-primary/50 transition-all"
                  >
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
                ))}
              </div>
            )}
          </div>
        </div>
      </AppLayout>
    );
  }

  // Default view: Show projects grid
  return (
    <AppLayout>
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground mb-2">Daily Logs</h1>
            <p className="text-muted-foreground">Select a project to view its daily field logs</p>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                id="search"
                type="text"
                placeholder="Search projects by name or client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          {/* Projects Grid */}
          {projectsLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : !filteredProjects || filteredProjects.length === 0 ? (
            <div className="text-center p-12 border border-dashed border-border rounded-lg bg-card">
              <Building className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium text-foreground mb-2">No projects found</p>
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'Try a different search term' : 'No projects available'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => {
                    setSelectedProjectId(project.id);
                    setSearchQuery(''); // Clear search when selecting
                  }}
                  className="group bg-card border border-border rounded-lg p-6 hover:shadow-lg hover:shadow-primary/10 hover:border-primary/50 transition-all duration-200 cursor-pointer text-left"
                >
                  {/* Project Icon */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                      <Building className="w-6 h-6 text-primary" />
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>

                  {/* Project Name */}
                  <h3 className="text-lg font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                    {project.name}
                  </h3>

                  {/* Client Name */}
                  {project.client_name && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {project.client_name}
                    </p>
                  )}

                  {/* Phase */}
                  {project.current_phase && (
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        Phase: <span className="font-medium text-foreground">{project.current_phase}</span>
                      </span>
                    </div>
                  )}
                </button>
              ))}
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
