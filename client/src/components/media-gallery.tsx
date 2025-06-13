import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Download, 
  X, 
  ZoomIn, 
  RotateCw, 
  FileText, 
  Play, 
  Image as ImageIcon,
  Grid3X3,
  List,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

interface MediaFile {
  id: number;
  fileName: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  mimeType: string;
  description?: string | null;
  createdAt: string | Date;
}

interface MediaGalleryProps {
  files: MediaFile[];
}

export function MediaGallery({ files }: MediaGalleryProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [rotation, setRotation] = useState(0);

  // Debug logging
  console.log('MediaGallery received files:', files);
  console.log('Files count:', files.length);

  const imageFiles = files.filter(file => file.fileType === 'image');
  const videoFiles = files.filter(file => file.fileType === 'video');
  const documentFiles = files.filter(file => !['image', 'video'].includes(file.fileType));

  console.log('Image files:', imageFiles.length);
  console.log('Video files:', videoFiles.length);
  console.log('Document files:', documentFiles.length);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const openLightbox = (file: MediaFile) => {
    const mediaFiles = [...imageFiles, ...videoFiles];
    const index = mediaFiles.findIndex(f => f.id === file.id);
    setCurrentIndex(index);
    setSelectedMedia(file);
    setRotation(0);
  };

  const navigateMedia = (direction: 'prev' | 'next') => {
    const mediaFiles = [...imageFiles, ...videoFiles];
    let newIndex = currentIndex;
    
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : mediaFiles.length - 1;
    } else {
      newIndex = currentIndex < mediaFiles.length - 1 ? currentIndex + 1 : 0;
    }
    
    setCurrentIndex(newIndex);
    setSelectedMedia(mediaFiles[newIndex]);
    setRotation(0);
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const renderMediaPreview = (file: MediaFile, isLightbox = false) => {
    const className = isLightbox 
      ? "max-w-full max-h-full object-contain" 
      : "w-full h-full object-cover transition-transform group-hover:scale-105";

    if (file.fileType === 'image') {
      return (
        <img 
          src={`/${file.filePath}`} 
          alt={file.originalName}
          className={className}
          style={isLightbox ? { transform: `rotate(${rotation}deg)` } : undefined}
          loading="lazy"
          onError={(e) => {
            console.error('Image failed to load:', `/${file.filePath}`);
            e.currentTarget.style.display = 'none';
          }}
          onLoad={() => {
            console.log('Image loaded successfully:', `/${file.filePath}`);
          }}
        />
      );
    }

    if (file.fileType === 'video') {
      return isLightbox ? (
        <video 
          src={`/${file.filePath}`} 
          className={className}
          controls
          autoPlay
        />
      ) : (
        <div className="relative w-full h-full bg-black flex items-center justify-center">
          <video 
            src={`/${file.filePath}`} 
            className="w-full h-full object-cover"
            muted
          />
          <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
            <Play className="h-12 w-12 text-white" />
          </div>
        </div>
      );
    }

    return null;
  };

  const renderFileCard = (file: MediaFile) => {
    const isMedia = ['image', 'video'].includes(file.fileType);

    if (viewMode === 'grid' && isMedia) {
      return (
        <Card key={file.id} className="overflow-hidden">
          <CardContent className="p-0">
            <div 
              className="aspect-video bg-gray-100 cursor-pointer group relative"
              onClick={() => openLightbox(file)}
            >
              {renderMediaPreview(file)}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            <div className="p-3">
              <h4 className="text-sm font-medium truncate">{file.originalName}</h4>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-gray-500">
                  {formatFileSize(file.fileSize)}
                </p>
                <p className="text-xs text-gray-500">
                  {file.createdAt instanceof Date ? file.createdAt.toLocaleDateString() : new Date(file.createdAt).toLocaleDateString()}
                </p>
              </div>
              {file.description && (
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">{file.description}</p>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card key={file.id}>
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              {file.fileType === 'image' && <ImageIcon className="h-8 w-8 text-blue-500" />}
              {file.fileType === 'video' && <Play className="h-8 w-8 text-green-500" />}
              {!['image', 'video'].includes(file.fileType) && <FileText className="h-8 w-8 text-gray-500" />}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium truncate">{file.originalName}</h4>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">{file.fileType}</Badge>
                <Badge variant="outline" className="text-xs">{formatFileSize(file.fileSize)}</Badge>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {file.createdAt instanceof Date ? file.createdAt.toLocaleDateString() : new Date(file.createdAt).toLocaleDateString()}
              </p>
              {file.description && (
                <p className="text-xs text-gray-600 mt-2">{file.description}</p>
              )}
            </div>
            <div className="flex flex-col gap-1">
              {isMedia && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => openLightbox(file)}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="sm" asChild>
                <a href={`/${file.filePath}`} download={file.originalName}>
                  <Download className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* View Controls */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">View:</span>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-gray-600">
          {imageFiles.length > 0 && <span>{imageFiles.length} images</span>}
          {videoFiles.length > 0 && <span>{videoFiles.length} videos</span>}
          {documentFiles.length > 0 && <span>{documentFiles.length} documents</span>}
        </div>
      </div>

      {/* Files Grid/List */}
      <div className={
        viewMode === 'grid' 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          : "space-y-3"
      }>
        {files.map(renderFileCard)}
      </div>

      {/* Lightbox */}
      <Dialog open={!!selectedMedia} onOpenChange={() => setSelectedMedia(null)}>
        <DialogContent className="max-w-6xl w-full h-[90vh] p-0">
          {selectedMedia && (
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold truncate">{selectedMedia.originalName}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">{selectedMedia.fileType}</Badge>
                    <Badge variant="outline">{formatFileSize(selectedMedia.fileSize)}</Badge>
                    <Badge variant="outline">{selectedMedia.createdAt instanceof Date ? selectedMedia.createdAt.toLocaleDateString() : new Date(selectedMedia.createdAt).toLocaleDateString()}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Navigation */}
                  {imageFiles.length + videoFiles.length > 1 && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigateMedia('prev')}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-gray-500">
                        {currentIndex + 1} / {imageFiles.length + videoFiles.length}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigateMedia('next')}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  
                  {selectedMedia.fileType === 'image' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRotate}
                    >
                      <RotateCw className="h-4 w-4" />
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a href={`/${selectedMedia.filePath}`} download={selectedMedia.originalName}>
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedMedia(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Media Display */}
              <div className="flex-1 flex items-center justify-center p-4 bg-gray-50">
                {renderMediaPreview(selectedMedia, true)}
              </div>

              {/* Description */}
              {selectedMedia.description && (
                <div className="p-4 border-t bg-white">
                  <p className="text-sm text-gray-600">{selectedMedia.description}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}