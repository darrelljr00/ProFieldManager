import { useState, useEffect } from 'react';
import { FileImage, AlertCircle } from 'lucide-react';

interface ThumbnailImageProps {
  fileId: number;
  fileName: string;
  className?: string;
  fallbackIcon?: React.ReactNode;
}

export function ThumbnailImage({ fileId, fileName, className = "", fallbackIcon }: ThumbnailImageProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    const loadThumbnail = async () => {
      try {
        setIsLoading(true);
        setHasError(false);

        const response = await fetch(`/api/files/${fileId}/thumbnail`, {
          credentials: 'include', // Important for cookie-based auth
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        if (isCancelled) return;

        // Convert response to blob URL for security
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        setImageSrc(blobUrl);
        setIsLoading(false);

      } catch (error) {
        console.warn(`Failed to load thumbnail for file ${fileId}:`, error);
        if (!isCancelled) {
          setHasError(true);
          setIsLoading(false);
        }
      }
    };

    loadThumbnail();

    // Cleanup function to cancel request and revoke blob URL
    return () => {
      isCancelled = true;
      if (imageSrc) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [fileId]);

  // Cleanup blob URL when component unmounts
  useEffect(() => {
    return () => {
      if (imageSrc) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [imageSrc]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 ${className}`}>
        <div className="animate-pulse">
          <FileImage className="h-8 w-8 text-gray-400" />
        </div>
      </div>
    );
  }

  if (hasError || !imageSrc) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 ${className}`}>
        {fallbackIcon || <AlertCircle className="h-8 w-8 text-gray-400" />}
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={fileName}
      className={`object-cover ${className}`}
      onError={() => {
        setHasError(true);
        if (imageSrc) {
          URL.revokeObjectURL(imageSrc);
        }
      }}
    />
  );
}