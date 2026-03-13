"use client";

import { Suspense, useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useDailyLog, useUpdateDailyLog, useUploadPhoto, useUploadAudio } from '@/hooks/useDailyLogs';
import { ArrowLeft, Camera, Mic, Save, Sparkles, Trash2 } from 'lucide-react';
import AudioRecorder from '@/components/AudioRecorder';
import { DailyLogCamera } from '@/components/DailyLogCamera';
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-muted rounded-lg"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h1 className="text-lg font-semibold">Daily Log</h1>
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
              className={`px-3 py-1 rounded text-xs font-medium ${
                log.status === 'submitted'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {log.status}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Photos Section */}
        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Photos</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCamera(true)}
                disabled={log.status === 'submitted' || isUploading}
                className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <Camera className="w-4 h-4" />
                Take Photos
              </button>
              <label className="flex items-center gap-2 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed text-sm cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  disabled={log.status === 'submitted' || isUploading}
                  className="hidden"
                />
                <Camera className="w-4 h-4" />
                {isUploading ? 'Uploading...' : 'Upload Photos'}
              </label>
            </div>
          </div>

          {log.photos && log.photos.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {log.photos.map((photo) => (
                <div key={photo.id} className="relative aspect-square">
                  <img
                    src={photo.photo_url}
                    alt={photo.caption || 'Daily log photo'}
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No photos yet. Use "Take Photos" to capture or "Upload Photos" to select from gallery.
            </p>
          )}
        </div>

        {/* Notes Section */}
        <div className="border border-border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Notes</h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add quick notes about today's work..."
            className="w-full px-3 py-2 border border-border rounded-lg resize-none focus:ring-2 focus:ring-primary focus:border-primary"
            rows={4}
            disabled={log.status === 'submitted'}
          />
        </div>

        {/* Audio Section */}
        <div className="border border-border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Audio Notes</h3>

          {log.status !== 'submitted' && (
            <div className="mb-4">
              <AudioRecorder
                onRecordingComplete={handleAudioComplete}
                disabled={uploadAudio.isPending}
              />
            </div>
          )}

          {log.audio && log.audio.length > 0 ? (
            <div className="space-y-2">
              {log.audio.map((audio, idx) => (
                <div key={audio.id} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Mic className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Audio Note {idx + 1}</p>
                    {audio.duration_seconds && (
                      <p className="text-xs text-muted-foreground">
                        {Math.floor(audio.duration_seconds / 60)}:{(audio.duration_seconds % 60).toString().padStart(2, '0')}
                      </p>
                    )}
                    {audio.transcription && (
                      <p className="text-xs text-muted-foreground mt-1">{audio.transcription}</p>
                    )}
                  </div>
                  <audio src={audio.audio_url} controls className="h-8" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No audio notes yet. Tap "Record Audio Note" to add voice notes.
            </p>
          )}
        </div>

        {/* Actions */}
        {log.status === 'draft' && (
          <div className="flex items-center gap-3 sticky bottom-4">
            <button
              onClick={handleSaveDraft}
              disabled={updateLog.isPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-border rounded-lg hover:bg-muted"
            >
              <Save className="w-4 h-4" />
              Save Draft
            </button>
            <button
              onClick={handleSubmit}
              disabled={updateLog.isPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Sparkles className="w-4 h-4" />
              Submit
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
    </div>
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
