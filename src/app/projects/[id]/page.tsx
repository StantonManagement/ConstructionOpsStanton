'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import ProjectDetailView from '@/app/components/ProjectDetailView';
import LoadingAnimation from '@/app/components/LoadingAnimation';
import AppLayout from '@/app/components/AppLayout';
import { authFetch } from '@/lib/authFetch';
import { Project } from '@/types/schema';

function ProjectDetailContent() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId) return;

      try {
        setIsLoading(true);
        const response = await authFetch(`/api/projects/${projectId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch project');
        }

        const data = await response.json();
        setProject(data);
      } catch (err) {
        console.error('Error fetching project:', err);
        setError('Failed to load project');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProject();
  }, [projectId]);

  if (isLoading) {
    return <LoadingAnimation text="Loading project..." />;
  }

  if (error || !project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-destructive mb-4">
            {error || 'Project not found'}
          </h2>
          <button
            onClick={() => router.push('/projects')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <ProjectDetailView
      project={project}
      onBack={() => router.push('/projects')}
      onEdit={(updatedProject) => {
        setProject(updatedProject);
      }}
      onDelete={() => {
        router.push('/projects');
      }}
    />
  );
}

export default function ProjectDetailPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return <LoadingAnimation fullScreen />;
  }

  if (!user) {
    return <LoadingAnimation fullScreen />;
  }

  return (
    <AppLayout>
      <Suspense fallback={<LoadingAnimation text="Loading project..." />}>
        <ProjectDetailContent />
      </Suspense>
    </AppLayout>
  );
}
