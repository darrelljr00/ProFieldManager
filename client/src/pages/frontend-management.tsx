import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Save, X, Eye, Settings, Layout, Image, FileText, Globe, Sliders, Box, Palette, Monitor, Smartphone, Tablet } from "lucide-react";

interface FrontendPage {
  id: number;
  title: string;
  slug: string;
  description?: string;
  content?: string;
  metaTitle?: string;
  metaDescription?: string;
  sortOrder: number;
  isPublished: boolean;
  template: string;
  featuredImage?: string;
  customCss?: string;
  customJs?: string;
  createdAt: string;
  updatedAt: string;
}

interface FrontendSlider {
  id: number;
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  videoUrl?: string;
  buttonText?: string;
  buttonLink?: string;
  backgroundColor: string;
  textColor: string;
  sortOrder: number;
  isActive: boolean;
  animationType: string;
  displayDuration: number;
  autoAdvance: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FrontendIcon {
  id: number;
  name: string;
  description?: string;
  iconType: string;
  iconData?: string;
  svgData?: string;
  imageUrl?: string;
  category: string;
  tags?: string;
  createdAt: string;
  updatedAt: string;
}

interface FrontendBox {
  id: number;
  title: string;
  description?: string;
  link?: string;
  iconId?: number;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  hoverColor: string;
  position: string;
  sortOrder: number;
  isVisible: boolean;
  animationEffect: string;
  customCss?: string;
  iconName?: string;
  iconType?: string;
  iconData?: string;
  createdAt: string;
  updatedAt: string;
}

export default function FrontendManagement() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("pages");
  const [editingPage, setEditingPage] = useState<FrontendPage | null>(null);
  const [editingSlider, setEditingSlider] = useState<FrontendSlider | null>(null);
  const [editingIcon, setEditingIcon] = useState<FrontendIcon | null>(null);
  const [editingBox, setEditingBox] = useState<FrontendBox | null>(null);
  const [showPageDialog, setShowPageDialog] = useState(false);
  const [showSliderDialog, setShowSliderDialog] = useState(false);
  const [showIconDialog, setShowIconDialog] = useState(false);
  const [showBoxDialog, setShowBoxDialog] = useState(false);

  // Fetch data
  const { data: pages = [] } = useQuery({
    queryKey: ['/api/frontend/pages'],
    enabled: activeTab === 'pages'
  });

  const { data: sliders = [] } = useQuery({
    queryKey: ['/api/frontend/sliders'],
    enabled: activeTab === 'sliders'
  });

  const { data: icons = [] } = useQuery({
    queryKey: ['/api/frontend/icons'],
    enabled: activeTab === 'icons'
  });

  const { data: boxes = [] } = useQuery({
    queryKey: ['/api/frontend/boxes'],
    enabled: activeTab === 'boxes'
  });

  // Page mutations
  const createPageMutation = useMutation({
    mutationFn: (data: Partial<FrontendPage>) => apiRequest('POST', '/api/frontend/pages', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/frontend/pages'] });
      setShowPageDialog(false);
      setEditingPage(null);
      toast({ title: "Success", description: "Page created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create page", variant: "destructive" });
    }
  });

  const updatePageMutation = useMutation({
    mutationFn: ({ id, ...data }: Partial<FrontendPage> & { id: number }) => 
      apiRequest('PUT', `/api/frontend/pages/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/frontend/pages'] });
      setShowPageDialog(false);
      setEditingPage(null);
      toast({ title: "Success", description: "Page updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update page", variant: "destructive" });
    }
  });

  const deletePageMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/frontend/pages/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/frontend/pages'] });
      toast({ title: "Success", description: "Page deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete page", variant: "destructive" });
    }
  });

  // Slider mutations
  const createSliderMutation = useMutation({
    mutationFn: (data: Partial<FrontendSlider>) => apiRequest('POST', '/api/frontend/sliders', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/frontend/sliders'] });
      setShowSliderDialog(false);
      setEditingSlider(null);
      toast({ title: "Success", description: "Slider created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create slider", variant: "destructive" });
    }
  });

  const updateSliderMutation = useMutation({
    mutationFn: ({ id, ...data }: Partial<FrontendSlider> & { id: number }) => 
      apiRequest('PUT', `/api/frontend/sliders/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/frontend/sliders'] });
      setShowSliderDialog(false);
      setEditingSlider(null);
      toast({ title: "Success", description: "Slider updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update slider", variant: "destructive" });
    }
  });

  const deleteSliderMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/frontend/sliders/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/frontend/sliders'] });
      toast({ title: "Success", description: "Slider deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete slider", variant: "destructive" });
    }
  });

  // Icon mutations
  const createIconMutation = useMutation({
    mutationFn: (data: Partial<FrontendIcon>) => apiRequest('POST', '/api/frontend/icons', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/frontend/icons'] });
      setShowIconDialog(false);
      setEditingIcon(null);
      toast({ title: "Success", description: "Icon created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create icon", variant: "destructive" });
    }
  });

  const updateIconMutation = useMutation({
    mutationFn: ({ id, ...data }: Partial<FrontendIcon> & { id: number }) => 
      apiRequest('PUT', `/api/frontend/icons/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/frontend/icons'] });
      setShowIconDialog(false);
      setEditingIcon(null);
      toast({ title: "Success", description: "Icon updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update icon", variant: "destructive" });
    }
  });

  const deleteIconMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/frontend/icons/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/frontend/icons'] });
      toast({ title: "Success", description: "Icon deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete icon", variant: "destructive" });
    }
  });

  // Box mutations
  const createBoxMutation = useMutation({
    mutationFn: (data: Partial<FrontendBox>) => apiRequest('POST', '/api/frontend/boxes', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/frontend/boxes'] });
      setShowBoxDialog(false);
      setEditingBox(null);
      toast({ title: "Success", description: "Box created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create box", variant: "destructive" });
    }
  });

  const updateBoxMutation = useMutation({
    mutationFn: ({ id, ...data }: Partial<FrontendBox> & { id: number }) => 
      apiRequest('PUT', `/api/frontend/boxes/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/frontend/boxes'] });
      setShowBoxDialog(false);
      setEditingBox(null);
      toast({ title: "Success", description: "Box updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update box", variant: "destructive" });
    }
  });

  const deleteBoxMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/frontend/boxes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/frontend/boxes'] });
      toast({ title: "Success", description: "Box deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete box", variant: "destructive" });
    }
  });

  const handleSavePage = (data: any) => {
    if (editingPage) {
      updatePageMutation.mutate({ ...data, id: editingPage.id });
    } else {
      createPageMutation.mutate(data);
    }
  };

  const handleSaveSlider = (data: any) => {
    if (editingSlider) {
      updateSliderMutation.mutate({ ...data, id: editingSlider.id });
    } else {
      createSliderMutation.mutate(data);
    }
  };

  const handleSaveIcon = (data: any) => {
    if (editingIcon) {
      updateIconMutation.mutate({ ...data, id: editingIcon.id });
    } else {
      createIconMutation.mutate(data);
    }
  };

  const handleSaveBox = (data: any) => {
    if (editingBox) {
      updateBoxMutation.mutate({ ...data, id: editingBox.id });
    } else {
      createBoxMutation.mutate(data);
    }
  };

  const openEditPage = (page?: FrontendPage) => {
    setEditingPage(page || null);
    setShowPageDialog(true);
  };

  const openEditSlider = (slider?: FrontendSlider) => {
    setEditingSlider(slider || null);
    setShowSliderDialog(true);
  };

  const openEditIcon = (icon?: FrontendIcon) => {
    setEditingIcon(icon || null);
    setShowIconDialog(true);
  };

  const openEditBox = (box?: FrontendBox) => {
    setEditingBox(box || null);
    setShowBoxDialog(true);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Frontend Management</h1>
          <p className="text-muted-foreground">
            Manage your website's frontend content, pages, and components
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Monitor className="h-5 w-5" />
          <Smartphone className="h-5 w-5" />
          <Tablet className="h-5 w-5" />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pages" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Pages</span>
          </TabsTrigger>
          <TabsTrigger value="sliders" className="flex items-center space-x-2">
            <Sliders className="h-4 w-4" />
            <span>Sliders</span>
          </TabsTrigger>
          <TabsTrigger value="icons" className="flex items-center space-x-2">
            <Image className="h-4 w-4" />
            <span>Icons</span>
          </TabsTrigger>
          <TabsTrigger value="boxes" className="flex items-center space-x-2">
            <Box className="h-4 w-4" />
            <span>Boxes</span>
          </TabsTrigger>
        </TabsList>

        {/* Pages Tab */}
        <TabsContent value="pages" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Website Pages</h2>
            <Button onClick={() => openEditPage()} className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Add Page</span>
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pages.map((page: FrontendPage) => (
                    <TableRow key={page.id}>
                      <TableCell className="font-medium">{page.title}</TableCell>
                      <TableCell>
                        <code className="bg-muted px-2 py-1 rounded text-sm">/{page.slug}</code>
                      </TableCell>
                      <TableCell>{page.template}</TableCell>
                      <TableCell>
                        <Badge variant={page.isPublished ? "default" : "secondary"}>
                          {page.isPublished ? "Published" : "Draft"}
                        </Badge>
                      </TableCell>
                      <TableCell>{page.sortOrder}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditPage(page)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deletePageMutation.mutate(page.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sliders Tab */}
        <TabsContent value="sliders" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Homepage Sliders</h2>
            <Button onClick={() => openEditSlider()} className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Add Slider</span>
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Subtitle</TableHead>
                    <TableHead>Animation</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sliders.map((slider: FrontendSlider) => (
                    <TableRow key={slider.id}>
                      <TableCell className="font-medium">{slider.title}</TableCell>
                      <TableCell>{slider.subtitle}</TableCell>
                      <TableCell>{slider.animationType}</TableCell>
                      <TableCell>{slider.displayDuration}ms</TableCell>
                      <TableCell>
                        <Badge variant={slider.isActive ? "default" : "secondary"}>
                          {slider.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>{slider.sortOrder}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditSlider(slider)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteSliderMutation.mutate(slider.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Icons Tab */}
        <TabsContent value="icons" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Icon Library</h2>
            <Button onClick={() => openEditIcon()} className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Add Icon</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {icons.map((icon: FrontendIcon) => (
              <Card key={icon.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{icon.name}</CardTitle>
                    <Badge variant="outline">{icon.category}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-center h-16 bg-muted rounded">
                    {icon.iconType === 'lucide' && icon.iconData && (
                      <div className="h-8 w-8" />
                    )}
                    {icon.imageUrl && (
                      <img src={icon.imageUrl} alt={icon.name} className="h-8 w-8" />
                    )}
                  </div>
                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditIcon(icon)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteIconMutation.mutate(icon.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Boxes Tab */}
        <TabsContent value="boxes" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Homepage Boxes</h2>
            <Button onClick={() => openEditBox()} className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Add Box</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {boxes.map((box: FrontendBox) => (
              <Card 
                key={box.id} 
                className="hover:shadow-md transition-shadow"
                style={{ 
                  backgroundColor: box.backgroundColor,
                  color: box.textColor,
                  borderColor: box.borderColor 
                }}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{box.title}</CardTitle>
                    <Badge variant={box.isVisible ? "default" : "secondary"}>
                      {box.isVisible ? "Visible" : "Hidden"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm opacity-80">{box.description}</p>
                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditBox(box)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteBoxMutation.mutate(box.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Page Dialog */}
      <PageDialog
        open={showPageDialog}
        onOpenChange={setShowPageDialog}
        page={editingPage}
        onSave={handleSavePage}
      />

      {/* Slider Dialog */}
      <SliderDialog
        open={showSliderDialog}
        onOpenChange={setShowSliderDialog}
        slider={editingSlider}
        onSave={handleSaveSlider}
      />

      {/* Icon Dialog */}
      <IconDialog
        open={showIconDialog}
        onOpenChange={setShowIconDialog}
        icon={editingIcon}
        onSave={handleSaveIcon}
      />

      {/* Box Dialog */}
      <BoxDialog
        open={showBoxDialog}
        onOpenChange={setShowBoxDialog}
        box={editingBox}
        onSave={handleSaveBox}
      />
    </div>
  );
}

// Page Dialog Component
function PageDialog({ 
  open, 
  onOpenChange, 
  page, 
  onSave 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  page: FrontendPage | null; 
  onSave: (data: any) => void; 
}) {
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    content: '',
    metaTitle: '',
    metaDescription: '',
    sortOrder: 0,
    isPublished: true,
    template: 'default',
    featuredImage: '',
    customCss: '',
    customJs: ''
  });

  useState(() => {
    if (page) {
      setFormData({
        title: page.title || '',
        slug: page.slug || '',
        description: page.description || '',
        content: page.content || '',
        metaTitle: page.metaTitle || '',
        metaDescription: page.metaDescription || '',
        sortOrder: page.sortOrder || 0,
        isPublished: page.isPublished ?? true,
        template: page.template || 'default',
        featuredImage: page.featuredImage || '',
        customCss: page.customCss || '',
        customJs: page.customJs || ''
      });
    } else {
      setFormData({
        title: '',
        slug: '',
        description: '',
        content: '',
        metaTitle: '',
        metaDescription: '',
        sortOrder: 0,
        isPublished: true,
        template: 'default',
        featuredImage: '',
        customCss: '',
        customJs: ''
      });
    }
  }, [page]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{page ? 'Edit Page' : 'Create Page'}</DialogTitle>
          <DialogDescription>
            {page ? 'Update page details and content' : 'Create a new page for your website'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={6}
              placeholder="HTML content for the page"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="metaTitle">Meta Title</Label>
              <Input
                id="metaTitle"
                value={formData.metaTitle}
                onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template">Template</Label>
              <Select value={formData.template} onValueChange={(value) => setFormData({ ...formData, template: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="landing">Landing Page</SelectItem>
                  <SelectItem value="blog">Blog Post</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="metaDescription">Meta Description</Label>
            <Textarea
              id="metaDescription"
              value={formData.metaDescription}
              onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input
                id="sortOrder"
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.isPublished}
                onCheckedChange={(checked) => setFormData({ ...formData, isPublished: checked })}
              />
              <Label>Published</Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {page ? 'Update' : 'Create'} Page
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Slider Dialog Component
function SliderDialog({ 
  open, 
  onOpenChange, 
  slider, 
  onSave 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  slider: FrontendSlider | null; 
  onSave: (data: any) => void; 
}) {
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    description: '',
    imageUrl: '',
    videoUrl: '',
    buttonText: '',
    buttonLink: '',
    backgroundColor: '#ffffff',
    textColor: '#000000',
    sortOrder: 0,
    isActive: true,
    animationType: 'fade',
    displayDuration: 5000,
    autoAdvance: true
  });

  useState(() => {
    if (slider) {
      setFormData({
        title: slider.title || '',
        subtitle: slider.subtitle || '',
        description: slider.description || '',
        imageUrl: slider.imageUrl || '',
        videoUrl: slider.videoUrl || '',
        buttonText: slider.buttonText || '',
        buttonLink: slider.buttonLink || '',
        backgroundColor: slider.backgroundColor || '#ffffff',
        textColor: slider.textColor || '#000000',
        sortOrder: slider.sortOrder || 0,
        isActive: slider.isActive ?? true,
        animationType: slider.animationType || 'fade',
        displayDuration: slider.displayDuration || 5000,
        autoAdvance: slider.autoAdvance ?? true
      });
    } else {
      setFormData({
        title: '',
        subtitle: '',
        description: '',
        imageUrl: '',
        videoUrl: '',
        buttonText: '',
        buttonLink: '',
        backgroundColor: '#ffffff',
        textColor: '#000000',
        sortOrder: 0,
        isActive: true,
        animationType: 'fade',
        displayDuration: 5000,
        autoAdvance: true
      });
    }
  }, [slider]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{slider ? 'Edit Slider' : 'Create Slider'}</DialogTitle>
          <DialogDescription>
            {slider ? 'Update slider details and settings' : 'Create a new homepage slider'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subtitle">Subtitle</Label>
              <Input
                id="subtitle"
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input
                id="imageUrl"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="videoUrl">Video URL</Label>
              <Input
                id="videoUrl"
                value={formData.videoUrl}
                onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="buttonText">Button Text</Label>
              <Input
                id="buttonText"
                value={formData.buttonText}
                onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="buttonLink">Button Link</Label>
              <Input
                id="buttonLink"
                value={formData.buttonLink}
                onChange={(e) => setFormData({ ...formData, buttonLink: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="backgroundColor">Background Color</Label>
              <Input
                id="backgroundColor"
                type="color"
                value={formData.backgroundColor}
                onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="textColor">Text Color</Label>
              <Input
                id="textColor"
                type="color"
                value={formData.textColor}
                onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="animationType">Animation</Label>
              <Select value={formData.animationType} onValueChange={(value) => setFormData({ ...formData, animationType: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fade">Fade</SelectItem>
                  <SelectItem value="slide">Slide</SelectItem>
                  <SelectItem value="zoom">Zoom</SelectItem>
                  <SelectItem value="flip">Flip</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayDuration">Duration (ms)</Label>
              <Input
                id="displayDuration"
                type="number"
                value={formData.displayDuration}
                onChange={(e) => setFormData({ ...formData, displayDuration: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input
                id="sortOrder"
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label>Active</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.autoAdvance}
                onCheckedChange={(checked) => setFormData({ ...formData, autoAdvance: checked })}
              />
              <Label>Auto Advance</Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {slider ? 'Update' : 'Create'} Slider
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Icon Dialog Component
function IconDialog({ 
  open, 
  onOpenChange, 
  icon, 
  onSave 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  icon: FrontendIcon | null; 
  onSave: (data: any) => void; 
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    iconType: 'lucide',
    iconData: '',
    svgData: '',
    imageUrl: '',
    category: 'general',
    tags: ''
  });

  useState(() => {
    if (icon) {
      setFormData({
        name: icon.name || '',
        description: icon.description || '',
        iconType: icon.iconType || 'lucide',
        iconData: icon.iconData || '',
        svgData: icon.svgData || '',
        imageUrl: icon.imageUrl || '',
        category: icon.category || 'general',
        tags: icon.tags || ''
      });
    } else {
      setFormData({
        name: '',
        description: '',
        iconType: 'lucide',
        iconData: '',
        svgData: '',
        imageUrl: '',
        category: 'general',
        tags: ''
      });
    }
  }, [icon]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{icon ? 'Edit Icon' : 'Create Icon'}</DialogTitle>
          <DialogDescription>
            {icon ? 'Update icon details' : 'Add a new icon to the library'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="technology">Technology</SelectItem>
                  <SelectItem value="ui">UI/UX</SelectItem>
                  <SelectItem value="navigation">Navigation</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="iconType">Icon Type</Label>
            <Select value={formData.iconType} onValueChange={(value) => setFormData({ ...formData, iconType: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lucide">Lucide Icon</SelectItem>
                <SelectItem value="svg">Custom SVG</SelectItem>
                <SelectItem value="image">Image URL</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.iconType === 'lucide' && (
            <div className="space-y-2">
              <Label htmlFor="iconData">Lucide Icon Name</Label>
              <Input
                id="iconData"
                value={formData.iconData}
                onChange={(e) => setFormData({ ...formData, iconData: e.target.value })}
                placeholder="e.g., home, settings, user"
              />
            </div>
          )}

          {formData.iconType === 'svg' && (
            <div className="space-y-2">
              <Label htmlFor="svgData">SVG Code</Label>
              <Textarea
                id="svgData"
                value={formData.svgData}
                onChange={(e) => setFormData({ ...formData, svgData: e.target.value })}
                rows={4}
                placeholder="<svg>...</svg>"
              />
            </div>
          )}

          {formData.iconType === 'image' && (
            <div className="space-y-2">
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input
                id="imageUrl"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="tag1, tag2, tag3"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {icon ? 'Update' : 'Create'} Icon
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Box Dialog Component
function BoxDialog({ 
  open, 
  onOpenChange, 
  box, 
  onSave 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  box: FrontendBox | null; 
  onSave: (data: any) => void; 
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    link: '',
    iconId: undefined as number | undefined,
    backgroundColor: '#ffffff',
    textColor: '#000000',
    borderColor: '#e2e8f0',
    hoverColor: '#f8fafc',
    position: 'static',
    sortOrder: 0,
    isVisible: true,
    animationEffect: 'none',
    customCss: ''
  });

  const { data: icons = [] } = useQuery({
    queryKey: ['/api/frontend/icons']
  });

  useState(() => {
    if (box) {
      setFormData({
        title: box.title || '',
        description: box.description || '',
        link: box.link || '',
        iconId: box.iconId,
        backgroundColor: box.backgroundColor || '#ffffff',
        textColor: box.textColor || '#000000',
        borderColor: box.borderColor || '#e2e8f0',
        hoverColor: box.hoverColor || '#f8fafc',
        position: box.position || 'static',
        sortOrder: box.sortOrder || 0,
        isVisible: box.isVisible ?? true,
        animationEffect: box.animationEffect || 'none',
        customCss: box.customCss || ''
      });
    } else {
      setFormData({
        title: '',
        description: '',
        link: '',
        iconId: undefined,
        backgroundColor: '#ffffff',
        textColor: '#000000',
        borderColor: '#e2e8f0',
        hoverColor: '#f8fafc',
        position: 'static',
        sortOrder: 0,
        isVisible: true,
        animationEffect: 'none',
        customCss: ''
      });
    }
  }, [box]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{box ? 'Edit Box' : 'Create Box'}</DialogTitle>
          <DialogDescription>
            {box ? 'Update box details and styling' : 'Create a new homepage box'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link">Link URL</Label>
              <Input
                id="link"
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="iconId">Icon</Label>
            <Select value={formData.iconId?.toString()} onValueChange={(value) => setFormData({ ...formData, iconId: value ? Number(value) : undefined })}>
              <SelectTrigger>
                <SelectValue placeholder="Select an icon" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No Icon</SelectItem>
                {icons.map((icon: FrontendIcon) => (
                  <SelectItem key={icon.id} value={icon.id.toString()}>
                    {icon.name} ({icon.category})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="backgroundColor">Background Color</Label>
              <Input
                id="backgroundColor"
                type="color"
                value={formData.backgroundColor}
                onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="textColor">Text Color</Label>
              <Input
                id="textColor"
                type="color"
                value={formData.textColor}
                onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="borderColor">Border Color</Label>
              <Input
                id="borderColor"
                type="color"
                value={formData.borderColor}
                onChange={(e) => setFormData({ ...formData, borderColor: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hoverColor">Hover Color</Label>
              <Input
                id="hoverColor"
                type="color"
                value={formData.hoverColor}
                onChange={(e) => setFormData({ ...formData, hoverColor: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Select value={formData.position} onValueChange={(value) => setFormData({ ...formData, position: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="static">Static</SelectItem>
                  <SelectItem value="fixed">Fixed</SelectItem>
                  <SelectItem value="absolute">Absolute</SelectItem>
                  <SelectItem value="relative">Relative</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="animationEffect">Animation</Label>
              <Select value={formData.animationEffect} onValueChange={(value) => setFormData({ ...formData, animationEffect: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="fade">Fade In</SelectItem>
                  <SelectItem value="slide">Slide In</SelectItem>
                  <SelectItem value="bounce">Bounce</SelectItem>
                  <SelectItem value="zoom">Zoom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input
                id="sortOrder"
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.isVisible}
              onCheckedChange={(checked) => setFormData({ ...formData, isVisible: checked })}
            />
            <Label>Visible</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customCss">Custom CSS</Label>
            <Textarea
              id="customCss"
              value={formData.customCss}
              onChange={(e) => setFormData({ ...formData, customCss: e.target.value })}
              rows={4}
              placeholder="Additional CSS styles..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {box ? 'Update' : 'Create'} Box
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}