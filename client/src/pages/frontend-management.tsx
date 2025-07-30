import { useState } from "react";
import React from "react";
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

interface FrontendCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  type: string;
  position: string;
  isActive: boolean;
  sortOrder: number;
  styling?: any;
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
  const [activeTab, setActiveTab] = useState("design");
  const [editingPage, setEditingPage] = useState<FrontendPage | null>(null);
  const [editingSlider, setEditingSlider] = useState<FrontendSlider | null>(null);
  const [editingIcon, setEditingIcon] = useState<FrontendIcon | null>(null);
  const [editingBox, setEditingBox] = useState<FrontendBox | null>(null);
  const [editingCategory, setEditingCategory] = useState<FrontendCategory | null>(null);
  const [showPageDialog, setShowPageDialog] = useState(false);
  const [showSliderDialog, setShowSliderDialog] = useState(false);
  const [showIconDialog, setShowIconDialog] = useState(false);
  const [showBoxDialog, setShowBoxDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [selectedPage, setSelectedPage] = useState<FrontendPage | null>(null);

  // Auto-select home page when pages are loaded
  React.useEffect(() => {
    if (pages.length > 0 && !selectedPage) {
      const homePage = pages.find(p => p.slug === 'home' || p.title.toLowerCase().includes('home'));
      if (homePage) {
        setSelectedPage(homePage);
      } else {
        setSelectedPage(pages[0]); // fallback to first page
      }
    }
  }, [pages, selectedPage]);
  const [draggedComponent, setDraggedComponent] = useState<any>(null);
  const [canvasElements, setCanvasElements] = useState<any[]>([]);
  const [deviceView, setDeviceView] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  // Fetch data
  const { data: pages = [] } = useQuery({
    queryKey: ['/api/frontend/pages'],
    enabled: activeTab === 'pages' || activeTab === 'design'
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

  const { data: categories = [] } = useQuery({
    queryKey: ['/api/frontend/categories'],
    enabled: activeTab === 'categories'
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

  // Category mutations
  const createCategoryMutation = useMutation({
    mutationFn: (data: Partial<FrontendCategory>) => apiRequest('POST', '/api/frontend/categories', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/frontend/categories'] });
      setShowCategoryDialog(false);
      setEditingCategory(null);
      toast({ title: "Success", description: "Category created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create category", variant: "destructive" });
    }
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, ...data }: Partial<FrontendCategory> & { id: number }) => 
      apiRequest('PUT', `/api/frontend/categories/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/frontend/categories'] });
      setShowCategoryDialog(false);
      setEditingCategory(null);
      toast({ title: "Success", description: "Category updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update category", variant: "destructive" });
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/frontend/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/frontend/categories'] });
      toast({ title: "Success", description: "Category deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete category", variant: "destructive" });
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

  const handleSaveCategory = (data: any) => {
    if (editingCategory) {
      updateCategoryMutation.mutate({ ...data, id: editingCategory.id });
    } else {
      createCategoryMutation.mutate(data);
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

  const openEditCategory = (category?: FrontendCategory) => {
    setEditingCategory(category || null);
    setShowCategoryDialog(true);
  };

  // Helper functions for drag and drop
  const getDefaultProps = (type: string) => {
    switch (type) {
      case 'text':
        return { content: 'Sample text content' };
      case 'heading':
        return { content: 'Heading Text', level: 'h2' };
      case 'image':
        return { src: '', alt: 'Image', width: '100%' };
      case 'button':
        return { text: 'Click Me', href: '#' };
      case 'container':
        return { maxWidth: '1200px' };
      case 'hero':
        return { title: 'Hero Title', subtitle: 'Hero Subtitle', image: '' };
      case 'features':
        return { title: 'Features', items: [] };
      default:
        return {};
    }
  };

  const getDefaultStyle = (type: string) => {
    switch (type) {
      case 'text':
        return { fontSize: '16px', color: '#000', padding: '10px' };
      case 'heading':
        return { fontSize: '32px', fontWeight: 'bold', color: '#000', padding: '10px' };
      case 'image':
        return { maxWidth: '100%', height: 'auto' };
      case 'button':
        return { backgroundColor: '#007bff', color: '#fff', padding: '10px 20px', borderRadius: '5px' };
      case 'container':
        return { backgroundColor: '#f8f9fa', padding: '20px', margin: '10px 0' };
      case 'hero':
        return { backgroundColor: '#007bff', color: '#fff', padding: '60px 20px', textAlign: 'center' };
      default:
        return { padding: '10px', margin: '5px' };
    }
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
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="design" className="flex items-center space-x-2">
            <Palette className="h-4 w-4" />
            <span>Design</span>
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center space-x-2">
            <Layout className="h-4 w-4" />
            <span>Categories</span>
          </TabsTrigger>
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

        {/* Design Tab - Drag and Drop Page Builder */}
        <TabsContent value="design" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Visual Page Designer</h2>
            <div className="flex items-center space-x-4">
              {/* Device Preview Controls */}
              <div className="flex items-center space-x-2 border rounded-lg p-1">
                <Button
                  variant={deviceView === 'desktop' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setDeviceView('desktop')}
                >
                  <Monitor className="h-4 w-4" />
                </Button>
                <Button
                  variant={deviceView === 'tablet' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setDeviceView('tablet')}
                >
                  <Tablet className="h-4 w-4" />
                </Button>
                <Button
                  variant={deviceView === 'mobile' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setDeviceView('mobile')}
                >
                  <Smartphone className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Page Selector */}
              <Select value={selectedPage?.id.toString() || ''} onValueChange={(value) => {
                const page = pages.find(p => p.id.toString() === value);
                setSelectedPage(page || null);
              }}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select a page to design" />
                </SelectTrigger>
                <SelectContent>
                  {pages.map((page: FrontendPage) => (
                    <SelectItem key={page.id} value={page.id.toString()}>
                      {page.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6 h-[800px]">
            {/* Component Library Sidebar */}
            <div className="col-span-3 border rounded-lg p-4 space-y-4 overflow-y-auto">
              <h3 className="font-semibold text-lg">Component Library</h3>
              
              {/* Basic Components */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">BASIC ELEMENTS</h4>
                <div className="grid grid-cols-2 gap-2">
                  <DraggableComponent
                    type="text"
                    icon={<FileText className="h-4 w-4" />}
                    label="Text"
                  />
                  <DraggableComponent
                    type="heading"
                    icon={<FileText className="h-4 w-4" />}
                    label="Heading"
                  />
                  <DraggableComponent
                    type="image"
                    icon={<Image className="h-4 w-4" />}
                    label="Image"
                  />
                  <DraggableComponent
                    type="button"
                    icon={<Box className="h-4 w-4" />}
                    label="Button"
                  />
                </div>
              </div>

              {/* Layout Components */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">LAYOUT</h4>
                <div className="grid grid-cols-2 gap-2">
                  <DraggableComponent
                    type="container"
                    icon={<Layout className="h-4 w-4" />}
                    label="Container"
                  />
                  <DraggableComponent
                    type="row"
                    icon={<Layout className="h-4 w-4" />}
                    label="Row"
                  />
                  <DraggableComponent
                    type="column"
                    icon={<Layout className="h-4 w-4" />}
                    label="Column"
                  />
                  <DraggableComponent
                    type="grid"
                    icon={<Layout className="h-4 w-4" />}
                    label="Grid"
                  />
                </div>
              </div>

              {/* Content Components */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">CONTENT</h4>
                <div className="grid grid-cols-1 gap-2">
                  <DraggableComponent
                    type="hero"
                    icon={<Sliders className="h-4 w-4" />}
                    label="Hero Section"
                  />
                  <DraggableComponent
                    type="features"
                    icon={<Box className="h-4 w-4" />}
                    label="Features Grid"
                  />
                  <DraggableComponent
                    type="testimonial"
                    icon={<FileText className="h-4 w-4" />}
                    label="Testimonial"
                  />
                  <DraggableComponent
                    type="pricing"
                    icon={<Box className="h-4 w-4" />}
                    label="Pricing Table"
                  />
                </div>
              </div>
            </div>

            {/* Design Canvas */}
            <div className="col-span-6">
              <DesignCanvas
                deviceView={deviceView}
                selectedPage={selectedPage}
                elements={canvasElements}
                onElementsChange={setCanvasElements}
                onDrop={(component, position) => {
                  const newElement = {
                    id: Date.now(),
                    type: component.type,
                    position,
                    props: getDefaultProps(component.type),
                    style: getDefaultStyle(component.type)
                  };
                  setCanvasElements([...canvasElements, newElement]);
                }}
              />
            </div>

            {/* Properties Panel */}
            <div className="col-span-3 border rounded-lg p-4 space-y-4 overflow-y-auto">
              <h3 className="font-semibold text-lg">Properties</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Element Type</Label>
                  <p className="text-sm text-muted-foreground">Select an element to edit its properties</p>
                </div>

                {/* Style Controls */}
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Background Color</Label>
                    <Input
                      type="color"
                      defaultValue="#ffffff"
                      className="h-8 w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm">Text Color</Label>
                    <Input
                      type="color"
                      defaultValue="#000000"
                      className="h-8 w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Border Radius</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      className="h-8"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Padding</Label>
                    <Input
                      type="number"
                      placeholder="10"
                      className="h-8"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Margin</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      className="h-8"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button className="w-full" size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Content Categories</h2>
            <Button onClick={() => openEditCategory()} className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Add Category</span>
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category: FrontendCategory) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell>
                        <code className="bg-muted px-2 py-1 rounded text-sm">{category.slug}</code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{category.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={category.position === 'header' ? 'default' : 'secondary'}>
                          {category.position}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={category.isActive ? "default" : "secondary"}>
                          {category.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>{category.sortOrder}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditCategory(category)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteCategoryMutation.mutate(category.id)}
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

      {/* Category Dialog */}
      <CategoryDialog
        open={showCategoryDialog}
        onOpenChange={setShowCategoryDialog}
        category={editingCategory}
        onSave={handleSaveCategory}
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

// Category Dialog Component
function CategoryDialog({ 
  open, 
  onOpenChange, 
  category, 
  onSave 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  category: FrontendCategory | null; 
  onSave: (data: any) => void; 
}) {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    type: 'navigation',
    position: 'header',
    isActive: true,
    sortOrder: 0,
    styling: {}
  });

  useState(() => {
    if (category) {
      setFormData({
        name: category.name || '',
        slug: category.slug || '',
        description: category.description || '',
        type: category.type || 'navigation',
        position: category.position || 'header',
        isActive: category.isActive ?? true,
        sortOrder: category.sortOrder || 0,
        styling: category.styling || {}
      });
    } else {
      setFormData({
        name: '',
        slug: '',
        description: '',
        type: 'navigation',
        position: 'header',
        isActive: true,
        sortOrder: 0,
        styling: {}
      });
    }
  }, [category, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{category ? 'Edit' : 'Create'} Category</DialogTitle>
          <DialogDescription>
            {category ? 'Update the category details below.' : 'Add a new content category for organizing header and footer sections.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Category Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Primary Navigation"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="e.g., primary-nav"
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
              rows={2}
              placeholder="Brief description of this category's purpose..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Category Type</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="navigation">Navigation</SelectItem>
                  <SelectItem value="content">Content</SelectItem>
                  <SelectItem value="widget">Widget</SelectItem>
                  <SelectItem value="menu">Menu</SelectItem>
                  <SelectItem value="social">Social Links</SelectItem>
                  <SelectItem value="footer">Footer Links</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Select value={formData.position} onValueChange={(value) => setFormData({ ...formData, position: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="header">Header</SelectItem>
                  <SelectItem value="footer">Footer</SelectItem>
                  <SelectItem value="sidebar">Sidebar</SelectItem>
                  <SelectItem value="main">Main Content</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label>Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {category ? 'Update' : 'Create'} Category
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Draggable Component for the component library
function DraggableComponent({ type, icon, label }: { type: string; icon: React.ReactNode; label: string }) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ type, label }));
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="flex flex-col items-center p-3 border rounded-lg cursor-move hover:bg-accent hover:border-accent-foreground transition-colors"
    >
      {icon}
      <span className="text-xs mt-1 text-center">{label}</span>
    </div>
  );
}

// Design Canvas Component
function DesignCanvas({ 
  deviceView, 
  selectedPage, 
  elements, 
  onElementsChange, 
  onDrop 
}: {
  deviceView: 'desktop' | 'tablet' | 'mobile';
  selectedPage: FrontendPage | null;
  elements: any[];
  onElementsChange: (elements: any[]) => void;
  onDrop: (component: any, position: { x: number; y: number }) => void;
}) {
  const [selectedElement, setSelectedElement] = useState<any>(null);

  const getCanvasStyle = () => {
    switch (deviceView) {
      case 'mobile':
        return { width: '375px', minHeight: '667px' };
      case 'tablet':
        return { width: '768px', minHeight: '1024px' };
      default:
        return { width: '100%', minHeight: '800px' };
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const componentData = JSON.parse(e.dataTransfer.getData('application/json'));
    const rect = e.currentTarget.getBoundingClientRect();
    const position = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    onDrop(componentData, position);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleElementClick = (element: any) => {
    setSelectedElement(element);
  };

  const handleElementMove = (elementId: number, newPosition: { x: number; y: number }) => {
    const updatedElements = elements.map(el => 
      el.id === elementId ? { ...el, position: newPosition } : el
    );
    onElementsChange(updatedElements);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b bg-muted/50">
        <h3 className="font-medium">
          {selectedPage ? `Editing: ${selectedPage.title}` : 'Select a page to design'}
        </h3>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <span>{deviceView.charAt(0).toUpperCase() + deviceView.slice(1)} View</span>
          <span>•</span>
          <span>{elements.length} elements</span>
        </div>
      </div>

      <div 
        className="flex-1 bg-white border rounded-lg mx-auto my-4 overflow-auto relative"
        style={getCanvasStyle()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {!selectedPage ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <Layout className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Select a page to start designing</p>
              <p className="text-sm">Choose a page from the dropdown above to begin</p>
            </div>
          </div>
        ) : (
          <>
            {/* Drop zone indicator */}
            <div className="absolute inset-0 border-2 border-dashed border-transparent hover:border-primary/20 transition-colors pointer-events-none" />
            
            {/* Rendered elements */}
            {elements.map((element) => (
              <CanvasElement
                key={element.id}
                element={element}
                isSelected={selectedElement?.id === element.id}
                onClick={() => handleElementClick(element)}
                onMove={(newPosition) => handleElementMove(element.id, newPosition)}
              />
            ))}

            {/* Empty state for selected page */}
            {elements.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Box className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Drag components here to start building</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Individual Canvas Element Component
function CanvasElement({ 
  element, 
  isSelected, 
  onClick, 
  onMove 
}: {
  element: any;
  isSelected: boolean;
  onClick: () => void;
  onMove: (position: { x: number; y: number }) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - element.position.x,
      y: e.clientY - element.position.y
    });
    onClick();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const newPosition = {
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      };
      onMove(newPosition);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const renderElementContent = () => {
    switch (element.type) {
      case 'text':
        return <p style={element.style}>{element.props.content}</p>;
      case 'heading':
        const HeadingTag = element.props.level as keyof JSX.IntrinsicElements;
        return <HeadingTag style={element.style}>{element.props.content}</HeadingTag>;
      case 'image':
        return (
          <img 
            src={element.props.src || '/api/placeholder/300/200'} 
            alt={element.props.alt}
            style={element.style}
          />
        );
      case 'button':
        return (
          <button style={element.style}>
            {element.props.text}
          </button>
        );
      case 'container':
        return (
          <div style={element.style}>
            <p className="text-muted-foreground text-sm">Container Element</p>
          </div>
        );
      case 'hero':
        return (
          <div style={element.style}>
            <h1 className="text-3xl font-bold mb-2">{element.props.title}</h1>
            <p className="text-lg">{element.props.subtitle}</p>
          </div>
        );
      default:
        return (
          <div style={element.style}>
            <p className="text-muted-foreground">{element.type} component</p>
          </div>
        );
    }
  };

  return (
    <div
      className={`absolute cursor-move select-none ${
        isSelected ? 'ring-2 ring-primary ring-offset-2' : 'hover:ring-1 hover:ring-muted-foreground'
      }`}
      style={{
        left: element.position.x,
        top: element.position.y,
        transform: isDragging ? 'scale(1.02)' : 'scale(1)',
        transition: isDragging ? 'none' : 'transform 0.1s ease'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {renderElementContent()}
      
      {/* Element controls */}
      {isSelected && (
        <div className="absolute -top-8 -right-1 flex space-x-1">
          <Button size="sm" variant="outline" className="h-6 w-6 p-0">
            <Edit className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="outline" className="h-6 w-6 p-0">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}