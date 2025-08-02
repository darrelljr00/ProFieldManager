import { useState, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface CameraOptions {
  facingMode?: 'user' | 'environment';
  width?: number;
  height?: number;
  quality?: number;
}

export function useCamera() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const checkCameraSupport = useCallback(() => {
    const supported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    setIsSupported(supported);
    return supported;
  }, []);

  const startCamera = useCallback(async (options: CameraOptions = {}) => {
    if (!checkCameraSupport()) {
      toast({
        title: "Camera Not Supported",
        description: "Your device doesn't support camera access",
        variant: "destructive",
      });
      return false;
    }

    try {
      // First, try to get permissions (fallback for browsers that don't support permissions API)
      try {
        const permissions = await navigator.permissions.query({ name: 'camera' as PermissionName });
        console.log('Camera permission status:', permissions.state);
      } catch (permError) {
        console.log('Permissions API not supported, proceeding with direct camera access');
      }
      
      const constraints = {
        video: {
          facingMode: options.facingMode || 'environment',
          width: { ideal: options.width || 1920 },
          height: { ideal: options.height || 1080 },
        },
        audio: false,
      };

      console.log('Requesting camera with constraints:', constraints);
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
      
      setIsOpen(true);
      return true;
    } catch (error: any) {
      console.error('Error accessing camera:', error);
      console.log('Camera failed to start');
      
      let errorMessage = "Please allow camera access to take photos";
      let errorTitle = "Camera Access Denied";
      
      if (error.name === 'NotAllowedError') {
        errorMessage = "Camera access was denied. Please allow camera permissions and try again.";
      } else if (error.name === 'NotFoundError') {
        errorMessage = "No camera device found on this device.";
        errorTitle = "Camera Not Found";
      } else if (error.name === 'NotReadableError') {
        errorMessage = "Camera is already in use by another application.";
        errorTitle = "Camera In Use";
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = "Camera doesn't support the requested settings.";
        errorTitle = "Camera Not Compatible";
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    }
  }, [checkCameraSupport, toast]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsOpen(false);
  }, [stream]);

  const capturePhoto = useCallback((quality: number = 0.9): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!videoRef.current || !canvasRef.current) {
        resolve(null);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) {
        resolve(null);
        return;
      }

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert canvas to blob
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg', quality);
    });
  }, []);

  const switchCamera = useCallback(async () => {
    if (!stream) return;

    const videoTrack = stream.getVideoTracks()[0];
    const currentFacingMode = videoTrack.getSettings().facingMode;
    const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';

    stopCamera();
    await startCamera({ facingMode: newFacingMode });
  }, [stream, stopCamera, startCamera]);

  return {
    isOpen,
    isSupported,
    stream,
    videoRef,
    canvasRef,
    startCamera,
    stopCamera,
    capturePhoto,
    switchCamera,
    checkCameraSupport,
  };
}