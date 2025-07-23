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
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Package, AlertTriangle, TrendingDown, MoreHorizontal, Edit, Trash2, Eye } from "lucide-react";
import { insertPartsSuppliesSchema } from "@shared/schema";

const createPartSchema = insertPartsSuppliesSchema.extend({
  unitCost: z.string().optional(),
  unitPrice: z.string().optional(),
  weight: z.string().optional(),
});

type CreatePartFormData = z.infer<typeof createPartSchema>;

export default function PartsSuppliesPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("inventory");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch parts and supplies
  const { data: partsSupplies = [], isLoading: partsLoading } = useQuery({
    queryKey: ['/api/parts-supplies'],
    queryFn: () => apiRequest('GET', '/api/parts-supplies')
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['/api/parts-categories'],
    queryFn: () => apiRequest('GET', '/api/parts-categories')
  });

  // Fetch stock alerts
  const { data: stockAlerts = [] } = useQuery({
    queryKey: ['/api/stock-alerts'],
    queryFn: () => apiRequest('GET', '/api/stock-alerts')
  });

  // Create part mutation
  const createPartMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/parts-supplies', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/parts-supplies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stock-alerts'] });
      setIsCreateDialogOpen(false);
      toast({ title: "Success", description: "Part created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create part", variant: "destructive" });
    }
  });

  // Update stock mutation
  const updateStockMutation = useMutation({
    mutationFn: ({ partId, newStock, reason }: { partId: number, newStock: number, reason?: string }) => 
      apiRequest('PUT', `/api/parts-supplies/${partId}/stock`, { newStock, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/parts-supplies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stock-alerts'] });
      toast({ title: "Success", description: "Stock updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update stock", variant: "destructive" });
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
      unit: "each",
      unitCost: "",
      unitPrice: "",
      weight: "",
      location: "",
      supplier: ""
    }
  });

  const onSubmit = (data: CreatePartFormData) => {
    const formattedData = {
      ...data,
      unitCost: data.unitCost ? parseFloat(data.unitCost) : null,
      unitPrice: data.unitPrice ? parseFloat(data.unitPrice) : null,
      weight: data.weight ? parseFloat(data.weight) : null,
    };
    createPartMutation.mutate(formattedData);
  };

  // Calculate inventory stats
  const partsArray = Array.isArray(partsSupplies) ? partsSupplies : [];
  const alertsArray = Array.isArray(stockAlerts) ? stockAlerts : [];
  const totalParts = partsArray.length;
  const lowStockParts = partsArray.filter((part: any) => part.isLowStock).length;
  const outOfStockParts = partsArray.filter((part: any) => part.isOutOfStock).length;
  const totalValue = partsArray.reduce((sum: number, part: any) => 
    sum + (part.currentStock * (parseFloat(part.unitCost) || 0)), 0
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Parts & Supplies</h1>
          <p className="text-muted-foreground">Manage your inventory and track stock levels</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
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
      </div>

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
                        <TableCell colSpan={9} className="text-center">Loading...</TableCell>
                      </TableRow>
                    ) : partsArray.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center">
                          No parts found. Click "Add Part" to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      partsArray.map((part: any) => (
                        <TableRow key={part.id}>
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
                                onClick={() => {
                                  const newStock = prompt(`Update stock for ${part.name}:`, part.currentStock.toString());
                                  if (newStock !== null && !isNaN(parseInt(newStock))) {
                                    updateStockMutation.mutate({
                                      partId: part.id,
                                      newStock: parseInt(newStock),
                                      reason: "Manual adjustment"
                                    });
                                  }
                                }}
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