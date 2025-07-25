import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ImageAnnotation } from "@/components/image-annotation";
import { SharePhotosDialog } from "@/components/share-photos-dialog";
import { DocuSignSignatureDialog } from "@/components/docusign-signature-dialog";
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
  ChevronRight,
  Trash2,
  Edit3,
  Share2,
  CheckSquare,
  Square,
  FileSignature,
  Smartphone
} from "lucide-react";
import { MobileCamera } from "@/components/mobile-camera";

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
  annotations?: any[];
  annotatedImageUrl?: string;
  signatureStatus?: string;
  docusignEnvelopeId?: string;
  signatureUrl?: string;
  uploadedBy?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
}

interface MediaGalleryProps {
  files: MediaFile[];
  projectId?: number;
}

export function MediaGallery({ files, projectId }: MediaGalleryProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [activeTab, setActiveTab] = useState('preview');
  const [selectedFiles, setSelectedFiles] = useState<MediaFile[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [showMobileCamera, setShowMobileCamera] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  console.log('🖼️ MediaGallery DEBUG - Total files:', files.length);
  console.log('🖼️ MediaGallery DEBUG - Files:', files);
  
  const imageFiles = files.filter(file => file.fileType === 'image');
  console.log('🖼️ MediaGallery DEBUG - Image files:', imageFiles.length, imageFiles);

  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: number) => {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete file');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "File deleted",
        description: "The file has been successfully deleted.",
      });
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'files'] });
      }
      setSelectedMedia(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete file",
        variant: "destructive",
      });
    },
  });

  const saveAnnotationsMutation = useMutation({
    mutationFn: ({ fileId, annotations, annotatedImageUrl }: { 
      fileId: number; 
      annotations: any[]; 
      annotatedImageUrl: string 
    }) =>
      apiRequest("/api/files/annotations", "POST", {
        fileId,
        annotations,
        annotatedImageUrl
      }),
    onSuccess: () => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'files'] });
      }
      setActiveTab('preview');
      toast({
        title: "Success",
        description: "Annotations saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save annotations",
        variant: "destructive",
      });
    },
  });

  const uploadFileMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch(`/api/projects/${projectId}/files`, {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Upload failed' }));
        throw new Error(errorData.message || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "files"] });
      toast({
        title: "Success",
        description: "Photo uploaded successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const videoFiles = files.filter(file => file.fileType === 'video');
  const documentFiles = files.filter(file => !['image', 'video'].includes(file.fileType));

  // Selection helper functions
  const toggleFileSelection = (file: MediaFile) => {
    setSelectedFiles(prev => {
      const isSelected = prev.some(f => f.id === file.id);
      if (isSelected) {
        return prev.filter(f => f.id !== file.id);
      } else {
        return [...prev, file];
      }
    });
  };

  const selectAllImages = () => {
    setSelectedFiles(imageFiles);
  };

  const clearSelection = () => {
    setSelectedFiles([]);
    setSelectionMode(false);
  };

  const handleShareSelected = () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "No images selected",
        description: "Please select at least one image to share",
        variant: "destructive",
      });
      return;
    }
    setShareDialogOpen(true);
  };

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
      // Handle both Cloudinary URLs (https://...) and local paths (/uploads/...)
      const imageUrl = file.filePath.startsWith('http') ? file.filePath : (file.filePath.startsWith('/') ? file.filePath : `/${file.filePath}`);
      console.log('🖼️ Rendering image:', file.originalName, 'URL:', imageUrl, 'File:', file);
      return (
        <img 
          src={imageUrl} 
          alt={file.originalName}
          className={className}
          style={isLightbox ? { transform: `rotate(${rotation}deg)` } : undefined}
          loading="lazy"
          onError={(e) => {
            console.error('🖼️ Image failed to load:', imageUrl, 'File data:', file);
            e.currentTarget.style.display = 'none';
          }}
          onLoad={() => {
            console.log('🖼️ Image loaded successfully:', imageUrl);
          }}
        />
      );
    }

    if (file.fileType === 'video') {
      const videoUrl = file.filePath.startsWith('/') ? file.filePath : `/${file.filePath}`;
      return isLightbox ? (
        <video 
          src={videoUrl} 
          className={className}
          controls
          autoPlay
        />
      ) : (
        <div className="relative w-full h-full bg-black flex items-center justify-center">
          <video 
            src={videoUrl} 
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
    const isSelected = selectedFiles.some(f => f.id === file.id);
    const isImage = file.fileType === 'image';

    if (viewMode === 'grid' && isMedia) {
      return (
        <Card key={file.id} className={`overflow-hidden ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
          <CardContent className="p-0">
            <div 
              className="aspect-video bg-gray-100 cursor-pointer group relative"
              onClick={(e) => {
                if (selectionMode && isImage) {
                  e.stopPropagation();
                  toggleFileSelection(file);
                } else {
                  openLightbox(file);
                }
              }}
            >
              {renderMediaPreview(file)}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              {selectionMode && isImage && (
                <div className="absolute top-2 right-2">
                  {isSelected ? (
                    <CheckSquare className="h-6 w-6 text-blue-500 bg-white rounded" />
                  ) : (
                    <Square className="h-6 w-6 text-gray-400 bg-white bg-opacity-80 rounded" />
                  )}
                </div>
              )}
            </div>
            <div className="p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium truncate">{file.originalName}</h4>
                    {file.annotations && file.annotations.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        <Edit3 className="h-3 w-3 mr-1" />
                        Annotated
                      </Badge>
                    )}
                  </div>
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
                  {file.uploadedBy && (
                    <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                      <span className="font-medium">📸 By:</span>
                      <span>{file.uploadedBy.firstName} {file.uploadedBy.lastName}</span>
                      {file.uploadedBy.phone && (
                        <span className="text-gray-500">• {file.uploadedBy.phone}</span>
                      )}
                    </div>
                  )}
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => deleteFileMutation.mutate(file.id)}
                  disabled={deleteFileMutation.isPending}
                  className="ml-2 h-6 w-6 p-0"
                >
                  <Trash2 className="h-3 w-3 text-red-500" />
                </Button>
              </div>
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
              {file.uploadedBy && (
                <div className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                  <span className="font-medium">📸 Uploaded by:</span>
                  <span>{file.uploadedBy.firstName} {file.uploadedBy.lastName}</span>
                  {file.uploadedBy.phone && (
                    <span className="text-gray-500">• {file.uploadedBy.phone}</span>
                  )}
                  <span className="text-gray-500">• {file.uploadedBy.email}</span>
                </div>
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
                <a href={file.filePath.startsWith('/') ? file.filePath : `/${file.filePath}`} download={file.originalName}>
                  <Download className="h-4 w-4" />
                </a>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => deleteFileMutation.mutate(file.id)}
                disabled={deleteFileMutation.isPending}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          </div>
          
          {/* DocuSign E-Signature Section for Document Files */}
          {file.fileType === 'document' && projectId && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="mb-2">
                <span className="text-sm font-medium text-blue-600">📝 Electronic Signature</span>
              </div>
              <DocuSignSignatureDialog 
                file={file}
                projectId={projectId}
              />
            </div>
          )}


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
          
          {imageFiles.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant={selectionMode ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setSelectionMode(!selectionMode);
                  if (!selectionMode) {
                    setSelectedFiles([]);
                  }
                }}
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                Select Photos
              </Button>
              
              {selectionMode && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllImages}
                    disabled={selectedFiles.length === imageFiles.length}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearSelection}
                  >
                    Clear
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleShareSelected}
                    disabled={selectedFiles.length === 0}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share ({selectedFiles.length})
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowMobileCamera(true)}
            size="sm"
            className="photo-button-green"
          >
            <Smartphone className="h-4 w-4 mr-2" />
            Take Photo
          </Button>
          
          <div className="flex items-center gap-4 text-sm text-gray-600">
            {imageFiles.length > 0 && <span>{imageFiles.length} images</span>}
            {videoFiles.length > 0 && <span>{videoFiles.length} videos</span>}
            {documentFiles.length > 0 && <span>{documentFiles.length} documents</span>}
          </div>
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
        <DialogContent className="max-w-6xl w-full h-[90vh] p-0" aria-describedby="media-preview-description">
          <DialogTitle className="sr-only">
            {selectedMedia?.originalName || 'Media Preview'}
          </DialogTitle>
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
                    {selectedMedia.annotations && selectedMedia.annotations.length > 0 && (
                      <Badge variant="secondary">
                        <Edit3 className="h-3 w-3 mr-1" />
                        Annotated
                      </Badge>
                    )}
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
                    <a href={selectedMedia.filePath.startsWith('http') ? selectedMedia.filePath : (selectedMedia.filePath.startsWith('/') ? selectedMedia.filePath : `/${selectedMedia.filePath}`)} download={selectedMedia.originalName}>
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteFileMutation.mutate(selectedMedia.id)}
                    disabled={deleteFileMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
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

              {/* Tabbed Interface */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                  <TabsList className="grid w-full grid-cols-2 mx-4 mt-2">
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                    <TabsTrigger value="annotate" disabled={selectedMedia.fileType !== 'image'}>
                      Annotate
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="preview" className="flex-1 flex items-center justify-center p-4 bg-gray-50 m-0">
                    {selectedMedia.annotatedImageUrl ? (
                      <img 
                        src={selectedMedia.annotatedImageUrl} 
                        alt={`${selectedMedia.originalName} (annotated)`}
                        className="max-w-full max-h-full object-contain"
                        style={{ transform: `rotate(${rotation}deg)` }}
                        loading="lazy"
                      />
                    ) : (
                      renderMediaPreview(selectedMedia, true)
                    )}
                  </TabsContent>
                  
                  <TabsContent value="annotate" className="flex-1 m-0 p-0">
                    {selectedMedia.fileType === 'image' && (
                      <ImageAnnotation
                        imageUrl={selectedMedia.filePath.startsWith('/') ? selectedMedia.filePath : `/${selectedMedia.filePath}`}
                        initialAnnotations={selectedMedia.annotations || []}
                        onSave={(annotations, annotatedImageUrl) => {
                          saveAnnotationsMutation.mutate({
                            fileId: selectedMedia.id,
                            annotations,
                            annotatedImageUrl
                          });
                        }}
                      />
                    )}
                  </TabsContent>
                </Tabs>
              </div>

              {/* Description */}
              <div id="media-preview-description" className="sr-only">
                Viewing {selectedMedia.fileType} file: {selectedMedia.originalName}
              </div>
              {selectedMedia.description && (
                <div className="p-4 border-t bg-white">
                  <p className="text-sm text-gray-600">{selectedMedia.description}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      <SharePhotosDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        selectedImages={selectedFiles}
        projectName={`Project ${projectId}`}
      />

      {/* Mobile Camera Dialog */}
      <MobileCamera
        isOpen={showMobileCamera}
        onClose={() => setShowMobileCamera(false)}
        onPhotoTaken={(file) => {
          console.log('Photo taken from media gallery:', file);
          
          // Create FormData to upload the photo
          const formData = new FormData();
          formData.append('file', file);
          formData.append('description', 'Photo taken with mobile camera from gallery');
          
          // Upload the photo
          uploadFileMutation.mutate(formData);
        }}
        title="Take Photo for Gallery"
      />
    </div>
  );
}