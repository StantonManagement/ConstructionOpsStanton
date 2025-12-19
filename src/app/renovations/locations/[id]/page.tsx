'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocation, useLocations } from '@/hooks/queries/useLocations';
import { useUpdateTaskStatus } from '@/hooks/queries/useTasks';
import { MobileTaskRow } from '../../components/MobileTaskRow';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, AlertTriangle, CheckCircle2, ChevronLeft, Loader2, MoreVertical } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { PhotoVerificationModal } from '@/app/components/PhotoVerificationModal';
import { BlockLocationModal } from '@/app/components/BlockLocationModal';
import { LocationStatusBadge } from '@/components/StatusBadge';
import { Task } from '@/types/schema';

// Helper to sort tasks by status priority then sort_order
const sortTasks = (tasks: Task[]) => {
  const statusPriority = {
    'in_progress': 0,
    'worker_complete': 1,
    'not_started': 2,
    'verified': 3,
  };
  
  return [...tasks].sort((a, b) => {
    // 1. Status Priority
    const scoreA = statusPriority[a.status as keyof typeof statusPriority] ?? 99;
    const scoreB = statusPriority[b.status as keyof typeof statusPriority] ?? 99;
    if (scoreA !== scoreB) return scoreA - scoreB;
    
    // 2. Sort Order
    return (a.sort_order || 0) - (b.sort_order || 0);
  });
};

export default function LocationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [id, setId] = useState<string | null>(null);
  
  // Unwrap params
  useEffect(() => {
    params.then(p => setId(p.id));
  }, [params]);

  const { data: location, isLoading: isLoadingLocation } = useLocation(id || '');
  const { data: projectLocations } = useLocations(location?.project_id);
  const { mutate: updateTaskStatus } = useUpdateTaskStatus();

  const [verifyTask, setVerifyTask] = useState<{ id: string; name: string } | null>(null);
  const [showBlockModal, setShowBlockModal] = useState(false);

  if (isLoadingLocation || !id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!location) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <p className="text-gray-500 mb-4">Location not found</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  // Navigation Logic (Next/Prev)
  const sortedLocations = projectLocations?.sort((a, b) => a.name.localeCompare(b.name)) || [];
  const currentIndex = sortedLocations.findIndex(l => l.id === location.id);
  const prevLocation = currentIndex > 0 ? sortedLocations[currentIndex - 1] : null;
  const nextLocation = currentIndex < sortedLocations.length - 1 ? sortedLocations[currentIndex + 1] : null;

  // Task Stats
  const tasks = location.tasks || [];
  const sortedTasks = sortTasks(tasks);
  const totalTasks = tasks.length;
  const verifiedTasks = tasks.filter(t => t.status === 'verified').length;
  const progress = totalTasks > 0 ? (verifiedTasks / totalTasks) * 100 : 0;

  // Handlers
  const handleTaskStatusUpdate = (taskId: string, newStatus: string) => {
    if (newStatus === 'verified') {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        setVerifyTask({ id: task.id, name: task.name });
      }
    } else {
      // Optimistic update handled by React Query cache invalidation usually, 
      // but for better UX we might want local state. 
      // For now relying on useMutation onSuccess.
      updateTaskStatus({ id: taskId, status: newStatus as any });
    }
  };

  const handleMarkAllComplete = () => {
    if (confirm('Mark all "In Progress" tasks as "Worker Complete"?')) {
      const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
      inProgressTasks.forEach(t => {
        updateTaskStatus({ id: t.id, status: 'worker_complete' });
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between p-4 h-16">
          <Button variant="ghost" size="sm" className="-ml-2" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5 mr-1" />
            Back
          </Button>
          <h1 className="font-semibold text-lg text-gray-900 truncate max-w-[200px]">
            {location.name}
          </h1>
          <Button variant="ghost" size="icon" onClick={() => setShowBlockModal(true)}>
            <AlertTriangle className={`w-5 h-5 ${location.status === 'on_hold' ? 'text-red-500 fill-red-100' : 'text-gray-400'}`} />
          </Button>
        </div>

        {/* Quick Jump Bar */}
        {(prevLocation || nextLocation) && (
          <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200 text-sm">
            {prevLocation ? (
              <button 
                className="flex items-center text-blue-600 hover:underline truncate max-w-[45%]"
                onClick={() => router.replace(`/renovations/locations/${prevLocation.id}`)}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                {prevLocation.name}
              </button>
            ) : <div />}
            
            {nextLocation ? (
              <button 
                className="flex items-center text-blue-600 hover:underline truncate max-w-[45%]"
                onClick={() => router.replace(`/renovations/locations/${nextLocation.id}`)}
              >
                {nextLocation.name}
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            ) : <div />}
          </div>
        )}

        {/* Progress Summary */}
        <div className="px-4 py-3 bg-white">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-500">Progress</span>
            <span className="font-medium text-gray-900">{verifiedTasks}/{totalTasks} Tasks ({Math.round(progress)}%)</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Blocked Banner */}
      {location.status === 'on_hold' && (
        <div className="bg-red-50 p-4 border-b border-red-100">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <div>
              <h3 className="font-medium text-red-900">Location Blocked</h3>
              <p className="text-sm text-red-700 mt-1">{location.blocked_note || 'No details provided'}</p>
              <div className="mt-2">
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800 capitalize">
                  {location.blocked_reason}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task List */}
      <div className="bg-white mt-2 border-t border-gray-200">
        {sortedTasks.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No tasks assigned to this location.
          </div>
        ) : (
          sortedTasks.map(task => (
            <MobileTaskRow 
              key={task.id} 
              task={task} 
              onUpdateStatus={handleTaskStatusUpdate}
            />
          ))
        )}
      </div>

      {/* Sticky Footer Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 pb-safe-area flex gap-3 z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <Button 
          variant="outline" 
          className="flex-1 border-red-200 text-red-700 hover:bg-red-50"
          onClick={() => setShowBlockModal(true)}
        >
          Block Location
        </Button>
        <Button 
          className="flex-1 bg-blue-600 hover:bg-blue-700"
          onClick={handleMarkAllComplete}
          disabled={!tasks.some(t => t.status === 'in_progress')}
        >
          Mark All Done
        </Button>
      </div>

      {/* Modals */}
      {verifyTask && (
        <PhotoVerificationModal
          isOpen={true}
          onClose={() => setVerifyTask(null)}
          taskId={verifyTask.id}
          taskName={verifyTask.name}
          locationId={location.id}
          onSuccess={() => {
            setVerifyTask(null);
            // Invalidate queries handled by mutation hook
          }}
        />
      )}

      {showBlockModal && (
        <BlockLocationModal
          isOpen={true}
          onClose={() => setShowBlockModal(false)}
          locationId={location.id}
          locationName={location.name}
          currentReason={location.blocked_reason}
          currentNote={location.blocked_note}
        />
      )}
    </div>
  );
}
