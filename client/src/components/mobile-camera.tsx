import { useCamera } from '@/hooks/useCamera';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, RotateCcw, X, Check } from 'lucide-react';
import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface MobileCameraProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoTaken?: (file: File) => void;
  projectId?: number;
  customerId?: number;
  title?: string;
}

export function MobileCamera({ 
  isOpen, 
  onClose, 
  onPhotoTaken,
  projectId,
  customerId,
  title = "Take Photo"
}: MobileCameraProps) {
  const { toast } = useToast();
  const [capturedPhoto, setCapturedPhoto] = useState<Blob | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const {
    isSupported,
    stream,
    videoRef,
    canvasRef,
    startCamera,
    stopCamera,
    capturePhoto,
    switchCamera,
  } = useCamera();

  const handleOpenCamera = async () => {
    if (!isSupported) {
      toast({
        title: "Camera Not Available",
        description: "Your device doesn't support camera functionality",
        variant: "destructive",
      });
      return;
    }

    const success = await startCamera({ facingMode: 'environment' });
    if (!success) {
      onClose();
    }
  };

  const handleTakePhoto = async () => {
    const photo = await capturePhoto();
    if (photo) {
      setCapturedPhoto(photo);
    }
  };

  const handleRetakePhoto = () => {
    setCapturedPhoto(null);
  };

  const handleSavePhoto = async () => {
    if (!capturedPhoto) return;

    try {
      setIsUploading(true);
      
      const formData = new FormData();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `camera-photo-${timestamp}.jpg`;
      
      formData.append('file', capturedPhoto, fileName);
      if (projectId) formData.append('projectId', projectId.toString());
      if (customerId) formData.append('customerId', customerId.toString());
      formData.append('source', 'camera');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      console.log('Upload response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload failed:', response.status, errorText);
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Upload successful:', result);

      if (onPhotoTaken) {
        const file = new File([capturedPhoto], fileName, { type: 'image/jpeg' });
        onPhotoTaken(file);
      }

      toast({
        title: "Photo Saved",
        description: "Your photo has been uploaded successfully",
      });

      handleClose();
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to save photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    stopCamera();
    setCapturedPhoto(null);
    onClose();
  };

  // Auto-start camera when dialog opens
  React.useEffect(() => {
    if (isOpen && !stream && !capturedPhoto) {
      handleOpenCamera();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-full h-screen md:max-w-lg md:h-auto p-0 rounded-none md:rounded-lg overflow-hidden">
        <DialogHeader className="p-4 border-b bg-white relative z-10">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">{title}</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 relative bg-black min-h-0" style={{ height: 'calc(100vh - 80px)' }}>
          {/* Camera View */}
          <video
            ref={videoRef}
            className={`w-full h-full object-cover ${capturedPhoto ? 'hidden' : 'block'}`}
            playsInline
            muted
            autoPlay
          />

          {/* Captured Photo Preview */}
          {capturedPhoto && (
            <img
              src={URL.createObjectURL(capturedPhoto)}
              alt="Captured"
              className="w-full h-full object-cover block"
            />
          )}

          {/* Loading overlay when processing */}
          {isUploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
              <div className="bg-white rounded-lg p-4 flex items-center space-x-3">
                <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                <span className="text-gray-900 font-medium">Saving photo...</span>
              </div>
            </div>
          )}

          {/* Hidden canvas for photo capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Camera Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/60 to-transparent z-20 min-h-[120px] flex items-end">
            <div className="w-full flex items-center justify-center space-x-6">
              {!capturedPhoto ? (
                <>
                  {/* Switch Camera Button */}
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={switchCamera}
                    className="bg-white/20 hover:bg-white/30 text-white border-white/30 h-12 w-12 p-0 rounded-full"
                    disabled={!stream}
                  >
                    <RotateCcw className="h-5 w-5" />
                  </Button>

                  {/* Capture Button */}
                  <Button
                    size="lg"
                    onClick={handleTakePhoto}
                    className="w-20 h-20 rounded-full bg-white hover:bg-gray-100 text-gray-900 border-4 border-white/30"
                    disabled={!stream}
                  >
                    <Camera className="h-8 w-8" />
                  </Button>

                  {/* Placeholder for symmetry */}
                  <div className="w-12 h-12" />
                </>
              ) : (
                <>
                  {/* Retake Button */}
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={handleRetakePhoto}
                    className="bg-red-600/80 hover:bg-red-700/80 text-white border-red-500/30 px-6 py-3 text-base font-medium rounded-lg"
                  >
                    <RotateCcw className="h-5 w-5 mr-2" />
                    Retake
                  </Button>

                  {/* Save Button */}
                  <Button
                    size="lg"
                    onClick={handleSavePhoto}
                    disabled={isUploading}
                    className="bg-green-600/80 hover:bg-green-700/80 text-white px-8 py-3 text-base font-medium rounded-lg disabled:opacity-50"
                  >
                    <Check className="h-5 w-5 mr-2" />
                    {isUploading ? 'Saving...' : 'Save Photo'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}