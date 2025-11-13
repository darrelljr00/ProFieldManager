import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, Edit, Trash2, Save, X, Image as ImageIcon,
  ArrowUp, ArrowDown, Eye, EyeOff, Upload, Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import type { FrontendSlider, InsertFrontendSlider } from "@shared/schema";
import { insertFrontendSliderSchema } from "@shared/schema";

// Form schema - includes only user-editable fields with proper coercion
const sliderFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().url("Please enter a valid image URL").min(1, "Image URL is required"),
  buttonText: z.string().optional(),
  buttonLink: z.string().optional(),
  backgroundColor: z.string().optional(),
  textColor: z.string().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().min(0).default(0),
  displayDuration: z.coerce.number().min(1000).max(30000).default(5000),
  animationType: z.string().optional(),
});

type SliderFormData = z.infer<typeof sliderFormSchema>;

export default function SliderManagement() {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMode, setUploadMode] = useState<'url' | 'upload'>('url');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: sliders, isLoading } = useQuery<FrontendSlider[]>({
    queryKey: ['/api/frontend/sliders'],
  });

  const form = useForm<SliderFormData>({
    resolver: zodResolver(sliderFormSchema),
    defaultValues: {
      title: "",
      subtitle: "",
      description: "",
      imageUrl: "",
      buttonText: "Get Started",
      buttonLink: "/features#signup",
      isActive: true,
      sortOrder: 0,
      displayDuration: 5000,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: SliderFormData) => {
      const response = await apiRequest('POST', '/api/frontend/sliders', data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create slider');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/frontend/sliders'] });
      toast({ title: "Slider created successfully" });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create slider", description: error.message, variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: SliderFormData }) => {
      const response = await apiRequest('PUT', `/api/frontend/sliders/${id}`, data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update slider');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/frontend/sliders'] });
      toast({ title: "Slider updated successfully" });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update slider", description: error.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/frontend/sliders/${id}`);
      if (!response.ok) throw new Error('Failed to delete slider');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/frontend/sliders'] });
      toast({ title: "Slider deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete slider", description: error.message, variant: "destructive" });
    }
  });

  const onSubmit = (data: SliderFormData) => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (slider: FrontendSlider) => {
    setEditingId(slider.id);
    form.reset({
      title: slider.title,
      subtitle: slider.subtitle || "",
      description: slider.description || "",
      imageUrl: slider.imageUrl || "",
      buttonText: slider.buttonText || "Get Started",
      buttonLink: slider.buttonLink || "/features#signup",
      isActive: slider.isActive ?? true,
      sortOrder: slider.sortOrder || 0,
      displayDuration: slider.displayDuration || 5000,
    });
    setIsDialogOpen(true);
  };

  const handleNew = () => {
    setEditingId(null);
    form.reset({
      title: "",
      subtitle: "",
      description: "",
      imageUrl: "",
      buttonText: "Get Started",
      buttonLink: "/features#signup",
      isActive: true,
      sortOrder: (sliders?.length || 0) + 1,
      displayDuration: 5000,
    });
    setIsDialogOpen(true);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (JPEG, PNG, or WebP)",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 5MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/frontend/sliders/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }

      const data = await response.json();
      
      // Update the form with the uploaded image URL
      form.setValue('imageUrl', data.imageUrl);

      toast({
        title: "Image uploaded successfully",
        description: `Image uploaded to Cloudinary (${(file.size / 1024).toFixed(0)}KB)`
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload image",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingId(null);
    form.reset();
  };

  const handleReorder = async (id: number, direction: 'up' | 'down') => {
    if (!sliders) return;
    
    const currentIndex = sliders.findIndex(s => s.id === id);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= sliders.length) return;

    const current = sliders[currentIndex];
    const swap = sliders[newIndex];

    // Optimistic update - swap in local array
    const updates = [
      { id: current.id, sortOrder: swap.sortOrder },
      { id: swap.id, sortOrder: current.sortOrder }
    ];

    try {
      await Promise.all(updates.map(({ id, sortOrder }) =>
        apiRequest('PUT', `/api/frontend/sliders/${id}`, { sortOrder })
      ));
      queryClient.invalidateQueries({ queryKey: ['/api/frontend/sliders'] });
    } catch (error) {
      toast({ title: "Failed to reorder slides", variant: "destructive" });
    }
  };

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Hero Slider Management</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Manage the hero slider on your home and features pages
            </p>
          </div>
          <Button onClick={handleNew} data-testid="button-new-slider">
            <Plus className="h-4 w-4 mr-2" />
            Add Slide
          </Button>
        </div>

        <div className="grid gap-6">
          {sliders && sliders.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <ImageIcon className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                <p className="text-slate-600 dark:text-slate-400 mb-4">No slides yet</p>
                <Button onClick={handleNew}>Create Your First Slide</Button>
              </CardContent>
            </Card>
          )}

          {sliders?.map((slider, index) => (
            <Card key={slider.id} data-testid={`card-slider-${slider.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle>{slider.title}</CardTitle>
                      {slider.isActive ? (
                        <Badge variant="default">
                          <Eye className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <EyeOff className="h-3 w-3 mr-1" />
                          Hidden
                        </Badge>
                      )}
                    </div>
                    <CardDescription>{slider.subtitle}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReorder(slider.id, 'up')}
                      disabled={index === 0}
                      data-testid={`button-move-up-${slider.id}`}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReorder(slider.id, 'down')}
                      disabled={index === sliders.length - 1}
                      data-testid={`button-move-down-${slider.id}`}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(slider)}
                      data-testid={`button-edit-${slider.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this slide?')) {
                          deleteMutation.mutate(slider.id);
                        }
                      }}
                      data-testid={`button-delete-${slider.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{slider.description}</p>
                    <div className="flex gap-2 text-xs text-slate-500 dark:text-slate-500">
                      <span>Button: {slider.buttonText}</span>
                      <span>•</span>
                      <span>Duration: {slider.displayDuration}ms</span>
                    </div>
                  </div>
                  {slider.imageUrl && (
                    <div className="relative h-32 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-800">
                      <img 
                        src={slider.imageUrl} 
                        alt={slider.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Slide' : 'Create New Slide'}</DialogTitle>
            <DialogDescription>
              Configure the slide content, appearance, and behavior
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title *</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Professional Field Service Management"
                        data-testid="input-slider-title"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subtitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subtitle</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Streamline Your Operations"
                        data-testid="input-slider-subtitle"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Complete business management solution..."
                        rows={3}
                        data-testid="input-slider-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slider Image *</FormLabel>
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={uploadMode === 'url' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setUploadMode('url')}
                        >
                          Enter URL
                        </Button>
                        <Button
                          type="button"
                          variant={uploadMode === 'upload' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setUploadMode('upload')}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Image
                        </Button>
                      </div>

                      {uploadMode === 'url' ? (
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="https://images.unsplash.com/..."
                            data-testid="input-slider-image"
                          />
                        </FormControl>
                      ) : (
                        <div className="space-y-2">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                          >
                            {isUploading ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="h-4 w-4 mr-2" />
                                Choose Image File
                              </>
                            )}
                          </Button>
                          {field.value && (
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Uploaded image URL will appear here"
                                readOnly
                                className="text-xs"
                              />
                            </FormControl>
                          )}
                        </div>
                      )}

                      {field.value && (
                        <div className="relative h-40 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
                          <img
                            src={field.value}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="buttonText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Button Text</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Get Started"
                          data-testid="input-slider-button-text"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="buttonLink"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Button Link</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="/features#signup"
                          data-testid="input-slider-button-link"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="displayDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Duration (ms)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          data-testid="input-slider-duration"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sortOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sort Order</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          data-testid="input-slider-sort"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-slider-active"
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Active (show on website)</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCloseDialog}
                  data-testid="button-cancel"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-slider"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Slide'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
