import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, X, ZoomIn, RotateCw, FileText } from "lucide-react";

interface ImagePreviewProps {
  src: string;
  alt: string;
  fileName: string;
  fileSize: number;
  uploadDate: string;
  description?: string;
  className?: string;
}

export function ImagePreview({ 
  src, 
  alt, 
  fileName, 
  fileSize, 
  uploadDate, 
  description,
  className = ""
}: ImagePreviewProps) {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [rotation, setRotation] = useState(0);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const resetRotation = () => {
    setRotation(0);
  };

  if (imageError) {
    return (
      <div className={`aspect-video rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center ${className}`}>
        <div className="text-center text-gray-500">
          <FileText className="h-8 w-8 mx-auto mb-2" />
          <p className="text-sm">Image not available</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`aspect-video rounded-lg overflow-hidden bg-gray-100 cursor-pointer group relative ${className}`}>
        <img 
          src={src} 
          alt={alt}
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
          onError={() => setImageError(true)}
          onClick={() => setIsLightboxOpen(true)}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
          <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
        <DialogContent className="max-w-4xl w-full h-[90vh] p-0">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold truncate">{fileName}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">{formatFileSize(fileSize)}</Badge>
                  <Badge variant="outline">{new Date(uploadDate).toLocaleDateString()}</Badge>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRotate}
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <a href={src} download={fileName}>
                    <Download className="h-4 w-4" />
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsLightboxOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Image */}
            <div className="flex-1 flex items-center justify-center p-4 bg-gray-50">
              <img 
                src={src} 
                alt={alt}
                className="max-w-full max-h-full object-contain transition-transform"
                style={{ transform: `rotate(${rotation}deg)` }}
                onLoad={resetRotation}
              />
            </div>

            {/* Description */}
            {description && (
              <div className="p-4 border-t bg-white">
                <p className="text-sm text-gray-600">{description}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}