import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Users,
  Truck,
  Search,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  RefreshCw,
  Eye,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

interface Part {
  id: number;
  name: string;
  description: string | null;
  category: string;
  sku: string | null;
  currentStock: number;
  unit: string;
  imageUrl: string | null;
}

interface Technician {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
  username: string;
  role: string;
}

interface Vehicle {
  id: number;
  vehicleNumber: string;
  make: string | null;
  model: string | null;
}

interface InventoryAssignment {
  id: number;
  userId: number;
  partId: number;
  vehicleId: number | null;
  assignedQuantity: number;
  currentQuantity: number;
  minQuantity: number | null;
  location: string | null;
  isLowStock: boolean;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  user?: Technician;
  part?: Part;
  vehicle?: Vehicle;
}

interface DailyVerification {
  id: number;
  userId: number;
  verificationDate: string;
  status: string;
  isComplete: boolean;
  completedAt: string | null;
  itemsChecked: number;
  totalItems: number;
  discrepancyCount: number;
  notes: string | null;
  user?: Technician;
  vehicle?: Vehicle;
}

export default function AdminInventoryManagement() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("assignments");
  const [searchQuery, setSearchQuery] = useState("");
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [bulkAssignDialogOpen, setBulkAssignDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<InventoryAssignment | null>(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const [formData, setFormData] = useState({
    userId: "",
    partId: "",
    vehicleId: "",
    assignedQuantity: 1,
    minQuantity: 0,
    location: "",
    notes: "",
  });

  const [bulkFormData, setBulkFormData] = useState({
    partId: "",
    userIds: [] as number[],
    vehicleId: "",
    assignedQuantity: 1,
    minQuantity: 0,
  });

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery<InventoryAssignment[]>({
    queryKey: ["/api/admin/technician-inventory"],
  });

  const { data: technicians = [] } = useQuery<Technician[]>({
    queryKey: ["/api/admin/technicians"],
  });

  const { data: parts = [] } = useQuery<Part[]>({
    queryKey: ["/api/parts-supplies"],
  });

  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const { data: verificationSummary } = useQuery({
    queryKey: ["/api/admin/daily-inventory-summary"],
    enabled: activeTab === "verifications",
  });

  const { data: verifications = [] } = useQuery<DailyVerification[]>({
    queryKey: ["/api/admin/daily-inventory-verifications", selectedDate],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/daily-inventory-verifications?date=${selectedDate}`);
      return res.json();
    },
    enabled: activeTab === "verifications",
  });

  const assignMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("/api/admin/technician-inventory", "POST", {
        userId: parseInt(data.userId),
        partId: parseInt(data.partId),
        vehicleId: data.vehicleId ? parseInt(data.vehicleId) : null,
        assignedQuantity: data.assignedQuantity,
        minQuantity: data.minQuantity,
        location: data.location || null,
        notes: data.notes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/technician-inventory"] });
      setAssignDialogOpen(false);
      resetForm();
      toast({
        title: "Inventory Assigned",
        description: "The inventory has been assigned successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign inventory",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<typeof formData & { currentQuantity: number }> }) => {
      return apiRequest(`/api/admin/technician-inventory/${id}`, "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/technician-inventory"] });
      setEditDialogOpen(false);
      setSelectedAssignment(null);
      resetForm();
      toast({
        title: "Assignment Updated",
        description: "The inventory assignment has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update assignment",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/admin/technician-inventory/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/technician-inventory"] });
      toast({
        title: "Assignment Removed",
        description: "The inventory assignment has been removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove assignment",
        variant: "destructive",
      });
    },
  });

  const bulkAssignMutation = useMutation({
    mutationFn: async (data: typeof bulkFormData) => {
      return apiRequest("/api/admin/technician-inventory/bulk-assign", "POST", {
        partId: parseInt(data.partId),
        userIds: data.userIds,
        vehicleId: data.vehicleId ? parseInt(data.vehicleId) : null,
        assignedQuantity: data.assignedQuantity,
        minQuantity: data.minQuantity,
      });
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/technician-inventory"] });
      setBulkAssignDialogOpen(false);
      setBulkFormData({
        partId: "",
        userIds: [],
        vehicleId: "",
        assignedQuantity: 1,
        minQuantity: 0,
      });
      toast({
        title: "Bulk Assignment Complete",
        description: `Inventory assigned to ${response.count || 'multiple'} technicians.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to bulk assign inventory",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      userId: "",
      partId: "",
      vehicleId: "",
      assignedQuantity: 1,
      minQuantity: 0,
      location: "",
      notes: "",
    });
  };

  const handleEdit = (assignment: InventoryAssignment) => {
    setSelectedAssignment(assignment);
    setFormData({
      userId: assignment.userId.toString(),
      partId: assignment.partId.toString(),
      vehicleId: assignment.vehicleId?.toString() || "",
      assignedQuantity: assignment.assignedQuantity,
      minQuantity: assignment.minQuantity || 0,
      location: assignment.location || "",
      notes: assignment.notes || "",
    });
    setEditDialogOpen(true);
  };

  const filteredAssignments = assignments.filter((a) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const techName = `${a.user?.firstName || ""} ${a.user?.lastName || ""}`.toLowerCase();
    const partName = a.part?.name?.toLowerCase() || "";
    const vehicleInfo = a.vehicle ? `${a.vehicle.make} ${a.vehicle.model} ${a.vehicle.vehicleNumber}`.toLowerCase() : "";
    return techName.includes(query) || partName.includes(query) || vehicleInfo.includes(query);
  });

  const getTechnicianName = (tech: Technician | undefined) => {
    if (!tech) return "Unknown";
    if (tech.firstName || tech.lastName) {
      return `${tech.firstName || ""} ${tech.lastName || ""}`.trim();
    }
    return tech.username || tech.email;
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6" data-testid="admin-inventory-management">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Package className="h-7 w-7" />
            Inventory Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Assign and manage technician inventory
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setBulkAssignDialogOpen(true)} variant="outline" data-testid="button-bulk-assign">
            <Users className="h-4 w-4 mr-2" />
            Bulk Assign
          </Button>
          <Button onClick={() => setAssignDialogOpen(true)} data-testid="button-assign-inventory">
            <Plus className="h-4 w-4 mr-2" />
            Assign Inventory
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="assignments" data-testid="tab-assignments">
            <Package className="h-4 w-4 mr-2" />
            Assignments
          </TabsTrigger>
          <TabsTrigger value="verifications" data-testid="tab-verifications">
            <Calendar className="h-4 w-4 mr-2" />
            Daily Verifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assignments" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <CardTitle>Inventory Assignments</CardTitle>
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search assignments..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-assignments"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {assignmentsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : filteredAssignments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No inventory assignments found. Click "Assign Inventory" to get started.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Technician</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>Vehicle</TableHead>
                        <TableHead className="text-center">Assigned</TableHead>
                        <TableHead className="text-center">Current</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAssignments.map((assignment) => (
                        <TableRow key={assignment.id} data-testid={`row-assignment-${assignment.id}`}>
                          <TableCell className="font-medium">
                            {getTechnicianName(assignment.user)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {assignment.part?.imageUrl ? (
                                <img
                                  src={assignment.part.imageUrl}
                                  alt={assignment.part.name}
                                  className="h-8 w-8 rounded object-cover"
                                />
                              ) : (
                                <Package className="h-8 w-8 p-1 bg-muted rounded" />
                              )}
                              <div>
                                <div className="font-medium">{assignment.part?.name}</div>
                                <div className="text-xs text-muted-foreground">{assignment.part?.category}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {assignment.vehicle ? (
                              <div className="flex items-center gap-1">
                                <Truck className="h-4 w-4" />
                                <span>{assignment.vehicle.vehicleNumber}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">{assignment.assignedQuantity}</TableCell>
                          <TableCell className="text-center">
                            <span className={assignment.isLowStock ? "text-red-500 font-medium" : ""}>
                              {assignment.currentQuantity}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            {assignment.isLowStock ? (
                              <Badge variant="destructive">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Low Stock
                              </Badge>
                            ) : assignment.isActive ? (
                              <Badge variant="default">Active</Badge>
                            ) : (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(assignment)}
                                data-testid={`button-edit-${assignment.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  if (confirm("Are you sure you want to remove this assignment?")) {
                                    deleteMutation.mutate(assignment.id);
                                  }
                                }}
                                data-testid={`button-delete-${assignment.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
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
        </TabsContent>

        <TabsContent value="verifications" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{verificationSummary?.totalTechnicians || 0}</div>
                <p className="text-sm text-muted-foreground">Total Technicians</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">{verificationSummary?.completed || 0}</div>
                <p className="text-sm text-muted-foreground">Verified Today</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-yellow-600">{verificationSummary?.pending || 0}</div>
                <p className="text-sm text-muted-foreground">Pending</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-red-600">{verificationSummary?.discrepancies || 0}</div>
                <p className="text-sm text-muted-foreground">Discrepancies</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <CardTitle>Daily Verification Status</CardTitle>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-auto"
                  data-testid="input-verification-date"
                />
              </div>
            </CardHeader>
            <CardContent>
              {verifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No verifications for this date.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Technician</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Items Checked</TableHead>
                      <TableHead className="text-center">Discrepancies</TableHead>
                      <TableHead>Completed At</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {verifications.map((v) => (
                      <TableRow key={v.id} data-testid={`row-verification-${v.id}`}>
                        <TableCell className="font-medium">
                          {getTechnicianName(v.user)}
                        </TableCell>
                        <TableCell>
                          {v.status === "verified" ? (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          ) : v.status === "discrepancy" ? (
                            <Badge variant="destructive">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Discrepancy
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <XCircle className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {v.itemsChecked} / {v.totalItems}
                        </TableCell>
                        <TableCell className="text-center">
                          {v.discrepancyCount > 0 ? (
                            <span className="text-red-600 font-medium">{v.discrepancyCount}</span>
                          ) : (
                            <span className="text-green-600">0</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {v.completedAt
                            ? format(new Date(v.completedAt), "h:mm a")
                            : "-"}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {v.notes || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Inventory</DialogTitle>
            <DialogDescription>
              Assign parts or supplies to a technician or vehicle.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Technician *</Label>
              <Select
                value={formData.userId}
                onValueChange={(v) => setFormData({ ...formData, userId: v })}
              >
                <SelectTrigger data-testid="select-technician">
                  <SelectValue placeholder="Select technician" />
                </SelectTrigger>
                <SelectContent>
                  {technicians.map((tech) => (
                    <SelectItem key={tech.id} value={tech.id.toString()}>
                      {getTechnicianName(tech)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Part / Supply *</Label>
              <Select
                value={formData.partId}
                onValueChange={(v) => setFormData({ ...formData, partId: v })}
              >
                <SelectTrigger data-testid="select-part">
                  <SelectValue placeholder="Select part or supply" />
                </SelectTrigger>
                <SelectContent>
                  {parts.map((part) => (
                    <SelectItem key={part.id} value={part.id.toString()}>
                      {part.name} ({part.category})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Vehicle (Optional)</Label>
              <Select
                value={formData.vehicleId}
                onValueChange={(v) => setFormData({ ...formData, vehicleId: v })}
              >
                <SelectTrigger data-testid="select-vehicle">
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Vehicle</SelectItem>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                      {vehicle.vehicleNumber} - {vehicle.make} {vehicle.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  min={1}
                  value={formData.assignedQuantity}
                  onChange={(e) => setFormData({ ...formData, assignedQuantity: parseInt(e.target.value) || 1 })}
                  data-testid="input-quantity"
                />
              </div>
              <div className="space-y-2">
                <Label>Min Stock Alert</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.minQuantity}
                  onChange={(e) => setFormData({ ...formData, minQuantity: parseInt(e.target.value) || 0 })}
                  data-testid="input-min-quantity"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., Toolbox, Truck Bed"
                data-testid="input-location"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional notes..."
                data-testid="input-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => assignMutation.mutate(formData)}
              disabled={!formData.userId || !formData.partId || assignMutation.isPending}
              data-testid="button-confirm-assign"
            >
              {assignMutation.isPending ? "Assigning..." : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Assignment</DialogTitle>
            <DialogDescription>
              Update the inventory assignment details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Vehicle</Label>
              <Select
                value={formData.vehicleId}
                onValueChange={(v) => setFormData({ ...formData, vehicleId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Vehicle</SelectItem>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                      {vehicle.vehicleNumber} - {vehicle.make} {vehicle.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Assigned Qty</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.assignedQuantity}
                  onChange={(e) => setFormData({ ...formData, assignedQuantity: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Min Stock Alert</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.minQuantity}
                  onChange={(e) => setFormData({ ...formData, minQuantity: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedAssignment) {
                  updateMutation.mutate({
                    id: selectedAssignment.id,
                    data: {
                      assignedQuantity: formData.assignedQuantity,
                      currentQuantity: selectedAssignment.currentQuantity,
                      minQuantity: formData.minQuantity,
                      vehicleId: formData.vehicleId ? parseInt(formData.vehicleId) : null,
                      location: formData.location || null,
                      notes: formData.notes || null,
                    } as any,
                  });
                }
              }}
              disabled={updateMutation.isPending}
              data-testid="button-confirm-edit"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkAssignDialogOpen} onOpenChange={setBulkAssignDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk Assign Inventory</DialogTitle>
            <DialogDescription>
              Assign the same part to multiple technicians at once.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Part / Supply *</Label>
              <Select
                value={bulkFormData.partId}
                onValueChange={(v) => setBulkFormData({ ...bulkFormData, partId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select part or supply" />
                </SelectTrigger>
                <SelectContent>
                  {parts.map((part) => (
                    <SelectItem key={part.id} value={part.id.toString()}>
                      {part.name} ({part.category})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Select Technicians *</Label>
              <div className="border rounded-lg max-h-48 overflow-y-auto p-2 space-y-1">
                {technicians.map((tech) => (
                  <label key={tech.id} className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer">
                    <Checkbox
                      checked={bulkFormData.userIds.includes(tech.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setBulkFormData({
                            ...bulkFormData,
                            userIds: [...bulkFormData.userIds, tech.id],
                          });
                        } else {
                          setBulkFormData({
                            ...bulkFormData,
                            userIds: bulkFormData.userIds.filter((id) => id !== tech.id),
                          });
                        }
                      }}
                    />
                    <span>{getTechnicianName(tech)}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {bulkFormData.userIds.length} technician(s) selected
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity Each</Label>
                <Input
                  type="number"
                  min={1}
                  value={bulkFormData.assignedQuantity}
                  onChange={(e) => setBulkFormData({ ...bulkFormData, assignedQuantity: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Min Stock Alert</Label>
                <Input
                  type="number"
                  min={0}
                  value={bulkFormData.minQuantity}
                  onChange={(e) => setBulkFormData({ ...bulkFormData, minQuantity: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => bulkAssignMutation.mutate(bulkFormData)}
              disabled={!bulkFormData.partId || bulkFormData.userIds.length === 0 || bulkAssignMutation.isPending}
              data-testid="button-confirm-bulk-assign"
            >
              {bulkAssignMutation.isPending ? "Assigning..." : `Assign to ${bulkFormData.userIds.length} Technicians`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
