"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X, Check, Trash2, Loader2 } from 'lucide-react';
import Image from 'next/image';

interface CapturedPhoto {
  id: string;
  blob: Blob;
  preview: string;
  uploaded: boolean;
  uploading: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  logId: number;
  onPhotosUploaded?: () => void;
}

export const DailyLogCamera: React.FC<Props> = ({
  isOpen,
  onClose,
  logId,
  onPhotosUploaded
}) => {
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);

      // Check if running on HTTPS (required for camera access in production)
      if (typeof window !== 'undefined' && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        throw new Error('Camera access requires HTTPS. Please use a secure connection.');
      }

      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser');
      }

      console.log('[Camera] Requesting camera access...');
      console.log('[Camera] Protocol:', window.location.protocol);
      console.log('[Camera] User Agent:', navigator.userAgent);

      // Try with environment camera first (back camera on mobile)
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        console.log('[Camera] Environment camera access granted');
      } catch (envError) {
        // Fallback to any available camera
        console.log('[Camera] Environment camera not available, trying default camera');
        stream = await navigator.mediaDevices.getUserMedia({
          video: true
        });
        console.log('[Camera] Default camera access granted');
      }

      // Verify stream has video tracks
      const videoTracks = stream.getVideoTracks();
      console.log('[Camera] Video tracks:', videoTracks.length, videoTracks);

      if (videoTracks.length === 0) {
        throw new Error('No video tracks found in stream');
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        // Ensure video plays on mobile
        try {
          await videoRef.current.play();
          console.log('[Camera] Video playback started');
        } catch (playError) {
          console.error('[Camera] Video play error:', playError);
        }

        setIsCameraActive(true);
      }
    } catch (err: any) {
      console.error('[Camera] Error:', err);
      let errorMessage = 'Could not access camera. ';

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage += 'Please allow camera permissions in your browser settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage += 'No camera found on this device.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage += 'Camera is already in use by another application.';
      } else if (err.message.includes('not supported')) {
        errorMessage += 'Your browser does not support camera access. Try using a modern browser like Chrome or Safari.';
      } else {
        errorMessage += err.message || 'Unknown error occurred.';
      }

      setCameraError(errorMessage);
      setIsCameraActive(false);
    }
  }, []);

  // Start camera when modal opens
  useEffect(() => {
    if (isOpen) {
      startCamera();
    }
    return () => {
      stopStream();
    };
  }, [isOpen, startCamera, stopStream]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);

      canvas.toBlob(async (blob) => {
        if (blob) {
          const id = `photo-${Date.now()}-${Math.random()}`;
          const preview = URL.createObjectURL(blob);

          const newPhoto: CapturedPhoto = {
            id,
            blob,
            preview,
            uploaded: false,
            uploading: false
          };

          // Add photo to list
          setPhotos(prev => [...prev, newPhoto]);

          // Upload immediately in background
          uploadPhoto(newPhoto);
        }
      }, 'image/jpeg', 0.85);
    }
  }, []);

  const uploadPhoto = async (photo: CapturedPhoto) => {
    setPhotos(prev => prev.map(p =>
      p.id === photo.id ? { ...p, uploading: true } : p
    ));

    try {
      // Get auth token from Supabase
      const { supabase } = await import('@/lib/supabaseClient');
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const formData = new FormData();
      formData.append('file', photo.blob, `${Date.now()}.jpg`);

      const response = await fetch(`/api/daily-logs/${logId}/photos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      setPhotos(prev => prev.map(p =>
        p.id === photo.id ? { ...p, uploaded: true, uploading: false } : p
      ));
    } catch (error) {
      console.error('Upload error:', error);
      setPhotos(prev => prev.map(p =>
        p.id === photo.id ? { ...p, uploading: false } : p
      ));
    }
  };

  const removePhoto = (photoId: string) => {
    setPhotos(prev => {
      const photo = prev.find(p => p.id === photoId);
      if (photo) {
        URL.revokeObjectURL(photo.preview);
      }
      return prev.filter(p => p.id !== photoId);
    });
  };

  const handleDone = () => {
    stopStream();
    // Clean up preview URLs
    photos.forEach(photo => {
      URL.revokeObjectURL(photo.preview);
    });
    setPhotos([]);
    setIsCameraActive(false);
    onPhotosUploaded?.();
    onClose();
  };

  const allPhotosUploaded = photos.length > 0 && photos.every(p => p.uploaded);
  const hasPhotos = photos.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleDone()}>
      <DialogContent className="sm:max-w-[90vw] md:max-w-[600px] h-[90vh] p-0 overflow-hidden bg-black text-white border-gray-800">
        {/* Camera Viewfinder */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
          {/* Loading state */}
          {!isCameraActive && !cameraError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-white animate-spin mx-auto mb-4" />
                <p className="text-white">Starting camera...</p>
              </div>
            </div>
          )}

          {isCameraActive && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              onLoadedMetadata={() => {
                console.log('[Camera] Video metadata loaded');
                if (videoRef.current) {
                  videoRef.current.play().catch(e => {
                    console.error('[Camera] Play on metadata load failed:', e);
                  });
                }
              }}
              onCanPlay={() => {
                console.log('[Camera] Video can play');
              }}
            />
          )}

          {cameraError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6">
              <div className="text-center max-w-md">
                <X className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-white mb-4">{cameraError}</p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={startCamera}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={handleDone}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    Close & Use Gallery Upload Instead
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Top Bar - Photo Count & Done */}
          <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent flex items-center justify-between">
            <div className="text-white font-medium">
              {photos.length} photo{photos.length !== 1 ? 's' : ''}
              {hasPhotos && !allPhotosUploaded && (
                <span className="ml-2 text-sm text-yellow-400">Uploading...</span>
              )}
              {allPhotosUploaded && (
                <span className="ml-2 text-sm text-green-400">All uploaded</span>
              )}
            </div>
            <button
              onClick={handleDone}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg transition-colors"
            >
              <Check className="w-4 h-4" />
              Done
            </button>
          </div>

          {/* Bottom Bar - Shutter Button */}
          {isCameraActive && (
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/60 to-transparent">
              <div className="flex items-center justify-center">
                <button
                  onClick={capturePhoto}
                  className="w-20 h-20 rounded-full border-4 border-white bg-white/20 hover:bg-white/40 transition-all active:scale-95"
                  aria-label="Capture Photo"
                />
              </div>
            </div>
          )}
        </div>

        {/* Photo Strip at Bottom */}
        {hasPhotos && (
          <div className="absolute bottom-24 left-0 right-0 px-4">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 border-white/30"
                >
                  <Image
                    src={photo.preview}
                    alt="Captured"
                    fill
                    className="object-cover"
                    unoptimized
                  />

                  {/* Upload status indicator */}
                  <div className="absolute top-0 right-0 p-1">
                    {photo.uploading && (
                      <Loader2 className="w-3 h-3 text-white animate-spin" />
                    )}
                    {photo.uploaded && (
                      <Check className="w-3 h-3 text-green-400" />
                    )}
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={() => removePhoto(photo.id)}
                    className="absolute bottom-0 left-0 right-0 bg-black/60 hover:bg-black/80 p-1 flex items-center justify-center"
                  >
                    <Trash2 className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
