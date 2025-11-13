import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Save, X, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface WebsitePopup {
  id: number;
  title: string;
  message: string;
  ctaText?: string;
  ctaUrl?: string;
  displayPages?: string[];
  displayRules?: any;
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  position?: string;
  animationType?: string;
  isActive: boolean;
  priority: number;
  impressions: number;
  clicks: number;
}

const popupFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  ctaText: z.string().optional(),
  ctaUrl: z.string().optional(),
  displayPages: z.string().optional(),
  backgroundColor: z.string().default("#ffffff"),
  textColor: z.string().default("#000000"),
  borderColor: z.string().optional(),
  position: z.string().default("center"),
  animationType: z.string().default("fade"),
  isActive: z.boolean().default(true),
  priority: z.coerce.number().min(0).default(0),
});

type PopupFormData = z.infer<typeof popupFormSchema>;

export default function PopupManagement() {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: popups, isLoading } = useQuery<WebsitePopup[]>({
    queryKey: ['/api/frontend/popups'],
  });

  const form = useForm<PopupFormData>({
    resolver: zodResolver(popupFormSchema),
    defaultValues: {
      title: "",
      message: "",
      ctaText: "",
      ctaUrl: "",
      displayPages: "",
      backgroundColor: "#ffffff",
      textColor: "#000000",
      borderColor: "#000000",
      position: "center",
      animationType: "fade",
      isActive: true,
      priority: 0,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: PopupFormData) => {
      const payload = {
        ...data,
        displayPages: data.displayPages ? data.displayPages.split(',').map(p => p.trim()) : [],
      };
      const response = await apiRequest('POST', '/api/frontend/popups', payload);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create popup');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/frontend/popups'] });
      toast({ title: "Pop-up created successfully" });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create pop-up", description: error.message, variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: PopupFormData }) => {
      const payload = {
        ...data,
        displayPages: data.displayPages ? data.displayPages.split(',').map(p => p.trim()) : [],
      };
      const response = await apiRequest('PUT', `/api/frontend/popups/${id}`, payload);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update popup');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/frontend/popups'] });
      toast({ title: "Pop-up updated successfully" });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update pop-up", description: error.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/frontend/popups/${id}`);
      if (!response.ok) throw new Error('Failed to delete popup');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/frontend/popups'] });
      toast({ title: "Pop-up deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete pop-up", description: error.message, variant: "destructive" });
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number, isActive: boolean }) => {
      const response = await apiRequest('PATCH', `/api/frontend/popups/${id}/toggle`, { isActive });
      if (!response.ok) throw new Error('Failed to toggle popup');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/frontend/popups'] });
    },
  });

  const onSubmit = (data: PopupFormData) => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (popup: WebsitePopup) => {
    setEditingId(popup.id);
    form.reset({
      title: popup.title,
      message: popup.message,
      ctaText: popup.ctaText || "",
      ctaUrl: popup.ctaUrl || "",
      displayPages: popup.displayPages?.join(', ') || "",
      backgroundColor: popup.backgroundColor || "#ffffff",
      textColor: popup.textColor || "#000000",
      borderColor: popup.borderColor || "#000000",
      position: popup.position || "center",
      animationType: popup.animationType || "fade",
      isActive: popup.isActive,
      priority: popup.priority,
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingId(null);
    form.reset();
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this pop-up?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Pop-up Management</h1>
          <p className="text-muted-foreground">Create and manage promotional pop-ups for your website</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} data-testid="button-create-popup">
          <Plus className="h-4 w-4 mr-2" />
          Create Pop-up
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading pop-ups...</div>
      ) : popups && popups.length > 0 ? (
        <div className="grid gap-4">
          {popups.map((popup) => (
            <Card key={popup.id} data-testid={`card-popup-${popup.id}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {popup.title}
                      {popup.isActive ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                      <Badge variant="outline">Priority: {popup.priority}</Badge>
                    </CardTitle>
                    <CardDescription className="mt-2">{popup.message}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleActiveMutation.mutate({ id: popup.id, isActive: !popup.isActive })}
                      data-testid={`button-toggle-${popup.id}`}
                    >
                      {popup.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(popup)}
                      data-testid={`button-edit-${popup.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(popup.id)}
                      data-testid={`button-delete-${popup.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Position</div>
                    <div className="font-medium">{popup.position}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Animation</div>
                    <div className="font-medium">{popup.animationType}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Impressions</div>
                    <div className="font-medium">{popup.impressions}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Clicks</div>
                    <div className="font-medium">{popup.clicks} ({popup.impressions > 0 ? ((popup.clicks / popup.impressions) * 100).toFixed(1) : 0}%)</div>
                  </div>
                </div>
                {popup.ctaText && (
                  <div className="mt-4 p-3 bg-muted rounded-md">
                    <div className="text-sm font-medium">Call to Action:</div>
                    <div className="text-sm">{popup.ctaText} → {popup.ctaUrl}</div>
                  </div>
                )}
                {popup.displayPages && popup.displayPages.length > 0 && (
                  <div className="mt-2">
                    <div className="text-sm text-muted-foreground">Display on: {popup.displayPages.join(', ')}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No pop-ups created yet. Click "Create Pop-up" to get started.</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Pop-up" : "Create New Pop-up"}</DialogTitle>
            <DialogDescription>
              Configure your promotional pop-up with custom styling and targeting
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Special Offer!" data-testid="input-popup-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Get 20% off your first order!" rows={3} data-testid="input-popup-message" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="ctaText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CTA Button Text (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Learn More" data-testid="input-popup-cta-text" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ctaUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CTA Button URL (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="/promotions" data-testid="input-popup-cta-url" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="displayPages"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Pages (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="/home, /products, /about (comma-separated)" data-testid="input-popup-pages" />
                    </FormControl>
                    <FormDescription>Leave blank to show on all pages</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="backgroundColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Background Color</FormLabel>
                      <FormControl>
                        <Input {...field} type="color" data-testid="input-popup-bg-color" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="textColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Text Color</FormLabel>
                      <FormControl>
                        <Input {...field} type="color" data-testid="input-popup-text-color" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="borderColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Border Color</FormLabel>
                      <FormControl>
                        <Input {...field} type="color" data-testid="input-popup-border-color" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Position</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-popup-position">
                            <SelectValue placeholder="Select position" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="center">Center</SelectItem>
                          <SelectItem value="top">Top</SelectItem>
                          <SelectItem value="bottom">Bottom</SelectItem>
                          <SelectItem value="top-right">Top Right</SelectItem>
                          <SelectItem value="bottom-right">Bottom Right</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="animationType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Animation</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-popup-animation">
                            <SelectValue placeholder="Select animation" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="fade">Fade</SelectItem>
                          <SelectItem value="slide">Slide</SelectItem>
                          <SelectItem value="bounce">Bounce</SelectItem>
                          <SelectItem value="zoom">Zoom</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority (Higher = Shows First)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min="0" data-testid="input-popup-priority" />
                    </FormControl>
                    <FormDescription>When multiple pop-ups are active, higher priority shows first</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active</FormLabel>
                      <FormDescription>
                        Enable this pop-up to display on your website
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-popup-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleCloseDialog} data-testid="button-cancel">
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-popup">
                  <Save className="h-4 w-4 mr-2" />
                  {editingId ? "Update" : "Create"} Pop-up
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
