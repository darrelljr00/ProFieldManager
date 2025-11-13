import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, Edit, Trash2, Save, X, Image as ImageIcon,
  ArrowUp, ArrowDown, Eye, EyeOff
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { FrontendSlider } from "@shared/schema";

export default function SliderManagement() {
  const [editingSlider, setEditingSlider] = useState<Partial<FrontendSlider> | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: sliders, isLoading } = useQuery<FrontendSlider[]>({
    queryKey: ['/api/frontend/sliders'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<FrontendSlider>) => {
      const response = await apiRequest('POST', '/api/frontend/sliders', data);
      if (!response.ok) throw new Error('Failed to create slider');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/frontend/sliders'] });
      toast({ title: "Slider created successfully" });
      setIsDialogOpen(false);
      setEditingSlider(null);
    },
    onError: () => {
      toast({ title: "Failed to create slider", variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<FrontendSlider> }) => {
      const response = await apiRequest('PUT', `/api/frontend/sliders/${id}`, data);
      if (!response.ok) throw new Error('Failed to update slider');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/frontend/sliders'] });
      toast({ title: "Slider updated successfully" });
      setIsDialogOpen(false);
      setEditingSlider(null);
    },
    onError: () => {
      toast({ title: "Failed to update slider", variant: "destructive" });
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
    onError: () => {
      toast({ title: "Failed to delete slider", variant: "destructive" });
    }
  });

  const handleSave = () => {
    if (!editingSlider) return;

    if (editingSlider.id) {
      updateMutation.mutate({ id: editingSlider.id, data: editingSlider });
    } else {
      createMutation.mutate(editingSlider);
    }
  };

  const handleEdit = (slider: FrontendSlider) => {
    setEditingSlider(slider);
    setIsDialogOpen(true);
  };

  const handleNew = () => {
    setEditingSlider({
      title: "",
      subtitle: "",
      description: "",
      imageUrl: "",
      buttonText: "Get Started",
      buttonLink: "/features#signup",
      backgroundColor: "#1e40af",
      textColor: "#ffffff",
      isActive: true,
      sortOrder: (sliders?.length || 0) + 1,
      displayDuration: 5000,
      animationType: "fade"
    });
    setIsDialogOpen(true);
  };

  const handleReorder = async (id: number, direction: 'up' | 'down') => {
    if (!sliders) return;
    
    const currentIndex = sliders.findIndex(s => s.id === id);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= sliders.length) return;

    const current = sliders[currentIndex];
    const swap = sliders[newIndex];

    await updateMutation.mutateAsync({ 
      id: current.id, 
      data: { sortOrder: swap.sortOrder } 
    });
    await updateMutation.mutateAsync({ 
      id: swap.id, 
      data: { sortOrder: current.sortOrder } 
    });
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
            <DialogTitle>{editingSlider?.id ? 'Edit Slide' : 'Create New Slide'}</DialogTitle>
            <DialogDescription>
              Configure the slide content, appearance, and behavior
            </DialogDescription>
          </DialogHeader>

          {editingSlider && (
            <div className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={editingSlider.title || ''}
                    onChange={(e) => setEditingSlider({ ...editingSlider, title: e.target.value })}
                    placeholder="Professional Field Service Management"
                    data-testid="input-slider-title"
                  />
                </div>

                <div>
                  <Label htmlFor="subtitle">Subtitle</Label>
                  <Input
                    id="subtitle"
                    value={editingSlider.subtitle || ''}
                    onChange={(e) => setEditingSlider({ ...editingSlider, subtitle: e.target.value })}
                    placeholder="Streamline Your Operations"
                    data-testid="input-slider-subtitle"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={editingSlider.description || ''}
                    onChange={(e) => setEditingSlider({ ...editingSlider, description: e.target.value })}
                    placeholder="Complete business management solution..."
                    rows={3}
                    data-testid="input-slider-description"
                  />
                </div>

                <div>
                  <Label htmlFor="imageUrl">Image URL *</Label>
                  <Input
                    id="imageUrl"
                    value={editingSlider.imageUrl || ''}
                    onChange={(e) => setEditingSlider({ ...editingSlider, imageUrl: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    data-testid="input-slider-image"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Use Unsplash or upload to File Manager
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="buttonText">Button Text</Label>
                    <Input
                      id="buttonText"
                      value={editingSlider.buttonText || ''}
                      onChange={(e) => setEditingSlider({ ...editingSlider, buttonText: e.target.value })}
                      placeholder="Get Started"
                      data-testid="input-slider-button-text"
                    />
                  </div>

                  <div>
                    <Label htmlFor="buttonLink">Button Link</Label>
                    <Input
                      id="buttonLink"
                      value={editingSlider.buttonLink || ''}
                      onChange={(e) => setEditingSlider({ ...editingSlider, buttonLink: e.target.value })}
                      placeholder="/features#signup"
                      data-testid="input-slider-button-link"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="displayDuration">Display Duration (ms)</Label>
                    <Input
                      id="displayDuration"
                      type="number"
                      value={editingSlider.displayDuration || 5000}
                      onChange={(e) => setEditingSlider({ ...editingSlider, displayDuration: parseInt(e.target.value) })}
                      min={1000}
                      max={30000}
                      data-testid="input-slider-duration"
                    />
                  </div>

                  <div>
                    <Label htmlFor="sortOrder">Sort Order</Label>
                    <Input
                      id="sortOrder"
                      type="number"
                      value={editingSlider.sortOrder || 0}
                      onChange={(e) => setEditingSlider({ ...editingSlider, sortOrder: parseInt(e.target.value) })}
                      min={0}
                      data-testid="input-slider-sort"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={editingSlider.isActive ?? true}
                    onCheckedChange={(checked) => setEditingSlider({ ...editingSlider, isActive: checked })}
                    data-testid="switch-slider-active"
                  />
                  <Label htmlFor="isActive">Active (show on website)</Label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingSlider(null);
                  }}
                  data-testid="button-cancel"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!editingSlider.title || !editingSlider.imageUrl || createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-slider"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Slide'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
