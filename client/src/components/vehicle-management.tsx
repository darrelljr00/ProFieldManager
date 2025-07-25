import React, { useState } from "react";
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
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Plus, Car, Edit, Trash2, Calendar, Fuel, MapPin, Settings, CheckCircle, Clock, AlertTriangle, Save, Wrench, User } from "lucide-react";

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

interface MaintenanceInterval {
  id: number;
  vehicleId: number;
  maintenanceType: string;
  intervalMiles?: number;
  intervalDays?: number;
  lastMaintenanceDate?: string;
  lastMaintenanceMileage?: number;
  nextDueDate?: string;
  nextDueMileage?: number;
  status: string;
  calculatedStatus?: string;
  maintenanceTypeDisplay?: string;
}

interface MaintenanceStatus {
  intervals: MaintenanceInterval[];
  status: MaintenanceInterval[];
}

export function VehicleManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [maintenanceData, setMaintenanceData] = useState<{[vehicleId: number]: MaintenanceInterval[]}>({});
  const [isMaintenanceSetupOpen, setIsMaintenanceSetupOpen] = useState(false);
  const [isInspectionDialogOpen, setIsInspectionDialogOpen] = useState(false);
  const [selectedVehicleForInspection, setSelectedVehicleForInspection] = useState<Vehicle | null>(null);
  const [customIntervals, setCustomIntervals] = useState({
    oilChange: { days: 90, miles: 3000 },
    tirePressure: { days: 30, miles: 0 },
    windshieldWashFluid: { days: 60, miles: 0 },
    oilLevel: { days: 14, miles: 0 },
    coolantLevel: { days: 30, miles: 0 },
    tireRotation: { days: 180, miles: 6000 },
    wiperBlades: { days: 365, miles: 0 }
  });
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

  const createDefaultMaintenanceMutation = useMutation({
    mutationFn: (vehicleId: number) => 
      apiRequest("POST", `/api/vehicles/${vehicleId}/maintenance/default`),
    onSuccess: (data, vehicleId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles", vehicleId, "maintenance"] });
      fetchMaintenanceData();
      toast({
        title: "Success",
        description: "Default maintenance intervals created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create maintenance intervals",
        variant: "destructive",
      });
    },
  });

  // Fetch maintenance data for all vehicles
  const fetchMaintenanceData = async () => {
    if (!vehicles || !Array.isArray(vehicles) || vehicles.length === 0) {
      return;
    }

    try {
      const maintenancePromises = vehicles.map(async (vehicle: Vehicle) => {
        try {
          const data = await apiRequest("GET", `/api/vehicles/${vehicle.id}/maintenance`);
          return { vehicleId: vehicle.id, data: Array.isArray(data.status) ? data.status : [] };
        } catch (error) {
          console.error(`Failed to fetch maintenance for vehicle ${vehicle.id}:`, error);
          return { vehicleId: vehicle.id, data: [] };
        }
      });

      const results = await Promise.all(maintenancePromises);
      const newMaintenanceData: {[vehicleId: number]: MaintenanceInterval[]} = {};
      
      results.forEach(({ vehicleId, data }) => {
        newMaintenanceData[vehicleId] = Array.isArray(data) ? data : [];
      });
      
      setMaintenanceData(newMaintenanceData);
    } catch (error) {
      console.error('Error fetching maintenance data:', error);
    }
  };

  // Fetch maintenance data when vehicles load
  React.useEffect(() => {
    if (vehicles && Array.isArray(vehicles) && vehicles.length > 0) {
      fetchMaintenanceData();
    }
  }, [vehicles]);

  // Handle custom maintenance setup with user-defined intervals
  const handleCustomMaintenanceSetup = async () => {
    if (!vehicles || vehicles.length === 0) {
      toast({
        title: "No Vehicles",
        description: "Please add vehicles before setting up maintenance intervals.",
        variant: "destructive",
      });
      return;
    }

    const vehiclesNeedingSetup = vehicles.filter((vehicle: Vehicle) => {
      const intervals = maintenanceData[vehicle.id];
      return !intervals || intervals.length === 0;
    });

    if (vehiclesNeedingSetup.length === 0) {
      toast({
        title: "All Set",
        description: "All vehicles already have maintenance intervals configured.",
      });
      setIsMaintenanceSetupOpen(false);
      return;
    }

    try {
      // Create custom intervals for each vehicle that needs setup
      for (const vehicle of vehiclesNeedingSetup) {
        const customIntervalsData = [
          { maintenanceType: 'oil_change', intervalDays: customIntervals.oilChange.days, intervalMiles: customIntervals.oilChange.miles },
          { maintenanceType: 'tire_pressure', intervalDays: customIntervals.tirePressure.days, intervalMiles: customIntervals.tirePressure.miles },
          { maintenanceType: 'windshield_wash_fluid', intervalDays: customIntervals.windshieldWashFluid.days, intervalMiles: customIntervals.windshieldWashFluid.miles },
          { maintenanceType: 'oil_level', intervalDays: customIntervals.oilLevel.days, intervalMiles: customIntervals.oilLevel.miles },
          { maintenanceType: 'coolant_level', intervalDays: customIntervals.coolantLevel.days, intervalMiles: customIntervals.coolantLevel.miles },
          { maintenanceType: 'tire_rotation', intervalDays: customIntervals.tireRotation.days, intervalMiles: customIntervals.tireRotation.miles },
          { maintenanceType: 'wiper_blades', intervalDays: customIntervals.wiperBlades.days, intervalMiles: customIntervals.wiperBlades.miles }
        ];

        // Send custom intervals to API
        await apiRequest("POST", `/api/vehicles/${vehicle.id}/maintenance/custom`, { intervals: customIntervalsData });
      }
      
      toast({
        title: "Success",
        description: `Set up custom maintenance intervals for ${vehiclesNeedingSetup.length} vehicle(s).`,
      });
      
      // Refresh maintenance data for all vehicles
      await fetchMaintenanceData();
      setIsMaintenanceSetupOpen(false);
    } catch (error) {
      console.error('Error setting up maintenance intervals:', error);
      toast({
        title: "Error",
        description: "Failed to set up some maintenance intervals. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleInspectVehicle = (vehicle: Vehicle) => {
    setSelectedVehicleForInspection(vehicle);
    setIsInspectionDialogOpen(true);
  };

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

  const getMaintenanceStatusSummary = (vehicleId: number) => {
    const intervals = maintenanceData[vehicleId];
    if (!intervals || !Array.isArray(intervals) || intervals.length === 0) {
      return { completed: 0, due: 0, overdue: 0, total: 0 };
    }

    const summary = intervals.reduce((acc, interval) => {
      if (!interval) return acc;
      const status = interval.calculatedStatus || interval.status;
      if (status === 'completed') acc.completed++;
      else if (status === 'overdue') acc.overdue++;
      else acc.due++;
      return acc;
    }, { completed: 0, due: 0, overdue: 0, total: intervals.length });

    return summary;
  };

  const renderMaintenanceStatus = (vehicleId: number) => {
    const summary = getMaintenanceStatusSummary(vehicleId);
    const intervals = maintenanceData[vehicleId];
    
    if (!intervals || !Array.isArray(intervals) || intervals.length === 0) {
      return (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Not configured</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        {summary.completed > 0 && (
          <div className="flex items-center gap-1">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-600">{summary.completed}</span>
          </div>
        )}
        {summary.due > 0 && (
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-blue-600">{summary.due}</span>
          </div>
        )}
        {summary.overdue > 0 && (
          <div className="flex items-center gap-1">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span className="text-sm text-red-600 font-medium">{summary.overdue}</span>
          </div>
        )}
      </div>
    );
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
          <div className="flex items-center gap-2">
            <Dialog open={isMaintenanceSetupOpen} onOpenChange={setIsMaintenanceSetupOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={vehicles.length === 0}
                  className="whitespace-nowrap"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Setup All Maintenance
                </Button>
              </DialogTrigger>
              <MaintenanceSetupDialog
                customIntervals={customIntervals}
                setCustomIntervals={setCustomIntervals}
                onSetup={handleCustomMaintenanceSetup}
                isLoading={createDefaultMaintenanceMutation.isPending}
                vehicleCount={vehicles.length}
              />
            </Dialog>
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
          </div>
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
                    <TableHead>Maintenance</TableHead>
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
                        {renderMaintenanceStatus(vehicle.id)}
                      </TableCell>
                      <TableCell>
                        {vehicle.currentMileage ? `${vehicle.currentMileage.toLocaleString()} mi` : "Not recorded"}
                      </TableCell>
                      <TableCell className="capitalize">
                        {vehicle.fuelType && vehicle.fuelType !== "not_specified" ? vehicle.fuelType : "Not specified"}
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
                            onClick={() => handleInspectVehicle(vehicle)}
                            title="Inspect Vehicle"
                          >
                            <Wrench className="h-4 w-4 text-blue-600" />
                          </Button>
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

      <Dialog open={isInspectionDialogOpen} onOpenChange={setIsInspectionDialogOpen}>
        <VehicleInspectionDialog
          vehicle={selectedVehicleForInspection}
          maintenanceIntervals={selectedVehicleForInspection ? maintenanceData[selectedVehicleForInspection.id] || [] : []}
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
    fuelType: vehicle?.fuelType || "not_specified",
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
      fuelType: formData.fuelType === "not_specified" ? null : formData.fuelType,
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
                <SelectValue placeholder="Select fuel type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not_specified">Not specified</SelectItem>
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

interface MaintenanceSetupDialogProps {
  customIntervals: any;
  setCustomIntervals: any;
  onSetup: () => void;
  isLoading: boolean;
  vehicleCount: number;
}

function MaintenanceSetupDialog({ customIntervals, setCustomIntervals, onSetup, isLoading, vehicleCount }: MaintenanceSetupDialogProps) {
  const maintenanceTypes = [
    { key: 'oilChange', label: 'Oil Change', defaultDays: 90, defaultMiles: 3000 },
    { key: 'tirePressure', label: 'Tire Pressure Check', defaultDays: 30, defaultMiles: 0 },
    { key: 'windshieldWashFluid', label: 'Windshield Wash Fluid', defaultDays: 60, defaultMiles: 0 },
    { key: 'oilLevel', label: 'Oil Level Check', defaultDays: 14, defaultMiles: 0 },
    { key: 'coolantLevel', label: 'Coolant Level Check', defaultDays: 30, defaultMiles: 0 },
    { key: 'tireRotation', label: 'Tire Rotation', defaultDays: 180, defaultMiles: 6000 },
    { key: 'wiperBlades', label: 'Wiper Blades', defaultDays: 365, defaultMiles: 0 }
  ];

  const updateInterval = (type: string, field: 'days' | 'miles', value: number) => {
    setCustomIntervals((prev: any) => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value
      }
    }));
  };

  const resetToDefaults = () => {
    const defaultIntervals: any = {};
    maintenanceTypes.forEach(type => {
      defaultIntervals[type.key] = {
        days: type.defaultDays,
        miles: type.defaultMiles
      };
    });
    setCustomIntervals(defaultIntervals);
  };

  return (
    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Setup Maintenance Intervals for All Vehicles
        </DialogTitle>
        <p className="text-sm text-muted-foreground">
          Configure maintenance intervals that will be applied to {vehicleCount} vehicle(s) that don't have intervals set up yet.
        </p>
      </DialogHeader>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Maintenance Schedule</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={resetToDefaults}
            disabled={isLoading}
          >
            Reset to Defaults
          </Button>
        </div>

        <div className="grid gap-4">
          {maintenanceTypes.map((type) => (
            <div key={type.key} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">{type.label}</Label>
                <div className="text-xs text-muted-foreground">
                  Default: {type.defaultDays} days{type.defaultMiles > 0 ? ` / ${type.defaultMiles.toLocaleString()} miles` : ''}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`${type.key}-days`} className="text-sm">
                    Interval (Days)
                  </Label>
                  <Input
                    id={`${type.key}-days`}
                    type="number"
                    min="1"
                    max="365"
                    value={customIntervals[type.key]?.days || type.defaultDays}
                    onChange={(e) => updateInterval(type.key, 'days', parseInt(e.target.value) || type.defaultDays)}
                    disabled={isLoading}
                  />
                </div>
                
                <div>
                  <Label htmlFor={`${type.key}-miles`} className="text-sm">
                    Interval (Miles) - Optional
                  </Label>
                  <Input
                    id={`${type.key}-miles`}
                    type="number"
                    min="0"
                    step="100"
                    value={customIntervals[type.key]?.miles || type.defaultMiles}
                    onChange={(e) => updateInterval(type.key, 'miles', parseInt(e.target.value) || 0)}
                    placeholder="0 = Time-based only"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <Separator />

        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <Settings className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-medium text-blue-900 dark:text-blue-100">
                Maintenance Interval Setup
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                These intervals will be applied to all vehicles that don't have maintenance schedules configured yet. 
                You can set both time-based (days) and mileage-based intervals. The system will track which comes first.
              </p>
            </div>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => setCustomIntervals(customIntervals)}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          onClick={onSetup}
          disabled={isLoading}
        >
          <Save className="h-4 w-4 mr-2" />
          {isLoading ? "Setting up..." : "Setup Maintenance Intervals"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

interface VehicleInspectionDialogProps {
  vehicle: Vehicle | null;
  maintenanceIntervals: MaintenanceInterval[];
}

function VehicleInspectionDialog({ vehicle, maintenanceIntervals }: VehicleInspectionDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [user] = useState(() => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    return currentUser;
  });

  // Define all 7 maintenance types
  const maintenanceTypes = [
    { key: 'oil_change', label: 'Oil Change', icon: Fuel },
    { key: 'tire_pressure', label: 'Tire Pressure Check', icon: Car },
    { key: 'windshield_wash_fluid', label: 'Windshield Wash Fluid', icon: Car },
    { key: 'oil_level', label: 'Oil Level Check', icon: Fuel },
    { key: 'coolant_level', label: 'Coolant Level Check', icon: Fuel },
    { key: 'tire_rotation', label: 'Tire Rotation', icon: Car },
    { key: 'wiper_blades', label: 'Wiper Blades', icon: Car }
  ];

  const getMaintenanceItem = (maintenanceType: string) => {
    return maintenanceIntervals.find(interval => interval.maintenanceType === maintenanceType);
  };

  const updateMaintenanceStatusMutation = useMutation({
    mutationFn: async ({ intervalId, status }: { intervalId: number; status: string }) => {
      return apiRequest("PUT", `/api/vehicles/${vehicle?.id}/maintenance/${intervalId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/vehicles/${vehicle?.id}/maintenance`] });
      toast({
        title: "Success",
        description: "Maintenance status updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update maintenance status.",
        variant: "destructive",
      });
    }
  });

  const toggleMaintenanceStatus = (maintenanceType: string) => {
    const item = getMaintenanceItem(maintenanceType);
    if (!item) return;

    const newStatus = item.calculatedStatus === 'completed' ? 'due' : 'completed';
    updateMaintenanceStatusMutation.mutate({ 
      intervalId: item.id, 
      status: newStatus 
    });
  };

  const formatStatusDate = (item: MaintenanceInterval | undefined) => {
    if (!item) return '';
    
    if (item.calculatedStatus === 'completed' && item.lastMaintenanceDate) {
      return `Completed on ${new Date(item.lastMaintenanceDate).toLocaleDateString()}`;
    }
    
    if (item.nextDueDate) {
      return `Due by ${new Date(item.nextDueDate).toLocaleDateString()}`;
    }
    
    return '';
  };

  const getStatusIcon = (item: MaintenanceInterval | undefined) => {
    if (!item) return <Clock className="h-5 w-5 text-gray-400" />;
    
    const status = item.calculatedStatus || item.status;
    
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'overdue':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-blue-600" />;
    }
  };

  const getStatusText = (item: MaintenanceInterval | undefined) => {
    if (!item) return 'Not configured';
    
    const status = item.calculatedStatus || item.status;
    
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'overdue':
        return 'Overdue';
      case 'due':
        return 'Due';
      default:
        return 'Unknown';
    }
  };

  if (!vehicle) return null;

  return (
    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Vehicle Inspection - {vehicle.vehicleNumber} ({vehicle.licensePlate})
        </DialogTitle>
        <p className="text-sm text-muted-foreground">
          Review and update maintenance schedule items for this vehicle. Click to toggle completion status.
        </p>
      </DialogHeader>

      <div className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3">
            <Car className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="font-medium text-blue-900 dark:text-blue-100">
                {vehicle.year && vehicle.make && vehicle.model
                  ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
                  : "Vehicle Details"}
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Current Mileage: {vehicle.currentMileage ? `${vehicle.currentMileage.toLocaleString()} miles` : 'Not recorded'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
            <User className="h-4 w-4" />
            Inspected by: {user.firstName || user.username}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Maintenance Schedule Items</h3>
          
          <div className="grid gap-3">
            {maintenanceTypes.map((type) => {
              const item = getMaintenanceItem(type.key);
              const IconComponent = type.icon;
              
              return (
                <div
                  key={type.key}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                  onClick={() => toggleMaintenanceStatus(type.key)}
                >
                  <div className="flex items-center gap-3">
                    <IconComponent className="h-5 w-5 text-gray-600" />
                    <div>
                      <h4 className="font-medium">{type.label}</h4>
                      {item && (
                        <p className="text-sm text-muted-foreground">
                          {formatStatusDate(item)}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(item)}
                      <span className={`text-sm font-medium ${
                        item?.calculatedStatus === 'completed' ? 'text-green-600' :
                        item?.calculatedStatus === 'overdue' ? 'text-red-600' :
                        'text-blue-600'
                      }`}>
                        {getStatusText(item)}
                      </span>
                    </div>
                    
                    {item?.calculatedStatus === 'completed' && (
                      <div className="text-xs text-muted-foreground">
                        by {user.firstName || user.username}<br />
                        {new Date().toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-medium text-yellow-900 dark:text-yellow-100">
                Inspection Instructions
              </h4>
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Click on any maintenance item to toggle between "Completed" and "Incomplete" status. 
                Completed items will show today's date and your name for accountability. 
                Regular inspections help maintain vehicle safety and performance.
              </p>
            </div>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => {}}
        >
          Close
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}