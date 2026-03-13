"use client";

import { Suspense, useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useDailyLog, useUpdateDailyLog, useUploadPhoto, useUploadAudio } from '@/hooks/useDailyLogs';
import { ArrowLeft, Camera, Mic, Save, Sparkles, Trash2 } from 'lucide-react';
import AudioRecorder from '@/components/AudioRecorder';
import { DailyLogCamera } from '@/components/DailyLogCamera';
import AppLayout from '@/app/components/AppLayout';
import toast from 'react-hot-toast';

function DailyLogContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const logId = params?.id ? parseInt(params.id as string) : undefined;

  const { data: log, isLoading, error } = useDailyLog(logId);
  const updateLog = useUpdateDailyLog();
  const uploadPhoto = useUploadPhoto();
  const uploadAudio = useUploadAudio();

  const [notes, setNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  // Initialize notes from log
  useEffect(() => {
    if (log?.notes) setNotes(log.notes);
  }, [log?.notes]);

  const handleSaveDraft = async () => {
    if (!logId) return;

    try {
      await updateLog.mutateAsync({
        id: logId,
        data: { notes, status: 'draft' }
      });
      toast.success('Draft saved');
    } catch (error) {
      toast.error('Failed to save draft');
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!logId || !e.target.files || e.target.files.length === 0) return;

    const files = Array.from(e.target.files);
    setIsUploading(true);

    try {
      for (const file of files) {
        await uploadPhoto.mutateAsync({ logId, file });
      }
      toast.success(`${files.length} photo(s) uploaded`);
    } catch (error) {
      toast.error('Failed to upload photos');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAudioComplete = async (blob: Blob, durationSeconds: number) => {
    if (!logId) return;

    try {
      await uploadAudio.mutateAsync({ logId, file: blob, durationSeconds });
      toast.success('Audio note saved');
    } catch (error) {
      toast.error('Failed to save audio');
    }
  };

  const handleSubmit = async () => {
    if (!logId) return;

    const toastId = toast.loading('Submitting log...');
    try {
      // Save and submit without AI
      await updateLog.mutateAsync({
        id: logId,
        data: { notes, status: 'submitted' }
      });
      toast.success('Log submitted!', { id: toastId });
      router.push(searchParams.get('returnTo') || '/daily-logs');
    } catch (error) {
      toast.error('Failed to submit log', { id: toastId });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !log) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-destructive mb-4">Failed to load daily log</p>
          <button
            onClick={() => router.back()}
            className="text-primary hover:underline"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b border-border bg-card sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.back()}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-xl font-bold">Daily Log</h1>
                  <p className="text-sm text-muted-foreground">
                    {new Date(log.log_date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
              <span
                className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide ${
                  log.status === 'submitted'
                    ? 'bg-green-100 text-green-700 border border-green-200'
                    : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                }`}
              >
                {log.status}
              </span>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Photos Section */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h3 className="text-lg font-semibold">Photos</h3>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <button
                onClick={() => setShowCamera(true)}
                disabled={log.status === 'submitted' || isUploading}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
              >
                <Camera className="w-4 h-4" />
                <span>Take Photos</span>
              </button>
              <label className={`flex items-center justify-center gap-2 px-4 py-2.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 text-sm font-medium transition-colors ${(log.status === 'submitted' || isUploading) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  disabled={log.status === 'submitted' || isUploading}
                  className="hidden"
                />
                <Camera className="w-4 h-4" />
                <span>{isUploading ? 'Uploading...' : 'Upload Photos'}</span>
              </label>
            </div>
          </div>

          {log.photos && log.photos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {log.photos.map((photo) => (
                <div key={photo.id} className="relative aspect-square group">
                  <img
                    src={photo.photo_url}
                    alt={photo.caption || 'Daily log photo'}
                    className="w-full h-full object-cover rounded-lg border border-border group-hover:border-primary transition-colors"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 px-4 bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/20">
              <Camera className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No photos yet. Use "Take Photos" to capture or "Upload Photos" to select from gallery.
              </p>
            </div>
          )}
        </div>

        {/* Notes Section */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Notes</h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add quick notes about today's work..."
            className="w-full px-4 py-3 border border-border rounded-lg resize-none focus:ring-2 focus:ring-primary focus:border-primary bg-background transition-colors"
            rows={5}
            disabled={log.status === 'submitted'}
          />
        </div>

        {/* Audio Section */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Audio Notes</h3>

          {log.status !== 'submitted' && (
            <div className="mb-4">
              <AudioRecorder
                onRecordingComplete={handleAudioComplete}
                disabled={uploadAudio.isPending}
              />
            </div>
          )}

          {log.audio && log.audio.length > 0 ? (
            <div className="space-y-3">
              {log.audio.map((audio, idx) => (
                <div key={audio.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-muted/50 rounded-lg border border-border hover:border-primary/30 transition-colors">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Mic className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Audio Note {idx + 1}</p>
                      {audio.duration_seconds && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Duration: {Math.floor(audio.duration_seconds / 60)}:{(audio.duration_seconds % 60).toString().padStart(2, '0')}
                        </p>
                      )}
                      {audio.transcription && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{audio.transcription}</p>
                      )}
                    </div>
                  </div>
                  <audio src={audio.audio_url} controls className="w-full sm:w-64 h-10" />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 px-4 bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/20">
              <Mic className="w-10 h-10 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No audio notes yet. Record voice notes to capture details.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        {log.status === 'draft' && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sticky bottom-4 bg-background/80 backdrop-blur-sm py-4 -mx-4 px-4 sm:mx-0 sm:px-0 sm:bg-transparent sm:backdrop-blur-none">
            <button
              onClick={handleSaveDraft}
              disabled={updateLog.isPending}
              className="flex items-center justify-center gap-2 px-6 py-3 border-2 border-border rounded-lg hover:bg-muted hover:border-primary/50 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all shadow-sm"
            >
              <Save className="w-4 h-4" />
              Save Draft
            </button>
            <button
              onClick={handleSubmit}
              disabled={updateLog.isPending}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all shadow-md hover:shadow-lg"
            >
              <Sparkles className="w-4 h-4" />
              Submit Log
            </button>
          </div>
        )}
      </div>

      {/* Camera Modal */}
      {logId && (
        <DailyLogCamera
          isOpen={showCamera}
          onClose={() => setShowCamera(false)}
          logId={logId}
          onPhotosUploaded={() => {
            // Refresh the log data to show new photos
            queryClient.invalidateQueries({ queryKey: ['daily-log', logId] });
          }}
        />
      )}
    </AppLayout>
  );
}

export default function DailyLogPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <DailyLogContent />
    </Suspense>
  );
}
