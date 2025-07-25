import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Car, Edit, Trash2, Calendar, Fuel, MapPin } from "lucide-react";

interface Vehicle {
  id: number;
  vehicleNumber: string;
  licensePlate: string;
  year?: number;
  make?: string;
  model?: string;
  color?: string;
  vin?: string;
  vehicleType: string;
  capacity?: string;
  status: string;
  currentMileage?: number;
  fuelType?: string;
  insuranceExpiry?: string;
  registrationExpiry?: string;
  inspectionDue?: string;
  notes?: string;
  photoUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function VehicleManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ["/api/vehicles"],
  });

  const createVehicleMutation = useMutation({
    mutationFn: (vehicleData: any) => apiRequest("POST", "/api/vehicles", vehicleData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Success",
        description: "Vehicle created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create vehicle",
        variant: "destructive",
      });
    },
  });

  const updateVehicleMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("PUT", `/api/vehicles/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      setIsEditDialogOpen(false);
      setEditingVehicle(null);
      toast({
        title: "Success",
        description: "Vehicle updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update vehicle",
        variant: "destructive",
      });
    },
  });

  const deleteVehicleMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/vehicles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      toast({
        title: "Success",
        description: "Vehicle deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete vehicle",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "maintenance":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "out_of_service":
        return "bg-red-100 text-red-800 border-red-200";
      case "retired":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Vehicle Management
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your fleet vehicles, pair vehicle numbers to license plates, and track vehicle information for inspections.
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Vehicle
              </Button>
            </DialogTrigger>
            <VehicleFormDialog
              mode="create"
              onSubmit={(data) => createVehicleMutation.mutate(data)}
              isLoading={createVehicleMutation.isPending}
            />
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="text-center py-8">
              <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No vehicles found</h3>
              <p className="text-gray-500 mb-4">
                Create your first vehicle to start managing your fleet for inspections.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Vehicle
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle #</TableHead>
                    <TableHead>License Plate</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Make/Model</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Mileage</TableHead>
                    <TableHead>Fuel Type</TableHead>
                    <TableHead>Inspection Due</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.map((vehicle: Vehicle) => (
                    <TableRow key={vehicle.id}>
                      <TableCell className="font-medium">
                        {vehicle.vehicleNumber}
                      </TableCell>
                      <TableCell>{vehicle.licensePlate}</TableCell>
                      <TableCell className="capitalize">
                        {vehicle.vehicleType.replace('_', ' ')}
                      </TableCell>
                      <TableCell>
                        {vehicle.year && vehicle.make && vehicle.model
                          ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
                          : "Not specified"}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(vehicle.status)}>
                          {vehicle.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {vehicle.currentMileage ? `${vehicle.currentMileage.toLocaleString()} mi` : "Not recorded"}
                      </TableCell>
                      <TableCell className="capitalize">
                        {vehicle.fuelType || "Not specified"}
                      </TableCell>
                      <TableCell>
                        <span className={vehicle.inspectionDue && new Date(vehicle.inspectionDue) < new Date() ? "text-red-600 font-medium" : ""}>
                          {formatDate(vehicle.inspectionDue)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingVehicle(vehicle);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this vehicle?")) {
                                deleteVehicleMutation.mutate(vehicle.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <VehicleFormDialog
          mode="edit"
          vehicle={editingVehicle}
          onSubmit={(data) => updateVehicleMutation.mutate({ id: editingVehicle!.id, data })}
          isLoading={updateVehicleMutation.isPending}
        />
      </Dialog>
    </div>
  );
}

interface VehicleFormDialogProps {
  mode: "create" | "edit";
  vehicle?: Vehicle | null;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

function VehicleFormDialog({ mode, vehicle, onSubmit, isLoading }: VehicleFormDialogProps) {
  const [formData, setFormData] = useState({
    vehicleNumber: vehicle?.vehicleNumber || "",
    licensePlate: vehicle?.licensePlate || "",
    year: vehicle?.year || "",
    make: vehicle?.make || "",
    model: vehicle?.model || "",
    color: vehicle?.color || "",
    vin: vehicle?.vin || "",
    vehicleType: vehicle?.vehicleType || "truck",
    capacity: vehicle?.capacity || "",
    status: vehicle?.status || "active",
    currentMileage: vehicle?.currentMileage || "",
    fuelType: vehicle?.fuelType || "",
    insuranceExpiry: vehicle?.insuranceExpiry ? vehicle.insuranceExpiry.split('T')[0] : "",
    registrationExpiry: vehicle?.registrationExpiry ? vehicle.registrationExpiry.split('T')[0] : "",
    inspectionDue: vehicle?.inspectionDue ? vehicle.inspectionDue.split('T')[0] : "",
    notes: vehicle?.notes || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      year: formData.year ? parseInt(formData.year.toString()) : null,
      currentMileage: formData.currentMileage ? parseInt(formData.currentMileage.toString()) : null,
      insuranceExpiry: formData.insuranceExpiry || null,
      registrationExpiry: formData.registrationExpiry || null,
      inspectionDue: formData.inspectionDue || null,
    };

    onSubmit(submitData);
  };

  return (
    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {mode === "create" ? "Add New Vehicle" : "Edit Vehicle"}
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Required Fields */}
          <div className="space-y-2">
            <Label htmlFor="vehicleNumber">Vehicle Number *</Label>
            <Input
              id="vehicleNumber"
              placeholder="e.g., Truck 1, Unit A, Fleet 001"
              value={formData.vehicleNumber}
              onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="licensePlate">License Plate *</Label>
            <Input
              id="licensePlate"
              placeholder="e.g., ABC-1234"
              value={formData.licensePlate}
              onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
              required
            />
          </div>

          {/* Vehicle Details */}
          <div className="space-y-2">
            <Label htmlFor="vehicleType">Vehicle Type</Label>
            <Select value={formData.vehicleType} onValueChange={(value) => setFormData({ ...formData, vehicleType: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="truck">Truck</SelectItem>
                <SelectItem value="van">Van</SelectItem>
                <SelectItem value="trailer">Trailer</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
                <SelectItem value="car">Car</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="out_of_service">Out of Service</SelectItem>
                <SelectItem value="retired">Retired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="year">Year</Label>
            <Input
              id="year"
              type="number"
              placeholder="2020"
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="make">Make</Label>
            <Input
              id="make"
              placeholder="Ford, Chevrolet, etc."
              value={formData.make}
              onChange={(e) => setFormData({ ...formData, make: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Input
              id="model"
              placeholder="F-150, Silverado, etc."
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Color</Label>
            <Input
              id="color"
              placeholder="White, Blue, etc."
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vin">VIN</Label>
            <Input
              id="vin"
              placeholder="Vehicle Identification Number"
              value={formData.vin}
              onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="capacity">Capacity</Label>
            <Input
              id="capacity"
              placeholder="Payload, tank size, etc."
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="currentMileage">Current Mileage</Label>
            <Input
              id="currentMileage"
              type="number"
              placeholder="50000"
              value={formData.currentMileage}
              onChange={(e) => setFormData({ ...formData, currentMileage: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fuelType">Fuel Type</Label>
            <Select value={formData.fuelType} onValueChange={(value) => setFormData({ ...formData, fuelType: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Not specified</SelectItem>
                <SelectItem value="gasoline">Gasoline</SelectItem>
                <SelectItem value="diesel">Diesel</SelectItem>
                <SelectItem value="electric">Electric</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Important Dates */}
          <div className="space-y-2">
            <Label htmlFor="insuranceExpiry">Insurance Expiry</Label>
            <Input
              id="insuranceExpiry"
              type="date"
              value={formData.insuranceExpiry}
              onChange={(e) => setFormData({ ...formData, insuranceExpiry: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="registrationExpiry">Registration Expiry</Label>
            <Input
              id="registrationExpiry"
              type="date"
              value={formData.registrationExpiry}
              onChange={(e) => setFormData({ ...formData, registrationExpiry: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="inspectionDue">Next Inspection Due</Label>
            <Input
              id="inspectionDue"
              type="date"
              value={formData.inspectionDue}
              onChange={(e) => setFormData({ ...formData, inspectionDue: e.target.value })}
            />
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            placeholder="Additional notes about this vehicle..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
          />
        </div>

        <DialogFooter>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : mode === "create" ? "Create Vehicle" : "Update Vehicle"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}