import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

// Types
export interface DailyLog {
  id: number;
  uuid: string;
  project_id: number;
  created_by: string;
  log_date: string;
  weather_temp_f?: number;
  weather_conditions?: string;
  weather_wind_mph?: number;
  weather_humidity?: number;
  weather_raw_json?: any;
  notes?: string;
  ai_summary?: string;
  ai_summary_json?: any;
  ai_processed_at?: string;
  status: 'draft' | 'submitted';
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  photos?: DailyLogPhoto[];
  audio?: DailyLogAudio[];
}

export interface DailyLogPhoto {
  id: number;
  daily_log_id: number;
  photo_url: string;
  supabase_storage_path: string;
  caption?: string;
  sort_order: number;
  ai_tags?: any;
  taken_at: string;
  created_at: string;
}

export interface DailyLogAudio {
  id: number;
  daily_log_id: number;
  audio_url: string;
  supabase_storage_path: string;
  duration_seconds?: number;
  transcription?: string;
  transcription_status: 'pending' | 'processing' | 'completed' | 'failed';
  transcribed_at?: string;
  recorded_at: string;
  created_at: string;
}

// Fetch daily logs for a project
export function useDailyLogs(projectId?: number) {
  return useQuery({
    queryKey: ['daily-logs', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const response = await fetch(`/api/daily-logs?project_id=${projectId}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch daily logs');
      }

      const result = await response.json();
      return result.data as DailyLog[];
    },
    enabled: !!projectId,
  });
}

// Fetch ALL daily logs across all projects
export function useAllDailyLogs() {
  return useQuery({
    queryKey: ['daily-logs', 'all'],
    queryFn: async () => {
      const response = await fetch('/api/daily-logs');

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch daily logs');
      }

      const result = await response.json();
      return result.data as DailyLog[];
    },
  });
}

// Fetch single daily log with details
export function useDailyLog(logId?: number) {
  return useQuery({
    queryKey: ['daily-log', logId],
    queryFn: async () => {
      if (!logId) return null;

      const response = await fetch(`/api/daily-logs/${logId}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch daily log');
      }

      const result = await response.json();
      return result.data as DailyLog;
    },
    enabled: !!logId,
  });
}

// Create new daily log
export function useCreateDailyLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { project_id: number; log_date?: string; notes?: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/daily-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create daily log');
      }

      const result = await response.json();
      return result.data as DailyLog;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['daily-logs', data.project_id] });
    },
  });
}

// Update daily log
export function useUpdateDailyLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { notes?: string; status?: string } }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/daily-logs/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update daily log');
      }

      const result = await response.json();
      return result.data as DailyLog;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['daily-log', data.id] });
      queryClient.invalidateQueries({ queryKey: ['daily-logs', data.project_id] });
    },
  });
}

// Upload photo
export function useUploadPhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ logId, file, caption }: { logId: number; file: File; caption?: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const formData = new FormData();
      formData.append('file', file);
      if (caption) formData.append('caption', caption);

      const response = await fetch(`/api/daily-logs/${logId}/photos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload photo');
      }

      const result = await response.json();
      return result.data as DailyLogPhoto;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['daily-log', variables.logId] });
    },
  });
}

// Upload audio
export function useUploadAudio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ logId, file, durationSeconds }: { logId: number; file: Blob; durationSeconds?: number }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const formData = new FormData();
      formData.append('file', file, 'recording.webm');
      if (durationSeconds) formData.append('duration_seconds', durationSeconds.toString());

      const response = await fetch(`/api/daily-logs/${logId}/audio`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload audio');
      }

      const result = await response.json();
      return result.data as DailyLogAudio;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['daily-log', variables.logId] });
    },
  });
}

// Organize with AI
export function useOrganizeDailyLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (logId: number) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/daily-logs/${logId}/organize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to organize log');
      }

      const result = await response.json();
      return result.data as DailyLog;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['daily-log', data.id] });
      queryClient.invalidateQueries({ queryKey: ['daily-logs', data.project_id] });
    },
  });
}
