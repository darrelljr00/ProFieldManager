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
import { Plus, Edit, Trash2, Save, X, Eye, Settings, Layout, Image, FileText, Globe, Sliders, Box, Palette, Monitor, Smartphone, Tablet, Crown, ExternalLink } from "lucide-react";

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

interface LayoutSettings {
  id?: number;
  contactBarTitle?: string;
  contactBarSubtitle?: string;
  contactBarPhone?: string;
  contactBarEmail?: string;
  contactBarButtonText?: string;
  contactBarButtonLink?: string;
  contactBarBackgroundColor?: string;
  footerCompanyName?: string;
  footerDescription?: string;
  footerAddress?: string;
  footerPhone?: string;
  footerEmail?: string;
  footerCopyright?: string;
}

interface SocialLink {
  id: number;
  platform: string;
  label: string;
  url: string;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

interface FooterSection {
  id: number;
  key: string;
  title: string;
  description?: string;
  sortOrder: number;
  links?: FooterLink[];
  createdAt?: string;
  updatedAt?: string;
}

interface FooterLink {
  id: number;
  sectionId: number;
  label: string;
  url: string;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
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
  const [editingSocialLink, setEditingSocialLink] = useState<SocialLink | null>(null);
  const [showSocialLinkDialog, setShowSocialLinkDialog] = useState(false);
  const [editingFooterSection, setEditingFooterSection] = useState<FooterSection | null>(null);
  const [showFooterSectionDialog, setShowFooterSectionDialog] = useState(false);
  const [editingFooterLink, setEditingFooterLink] = useState<FooterLink | null>(null);
  const [showFooterLinkDialog, setShowFooterLinkDialog] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
  const [selectedPage, setSelectedPage] = useState<FrontendPage | null>(null);
  const [draggedComponent, setDraggedComponent] = useState<any>(null);
  const [canvasElements, setCanvasElements] = useState<any[]>([]);
  const [deviceView, setDeviceView] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [selectedElementId, setSelectedElementId] = useState<number | null>(null);
  const [draftStyles, setDraftStyles] = useState({
    backgroundColor: '#ffffff',
    textColor: '#000000',
    borderRadius: 0,
    padding: 10,
    margin: 0
  });

  // Get the selected element object
  const selectedElement = canvasElements.find(el => el.id === selectedElementId);

  // Initialize draftStyles when selection changes
  React.useEffect(() => {
    if (selectedElement && selectedElement.style) {
      setDraftStyles({
        backgroundColor: selectedElement.style.backgroundColor || '#ffffff',
        textColor: selectedElement.style.textColor || '#000000',
        borderRadius: selectedElement.style.borderRadius || 0,
        padding: selectedElement.style.padding || 10,
        margin: selectedElement.style.margin || 0
      });
    }
  }, [selectedElement]);

  // Handler to save property changes to the selected element
  const handleSaveElementProperties = () => {
    if (!selectedElementId) {
      toast({
        title: "No element selected",
        description: "Please select an element to edit its properties",
        variant: "destructive"
      });
      return;
    }

    const updatedElements = canvasElements.map(el =>
      el.id === selectedElementId
        ? { ...el, style: { ...el.style, ...draftStyles } }
        : el
    );
    
    setCanvasElements(updatedElements);
    
    toast({
      title: "Properties saved",
      description: "Element properties updated successfully"
    });
  };

  // Fetch data
  const { data: pages = [] } = useQuery<FrontendPage[]>({
    queryKey: ['/api/frontend/pages'],
    enabled: activeTab === 'pages' || activeTab === 'design'
  });

  // Auto-select home page when pages are loaded
  React.useEffect(() => {
    if (pages && pages.length > 0 && !selectedPage) {
      const homePage = pages.find(p => p.slug === 'home' || p.title.toLowerCase().includes('home'));
      if (homePage) {
        setSelectedPage(homePage);
      } else {
        setSelectedPage(pages[0]); // fallback to first page
      }
    }
  }, [pages, selectedPage]);

  const { data: sliders = [] } = useQuery<FrontendSlider[]>({
    queryKey: ['/api/frontend/sliders'],
    enabled: activeTab === 'sliders'
  });

  const { data: icons = [] } = useQuery<FrontendIcon[]>({
    queryKey: ['/api/frontend/icons'],
    enabled: activeTab === 'icons'
  });

  const { data: boxes = [] } = useQuery<FrontendBox[]>({
    queryKey: ['/api/frontend/boxes'],
    enabled: activeTab === 'boxes'
  });

  const { data: categories = [] } = useQuery<FrontendCategory[]>({
    queryKey: ['/api/frontend/categories'],
    enabled: activeTab === 'categories'
  });

  // Layout queries
  const { data: layoutSettings, isLoading: isLoadingSettings } = useQuery<LayoutSettings>({
    queryKey: ['/api/website-layout/settings'],
    enabled: activeTab === 'layout'
  });

  const { data: socialLinks = [], isLoading: isLoadingSocialLinks } = useQuery<SocialLink[]>({
    queryKey: ['/api/website-layout/social-links'],
    enabled: activeTab === 'layout'
  });

  const { data: footerSections = [], isLoading: isLoadingFooterSections } = useQuery<FooterSection[]>({
    queryKey: ['/api/website-layout/footer-sections'],
    enabled: activeTab === 'layout'
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


  // Save Frontend Page Components Mutation
  const saveComponentsMutation = useMutation({
    mutationFn: async ({ pageId, components }: { pageId: number; components: any[] }) => {
      return apiRequest('POST', `/api/frontend/pages/${pageId}/components`, { components });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/frontend/components'] });
      toast({ title: "Success", description: "Page design saved successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save page design", variant: "destructive" });
    }
  });

  // Load components for selected page
  const { data: loadedComponents = [] } = useQuery<any[]>({
    queryKey: ['/api/frontend/components', selectedPage?.id],
    queryFn: async () => {
      if (!selectedPage) return [];
      const response = await fetch(`/api/frontend/components?pageId=${selectedPage.id}`);
      return response.json();
    },
    enabled: !!selectedPage && activeTab === 'design'
  });

  // Clear canvas immediately when page changes (prevent showing stale data)
  React.useEffect(() => {
    setCanvasElements([]);
  }, [selectedPage?.id]);

  // Populate canvas when components are loaded
  React.useEffect(() => {
    if (selectedPage && Array.isArray(loadedComponents)) {
      const formattedElements = loadedComponents.map(comp => ({
        id: comp.id,
        type: comp.type,
        props: comp.props || {},
        style: comp.style || {},
        content: comp.content,
        sortOrder: comp.sortOrder
      }));
      setCanvasElements(formattedElements);
    }
  }, [loadedComponents, selectedPage?.id]);

  // Handler to save page design
  const handleSavePageDesign = () => {
    if (!selectedPage) {
      toast({
        title: "No page selected",
        description: "Please select a page to save the design",
        variant: "destructive"
      });
      return;
    }

    if (canvasElements.length === 0) {
      toast({
        title: "No components",
        description: "Add some components to the page before saving",
        variant: "destructive"
      });
      return;
    }

    saveComponentsMutation.mutate({
      pageId: selectedPage.id,
      components: canvasElements
    });
  };

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

  // Layout mutations
  const updateLayoutSettingsMutation = useMutation({
    mutationFn: (data: Partial<LayoutSettings>) => apiRequest('PUT', '/api/website-layout/settings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/website-layout/settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/public/website-layout/settings'] });
      toast({ title: "Success", description: "Layout settings updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update layout settings", variant: "destructive" });
    }
  });

  const createSocialLinkMutation = useMutation({
    mutationFn: (data: Partial<SocialLink>) => apiRequest('POST', '/api/website-layout/social-links', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/website-layout/social-links'] });
      queryClient.invalidateQueries({ queryKey: ['/api/public/website-layout/social-links'] });
      setShowSocialLinkDialog(false);
      setEditingSocialLink(null);
      toast({ title: "Success", description: "Social link created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create social link", variant: "destructive" });
    }
  });

  const updateSocialLinkMutation = useMutation({
    mutationFn: ({ id, ...data }: Partial<SocialLink> & { id: number }) => 
      apiRequest('PUT', `/api/website-layout/social-links/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/website-layout/social-links'] });
      queryClient.invalidateQueries({ queryKey: ['/api/public/website-layout/social-links'] });
      setShowSocialLinkDialog(false);
      setEditingSocialLink(null);
      toast({ title: "Success", description: "Social link updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update social link", variant: "destructive" });
    }
  });

  const deleteSocialLinkMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/website-layout/social-links/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/website-layout/social-links'] });
      queryClient.invalidateQueries({ queryKey: ['/api/public/website-layout/social-links'] });
      toast({ title: "Success", description: "Social link deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete social link", variant: "destructive" });
    }
  });

  const createFooterSectionMutation = useMutation({
    mutationFn: (data: Partial<FooterSection>) => apiRequest('POST', '/api/website-layout/footer-sections', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/website-layout/footer-sections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/public/website-layout/footer-sections'] });
      setShowFooterSectionDialog(false);
      setEditingFooterSection(null);
      toast({ title: "Success", description: "Footer section created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create footer section", variant: "destructive" });
    }
  });

  const updateFooterSectionMutation = useMutation({
    mutationFn: ({ id, ...data }: Partial<FooterSection> & { id: number }) => 
      apiRequest('PUT', `/api/website-layout/footer-sections/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/website-layout/footer-sections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/public/website-layout/footer-sections'] });
      setShowFooterSectionDialog(false);
      setEditingFooterSection(null);
      toast({ title: "Success", description: "Footer section updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update footer section", variant: "destructive" });
    }
  });

  const deleteFooterSectionMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/website-layout/footer-sections/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/website-layout/footer-sections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/public/website-layout/footer-sections'] });
      toast({ title: "Success", description: "Footer section deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete footer section", variant: "destructive" });
    }
  });

  const createFooterLinkMutation = useMutation({
    mutationFn: (data: Partial<FooterLink>) => apiRequest('POST', '/api/website-layout/footer-links', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/website-layout/footer-sections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/public/website-layout/footer-sections'] });
      setShowFooterLinkDialog(false);
      setEditingFooterLink(null);
      toast({ title: "Success", description: "Footer link created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create footer link", variant: "destructive" });
    }
  });

  const updateFooterLinkMutation = useMutation({
    mutationFn: ({ id, ...data }: Partial<FooterLink> & { id: number }) => 
      apiRequest('PUT', `/api/website-layout/footer-links/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/website-layout/footer-sections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/public/website-layout/footer-sections'] });
      setShowFooterLinkDialog(false);
      setEditingFooterLink(null);
      toast({ title: "Success", description: "Footer link updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update footer link", variant: "destructive" });
    }
  });

  const deleteFooterLinkMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/website-layout/footer-links/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/website-layout/footer-sections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/public/website-layout/footer-sections'] });
      toast({ title: "Success", description: "Footer link deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete footer link", variant: "destructive" });
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
        <div className="flex items-center gap-4">
          <TabsList className="grid w-full grid-cols-7">
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
          <TabsTrigger value="layout" className="flex items-center space-x-2" data-testid="tab-layout">
            <Settings className="h-4 w-4" />
            <span>Layout</span>
          </TabsTrigger>
        </TabsList>
          <Button
            variant="outline"
            onClick={() => window.open('/website-preview', '_blank')}
            className="flex items-center gap-2 whitespace-nowrap"
            data-testid="button-view-website"
          >
            <ExternalLink className="h-4 w-4" />
            <span>View Website</span>
          </Button>
        </div>

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
              
              {/* Save Page Design Button */}
              {selectedPage && (
                <Button
                  onClick={handleSavePageDesign}
                  disabled={saveComponentsMutation.isPending || !canvasElements.length}
                  className="flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>{saveComponentsMutation.isPending ? 'Saving...' : 'Save Page Design'}</span>
                </Button>
              )}
              
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
                selectedElementId={selectedElementId}
                onSelectElement={setSelectedElementId}
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
                  <p className="text-sm text-muted-foreground">
                    {selectedElement ? `Editing ${selectedElement.type} element` : 'Select an element to edit its properties'}
                  </p>
                </div>

                {/* Style Controls */}
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Background Color</Label>
                    <Input
                      type="color"
                      value={draftStyles.backgroundColor}
                      onChange={(e) => setDraftStyles({ ...draftStyles, backgroundColor: e.target.value })}
                      className="h-8 w-full"
                      disabled={!selectedElement}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm">Text Color</Label>
                    <Input
                      type="color"
                      value={draftStyles.textColor}
                      onChange={(e) => setDraftStyles({ ...draftStyles, textColor: e.target.value })}
                      className="h-8 w-full"
                      disabled={!selectedElement}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Border Radius</Label>
                    <Input
                      type="number"
                      value={draftStyles.borderRadius}
                      onChange={(e) => setDraftStyles({ ...draftStyles, borderRadius: Number(e.target.value) })}
                      placeholder="0"
                      className="h-8"
                      disabled={!selectedElement}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Padding</Label>
                    <Input
                      type="number"
                      value={draftStyles.padding}
                      onChange={(e) => setDraftStyles({ ...draftStyles, padding: Number(e.target.value) })}
                      placeholder="10"
                      className="h-8"
                      disabled={!selectedElement}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Margin</Label>
                    <Input
                      type="number"
                      value={draftStyles.margin}
                      onChange={(e) => setDraftStyles({ ...draftStyles, margin: Number(e.target.value) })}
                      placeholder="0"
                      className="h-8"
                      disabled={!selectedElement}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button 
                    className="w-full" 
                    size="sm"
                    onClick={handleSaveElementProperties}
                    disabled={!selectedElement}
                  >
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
          {/* Top Slider Section */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-2xl font-semibold text-blue-900 dark:text-blue-100 flex items-center">
                  <Crown className="h-6 w-6 mr-2" />
                  Top Banner Slider
                </h2>
                <p className="text-blue-700 dark:text-blue-300 text-sm">
                  Featured slider displayed prominently at the top of your website
                </p>
              </div>
              <Button 
                onClick={() => openEditSlider()} 
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                <span>Add Top Slider</span>
              </Button>
            </div>

            {/* Top Slider Preview */}
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-blue-900 dark:text-blue-100">Active Top Slider</h3>
                <Badge variant="default" className="bg-blue-600">Priority</Badge>
              </div>
              
              {sliders.length > 0 ? (
                <div className="space-y-3">
                  {sliders
                    .filter((slider: FrontendSlider) => slider.isActive)
                    .slice(0, 1)
                    .map((slider: FrontendSlider) => (
                    <div key={slider.id} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded border">
                      <div>
                        <h4 className="font-medium text-blue-900 dark:text-blue-100">{slider.title}</h4>
                        <p className="text-sm text-blue-700 dark:text-blue-300">{slider.subtitle}</p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-blue-600 dark:text-blue-400">
                          <span>Animation: {slider.animationType}</span>
                          <span>Duration: {slider.displayDuration}ms</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditSlider(slider)}
                          className="border-blue-300 text-blue-700 hover:bg-blue-100"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteSliderMutation.mutate(slider.id)}
                          className="border-red-300 text-red-700 hover:bg-red-100"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {sliders.filter((slider: FrontendSlider) => slider.isActive).length === 0 && (
                    <div className="text-center py-8 text-blue-600 dark:text-blue-400">
                      <Sliders className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No active top slider configured</p>
                      <p className="text-sm">Create your first slider to get started</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-blue-600 dark:text-blue-400">
                  <Sliders className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No sliders created yet</p>
                  <p className="text-sm">Create your first slider to get started</p>
                </div>
              )}
            </div>
          </div>

          {/* All Sliders Section */}
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">All Homepage Sliders</h2>
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

        {/* Layout Tab */}
        <TabsContent value="layout" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            
            {/* Section 1: Contact Bar Settings */}
            <Card data-testid="card-contact-bar-settings">
              <CardHeader>
                <CardTitle>Contact Bar Settings</CardTitle>
                <CardDescription>Configure the top contact bar of your website</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingSettings ? (
                  <div className="text-center py-8">Loading...</div>
                ) : (
                  <form 
                    className="space-y-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      const data: Partial<LayoutSettings> = {
                        contactBarTitle: formData.get('contactBarTitle') as string,
                        contactBarSubtitle: formData.get('contactBarSubtitle') as string,
                        contactBarPhone: formData.get('contactBarPhone') as string,
                        contactBarEmail: formData.get('contactBarEmail') as string,
                        contactBarButtonText: formData.get('contactBarButtonText') as string,
                        contactBarButtonLink: formData.get('contactBarButtonLink') as string,
                        contactBarBackgroundColor: formData.get('contactBarBackgroundColor') as string,
                      };
                      updateLayoutSettingsMutation.mutate(data);
                    }}
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="contactBarTitle">Title</Label>
                        <Input
                          id="contactBarTitle"
                          name="contactBarTitle"
                          defaultValue={layoutSettings?.contactBarTitle || ''}
                          placeholder="Need help? Call us today!"
                          data-testid="input-contact-bar-title"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contactBarSubtitle">Subtitle</Label>
                        <Input
                          id="contactBarSubtitle"
                          name="contactBarSubtitle"
                          defaultValue={layoutSettings?.contactBarSubtitle || ''}
                          placeholder="Available 24/7"
                          data-testid="input-contact-bar-subtitle"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="contactBarPhone">Phone</Label>
                        <Input
                          id="contactBarPhone"
                          name="contactBarPhone"
                          defaultValue={layoutSettings?.contactBarPhone || ''}
                          placeholder="+1 (555) 123-4567"
                          data-testid="input-contact-bar-phone"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contactBarEmail">Email</Label>
                        <Input
                          id="contactBarEmail"
                          name="contactBarEmail"
                          type="email"
                          defaultValue={layoutSettings?.contactBarEmail || ''}
                          placeholder="contact@example.com"
                          data-testid="input-contact-bar-email"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="contactBarButtonText">Button Text</Label>
                        <Input
                          id="contactBarButtonText"
                          name="contactBarButtonText"
                          defaultValue={layoutSettings?.contactBarButtonText || ''}
                          placeholder="Get Quote"
                          data-testid="input-contact-bar-button-text"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contactBarButtonLink">Button Link</Label>
                        <Input
                          id="contactBarButtonLink"
                          name="contactBarButtonLink"
                          defaultValue={layoutSettings?.contactBarButtonLink || ''}
                          placeholder="/contact"
                          data-testid="input-contact-bar-button-link"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contactBarBackgroundColor">Background Color</Label>
                        <Input
                          id="contactBarBackgroundColor"
                          name="contactBarBackgroundColor"
                          type="color"
                          defaultValue={layoutSettings?.contactBarBackgroundColor || '#000000'}
                          data-testid="input-contact-bar-bg-color"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit" disabled={updateLayoutSettingsMutation.isPending} data-testid="button-save-contact-bar">
                        <Save className="h-4 w-4 mr-2" />
                        {updateLayoutSettingsMutation.isPending ? 'Saving...' : 'Save Contact Bar Settings'}
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>

            {/* Section 2: Footer Company Information */}
            <Card data-testid="card-footer-info">
              <CardHeader>
                <CardTitle>Footer Information</CardTitle>
                <CardDescription>Manage company information displayed in the footer</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingSettings ? (
                  <div className="text-center py-8">Loading...</div>
                ) : (
                  <form 
                    className="space-y-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      const data: Partial<LayoutSettings> = {
                        footerCompanyName: formData.get('footerCompanyName') as string,
                        footerDescription: formData.get('footerDescription') as string,
                        footerAddress: formData.get('footerAddress') as string,
                        footerPhone: formData.get('footerPhone') as string,
                        footerEmail: formData.get('footerEmail') as string,
                        footerCopyright: formData.get('footerCopyright') as string,
                      };
                      updateLayoutSettingsMutation.mutate(data);
                    }}
                  >
                    <div className="space-y-2">
                      <Label htmlFor="footerCompanyName">Company Name</Label>
                      <Input
                        id="footerCompanyName"
                        name="footerCompanyName"
                        defaultValue={layoutSettings?.footerCompanyName || ''}
                        placeholder="Your Company Name"
                        data-testid="input-footer-company-name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="footerDescription">Description</Label>
                      <Textarea
                        id="footerDescription"
                        name="footerDescription"
                        defaultValue={layoutSettings?.footerDescription || ''}
                        placeholder="Brief description about your company..."
                        rows={3}
                        data-testid="input-footer-description"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="footerAddress">Address</Label>
                        <Input
                          id="footerAddress"
                          name="footerAddress"
                          defaultValue={layoutSettings?.footerAddress || ''}
                          placeholder="123 Main St, City, State 12345"
                          data-testid="input-footer-address"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="footerPhone">Phone</Label>
                        <Input
                          id="footerPhone"
                          name="footerPhone"
                          defaultValue={layoutSettings?.footerPhone || ''}
                          placeholder="+1 (555) 123-4567"
                          data-testid="input-footer-phone"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="footerEmail">Email</Label>
                        <Input
                          id="footerEmail"
                          name="footerEmail"
                          type="email"
                          defaultValue={layoutSettings?.footerEmail || ''}
                          placeholder="info@example.com"
                          data-testid="input-footer-email"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="footerCopyright">Copyright Text</Label>
                        <Input
                          id="footerCopyright"
                          name="footerCopyright"
                          defaultValue={layoutSettings?.footerCopyright || ''}
                          placeholder="© 2025 Your Company. All rights reserved."
                          data-testid="input-footer-copyright"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit" disabled={updateLayoutSettingsMutation.isPending} data-testid="button-save-footer-info">
                        <Save className="h-4 w-4 mr-2" />
                        {updateLayoutSettingsMutation.isPending ? 'Saving...' : 'Save Footer Information'}
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>

            {/* Section 3: Social Links Management */}
            <Card data-testid="card-social-links">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Social Media Links</CardTitle>
                    <CardDescription>Manage your social media links displayed in the footer</CardDescription>
                  </div>
                  <Button 
                    onClick={() => {
                      setEditingSocialLink(null);
                      setShowSocialLinkDialog(true);
                    }}
                    className="flex items-center space-x-2"
                    data-testid="button-add-social-link"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Social Link</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingSocialLinks ? (
                  <div className="text-center py-8">Loading...</div>
                ) : socialLinks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No social links configured yet.</p>
                    <p className="text-sm mt-2">Click "Add Social Link" to get started.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Platform</TableHead>
                        <TableHead>Label</TableHead>
                        <TableHead>URL</TableHead>
                        <TableHead>Sort Order</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {socialLinks.map((link: SocialLink) => (
                        <TableRow key={link.id} data-testid={`row-social-link-${link.id}`}>
                          <TableCell className="capitalize">{link.platform}</TableCell>
                          <TableCell>{link.label}</TableCell>
                          <TableCell className="max-w-xs truncate">{link.url}</TableCell>
                          <TableCell>{link.sortOrder}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingSocialLink(link);
                                setShowSocialLinkDialog(true);
                              }}
                              data-testid={`button-edit-social-link-${link.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteSocialLinkMutation.mutate(link.id)}
                              data-testid={`button-delete-social-link-${link.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Section 4: Footer Sections & Links */}
            <Card data-testid="card-footer-sections">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Footer Navigation Sections</CardTitle>
                    <CardDescription>Organize footer links into sections</CardDescription>
                  </div>
                  <Button 
                    onClick={() => {
                      setEditingFooterSection(null);
                      setShowFooterSectionDialog(true);
                    }}
                    className="flex items-center space-x-2"
                    data-testid="button-add-footer-section"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Section</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingFooterSections ? (
                  <div className="text-center py-8">Loading...</div>
                ) : footerSections.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No footer sections configured yet.</p>
                    <p className="text-sm mt-2">Click "Add Section" to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {footerSections.map((section: FooterSection) => (
                      <div key={section.id} className="border rounded-lg p-4" data-testid={`section-footer-${section.id}`}>
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-semibold text-lg">{section.title}</h3>
                            <p className="text-sm text-muted-foreground">{section.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">Key: {section.key} • Sort Order: {section.sortOrder}</p>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedSectionId(section.id);
                                setEditingFooterLink(null);
                                setShowFooterLinkDialog(true);
                              }}
                              data-testid={`button-add-link-section-${section.id}`}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add Link
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingFooterSection(section);
                                setShowFooterSectionDialog(true);
                              }}
                              data-testid={`button-edit-section-${section.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteFooterSectionMutation.mutate(section.id)}
                              data-testid={`button-delete-section-${section.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Links for this section */}
                        {section.links && section.links.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Label</TableHead>
                                <TableHead>URL</TableHead>
                                <TableHead>Sort Order</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {section.links.map((link: FooterLink) => (
                                <TableRow key={link.id} data-testid={`row-footer-link-${link.id}`}>
                                  <TableCell>{link.label}</TableCell>
                                  <TableCell className="max-w-xs truncate">{link.url}</TableCell>
                                  <TableCell>{link.sortOrder}</TableCell>
                                  <TableCell className="text-right space-x-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedSectionId(section.id);
                                        setEditingFooterLink(link);
                                        setShowFooterLinkDialog(true);
                                      }}
                                      data-testid={`button-edit-link-${link.id}`}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => deleteFooterLinkMutation.mutate(link.id)}
                                      data-testid={`button-delete-link-${link.id}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <div className="text-center py-4 text-sm text-muted-foreground border-t">
                            No links in this section. Click "Add Link" to add one.
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
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

      {/* Social Link Dialog */}
      <SocialLinkDialog
        open={showSocialLinkDialog}
        onOpenChange={setShowSocialLinkDialog}
        socialLink={editingSocialLink}
        onSave={(data) => {
          if (editingSocialLink) {
            updateSocialLinkMutation.mutate({ ...data, id: editingSocialLink.id });
          } else {
            createSocialLinkMutation.mutate(data);
          }
        }}
      />

      {/* Footer Section Dialog */}
      <FooterSectionDialog
        open={showFooterSectionDialog}
        onOpenChange={setShowFooterSectionDialog}
        section={editingFooterSection}
        onSave={(data) => {
          if (editingFooterSection) {
            updateFooterSectionMutation.mutate({ ...data, id: editingFooterSection.id });
          } else {
            createFooterSectionMutation.mutate(data);
          }
        }}
      />

      {/* Footer Link Dialog */}
      <FooterLinkDialog
        open={showFooterLinkDialog}
        onOpenChange={setShowFooterLinkDialog}
        link={editingFooterLink}
        sectionId={selectedSectionId}
        onSave={(data) => {
          if (editingFooterLink) {
            updateFooterLinkMutation.mutate({ ...data, id: editingFooterLink.id });
          } else {
            createFooterLinkMutation.mutate({ ...data, sectionId: selectedSectionId });
          }
        }}
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
    path: '',
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
        path: page.path || '',
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
        path: '',
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
                onChange={(e) => {
                  const slug = e.target.value;
                  const path = slug ? `/${slug}` : '';
                  setFormData({ ...formData, slug, path });
                }}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="path">Page Path</Label>
            <Input
              id="path"
              value={formData.path}
              onChange={(e) => setFormData({ ...formData, path: e.target.value })}
              required
              placeholder="/your-page-url"
            />
            <p className="text-xs text-muted-foreground">
              Auto-generated from slug. You can customize it if needed.
            </p>
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

  React.useEffect(() => {
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

  React.useEffect(() => {
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

  React.useEffect(() => {
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

// Social Link Dialog Component
function SocialLinkDialog({ 
  open, 
  onOpenChange, 
  socialLink, 
  onSave 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  socialLink: SocialLink | null; 
  onSave: (data: any) => void; 
}) {
  const [formData, setFormData] = useState({
    platform: 'facebook',
    label: '',
    url: '',
    sortOrder: 0
  });

  React.useEffect(() => {
    if (socialLink) {
      setFormData({
        platform: socialLink.platform || 'facebook',
        label: socialLink.label || '',
        url: socialLink.url || '',
        sortOrder: socialLink.sortOrder || 0
      });
    } else {
      setFormData({
        platform: 'facebook',
        label: '',
        url: '',
        sortOrder: 0
      });
    }
  }, [socialLink]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{socialLink ? 'Edit Social Link' : 'Add Social Link'}</DialogTitle>
          <DialogDescription>
            {socialLink ? 'Update social media link details' : 'Add a new social media link to your footer'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="platform">Platform</Label>
              <Select value={formData.platform} onValueChange={(value) => setFormData({ ...formData, platform: value })}>
                <SelectTrigger data-testid="select-social-platform">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="twitter">Twitter</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="Follow us on Facebook"
                required
                data-testid="input-social-label"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://facebook.com/yourpage"
                required
                data-testid="input-social-url"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input
                id="sortOrder"
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) })}
                data-testid="input-social-sort-order"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" data-testid="button-submit-social-link">
              {socialLink ? 'Update' : 'Add'} Social Link
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Footer Section Dialog Component
function FooterSectionDialog({ 
  open, 
  onOpenChange, 
  section, 
  onSave 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  section: FooterSection | null; 
  onSave: (data: any) => void; 
}) {
  const [formData, setFormData] = useState({
    key: '',
    title: '',
    description: '',
    sortOrder: 0
  });

  React.useEffect(() => {
    if (section) {
      setFormData({
        key: section.key || '',
        title: section.title || '',
        description: section.description || '',
        sortOrder: section.sortOrder || 0
      });
    } else {
      setFormData({
        key: '',
        title: '',
        description: '',
        sortOrder: 0
      });
    }
  }, [section]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{section ? 'Edit Footer Section' : 'Add Footer Section'}</DialogTitle>
          <DialogDescription>
            {section ? 'Update footer section details' : 'Add a new navigation section to your footer'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="key">Key (unique identifier)</Label>
              <Input
                id="key"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                placeholder="company-info"
                required
                data-testid="input-section-key"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Company"
                required
                data-testid="input-section-title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description..."
                rows={2}
                data-testid="input-section-description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input
                id="sortOrder"
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) })}
                data-testid="input-section-sort-order"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" data-testid="button-submit-footer-section">
              {section ? 'Update' : 'Create'} Section
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Footer Link Dialog Component
function FooterLinkDialog({ 
  open, 
  onOpenChange, 
  link, 
  sectionId, 
  onSave 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  link: FooterLink | null; 
  sectionId: number | null; 
  onSave: (data: any) => void; 
}) {
  const [formData, setFormData] = useState({
    label: '',
    url: '',
    sortOrder: 0
  });

  React.useEffect(() => {
    if (link) {
      setFormData({
        label: link.label || '',
        url: link.url || '',
        sortOrder: link.sortOrder || 0
      });
    } else {
      setFormData({
        label: '',
        url: '',
        sortOrder: 0
      });
    }
  }, [link]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{link ? 'Edit Footer Link' : 'Add Footer Link'}</DialogTitle>
          <DialogDescription>
            {link ? 'Update footer link details' : 'Add a new link to this footer section'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="About Us"
                required
                data-testid="input-link-label"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="/about"
                required
                data-testid="input-link-url"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input
                id="sortOrder"
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) })}
                data-testid="input-link-sort-order"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" data-testid="button-submit-footer-link">
              {link ? 'Update' : 'Add'} Link
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
  selectedElementId,
  onSelectElement,
  onDrop 
}: {
  deviceView: 'desktop' | 'tablet' | 'mobile';
  selectedPage: FrontendPage | null;
  elements: any[];
  onElementsChange: (elements: any[]) => void;
  selectedElementId: number | null;
  onSelectElement: (id: number | null) => void;
  onDrop: (component: any, position: { x: number; y: number }) => void;
}) {
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
    onSelectElement(element.id);
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
        className="flex-1 bg-white border rounded-lg mx-auto my-4 overflow-y-auto overflow-x-hidden relative"
        style={{...getCanvasStyle(), maxHeight: '600px'}}
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
            {/* Template preview when no custom components - shows example designs */}
            {elements.length === 0 && (
              <div className="p-6 space-y-6 opacity-50 pointer-events-none">
                {selectedPage.slug === 'home' ? (
                  <div className="space-y-8">
                    <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-8 rounded-lg">
                      <h1 className="text-4xl font-bold mb-4">Pro Field Manager</h1>
                      <p className="text-xl mb-6">Comprehensive SaaS Platform for Field Service Management</p>
                      <div className="flex space-x-4">
                        <div className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold">Get Started</div>
                        <div className="border border-white px-6 py-3 rounded-lg">Learn More</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="p-6 border rounded-lg">
                        <h3 className="text-lg font-semibold mb-2">Mobile & Field Operations</h3>
                        <p className="text-gray-600">Native mobile apps, GPS tracking, photo management</p>
                      </div>
                      <div className="p-6 border rounded-lg">
                        <h3 className="text-lg font-semibold mb-2">Business Intelligence</h3>
                        <p className="text-gray-600">Advanced reports, analytics, custom dashboards</p>
                      </div>
                      <div className="p-6 border rounded-lg">
                        <h3 className="text-lg font-semibold mb-2">Communication & Automation</h3>
                        <p className="text-gray-600">Team messaging, SMS integration, smart notifications</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Box className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium text-muted-foreground">Empty Canvas</p>
                    <p className="text-sm text-muted-foreground">Drag components from the left panel to start designing</p>
                  </div>
                )}
              </div>
            )}

            {/* Drop zone indicator */}
            <div className="absolute inset-0 border-2 border-dashed border-transparent hover:border-primary/20 transition-colors pointer-events-none" />
            
            {/* Rendered elements - shown in real-time as you add them */}
            {elements.map((element) => (
              <CanvasElement
                key={element.id}
                element={element}
                isSelected={selectedElementId === element.id}
                onClick={() => handleElementClick(element)}
                onMove={(newPosition) => handleElementMove(element.id, newPosition)}
              />
            ))}

            {/* Helpful hint */}
            {elements.length === 0 ? (
              <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-2 rounded-lg text-sm">
                Template Preview • Drag components to customize
              </div>
            ) : (
              <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-2 rounded-lg text-sm">
                Click elements to edit • Drag to reposition
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