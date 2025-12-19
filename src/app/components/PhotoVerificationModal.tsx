import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, RefreshCw, Upload, CheckCircle, AlertCircle, X, Image as ImageIcon, BrainCircuit, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useVerifyTask } from '@/hooks/queries/useTasks';
import { useAnalyzePhoto, AIAnalysisResult } from '@/hooks/mutations/useAI';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  taskName: string;
  locationId: string;
  onSuccess?: () => void;
}

export const PhotoVerificationModal: React.FC<Props> = ({ 
  isOpen, 
  onClose, 
  taskId, 
  taskName, 
  locationId,
  onSuccess 
}) => {
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mutate: verifyTask, isPending: isVerifying } = useVerifyTask();
  const { mutate: analyzePhoto, isPending: isAnalyzing } = useAnalyzePhoto();

  const stopStream = React.useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const stopCamera = React.useCallback(() => {
    stopStream();
    setIsCameraActive(prev => prev ? false : prev);
  }, [stopStream]);

  const resetState = () => {
    setIsCameraActive(false);
    setPhoto(null);
    setPhotoPreview(null);
    setPhotoBase64(null);
    setNotes('');
    setCameraError(null);
    setAiResult(null);
  };

  const handleClose = () => {
    stopStream();
    resetState();
    onClose();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Prefer back camera
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      console.error('Camera error:', err);
      setCameraError('Could not access camera. Please allow camera permissions or upload a file.');
      setIsCameraActive(false);
    }
  };

  const processPhoto = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setPhotoBase64(base64String);
      
      // Trigger AI Analysis automatically
      analyzePhoto({ image_base64: base64String, task_id: taskId }, {
        onSuccess: (data) => setAiResult(data),
        onError: () => setAiResult(null) // Fail silently/gracefully regarding AI
      });
    };
    reader.readAsDataURL(file);
    
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    stopCamera();
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      
      // Convert to file
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
          processPhoto(file);
        }
      }, 'image/jpeg', 0.8);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setCameraError('Please select an image file');
        return;
      }
      processPhoto(file);
    }
  };

  const handleSubmit = () => {
    if (!photo) return;

    // Check low confidence
    // We display warning in UI, but user can still click confirm
    
    verifyTask({
      taskId,
      locationId,
      photoFile: photo,
      notes: notes.trim() || undefined
    }, {
      onSuccess: () => {
        onSuccess?.();
        handleClose();
      },
      onError: (err) => {
        setCameraError(err.message);
      }
    });
  };
  
  const isPending = isVerifying || isAnalyzing;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden bg-black text-white border-gray-800">
        <DialogHeader className="p-4 bg-gray-900 border-b border-gray-800">
          <DialogTitle className="text-white">Verify: {taskName}</DialogTitle>
        </DialogHeader>

        <div className="relative aspect-[3/4] bg-black flex items-center justify-center overflow-hidden">
          {/* Camera View */}
          {isCameraActive && !photoPreview && (
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover"
            />
          )}

          {/* Photo Preview */}
          {photoPreview && (
            <div className="relative w-full h-full">
              <Image 
                src={photoPreview} 
                alt="Verification Preview" 
                fill
                className="object-contain"
                unoptimized // Since it's a local blob URL
              />
              
              {/* AI Overlay */}
              {(isAnalyzing || aiResult) && (
                <div className="absolute top-4 left-4 right-4 bg-black/70 backdrop-blur-md p-3 rounded-lg border border-white/10 shadow-lg animate-in fade-in slide-in-from-top-4">
                  {isAnalyzing ? (
                    <div className="flex items-center gap-3 text-sm text-blue-200">
                      <BrainCircuit className="w-4 h-4 animate-pulse" />
                      <span>AI analyzing photo...</span>
                    </div>
                  ) : aiResult ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                         <div className={`flex items-center gap-2 font-medium ${
                           aiResult.confidence > 80 ? 'text-green-400' : 
                           aiResult.confidence > 50 ? 'text-yellow-400' : 'text-red-400'
                         }`}>
                           <BrainCircuit className="w-4 h-4" />
                           <span>Confidence: {aiResult.confidence}%</span>
                         </div>
                         <span className="text-xs uppercase bg-white/10 px-1.5 py-0.5 rounded text-white/70">
                           {aiResult.recommendation}
                         </span>
                      </div>
                      <p className="text-xs text-white/90 leading-relaxed line-clamp-2">
                        {aiResult.assessment}
                      </p>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}

          {/* Placeholder / Start State */}
          {!isCameraActive && !photoPreview && (
            <div className="text-center p-6 space-y-4">
              <Camera className="w-16 h-16 text-gray-500 mx-auto" />
              <p className="text-gray-400">Take a photo to verify completion</p>
              
              <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
                <Button onClick={startCamera} variant="default" className="bg-blue-600 hover:bg-blue-700 w-full">
                  <Camera className="w-4 h-4 mr-2" />
                  Open Camera
                </Button>
                
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleFileUpload}
                    ref={fileInputRef}
                  />
                  <Button variant="outline" className="w-full border-gray-600 text-gray-300 hover:bg-gray-800">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload File
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Error Overlay */}
          {cameraError && (
            <div className="absolute top-4 left-4 right-4 bg-red-900/90 text-white p-3 rounded text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{cameraError}</span>
              <button onClick={() => setCameraError(null)} className="ml-auto">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Camera Controls Overlay */}
          {isCameraActive && !photoPreview && (
            <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center gap-8">
               <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:bg-white/20 rounded-full h-12 w-12"
                onClick={() => {
                  fileInputRef.current?.click();
                  stopCamera();
                }}
              >
                <ImageIcon className="w-6 h-6" />
              </Button>

              <button 
                onClick={capturePhoto}
                className="w-16 h-16 rounded-full border-4 border-white bg-white/20 hover:bg-white/40 transition-colors"
                aria-label="Take Photo"
              />

              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:bg-white/20 rounded-full h-12 w-12"
                onClick={stopCamera}
              >
                <X className="w-6 h-6" />
              </Button>
            </div>
          )}
        </div>

        {/* Confirmation Form */}
        {photoPreview && (
          <div className="p-4 bg-gray-900 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-gray-300">Notes (Optional)</Label>
              <Input
                id="notes"
                placeholder="Any issues or details..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              />
            </div>
            
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setPhoto(null);
                  setPhotoPreview(null);
                  setPhotoBase64(null);
                  setAiResult(null);
                  startCamera();
                }}
                disabled={isPending}
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retake
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={isPending || (isAnalyzing && !aiResult)} // Wait for AI or timeout
                className={`flex-1 text-white transition-colors ${
                  aiResult?.recommendation === 'retake' 
                    ? 'bg-yellow-600 hover:bg-yellow-700' 
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isVerifying ? (
                   <>
                     <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                     Uploading...
                   </>
                ) : isAnalyzing ? (
                    <>
                     <BrainCircuit className="w-4 h-4 mr-2 animate-pulse" />
                     Analyzing...
                   </>
                ) : aiResult?.recommendation === 'retake' ? (
                   'Verify Anyway'
                ) : (
                   'Confirm Verification'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
