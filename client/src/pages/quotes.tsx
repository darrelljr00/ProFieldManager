import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { QuoteForm } from "@/components/quote-form";
import { QuotesTable } from "@/components/quotes-table";
import { TrashedQuotesTable } from "@/components/trashed-quotes-table";
import { Plus, FileText, TrendingUp, Clock, CheckCircle, Search, Filter, Trash2, Wrench, Edit, DollarSign, X, Briefcase } from "lucide-react";
import type { Quote, Customer, QuoteLineItem, Service } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

export default function Quotes() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const tabParam = searchParams.get('tab');
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [activeTab, setActiveTab] = useState(tabParam || "quotes");
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [serviceName, setServiceName] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [serviceMaterialsCost, setServiceMaterialsCost] = useState("");
  const [serviceMaterials, setServiceMaterials] = useState<{ name: string; cost: number }[]>([]);
  const [serviceTime, setServiceTime] = useState("");
  const { toast } = useToast();

  const { data: quotes = [], isLoading, error } = useQuery<(Quote & { customer: Customer; lineItems: QuoteLineItem[] })[]>({
    queryKey: ["/api/quotes"],
  });

  const { data: trashedQuotes = [], isLoading: trashedLoading, error: trashedError } = useQuery<(Quote & { customer: Customer; lineItems: QuoteLineItem[] })[]>({
    queryKey: ["/api/quotes/trash"],
  });

  const { data: services = [], isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const createServiceMutation = useMutation({
    mutationFn: async (data: { name: string; price: string; materialsCost: string; materials: { name: string; cost: number }[]; estimatedCompletionTime: number }) => {
      return await apiRequest("POST", "/api/services", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setIsServiceDialogOpen(false);
      resetServiceForm();
      toast({ title: "Service created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error creating service", description: error.message, variant: "destructive" });
    },
  });

  const updateServiceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { name: string; price: string; materialsCost: string; materials: { name: string; cost: number }[]; estimatedCompletionTime: number } }) => {
      return await apiRequest("PUT", `/api/services/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setIsServiceDialogOpen(false);
      resetServiceForm();
      toast({ title: "Service updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error updating service", description: error.message, variant: "destructive" });
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/services/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({ title: "Service deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error deleting service", description: error.message, variant: "destructive" });
    },
  });

  // Update active tab when URL changes
  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const resetServiceForm = () => {
    setSelectedService(null);
    setServiceName("");
    setServicePrice("");
    setServiceMaterialsCost("");
    setServiceMaterials([]);
    setServiceTime("");
  };

  const openServiceDialog = (service?: Service) => {
    if (service) {
      setSelectedService(service);
      setServiceName(service.name);
      setServicePrice(service.price);
      setServiceMaterialsCost(service.materialsCost || "0");
      setServiceMaterials((service.materials as any) || []);
      setServiceTime(service.estimatedCompletionTime.toString());
    } else {
      resetServiceForm();
    }
    setIsServiceDialogOpen(true);
  };

  const addMaterialItem = () => {
    setServiceMaterials([...serviceMaterials, { name: "", cost: 0 }]);
  };

  const removeMaterialItem = (index: number) => {
    setServiceMaterials(serviceMaterials.filter((_, i) => i !== index));
  };

  const updateMaterialItem = (index: number, field: "name" | "cost", value: string | number) => {
    const updated = [...serviceMaterials];
    if (field === "name") {
      updated[index].name = value as string;
    } else {
      updated[index].cost = typeof value === "string" ? parseFloat(value) || 0 : value;
    }
    setServiceMaterials(updated);
  };

  const handleServiceSubmit = () => {
    if (!serviceName.trim() || !servicePrice.trim() || !serviceTime.trim()) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }

    const priceValue = parseFloat(servicePrice);
    const timeValue = parseInt(serviceTime);

    if (isNaN(priceValue) || priceValue <= 0) {
      toast({ title: "Please enter a valid price greater than 0", variant: "destructive" });
      return;
    }

    if (isNaN(timeValue) || timeValue <= 0) {
      toast({ title: "Please enter a valid completion time greater than 0", variant: "destructive" });
      return;
    }

    // Validate materials if any exist
    const validMaterials = serviceMaterials.filter(m => m.name.trim() && m.cost >= 0);
    const totalMaterialsCost = validMaterials.reduce((sum, item) => sum + item.cost, 0);

    const data = {
      name: serviceName.trim(),
      price: priceValue.toFixed(2),
      materialsCost: totalMaterialsCost.toFixed(2),
      materials: validMaterials,
      estimatedCompletionTime: timeValue,
    };

    if (selectedService) {
      updateServiceMutation.mutate({ id: selectedService.id, data });
    } else {
      createServiceMutation.mutate(data);
    }
  };

  // Calculate pending approvals count (sent quotes without response)
  const pendingApprovalsCount = useMemo(() => {
    return quotes.filter(quote => 
      quote.status === 'sent' && !quote.respondedAt
    ).length;
  }, [quotes]);

  // Filter quotes based on search criteria
  const filteredQuotes = useMemo(() => {
    return quotes.filter(quote => {
      // Text search
      const searchMatch = !searchTerm || 
        quote.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.lineItems.some(item => 
          item.description?.toLowerCase().includes(searchTerm.toLowerCase())
        );

      // Status filter
      const statusMatch = statusFilter === "all" || quote.status === statusFilter;

      // Date filter
      const quoteDate = new Date(quote.quoteDate);
      const now = new Date();
      let dateMatch = true;
      
      if (dateFilter === "today") {
        dateMatch = quoteDate.toDateString() === now.toDateString();
      } else if (dateFilter === "this-week") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateMatch = quoteDate >= weekAgo;
      } else if (dateFilter === "this-month") {
        dateMatch = quoteDate.getMonth() === now.getMonth() && 
                   quoteDate.getFullYear() === now.getFullYear();
      } else if (dateFilter === "this-year") {
        dateMatch = quoteDate.getFullYear() === now.getFullYear();
      }

      return searchMatch && statusMatch && dateMatch;
    });
  }, [quotes, searchTerm, statusFilter, dateFilter]);

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-red-600">
          Failed to load quotes. Please try again.
        </div>
      </div>
    );
  }

  // Calculate quote statistics based on filtered results
  const stats = {
    totalQuotes: filteredQuotes.length,
    draftQuotes: filteredQuotes.filter(q => q.status === 'draft').length,
    sentQuotes: filteredQuotes.filter(q => q.status === 'sent').length,
    acceptedQuotes: filteredQuotes.filter(q => q.status === 'accepted').length,
    totalValue: filteredQuotes.reduce((sum, quote) => sum + parseFloat(quote.total), 0),
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Quotes</h1>
          <p className="text-muted-foreground">
            Create and manage your quotes
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Quote
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Quote</DialogTitle>
            </DialogHeader>
            <QuoteForm onSuccess={() => setIsDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="quotes" className="flex items-center gap-2 relative" data-testid="tab-quotes">
            <FileText className="h-4 w-4" />
            Quotes ({quotes.length})
            {pendingApprovalsCount > 0 && (
              <Badge 
                variant="destructive" 
                className="ml-1 h-5 w-5 text-xs flex items-center justify-center p-0 rounded-full"
                data-testid="pending-approvals-badge"
              >
                {pendingApprovalsCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="jobs" className="flex items-center gap-2" data-testid="tab-jobs">
            <Briefcase className="h-4 w-4" />
            Jobs
          </TabsTrigger>
          <TabsTrigger value="trash" className="flex items-center gap-2" data-testid="tab-trash">
            <Trash2 className="h-4 w-4" />
            Trash ({trashedQuotes.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quotes" className="space-y-6 mt-6">

      {/* Search and Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search & Filter Quotes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {/* Search Input */}
            <div className="md:col-span-2">
              <Input
                placeholder="Search quotes by number, customer, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Filter */}
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="this-week">This Week</SelectItem>
                <SelectItem value="this-month">This Month</SelectItem>
                <SelectItem value="this-year">This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active Filters Display */}
          {(searchTerm || statusFilter !== "all" || dateFilter !== "all") && (
            <div className="flex gap-2 mt-4 flex-wrap">
              {searchTerm && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Search: "{searchTerm}"
                  <button
                    onClick={() => setSearchTerm("")}
                    className="ml-1 hover:text-red-600"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {statusFilter !== "all" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Status: {statusFilter}
                  <button
                    onClick={() => setStatusFilter("all")}
                    className="ml-1 hover:text-red-600"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {dateFilter !== "all" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Date: {dateFilter.replace("-", " ")}
                  <button
                    onClick={() => setDateFilter("all")}
                    className="ml-1 hover:text-red-600"
                  >
                    ×
                  </button>
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setDateFilter("all");
                }}
              >
                Clear All Filters
              </Button>
            </div>
          )}

          {/* Results Summary */}
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredQuotes.length} of {quotes.length} quotes
            {(searchTerm || statusFilter !== "all" || dateFilter !== "all") && " (filtered)"}
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quotes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalQuotes}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.draftQuotes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sent</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sentQuotes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accepted</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.acceptedQuotes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalValue.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

          {/* Quotes Table */}
          <QuotesTable quotes={filteredQuotes} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="jobs" className="space-y-6 mt-6">
          {/* Services Content */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Service Catalog
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage your services with pricing and estimated completion times
                </p>
              </div>
              <Dialog open={isServiceDialogOpen} onOpenChange={setIsServiceDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => openServiceDialog()} data-testid="button-add-service">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Service
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{selectedService ? "Edit Service" : "Add New Service"}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="service-name">Service Name</Label>
                      <Input
                        id="service-name"
                        value={serviceName}
                        onChange={(e) => setServiceName(e.target.value)}
                        placeholder="e.g., House Washing"
                        data-testid="input-service-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="service-price">Price ($)</Label>
                      <Input
                        id="service-price"
                        type="number"
                        step="0.01"
                        value={servicePrice}
                        onChange={(e) => setServicePrice(e.target.value)}
                        placeholder="e.g., 150.00"
                        data-testid="input-service-price"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>Materials & Supplies</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addMaterialItem}
                          data-testid="button-add-material"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Material
                        </Button>
                      </div>
                      
                      {serviceMaterials.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-4 text-center border border-dashed rounded">
                          No materials added yet. Click "Add Material" to add items.
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                          {serviceMaterials.map((material, index) => (
                            <div key={index} className="flex gap-2 items-start" data-testid={`material-item-${index}`}>
                              <div className="flex-1">
                                <Input
                                  placeholder="Material name"
                                  value={material.name}
                                  onChange={(e) => updateMaterialItem(index, "name", e.target.value)}
                                  data-testid={`input-material-name-${index}`}
                                />
                              </div>
                              <div className="w-28">
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="Cost"
                                  value={material.cost || ""}
                                  onChange={(e) => updateMaterialItem(index, "cost", e.target.value)}
                                  data-testid={`input-material-cost-${index}`}
                                />
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeMaterialItem(index)}
                                data-testid={`button-remove-material-${index}`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {serviceMaterials.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Total Materials Cost: ${serviceMaterials.reduce((sum, m) => sum + (m.cost || 0), 0).toFixed(2)}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="service-time">Estimated Completion Time (minutes)</Label>
                      <Input
                        id="service-time"
                        type="number"
                        value={serviceTime}
                        onChange={(e) => setServiceTime(e.target.value)}
                        placeholder="e.g., 120"
                        data-testid="input-service-time"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        This time is hidden in the UI and only used for analytics/reports
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsServiceDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleServiceSubmit} 
                      disabled={createServiceMutation.isPending || updateServiceMutation.isPending}
                      data-testid="button-save-service"
                    >
                      {selectedService ? "Update" : "Create"} Service
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {servicesLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading services...
                </div>
              ) : services.length === 0 ? (
                <div className="text-center py-8">
                  <Wrench className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-lg font-medium mb-2">No services yet</p>
                  <p className="text-muted-foreground">Add your first service to get started</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service Name</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Materials Cost</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {services.map((service) => (
                      <TableRow key={service.id} data-testid={`row-service-${service.id}`}>
                        <TableCell className="font-medium" data-testid={`text-service-name-${service.id}`}>
                          {service.name}
                        </TableCell>
                        <TableCell data-testid={`text-service-price-${service.id}`}>
                          <div className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-1" />
                            {parseFloat(service.price).toFixed(2)}
                          </div>
                        </TableCell>
                        <TableCell data-testid={`text-service-materials-cost-${service.id}`}>
                          {service.materials && (service.materials as any[]).length > 0 ? (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" className="h-auto py-1 px-2" data-testid={`button-materials-details-${service.id}`}>
                                  <div className="flex items-center">
                                    <DollarSign className="h-4 w-4 mr-1" />
                                    {parseFloat(service.materialsCost || "0").toFixed(2)}
                                    <span className="ml-1 text-xs text-muted-foreground">({(service.materials as any[]).length} items)</span>
                                  </div>
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-64">
                                <div className="space-y-2">
                                  <h4 className="font-medium text-sm">Materials Breakdown</h4>
                                  <div className="space-y-1">
                                    {(service.materials as any[]).map((material: any, idx: number) => (
                                      <div key={idx} className="flex justify-between text-xs" data-testid={`material-breakdown-${service.id}-${idx}`}>
                                        <span className="truncate flex-1">{material.name}</span>
                                        <span className="ml-2 font-medium">${parseFloat(material.cost || 0).toFixed(2)}</span>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="border-t pt-1 mt-2">
                                    <div className="flex justify-between text-sm font-medium">
                                      <span>Total:</span>
                                      <span>${parseFloat(service.materialsCost || "0").toFixed(2)}</span>
                                    </div>
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          ) : (
                            <div className="flex items-center">
                              <DollarSign className="h-4 w-4 mr-1" />
                              {parseFloat(service.materialsCost || "0").toFixed(2)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openServiceDialog(service)}
                              data-testid={`button-edit-service-${service.id}`}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (confirm(`Delete "${service.name}"?`)) {
                                  deleteServiceMutation.mutate(service.id);
                                }
                              }}
                              data-testid={`button-delete-service-${service.id}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trash" className="space-y-6 mt-6">
          {/* Trash Content */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Deleted Quotes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                These quotes have been deleted. You can restore or permanently delete them.
              </p>
              
              {trashedError ? (
                <div className="text-center text-red-600 py-8">
                  Failed to load deleted quotes. Please try again.
                </div>
              ) : trashedLoading ? (
                <div className="text-center text-muted-foreground py-8">
                  Loading deleted quotes...
                </div>
              ) : trashedQuotes.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Trash2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-lg font-medium mb-2">No deleted quotes</p>
                  <p>When you delete quotes, they'll appear here for recovery.</p>
                </div>
              ) : (
                <TrashedQuotesTable quotes={trashedQuotes} isLoading={trashedLoading} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}