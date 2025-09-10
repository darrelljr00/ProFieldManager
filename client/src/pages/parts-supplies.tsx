import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Package, AlertTriangle, TrendingDown, MoreHorizontal, Edit, Trash2, Eye, Search, Filter, X, Upload, Image as ImageIcon } from "lucide-react";
import { insertPartsSuppliesSchema } from "@shared/schema";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";

const createPartSchema = z.object({
  name: z.string().min(1, "Part name is required"),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  sku: z.string().optional(),
  currentStock: z.number().min(0).default(0),
  minStockLevel: z.number().min(0).default(0),
  maxStockLevel: z.number().optional(),
  reorderPoint: z.number().optional(),
  reorderQuantity: z.number().optional(),
  unitCost: z.string().optional(),
  unitPrice: z.string().optional(),
  weight: z.string().optional(),
  dimensions: z.string().optional(),
  unit: z.string().default("each"),
  supplier: z.string().optional(),
  supplierSku: z.string().optional(),
  supplierContact: z.string().optional(),
  location: z.string().optional(),
  binLocation: z.string().optional(),
  imageUrl: z.string().optional(),
  requiresSpecialHandling: z.boolean().optional(),
  isHazardous: z.boolean().optional(),
});

type CreatePartFormData = z.infer<typeof createPartSchema>;

export default function PartsSuppliesPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState<any>(null);
  const [editingPart, setEditingPart] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("inventory");
  
  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockStatusFilter, setStockStatusFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Image upload state
  const [uploadedImageUrl, setUploadedImageUrl] = useState("");
  const lastUploadMetaRef = useRef<{publicURL: string; objectPath: string} | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Image upload handlers (using public storage for parts inventory)
  const handleGetUploadParameters = async () => {
    try {
      console.log('🔄 Getting public upload parameters for parts inventory...');
      const response = await apiRequest('POST', '/api/objects/upload-public');
      const result = await response.json();
      console.log('✅ Public upload parameters received:', result);
      
      // Store the public URL and object path for use in onComplete
      lastUploadMetaRef.current = {
        publicURL: result.publicURL,
        objectPath: result.objectPath
      };
      
      return {
        method: 'PUT' as const,
        url: result.uploadURL,
      };
    } catch (error) {
      console.error('❌ Failed to get public upload parameters:', error);
      toast({
        title: "Upload Error",
        description: "Failed to get upload URL. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Handle dialog open/close
  const handleDialogOpenChange = (open: boolean) => {
    setIsCreateDialogOpen(open);
    if (!open) {
      // Dialog is closing - clear uploaded image and reset form
      setUploadedImageUrl("");
      form.reset();
    }
  };

  // Fetch parts and supplies
  const { data: partsSupplies = [], isLoading: partsLoading } = useQuery({
    queryKey: ['/api/parts-supplies']
  });

  // Filter and search logic
  const filteredPartsSupplies = Array.isArray(partsSupplies) && partsSupplies.length > 0 
    ? partsSupplies.filter((part: any) => {
        const matchesSearch = searchTerm === "" || 
          part.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          part.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          part.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          part.supplier?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCategory = categoryFilter === "all" || part.category === categoryFilter;
        
        const matchesStockStatus = stockStatusFilter === "all" || 
          (stockStatusFilter === "low" && part.isLowStock) ||
          (stockStatusFilter === "out" && part.isOutOfStock) ||
          (stockStatusFilter === "normal" && !part.isLowStock && !part.isOutOfStock);
        
        const matchesSupplier = supplierFilter === "all" || part.supplier === supplierFilter;

        return matchesSearch && matchesCategory && matchesStockStatus && matchesSupplier;
      })
    : [];

  // Get unique suppliers for filter dropdown
  const uniqueSuppliers = Array.isArray(partsSupplies) 
    ? Array.from(new Set(partsSupplies.map((part: any) => part.supplier).filter(Boolean)))
    : [];

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm("");
    setCategoryFilter("all");
    setStockStatusFilter("all");
    setSupplierFilter("all");
  };

  // Count active filters
  const activeFiltersCount = [
    searchTerm !== "",
    categoryFilter !== "all", 
    stockStatusFilter !== "all",
    supplierFilter !== "all"
  ].filter(Boolean).length;

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['/api/parts-categories']
  });

  // Fetch stock alerts
  const { data: stockAlerts = [] } = useQuery({
    queryKey: ['/api/stock-alerts']
  });

  // Create part mutation
  const createPartMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/parts-supplies', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/parts-supplies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stock-alerts'] });
      setIsCreateDialogOpen(false);
      setUploadedImageUrl(""); // Clear uploaded image
      form.reset(); // Reset form
      toast({ title: "Success", description: "Part created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create part", variant: "destructive" });
    }
  });

  // Update stock mutation
  const updateStockMutation = useMutation({
    mutationFn: async ({ partId, newStock, reason }: { partId: number, newStock: number, reason?: string }) => {
      const response = await apiRequest('PUT', `/api/parts-supplies/${partId}/stock`, { newStock, reason });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/parts-supplies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stock-alerts'] });
      toast({ title: "Success", description: "Stock updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update stock", variant: "destructive" });
    }
  });

  // Edit part mutation
  const editPartMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!editingPart?.id) {
        throw new Error('No part selected for editing');
      }
      const response = await apiRequest('PUT', `/api/parts-supplies/${editingPart.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/parts-supplies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stock-alerts'] });
      setIsEditDialogOpen(false);
      setEditingPart(null);
      setUploadedImageUrl("");
      editForm.reset();
      toast({ title: "Success", description: "Part updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update part", variant: "destructive" });
    }
  });

  const form = useForm<CreatePartFormData>({
    resolver: zodResolver(createPartSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      sku: "",
      currentStock: 0,
      minStockLevel: 0,
      maxStockLevel: 100,
      reorderPoint: 10,
      reorderQuantity: 50,
      unitCost: "",
      unitPrice: "",
      weight: "",
      dimensions: "",
      unit: "each",
      supplier: "",
      supplierSku: "",
      supplierContact: "",
      location: "",
      binLocation: "",
      imageUrl: "",
      requiresSpecialHandling: false,
      isHazardous: false
    }
  });

  // Edit form
  const editForm = useForm<CreatePartFormData>({
    resolver: zodResolver(createPartSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      sku: "",
      currentStock: 0,
      minStockLevel: 0,
      maxStockLevel: 100,
      reorderPoint: 10,
      reorderQuantity: 50,
      unitCost: "",
      unitPrice: "",
      weight: "",
      dimensions: "",
      unit: "each",
      supplier: "",
      supplierSku: "",
      supplierContact: "",
      location: "",
      binLocation: "",
      imageUrl: "",
      requiresSpecialHandling: false,
      isHazardous: false
    }
  });



  const handleUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      // Use the stored publicURL from handleGetUploadParameters
      const imageUrl = lastUploadMetaRef.current?.publicURL;
      if (!imageUrl) {
        console.error('❌ No public URL found in upload metadata');
        toast({
          title: "Upload Error", 
          description: "Failed to get public image URL",
          variant: "destructive"
        });
        return;
      }
      
      console.log('📁 Upload completed, using stored public URL:', imageUrl);
      setUploadedImageUrl(imageUrl);
      
      // If we're editing a part, immediately update the part's image in the database
      if (editingPart && editingPart.id) {
        try {
          await apiRequest('PUT', `/api/parts-supplies/${editingPart.id}/image`, {
            imageURL: imageUrl
          });
          
          // Refresh the parts list to show the updated image
          queryClient.invalidateQueries({ queryKey: ["/api/parts-supplies"] });
          
          toast({
            title: "Success",
            description: "Image uploaded and part updated successfully",
          });
        } catch (error) {
          console.error('Failed to update part image:', error);
          toast({
            title: "Upload Complete",
            description: "Image uploaded but failed to update part. Please save the form to apply changes.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Success",
          description: "Image uploaded successfully",
        });
      }
    }
  };

  const onSubmit = (data: CreatePartFormData) => {
    const formattedData = {
      ...data,
      unitCost: data.unitCost ? parseFloat(data.unitCost) : null,
      unitPrice: data.unitPrice ? parseFloat(data.unitPrice) : null,
      weight: data.weight ? parseFloat(data.weight) : null,
      imageUrl: uploadedImageUrl || null, // Include uploaded image URL
    };
    createPartMutation.mutate(formattedData);
  };

  const onEditSubmit = (data: CreatePartFormData) => {
    const formattedData = {
      ...data,
      unitCost: data.unitCost ? parseFloat(data.unitCost) : null,
      unitPrice: data.unitPrice ? parseFloat(data.unitPrice) : null,
      weight: data.weight ? parseFloat(data.weight) : null,
      imageUrl: uploadedImageUrl || editingPart?.imageUrl || null,
    };
    editPartMutation.mutate(formattedData);
  };

  // Handle editing a part
  const handleEditPart = (part: any) => {
    setEditingPart(part);
    setUploadedImageUrl(part.imageUrl || "");
    
    // Populate the edit form with current part data
    editForm.reset({
      name: part.name || "",
      description: part.description || "",
      category: part.category || "",
      sku: part.sku || "",
      currentStock: part.currentStock || 0,
      minStockLevel: part.minStockLevel || 0,
      maxStockLevel: part.maxStockLevel || 100,
      reorderPoint: part.reorderPoint || 10,
      reorderQuantity: part.reorderQuantity || 50,
      unitCost: part.unitCost?.toString() || "",
      unitPrice: part.unitPrice?.toString() || "",
      weight: part.weight?.toString() || "",
      dimensions: part.dimensions || "",
      unit: part.unit || "each",
      supplier: part.supplier || "",
      supplierSku: part.supplierSku || "",
      supplierContact: part.supplierContact || "",
      location: part.location || "",
      binLocation: part.binLocation || "",
      imageUrl: part.imageUrl || "",
      requiresSpecialHandling: part.requiresSpecialHandling || false,
      isHazardous: part.isHazardous || false,
    });
    
    setIsEditDialogOpen(true);
  };

  // Handle closing edit dialog
  const handleEditDialogClose = (open: boolean) => {
    setIsEditDialogOpen(open);
    if (!open) {
      setEditingPart(null);
      setUploadedImageUrl("");
      editForm.reset();
    }
  };

  // Calculate inventory stats
  const partsArray = Array.isArray(partsSupplies) ? partsSupplies : [];
  const alertsArray = Array.isArray(stockAlerts) ? stockAlerts : [];
  const totalParts = partsArray.length;
  const lowStockParts = partsArray.filter((part: any) => part.isLowStock).length;
  const outOfStockParts = partsArray.filter((part: any) => part.isOutOfStock).length;
  const totalValue = partsArray.reduce((sum: number, part: any) => 
    sum + (part.currentStock * (parseFloat(part.unitCost?.toString() || '0') || 0)), 0
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Parts & Supplies</h1>
          <p className="text-muted-foreground">Manage your inventory and track stock levels</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Part
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Part</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Part Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Brake Fluid" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="sku"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SKU</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., BF-001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Part description..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Image Upload Section */}
                <div className="space-y-3">
                  <FormLabel>Part Image</FormLabel>
                  <div className="flex items-center gap-4">
                    {uploadedImageUrl && (
                      <div className="relative">
                        <img 
                          src={uploadedImageUrl} 
                          alt="Part preview" 
                          className="w-16 h-16 object-cover rounded-md border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                          onClick={() => setUploadedImageUrl("")}
                        >
                          ×
                        </Button>
                      </div>
                    )}
                    <ObjectUploader
                      maxNumberOfFiles={1}
                      maxFileSize={5242880} // 5MB
                      onGetUploadParameters={handleGetUploadParameters}
                      onComplete={handleUploadComplete}
                      buttonClassName="h-10"
                    >
                      <div className="flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        <span>{uploadedImageUrl ? "Change Image" : "Upload Image"}</span>
                      </div>
                    </ObjectUploader>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Upload a clear image of the part (JPG, PNG - max 5MB)
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Chemical">Chemical</SelectItem>
                            <SelectItem value="Tool">Tool</SelectItem>
                            <SelectItem value="Part">Part</SelectItem>
                            <SelectItem value="Supply">Supply</SelectItem>
                            <SelectItem value="Equipment">Equipment</SelectItem>
                            <SelectItem value="Safety">Safety</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="each">Each</SelectItem>
                            <SelectItem value="gallon">Gallon</SelectItem>
                            <SelectItem value="lbs">Pounds</SelectItem>
                            <SelectItem value="box">Box</SelectItem>
                            <SelectItem value="case">Case</SelectItem>
                            <SelectItem value="bottle">Bottle</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="currentStock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Stock</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="minStockLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Min Stock Level</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="reorderPoint"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reorder Point</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="unitCost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit Cost ($)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="unitPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit Price ($)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Warehouse A-3" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="supplier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Supplier</FormLabel>
                        <FormControl>
                          <Input placeholder="Supplier name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createPartMutation.isPending}>
                    {createPartMutation.isPending ? "Creating..." : "Create Part"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Edit Part Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={handleEditDialogClose}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Part</DialogTitle>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Part Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Brake Fluid" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="sku"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SKU</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., BF-001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={editForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Brief description of the part..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Automotive">Automotive</SelectItem>
                            <SelectItem value="Tools">Tools</SelectItem>
                            <SelectItem value="Safety">Safety</SelectItem>
                            <SelectItem value="Electrical">Electrical</SelectItem>
                            <SelectItem value="Plumbing">Plumbing</SelectItem>
                            <SelectItem value="Hardware">Hardware</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="each">Each</SelectItem>
                            <SelectItem value="box">Box</SelectItem>
                            <SelectItem value="case">Case</SelectItem>
                            <SelectItem value="gallon">Gallon</SelectItem>
                            <SelectItem value="liter">Liter</SelectItem>
                            <SelectItem value="pound">Pound</SelectItem>
                            <SelectItem value="kilogram">Kilogram</SelectItem>
                            <SelectItem value="foot">Foot</SelectItem>
                            <SelectItem value="meter">Meter</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Stock Information */}
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={editForm.control}
                    name="currentStock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Stock</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            value={field.value || 0}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="minStockLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Min Stock Level</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            value={field.value || 0}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="maxStockLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Stock Level</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            value={field.value || 0}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Pricing Information */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="unitCost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit Cost ($)</FormLabel>
                        <FormControl>
                          <Input placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="unitPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit Price ($)</FormLabel>
                        <FormControl>
                          <Input placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Image Upload */}
                <div className="space-y-2">
                  <FormLabel>Product Image</FormLabel>
                  <div className="flex items-center gap-4">
                    {(uploadedImageUrl || editingPart?.imageUrl) && (
                      <div className="w-20 h-20 border rounded-md overflow-hidden">
                        <img 
                          src={uploadedImageUrl || editingPart?.imageUrl} 
                          alt="Part preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <ObjectUploader
                      maxNumberOfFiles={1}
                      maxFileSize={10485760} // 10MB
                      onGetUploadParameters={handleGetUploadParameters}
                      onComplete={handleUploadComplete}
                      buttonClassName="flex-shrink-0"
                    >
                      <div className="flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        <span>{uploadedImageUrl || editingPart?.imageUrl ? "Change Image" : "Upload Image"}</span>
                      </div>
                    </ObjectUploader>
                  </div>
                </div>

                {/* Location Information */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Warehouse A" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="binLocation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bin Location</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., A-12-C" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Supplier Information */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="supplier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Supplier</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., ABC Supply Co." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="supplierSku"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Supplier SKU</FormLabel>
                        <FormControl>
                          <Input placeholder="Supplier's part number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Safety Flags */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="requiresSpecialHandling"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Requires Special Handling</FormLabel>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="isHazardous"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Hazardous Material</FormLabel>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleEditDialogClose(false)}
                    disabled={editPartMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={editPartMutation.isPending}
                  >
                    {editPartMutation.isPending ? "Updating..." : "Update Part"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter Controls */}
      <Card className="p-4">
        <div className="space-y-4">
          {/* Main Search Bar */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by name, SKU, description, or supplier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filters
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
              {activeFiltersCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
              <div>
                <label className="text-sm font-medium mb-2 block">Category</label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="Chemical">Chemical</SelectItem>
                    <SelectItem value="Tool">Tool</SelectItem>
                    <SelectItem value="Part">Part</SelectItem>
                    <SelectItem value="Supply">Supply</SelectItem>
                    <SelectItem value="Equipment">Equipment</SelectItem>
                    <SelectItem value="Safety">Safety</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Stock Status</label>
                <Select value={stockStatusFilter} onValueChange={setStockStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="normal">Normal Stock</SelectItem>
                    <SelectItem value="low">Low Stock</SelectItem>
                    <SelectItem value="out">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Supplier</label>
                <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Suppliers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Suppliers</SelectItem>
                    {uniqueSuppliers.map((supplier) => (
                      <SelectItem key={supplier} value={supplier}>{supplier}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <div className="text-sm text-muted-foreground">
                  Showing {filteredPartsSupplies.length} of {partsSupplies.length} parts
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Parts</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalParts}</div>
            <p className="text-xs text-muted-foreground">Active inventory items</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{lowStockParts}</div>
            <p className="text-xs text-muted-foreground">Items below minimum</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{outOfStockParts}</div>
            <p className="text-xs text-muted-foreground">Items at zero stock</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Current inventory value</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="alerts">
            Stock Alerts
            {stockAlerts.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {stockAlerts.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Parts Inventory</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Image</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Min Level</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Unit Cost</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {partsLoading ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center">Loading...</TableCell>
                      </TableRow>
                    ) : filteredPartsSupplies.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center">
                          {partsArray.length === 0 ? "No parts found. Click \"Add Part\" to get started." : "No parts match your search criteria."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPartsSupplies.map((part: any) => (
                        <TableRow key={part.id}>
                          <TableCell>
                            {part.imageUrl ? (
                              <img 
                                src={part.imageUrl} 
                                alt={part.name}
                                className="w-12 h-12 object-cover rounded-md border"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gray-100 rounded-md border flex items-center justify-center">
                                <ImageIcon className="h-6 w-6 text-gray-400" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{part.name}</TableCell>
                          <TableCell>{part.sku || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{part.category}</Badge>
                          </TableCell>
                          <TableCell>{part.currentStock} {part.unit}</TableCell>
                          <TableCell>{part.minStockLevel}</TableCell>
                          <TableCell>
                            {part.isOutOfStock ? (
                              <Badge variant="destructive">Out of Stock</Badge>
                            ) : part.isLowStock ? (
                              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                                Low Stock
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-green-700">In Stock</Badge>
                            )}
                          </TableCell>
                          <TableCell>${parseFloat(part.unitCost || 0).toFixed(2)}</TableCell>
                          <TableCell>{part.location || "-"}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditPart(part)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stock Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alertsArray.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No stock alerts. All inventory levels are adequate.
                  </p>
                ) : (
                  alertsArray.map((alert: any) => (
                    <div key={alert.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <AlertTriangle className={`h-5 w-5 ${
                          alert.alertType === 'OUT_OF_STOCK' ? 'text-red-500' : 'text-orange-500'
                        }`} />
                        <div>
                          <div className="font-medium">{alert.partName}</div>
                          <div className="text-sm text-muted-foreground">
                            {alert.alertType === 'OUT_OF_STOCK' 
                              ? 'Out of stock' 
                              : `Low stock: ${alert.currentStock} remaining (min: ${alert.minStockLevel})`
                            }
                          </div>
                        </div>
                      </div>
                      <Badge variant={alert.alertType === 'OUT_OF_STOCK' ? 'destructive' : 'secondary'}>
                        {alert.alertType.replace('_', ' ').toLowerCase()}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}