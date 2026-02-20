"use client";

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCreateDailyLog } from '@/hooks/useDailyLogs';
import toast from 'react-hot-toast';

function NewDailyLogContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('project');
  const createLog = useCreateDailyLog();

  useEffect(() => {
    if (!projectId) {
      toast.error('Project ID is required');
      router.back();
      return;
    }

    // Auto-create the log and redirect to edit page
    const createNewLog = async () => {
      try {
        const log = await createLog.mutateAsync({
          project_id: parseInt(projectId),
          log_date: new Date().toISOString().split('T')[0],
          notes: ''
        });

        // Redirect to the edit page
        router.push(`/daily-logs/${log.id}?returnTo=${encodeURIComponent(window.location.pathname)}`);
      } catch (error) {
        toast.error('Failed to create daily log');
        router.back();
      }
    };

    createNewLog();
  }, [projectId]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-sm text-muted-foreground">Creating daily log...</p>
      </div>
    </div>
  );
}

export default function NewDailyLogPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <NewDailyLogContent />
    </Suspense>
  );
}
