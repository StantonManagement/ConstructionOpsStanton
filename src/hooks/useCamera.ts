/**
 * useCamera Hook
 * Provides camera access and photo capture functionality
 */

import { useState, useRef, useCallback } from 'react';

export interface CameraOptions {
  facingMode?: 'user' | 'environment';
  width?: number;
  height?: number;
}

export function useCamera(options: CameraOptions = {}) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Check if camera is available
  const isCameraAvailable = useCallback(() => {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }, []);

  // Start camera stream
  const startCamera = useCallback(async () => {
    if (!isCameraAvailable()) {
      setError('Camera not available on this device');
      return false;
    }

    try {
      const constraints = {
        video: {
          facingMode: options.facingMode || 'environment',
          width: options.width ? { ideal: options.width } : undefined,
          height: options.height ? { ideal: options.height } : undefined,
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      setIsStreaming(true);
      setError(null);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      return true;
    } catch (err) {
      console.error('Error starting camera:', err);
      setError('Failed to access camera. Please grant camera permissions.');
      return false;
    }
  }, [options.facingMode, options.width, options.height, isCameraAvailable]);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsStreaming(false);
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  }, [stream]);

  // Capture photo from video stream
  const capturePhoto = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!videoRef.current || !isStreaming) {
        resolve(null);
        return;
      }

      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }

      ctx.drawImage(video, 0, 0);

      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg', 0.9);
    });
  }, [isStreaming]);

  // Switch camera (front/back)
  const switchCamera = useCallback(async () => {
    stopCamera();
    const newFacingMode = options.facingMode === 'user' ? 'environment' : 'user';
    return startCamera();
  }, [stopCamera, startCamera, options.facingMode]);

  return {
    videoRef,
    stream,
    isStreaming,
    error,
    isCameraAvailable: isCameraAvailable(),
    startCamera,
    stopCamera,
    capturePhoto,
    switchCamera,
  };
}

