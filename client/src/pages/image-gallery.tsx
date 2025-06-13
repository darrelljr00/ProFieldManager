import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Upload, 
  Image as ImageIcon, 
  Filter, 
  Grid3X3, 
  List,
  Search,
  Edit3,
  Download,
  Trash2,
  Palette
} from "lucide-react";
import { ImageAnnotation } from "@/components/image-annotation";
import { PhotoEditor } from "@/components/photo-editor";

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
}

export default function ImageGallery() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedImage, setSelectedImage] = useState<ImageFile | null>(null);
  const [isAnnotationOpen, setIsAnnotationOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProjectId, setUploadProjectId] = useState<string>("");
  const [isPhotoEditorOpen, setIsPhotoEditorOpen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch images
  const { data: images = [], isLoading: imagesLoading } = useQuery<ImageFile[]>({
    queryKey: ["/api/images"],
  });

  // Fetch projects for filtering
  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: data,
        credentials: "include",
      });
      if (!response.ok) throw new Error("Upload failed");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/images"] });
      setIsUploadOpen(false);
      setUploadFile(null);
      setUploadProjectId("");
      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload image",
        variant: "destructive",
      });
    },
  });

  // Save annotations mutation
  const saveAnnotationsMutation = useMutation({
    mutationFn: ({ imageId, annotations, annotatedImageUrl }: { 
      imageId: number; 
      annotations: any[]; 
      annotatedImageUrl: string 
    }) =>
      apiRequest("/api/images/annotations", "POST", {
        imageId,
        annotations,
        annotatedImageUrl
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/images"] });
      setIsAnnotationOpen(false);
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

  // Delete image mutation
  const deleteMutation = useMutation({
    mutationFn: (imageId: number) =>
      apiRequest(`/api/images/${imageId}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/images"] });
      toast({
        title: "Success",
        description: "Image deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete image",
        variant: "destructive",
      });
    },
  });

  const filteredImages = images.filter(image => {
    const matchesSearch = image.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         image.projectName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProject = selectedProject === "all" || 
                          (selectedProject === "unassigned" && !image.projectId) ||
                          image.projectId?.toString() === selectedProject;
    return matchesSearch && matchesProject;
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                />
              </div>
              <div>
                <Label htmlFor="project-select">Project (Optional)</Label>
                <Select value={uploadProjectId} onValueChange={setUploadProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Project</SelectItem>
                    {projects.map((project: any) => (
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
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {projects.map((project: any) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-1 border rounded-md">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Images Grid/List */}
      <div className="space-y-4">
        {imagesLoading ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-muted-foreground">Loading images...</p>
          </div>
        ) : filteredImages.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                {searchTerm || selectedProject !== "all" ? "No images match your filters" : "No images uploaded yet"}
              </p>
              <Button onClick={() => setIsUploadOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload your first image
              </Button>
            </CardContent>
          </Card>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredImages.map((image) => (
              <Card key={image.id} className="overflow-hidden">
                <div className="aspect-video relative bg-gray-100">
                  <img
                    src={getImageUrl(image.filename)}
                    alt={image.originalName}
                    className="w-full h-full object-cover"
                  />
                  {image.annotations && image.annotations.length > 0 && (
                    <Badge className="absolute top-2 right-2" variant="secondary">
                      <Edit3 className="h-3 w-3 mr-1" />
                      Annotated
                    </Badge>
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <h3 className="font-medium truncate">{image.originalName}</h3>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{formatFileSize(image.size)}</span>
                      <span>{new Date(image.uploadDate).toLocaleDateString()}</span>
                    </div>
                    {image.projectName && (
                      <Badge variant="outline">{image.projectName}</Badge>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAnnotate(image)}
                        className="flex-1"
                      >
                        <Edit3 className="h-4 w-4 mr-1" />
                        Annotate
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                      >
                        <a href={getImageUrl(image.filename)} download={image.originalName}>
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteMutation.mutate(image.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {filteredImages.map((image) => (
                  <div key={image.id} className="p-4 flex items-center gap-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={getImageUrl(image.filename)}
                        alt={image.originalName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium truncate">{image.originalName}</h3>
                        {image.annotations && image.annotations.length > 0 && (
                          <Badge variant="secondary">
                            <Edit3 className="h-3 w-3 mr-1" />
                            Annotated
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span>{formatFileSize(image.size)}</span>
                        <span>{new Date(image.uploadDate).toLocaleDateString()}</span>
                        {image.projectName && <Badge variant="outline">{image.projectName}</Badge>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAnnotate(image)}
                      >
                        <Edit3 className="h-4 w-4 mr-1" />
                        Annotate
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                      >
                        <a href={getImageUrl(image.filename)} download={image.originalName}>
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteMutation.mutate(image.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

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
    </div>
  );
}