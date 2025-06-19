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
      const constraints = {
        video: {
          facingMode: options.facingMode || 'environment',
          width: options.width || 1920,
          height: options.height || 1080,
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
      
      setIsOpen(true);
      return true;
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Camera Access Denied",
        description: "Please allow camera access to take photos",
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