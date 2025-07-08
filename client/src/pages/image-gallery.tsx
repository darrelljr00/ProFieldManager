import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Grid,
  List,
  Upload,
  Download,
  Trash2,
  Palette,
  Share2,
  CheckSquare,
  Square,
  Edit3,
  Copy,
  Scissors,
  RotateCw,
  Crop,
  Filter,
  Layers,
  Image as ImageIcon
} from "lucide-react";
import { ImageAnnotation } from "@/components/image-annotation";
import { PhotoEditor } from "@/components/photo-editor";
import { SharePhotosDialog } from "@/components/share-photos-dialog";
import { MobileCamera } from "@/components/mobile-camera";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface ImageFile {
  id: number;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadDate: string;
  projectId?: number;
  projectName?: string;
  annotations?: any[];
  url?: string;
}

export default function ImageGallery() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedImages, setSelectedImages] = useState<ImageFile[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImageFile | null>(null);
  const [isAnnotationOpen, setIsAnnotationOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadProjectId, setUploadProjectId] = useState<string>("");
  const [isPhotoEditorOpen, setIsPhotoEditorOpen] = useState(false);
  const [isCollageOpen, setIsCollageOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<ImageFile | null>(null);
  const [showEditOptions, setShowEditOptions] = useState<number | null>(null);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const imagesQuery = useQuery({
    queryKey: ['/api/images'],
    onSuccess: (data) => {
      console.log('Image gallery data received:', data);
      if (data && data.length > 0) {
        console.log('Sample image:', data[0]);
      }
    }
  });

  const projectsQuery = useQuery({
    queryKey: ['/api/projects'],
  });

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        if (uploadProjectId) {
          formData.append('projectId', uploadProjectId);
        }

        const response = await fetch('/api/upload/image', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Upload failed for ${file.name}: ${response.status} ${response.statusText} - ${errorText}`);
        }
        
        return response.json();
      });

      return Promise.all(uploadPromises);
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['/api/images'] });
      setIsUploadOpen(false);
      setUploadFiles([]);
      setUploadProjectId("");
      toast({
        title: "Success",
        description: `${results.length} image${results.length > 1 ? 's' : ''} uploaded successfully`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload images",
        variant: "destructive",
      });
    },
  });

  const saveAnnotationsMutation = useMutation({
    mutationFn: async ({ imageId, annotations, annotatedImageUrl }: {
      imageId: number;
      annotations: any[];
      annotatedImageUrl: string;
    }) => {
      const response = await fetch(`/api/images/${imageId}/annotations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ annotations, annotatedImageUrl }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save annotations');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/images'] });
      setIsAnnotationOpen(false);
      setSelectedImage(null);
      toast({
        title: "Success",
        description: "Annotations saved successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save annotations",
        variant: "destructive",
      });
    },
  });

  const images = (imagesQuery.data as ImageFile[]) || [];
  
  const filteredImages = Array.isArray(images) ? images.filter((image: ImageFile) => {
    const matchesSearch = image.originalName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProject = selectedProject === "all" || image.projectId?.toString() === selectedProject;
    return matchesSearch && matchesProject;
  }) : [];

  // Selection helper functions
  const toggleImageSelection = (image: ImageFile) => {
    setSelectedImages(prev => {
      const isSelected = prev.some(img => img.id === image.id);
      if (isSelected) {
        return prev.filter(img => img.id !== image.id);
      } else {
        return [...prev, image];
      }
    });
  };

  const selectAllVisible = () => {
    setSelectedImages(filteredImages);
  };

  const clearSelection = () => {
    setSelectedImages([]);
    setSelectionMode(false);
  };

  const handleShareSelected = () => {
    if (selectedImages.length === 0) {
      toast({
        title: "No images selected",
        description: "Please select at least one image to share",
        variant: "destructive",
      });
      return;
    }
    setShareDialogOpen(true);
  };

  const getProjectNameForSharing = () => {
    if (selectedImages.length > 0 && selectedImages[0].projectName) {
      return selectedImages[0].projectName;
    }
    return "Mixed Projects";
  };

  const handleUpload = () => {
    if (uploadFiles.length === 0) return;
    uploadMutation.mutate(uploadFiles);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length !== files.length) {
      toast({
        title: "Invalid files",
        description: "Only image files are allowed",
        variant: "destructive",
      });
    }
    
    setUploadFiles(imageFiles);
  };

  const removeFile = (index: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAnnotate = (image: ImageFile) => {
    setSelectedImage(image);
    setIsAnnotationOpen(true);
  };

  const handleSaveAnnotations = (annotations: any[], imageDataUrl: string) => {
    if (!selectedImage) return;
    
    saveAnnotationsMutation.mutate({
      imageId: selectedImage.id,
      annotations,
      annotatedImageUrl: imageDataUrl
    });
  };

  const handleEditImage = (image: ImageFile) => {
    setEditingImage(image);
    setIsPhotoEditorOpen(true);
  };

  const handleCreateCollage = () => {
    if (selectedImages.length < 2) {
      toast({
        title: "Select Images",
        description: "Please select at least 2 images to create a collage",
        variant: "destructive",
      });
      return;
    }
    setIsCollageOpen(true);
  };

  const handleDuplicateImage = async (image: ImageFile) => {
    try {
      const response = await fetch(`/api/images/${image.id}/duplicate`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to duplicate image');
      }

      await queryClient.invalidateQueries({ queryKey: ['/api/images'] });
      toast({
        title: "Success",
        description: "Image duplicated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to duplicate image",
        variant: "destructive",
      });
    }
  };

  const handleDeleteImage = async (image: ImageFile) => {
    try {
      const response = await fetch(`/api/images/${image.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete image');
      }

      await queryClient.invalidateQueries({ queryKey: ['/api/images'] });
      toast({
        title: "Success",
        description: "Image deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete image",
        variant: "destructive",
      });
    }
  };

  const handleDownloadImage = (image: ImageFile) => {
    const link = document.createElement('a');
    link.href = getImageUrl(image);
    link.download = image.originalName || image.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateCollageFile = async () => {
    try {
      // Create a canvas to combine images
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size based on layout
      const collageSize = 800;
      canvas.width = collageSize;
      canvas.height = collageSize;

      // Calculate grid dimensions
      const imageCount = selectedImages.length;
      const cols = Math.ceil(Math.sqrt(imageCount));
      const rows = Math.ceil(imageCount / cols);
      const cellWidth = collageSize / cols;
      const cellHeight = collageSize / rows;

      // Load and draw each image
      const loadImagePromises = selectedImages.map((image, index) => {
        return new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const x = col * cellWidth;
            const y = row * cellHeight;

            // Draw image to fit cell
            ctx.drawImage(img, x, y, cellWidth, cellHeight);
            resolve();
          };
          img.onerror = reject;
          img.src = getImageUrl(image);
        });
      });

      await Promise.all(loadImagePromises);

      // Convert canvas to blob and upload
      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const file = new File([blob], `collage-${Date.now()}.png`, { type: 'image/png' });
        uploadMutation.mutate([file]);
        setIsCollageOpen(false);
        clearSelection();
        
        toast({
          title: "Success",
          description: "Collage created and uploaded successfully",
        });
      }, 'image/png');

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create collage",
        variant: "destructive",
      });
    }
  };

  const getImageUrl = (image: ImageFile) => {
    // Always use the URL from the backend response which includes correct organization path
    if (image.url) {
      return image.url;
    }
    
    // Enhanced fallback - try to construct organization-based path from filename
    if (image.filename && user?.organizationId) {
      // If filename contains gallery prefix, use organization-based path
      if (image.filename.includes('gallery-')) {
        console.warn('Image missing URL property, constructing organization path');
        return `/uploads/org-${user.organizationId}/image_gallery/${image.filename}`;
      }
      // If it's a generic filename, try the standard path
      return `/uploads/${image.filename}`;
    }
    
    // Last resort fallback
    console.error('Image missing both URL and filename properties, or user not loaded');
    return '';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Image Gallery</h1>
          <p className="text-muted-foreground">View and annotate project images</p>
        </div>
        <div className="flex gap-2">
          {selectionMode && (
            <>
              <Button 
                onClick={selectAllVisible}
                variant="outline"
                size="sm"
              >
                Select All ({filteredImages.length})
              </Button>
              <Button 
                onClick={clearSelection}
                variant="outline"
                size="sm"
              >
                Clear ({selectedImages.length})
              </Button>
              <Button 
                onClick={handleShareSelected}
                disabled={selectedImages.length === 0}
                size="sm"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share Selected ({selectedImages.length})
              </Button>
              <Button 
                onClick={handleCreateCollage}
                disabled={selectedImages.length < 2}
                size="sm"
                variant="outline"
              >
                <Layers className="h-4 w-4 mr-2" />
                Create Collage ({selectedImages.length})
              </Button>
            </>
          )}
          {!selectionMode && (
            <Button 
              onClick={() => setSelectionMode(true)}
              variant="outline"
            >
              <CheckSquare className="h-4 w-4 mr-2" />
              Select Photos
            </Button>
          )}
          <Button 
            onClick={() => setIsPhotoEditorOpen(true)}
            variant="outline"
            disabled={filteredImages.length === 0}
          >
            <Palette className="h-4 w-4 mr-2" />
            Photo Editor
          </Button>
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Upload Image
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Upload Images</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="image-upload">Select Images</Label>
                  <Input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    You can select multiple images to upload at once
                  </p>
                </div>
                
                {uploadFiles.length > 0 && (
                  <div className="space-y-2">
                    <Label>Selected Files ({uploadFiles.length})</Label>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {uploadFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                              <Upload className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{file.name}</p>
                              <p className="text-xs text-gray-500">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <Label htmlFor="project-select">Project (optional)</Label>
                  <Select value={uploadProjectId} onValueChange={setUploadProjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      {(projectsQuery.data as any)?.map((project: any) => (
                        <SelectItem key={project.id} value={project.id.toString()}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => {
                    setIsUploadOpen(false);
                    setUploadFiles([]);
                    setUploadProjectId("");
                  }}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleUpload}
                    disabled={uploadFiles.length === 0 || uploadMutation.isPending}
                  >
                    {uploadMutation.isPending ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Uploading...</span>
                      </div>
                    ) : (
                      `Upload ${uploadFiles.length} Image${uploadFiles.length !== 1 ? 's' : ''}`
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search images..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="project-filter">Project:</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {(projectsQuery.data as any)?.map((project: any) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Images Display */}
      {imagesQuery.isLoading ? (
        <div className="text-center py-8">Loading images...</div>
      ) : filteredImages.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No images found. Upload some images to get started.
        </div>
      ) : (
        <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" : "space-y-4"}>
          {filteredImages.map((image: ImageFile) => (
            <Card key={image.id} className={`overflow-hidden ${selectedImages.some(img => img.id === image.id) ? 'ring-2 ring-primary' : ''}`}>
              {viewMode === "grid" ? (
                <div>
                  <div 
                    className="aspect-square relative overflow-hidden group"
                    onMouseEnter={() => setShowEditOptions(image.id)}
                    onMouseLeave={() => setShowEditOptions(null)}
                  >
                    {selectionMode && (
                      <div className="absolute top-2 left-2 z-10">
                        <Button
                          size="sm"
                          variant={selectedImages.some(img => img.id === image.id) ? "default" : "secondary"}
                          className="h-8 w-8 p-0"
                          onClick={() => toggleImageSelection(image)}
                        >
                          {selectedImages.some(img => img.id === image.id) ? (
                            <CheckSquare className="h-4 w-4" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    )}
                    
                    {/* Edit Options Overlay */}
                    {!selectionMode && showEditOptions === image.id && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-2 z-10">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-8 w-8 p-0"
                          onClick={() => handleEditImage(image)}
                          title="Edit Image"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-8 w-8 p-0"
                          onClick={() => handleAnnotate(image)}
                          title="Annotate"
                        >
                          <Palette className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-8 w-8 p-0"
                          onClick={() => handleDuplicateImage(image)}
                          title="Duplicate"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-8 w-8 p-0"
                          onClick={() => handleDownloadImage(image)}
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-8 w-8 p-0"
                          onClick={() => handleDeleteImage(image)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    
                    <img
                      src={getImageUrl(image)}
                      alt={image.originalName}
                      className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                      onClick={() => selectionMode ? toggleImageSelection(image) : handleAnnotate(image)}
                    />
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-medium truncate mb-2">{image.originalName}</h3>
                    <div className="space-y-2">
                      {image.projectName && (
                        <Badge variant="secondary" className="text-xs">
                          {image.projectName}
                        </Badge>
                      )}
                      <div className="flex justify-between items-center text-sm text-muted-foreground">
                        <span>{(image.size / 1024).toFixed(1)} KB</span>
                        <span>{image.uploadDate ? new Date(image.uploadDate).toLocaleDateString() : 'No date'}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleAnnotate(image)}>
                          Annotate
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <a href={getImageUrl(image)} download={image.originalName}>
                            <Download className="h-3 w-3" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </div>
              ) : (
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded overflow-hidden flex-shrink-0">
                      <img
                        src={getImageUrl(image)}
                        alt={image.originalName}
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => handleAnnotate(image)}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{image.originalName}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {image.projectName && (
                          <Badge variant="secondary" className="text-xs">
                            {image.projectName}
                          </Badge>
                        )}
                        <span className="text-sm text-muted-foreground">
                          {(image.size / 1024).toFixed(1)} KB
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {image.uploadDate ? new Date(image.uploadDate).toLocaleDateString() : 'No date'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleAnnotate(image)}>
                        Annotate
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <a href={getImageUrl(image)} download={image.originalName}>
                          <Download className="h-3 w-3" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Annotation Dialog */}
      <Dialog open={isAnnotationOpen} onOpenChange={setIsAnnotationOpen}>
        <DialogContent className="max-w-7xl w-full h-[95vh] p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>
              Annotate Image: {selectedImage?.originalName}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden p-4">
            {selectedImage && (
              <ImageAnnotation
                imageUrl={getImageUrl(selectedImage)}
                onSave={handleSaveAnnotations}
                initialAnnotations={selectedImage.annotations || []}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Photo Editor */}
      {isPhotoEditorOpen && (
        <PhotoEditor
          images={filteredImages.map(img => ({
            id: img.id,
            fileName: img.filename,
            filePath: getImageUrl(img),
            originalName: img.originalName
          }))}
          onSave={(editedImageData: string, fileName: string) => {
            // Convert base64 to file and upload
            const byteCharacters = atob(editedImageData.split(',')[1]);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const file = new File([byteArray], fileName, { type: 'image/png' });
            
            const formData = new FormData();
            formData.append('file', file);
            
            uploadMutation.mutate([file]);
            setIsPhotoEditorOpen(false);
          }}
          onClose={() => setIsPhotoEditorOpen(false)}
        />
      )}

      {/* Collage Creation Dialog */}
      <Dialog open={isCollageOpen} onOpenChange={setIsCollageOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Create Collage</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
              {selectedImages.map((image, index) => (
                <div key={image.id} className="relative">
                  <img
                    src={getImageUrl(image)}
                    alt={image.originalName}
                    className="w-full h-24 object-cover rounded"
                  />
                  <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs">
                    {index + 1}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="space-y-3">
              <Label>Collage Layout</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Button variant="outline" className="h-16">
                  <div className="text-xs">Grid 2x2</div>
                </Button>
                <Button variant="outline" className="h-16">
                  <div className="text-xs">Grid 3x3</div>
                </Button>
                <Button variant="outline" className="h-16">
                  <div className="text-xs">Horizontal</div>
                </Button>
                <Button variant="outline" className="h-16">
                  <div className="text-xs">Vertical</div>
                </Button>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCollageOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateCollageFile}>
                <ImageIcon className="h-4 w-4 mr-2" />
                Create Collage
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Photos Dialog */}
      <SharePhotosDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        projectId={selectedImages.length > 0 && selectedImages[0].projectId ? selectedImages[0].projectId : 0}
        selectedImages={selectedImages.map(img => ({
          ...img,
          url: getImageUrl(img)
        }))}
        projectName={getProjectNameForSharing()}
        onSuccess={() => {
          clearSelection();
          toast({
            title: "Success",
            description: "Shareable link created successfully",
          });
        }}
      />
    </div>
  );
}