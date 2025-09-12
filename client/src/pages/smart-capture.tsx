import { useState } from "react";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Package, List, Edit, AlertCircle, Trash2, Pencil } from "lucide-react";
import { 
  insertSmartCaptureListSchema, 
  insertSmartCaptureItemSchema,
  type InsertSmartCaptureList,
  type InsertSmartCaptureItem,
  type SmartCaptureList,
  type SmartCaptureItem
} from "@shared/schema";

// Type for Smart Capture list with items (as returned by the API)
type SmartCaptureListWithItems = SmartCaptureList & {
  items: SmartCaptureItem[];
};

// Using shared schemas from @shared/schema.ts to ensure backend/frontend consistency

export default function SmartCapturePage() {
  const [isCreateListDialogOpen, setIsCreateListDialogOpen] = useState(false);
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [isEditItemDialogOpen, setIsEditItemDialogOpen] = useState(false);
  const [selectedSmartCaptureList, setSelectedSmartCaptureList] = useState<any>(null);
  const [editingItem, setEditingItem] = useState<SmartCaptureItem | null>(null);
  const [activeTab, setActiveTab] = useState("lists");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch Smart Capture lists
  const { data: smartCaptureLists = [], isLoading: smartCaptureLoading, error: smartCaptureError } = useQuery({
    queryKey: ['/api/smart-capture/lists']
  });

  // Fetch Smart Capture items for selected list
  const { data: selectedListWithItems, isLoading: itemsLoading, error: itemsError } = useQuery<SmartCaptureListWithItems>({
    queryKey: ['/api/smart-capture/lists', selectedSmartCaptureList?.id],
    enabled: !!selectedSmartCaptureList?.id
  });

  // Extract items from the selected list response
  const smartCaptureItems = selectedListWithItems?.items || [];

  // Smart Capture mutations
  const createSmartCaptureListMutation = useMutation({
    mutationFn: async (data: InsertSmartCaptureList) => {
      const response = await apiRequest('POST', '/api/smart-capture/lists', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/smart-capture/lists'] });
      setIsCreateListDialogOpen(false);
      smartCaptureListForm.reset();
      toast({ title: "Success", description: "Smart Capture list created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create Smart Capture list", variant: "destructive" });
    }
  });

  const createSmartCaptureItemMutation = useMutation({
    mutationFn: async (data: InsertSmartCaptureItem & { listId: number }) => {
      const response = await apiRequest('POST', `/api/smart-capture/lists/${data.listId}/items`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/smart-capture/lists', selectedSmartCaptureList?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/smart-capture/lists'] });
      setIsAddItemDialogOpen(false);
      smartCaptureItemForm.reset();
      toast({ title: "Success", description: "Item added to Smart Capture list successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to add item to Smart Capture list", variant: "destructive" });
    }
  });

  const updateSmartCaptureItemMutation = useMutation({
    mutationFn: async (data: { itemId: number; updateData: Partial<InsertSmartCaptureItem> }) => {
      const response = await apiRequest('PUT', `/api/smart-capture/items/${data.itemId}`, data.updateData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/smart-capture/lists', selectedSmartCaptureList?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/smart-capture/lists'] });
      setIsEditItemDialogOpen(false);
      setEditingItem(null);
      toast({ title: "Success", description: "Item updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update item", variant: "destructive" });
    }
  });

  const deleteSmartCaptureItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      const response = await apiRequest('DELETE', `/api/smart-capture/items/${itemId}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/smart-capture/lists', selectedSmartCaptureList?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/smart-capture/lists'] });
      toast({ title: "Success", description: "Item deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete item", variant: "destructive" });
    }
  });

  // Smart Capture forms using shared schemas
  const smartCaptureListForm = useForm<InsertSmartCaptureList>({
    resolver: zodResolver(insertSmartCaptureListSchema),
    defaultValues: {
      name: "",
      description: "",
      status: "draft"
    }
  });

  const smartCaptureItemForm = useForm<InsertSmartCaptureItem>({
    resolver: zodResolver(insertSmartCaptureItemSchema),
    defaultValues: {
      partNumber: "",
      vehicleNumber: "",
      inventoryNumber: "",
      masterPrice: "0",
      location: "",
      quantity: 1,
      notes: ""
    }
  });

  const editSmartCaptureItemForm = useForm<InsertSmartCaptureItem>({
    resolver: zodResolver(insertSmartCaptureItemSchema)
  });

  // Smart Capture form handlers
  const onSmartCaptureListSubmit = (data: InsertSmartCaptureList) => {
    createSmartCaptureListMutation.mutate(data);
  };

  const onSmartCaptureItemSubmit = (data: InsertSmartCaptureItem) => {
    if (!selectedSmartCaptureList?.id) {
      toast({ title: "Error", description: "Please select a Smart Capture list first", variant: "destructive" });
      return;
    }
    const formattedData = {
      ...data,
      listId: selectedSmartCaptureList.id
    };
    createSmartCaptureItemMutation.mutate(formattedData);
  };

  const onEditSmartCaptureItemSubmit = (data: InsertSmartCaptureItem) => {
    if (!editingItem?.id) return;
    updateSmartCaptureItemMutation.mutate({
      itemId: editingItem.id,
      updateData: data
    });
  };

  const handleEditItem = (item: SmartCaptureItem) => {
    setEditingItem(item);
    editSmartCaptureItemForm.reset({
      partNumber: item.partNumber || "",
      vehicleNumber: item.vehicleNumber || "",
      inventoryNumber: item.inventoryNumber || "",
      masterPrice: item.masterPrice?.toString() || "0",
      location: item.location || "",
      quantity: item.quantity || 1,
      notes: item.notes || ""
    });
    setIsEditItemDialogOpen(true);
  };

  const handleDeleteItem = (itemId: number) => {
    if (confirm("Are you sure you want to delete this item?")) {
      deleteSmartCaptureItemMutation.mutate(itemId);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="smart-capture-page">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Smart Capture</h1>
          <p className="text-muted-foreground">Create and manage inventory lists with part numbers, vehicle numbers, and pricing</p>
        </div>
        <Dialog open={isCreateListDialogOpen} onOpenChange={setIsCreateListDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-list">
              <Plus className="h-4 w-4 mr-2" />
              Create New List
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Smart Capture List</DialogTitle>
            </DialogHeader>
            <Form {...smartCaptureListForm}>
              <form onSubmit={smartCaptureListForm.handleSubmit(onSmartCaptureListSubmit)} className="space-y-4">
                <FormField
                  control={smartCaptureListForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>List Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Vehicle Inventory Q1 2025" {...field} data-testid="input-list-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={smartCaptureListForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="List description..." {...field} data-testid="input-list-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={smartCaptureListForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} data-testid="select-list-status">
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateListDialogOpen(false)}
                    disabled={createSmartCaptureListMutation.isPending}
                    data-testid="button-cancel-list"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createSmartCaptureListMutation.isPending}
                    data-testid="button-submit-list"
                  >
                    {createSmartCaptureListMutation.isPending ? "Creating..." : "Create List"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="lists" data-testid="tab-lists">Lists</TabsTrigger>
          <TabsTrigger value="items" data-testid="tab-items" disabled={!selectedSmartCaptureList}>
            Items
            {selectedSmartCaptureList && (
              <Badge variant="secondary" className="ml-2">
                {Array.isArray(smartCaptureItems) ? smartCaptureItems.length : 0}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lists" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Smart Capture Lists</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {smartCaptureLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">Loading...</TableCell>
                      </TableRow>
                    ) : smartCaptureError ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-red-600">
                          Error loading lists: {smartCaptureError.message}
                        </TableCell>
                      </TableRow>
                    ) : Array.isArray(smartCaptureLists) && smartCaptureLists.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">
                          No Smart Capture lists found. Click "Create New List" to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      Array.isArray(smartCaptureLists) && smartCaptureLists.map((list: SmartCaptureList) => (
                        <TableRow key={list.id} data-testid={`list-row-${list.id}`}>
                          <TableCell className="font-medium">{list.name}</TableCell>
                          <TableCell>{list.description || "-"}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={list.status === 'active' ? 'default' : list.status === 'draft' ? 'secondary' : 'outline'}
                            >
                              {list.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(list.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedSmartCaptureList(list);
                                  setActiveTab("items");
                                }}
                                data-testid={`button-manage-items-${list.id}`}
                              >
                                <Package className="h-3 w-3 mr-1" />
                                Manage Items
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

        <TabsContent value="items" className="space-y-4">
          {selectedSmartCaptureList && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Items in "{selectedSmartCaptureList.name}"</CardTitle>
                  <p className="text-sm text-muted-foreground">{selectedSmartCaptureList.description}</p>
                </div>
                <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-add-item">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add Item to Smart Capture List</DialogTitle>
                    </DialogHeader>
                    <Form {...smartCaptureItemForm}>
                      <form onSubmit={smartCaptureItemForm.handleSubmit(onSmartCaptureItemSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={smartCaptureItemForm.control}
                            name="partNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Part Number</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., ABC-123" {...field} data-testid="input-part-number" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={smartCaptureItemForm.control}
                            name="vehicleNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Vehicle Number</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., VH-001" {...field} data-testid="input-vehicle-number" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={smartCaptureItemForm.control}
                            name="inventoryNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Inventory Number</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., INV-456" {...field} data-testid="input-inventory-number" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={smartCaptureItemForm.control}
                            name="quantity"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Quantity *</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="1"
                                    step="1"
                                    {...field} 
                                    onChange={e => field.onChange(Number(e.target.value) || 1)}
                                    data-testid="input-quantity"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Validation Message for Required Fields */}
                        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                          <div className="flex items-start space-x-2">
                            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-blue-700 dark:text-blue-300">
                              <p className="font-medium">Required Fields</p>
                              <p>At least one of Part Number, Vehicle Number, or Inventory Number must be provided, along with Location and Master Price.</p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={smartCaptureItemForm.control}
                            name="masterPrice"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Master Price *</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="0" 
                                    step="0.01" 
                                    placeholder="0.00" 
                                    {...field} 
                                    data-testid="input-master-price" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={smartCaptureItemForm.control}
                            name="location"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Location *</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., Warehouse A - Shelf 3" {...field} data-testid="input-location" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={smartCaptureItemForm.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Notes</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Additional notes..." {...field} data-testid="input-notes" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex justify-end space-x-2 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsAddItemDialogOpen(false)}
                            disabled={createSmartCaptureItemMutation.isPending}
                            data-testid="button-cancel-item"
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="submit" 
                            disabled={createSmartCaptureItemMutation.isPending}
                            data-testid="button-submit-item"
                          >
                            {createSmartCaptureItemMutation.isPending ? "Adding..." : "Add Item"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Part #</TableHead>
                        <TableHead>Vehicle #</TableHead>
                        <TableHead>Inventory #</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Master Price</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itemsLoading ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center">Loading items...</TableCell>
                        </TableRow>
                      ) : itemsError ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-red-600">
                            Error loading items: {itemsError.message}
                          </TableCell>
                        </TableRow>
                      ) : Array.isArray(smartCaptureItems) && smartCaptureItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center">
                            No items in this list. Click "Add Item" to get started.
                          </TableCell>
                        </TableRow>
                      ) : (
                        Array.isArray(smartCaptureItems) && smartCaptureItems.map((item: SmartCaptureItem) => (
                          <TableRow key={item.id} data-testid={`item-row-${item.id}`}>
                            <TableCell>{item.partNumber || "-"}</TableCell>
                            <TableCell>{item.vehicleNumber || "-"}</TableCell>
                            <TableCell>{item.inventoryNumber || "-"}</TableCell>
                            <TableCell>{item.notes || "-"}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>${parseFloat(item.masterPrice?.toString() || "0").toFixed(2)}</TableCell>
                            <TableCell>{item.location}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditItem(item)}
                                  data-testid={`edit-item-${item.id}`}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="text-red-600 hover:text-red-700"
                                  data-testid={`delete-item-${item.id}`}
                                >
                                  <Trash2 className="h-3 w-3" />
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
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Smart Capture Item Dialog */}
      <Dialog open={isEditItemDialogOpen} onOpenChange={setIsEditItemDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Smart Capture Item</DialogTitle>
          </DialogHeader>
          <Form {...editSmartCaptureItemForm}>
            <form onSubmit={editSmartCaptureItemForm.handleSubmit(onEditSmartCaptureItemSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editSmartCaptureItemForm.control}
                  name="partNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Part Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., ABC-123" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editSmartCaptureItemForm.control}
                  name="vehicleNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicle Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., VH-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editSmartCaptureItemForm.control}
                  name="inventoryNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Inventory Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., INV-456" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editSmartCaptureItemForm.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editSmartCaptureItemForm.control}
                  name="masterPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Master Price</FormLabel>
                      <FormControl>
                        <Input placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editSmartCaptureItemForm.control}
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
              </div>

              <FormField
                control={editSmartCaptureItemForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Additional notes about this item..." 
                        className="resize-none" 
                        rows={3}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditItemDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateSmartCaptureItemMutation.isPending}
                >
                  {updateSmartCaptureItemMutation.isPending ? "Updating..." : "Update Item"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}