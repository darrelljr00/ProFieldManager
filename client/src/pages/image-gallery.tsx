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
  Square
} from "lucide-react";
import { ImageAnnotation } from "@/components/image-annotation";
import { PhotoEditor } from "@/components/photo-editor";
import { SharePhotosDialog } from "@/components/share-photos-dialog";
import { MobileCamera } from "@/components/mobile-camera";
import { useToast } from "@/hooks/use-toast";

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
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProjectId, setUploadProjectId] = useState<string>("");
  const [isPhotoEditorOpen, setIsPhotoEditorOpen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const imagesQuery = useQuery({
    queryKey: ['/api/images'],
  });

  const projectsQuery = useQuery({
    queryKey: ['/api/projects'],
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: data,
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/images'] });
      setIsUploadOpen(false);
      setUploadFile(null);
      setUploadProjectId("");
      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to upload image",
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
    if (!uploadFile) return;

    const formData = new FormData();
    formData.append('file', uploadFile);
    if (uploadProjectId) {
      formData.append('projectId', uploadProjectId);
    }

    uploadMutation.mutate(formData);
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

  const getImageUrl = (filename: string) => `/uploads/${filename}`;

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
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload New Image</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="image-upload">Select Image</Label>
                  <Input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setUploadFile(file);
                      }
                    }}
                  />
                </div>
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
                  <Button variant="outline" onClick={() => setIsUploadOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleUpload}
                    disabled={!uploadFile || uploadMutation.isPending}
                  >
                    Upload
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
                  <div className="aspect-square relative overflow-hidden">
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
                    <img
                      src={getImageUrl(image.filename)}
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
                        <span>{new Date(image.uploadDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleAnnotate(image)}>
                          Annotate
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <a href={getImageUrl(image.filename)} download={image.originalName}>
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
                        src={getImageUrl(image.filename)}
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
                          {new Date(image.uploadDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleAnnotate(image)}>
                        Annotate
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <a href={getImageUrl(image.filename)} download={image.originalName}>
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
                imageUrl={getImageUrl(selectedImage.filename)}
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
            filePath: `uploads/${img.filename}`,
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
            
            uploadMutation.mutate(formData);
            setIsPhotoEditorOpen(false);
          }}
          onClose={() => setIsPhotoEditorOpen(false)}
        />
      )}

      {/* Share Photos Dialog */}
      <SharePhotosDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        projectId={selectedImages.length > 0 && selectedImages[0].projectId ? selectedImages[0].projectId : 0}
        selectedImages={selectedImages.map(img => ({
          ...img,
          url: getImageUrl(img.filename)
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