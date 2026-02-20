"use client";

import { useDailyLogs } from '@/hooks/useDailyLogs';
import { Calendar, Camera, Mic, Plus } from 'lucide-react';
import Link from 'next/link';

interface DailyLogsListProps {
  projectId: number;
}

export default function DailyLogsList({ projectId }: DailyLogsListProps) {
  const { data: logs, isLoading, error } = useDailyLogs(projectId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-600">Failed to load daily logs</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Daily Logs</h3>
        <Link
          href={`/daily-logs/new?project=${projectId}`}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm"
        >
          <Plus className="w-4 h-4" />
          New Log
        </Link>
      </div>

      {/* Logs List */}
      {!logs || logs.length === 0 ? (
        <div className="text-center p-8 border border-dashed border-border rounded-lg">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm mb-4">No daily logs yet</p>
          <Link
            href={`/daily-logs/new?project=${projectId}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm"
          >
            <Plus className="w-4 h-4" />
            Create First Log
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <Link
              key={log.id}
              href={`/daily-logs/${log.id}`}
              className="block p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="font-medium">
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
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {log.status}
                    </span>
                  </div>

                  {log.notes && (
                    <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                      {log.notes}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {(log.photos && log.photos.length > 0) && (
                      <div className="flex items-center gap-1">
                        <Camera className="w-3 h-3" />
                        <span>{log.photos.length}</span>
                      </div>
                    )}
                    {(log.audio && log.audio.length > 0) && (
                      <div className="flex items-center gap-1">
                        <Mic className="w-3 h-3" />
                        <span>{log.audio.length}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-muted-foreground">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
