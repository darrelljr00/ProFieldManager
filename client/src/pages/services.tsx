import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Wrench, Edit, DollarSign, X, Trash2 } from "lucide-react";
import type { Service } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

export default function Services() {
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [serviceName, setServiceName] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [serviceMaterialsCost, setServiceMaterialsCost] = useState("");
  const [serviceMaterials, setServiceMaterials] = useState<{ name: string; cost: number }[]>([]);
  const [serviceTime, setServiceTime] = useState("");
  const { toast } = useToast();

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
      updated[index].cost = parseFloat(value as string) || 0;
    }
    setServiceMaterials(updated);
  };

  const handleServiceSubmit = () => {
    if (!serviceName.trim() || !servicePrice || !serviceTime) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    const totalMaterialsCost = serviceMaterials.reduce((sum, m) => sum + (m.cost || 0), 0);

    const data = {
      name: serviceName.trim(),
      price: servicePrice,
      materialsCost: totalMaterialsCost.toFixed(2),
      materials: serviceMaterials,
      estimatedCompletionTime: parseInt(serviceTime),
    };

    if (selectedService) {
      updateServiceMutation.mutate({ id: selectedService.id, data });
    } else {
      createServiceMutation.mutate(data);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
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
    </div>
  );
}
