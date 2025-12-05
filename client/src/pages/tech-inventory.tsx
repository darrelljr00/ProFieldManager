import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useDailyFlowReturn } from "@/hooks/useDailyFlowReturn";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Package,
  AlertTriangle,
  Minus,
  Plus,
  History,
  Search,
  Truck,
  MapPin,
  RefreshCw,
  CheckCircle,
  ClipboardCheck,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface TechnicianInventoryItem {
  id: number;
  userId: number;
  organizationId: number;
  partId: number;
  assignedQuantity: number;
  currentQuantity: number;
  minQuantity: number | null;
  location: string | null;
  vehicleId: number | null;
  isActive: boolean;
  isLowStock: boolean;
  lastRestockedAt: string | null;
  lastUsedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  part?: {
    id: number;
    name: string;
    description: string | null;
    category: string;
    sku: string | null;
    unit: string;
    imageUrl: string | null;
  };
  vehicle?: {
    id: number;
    vehicleNumber: string;
    make: string | null;
    model: string | null;
  };
}

interface Transaction {
  id: number;
  type: string;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  notes: string | null;
  createdAt: string;
}

interface VerificationDetail {
  partId: number;
  partName: string;
  expectedQty: number;
  actualQty: number;
  confirmed: boolean;
  notes?: string;
}

interface DailyVerificationStatus {
  verification: any;
  inventory: TechnicianInventoryItem[];
  totalItems: number;
  isComplete: boolean;
}

export default function TechInventory() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { isFromDailyFlow, completeAndReturn, isPending: isDailyFlowPending } = useDailyFlowReturn();
  const [searchQuery, setSearchQuery] = useState("");
  const [useItemDialogOpen, setUseItemDialogOpen] = useState(false);
  const [restockDialogOpen, setRestockDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TechnicianInventoryItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [verificationDetails, setVerificationDetails] = useState<VerificationDetail[]>([]);
  const [verificationNotes, setVerificationNotes] = useState("");

  const { data: inventory = [], isLoading } = useQuery<TechnicianInventoryItem[]>({
    queryKey: ["/api/technician-inventory"],
  });

  const { data: verificationStatus, isLoading: isVerificationLoading } = useQuery<DailyVerificationStatus>({
    queryKey: ["/api/daily-inventory-verification"],
    staleTime: 5000,
  });

  const isVerifiedToday = verificationStatus?.isComplete === true;

  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ["/api/technician-inventory", selectedItem?.id, "transactions"],
    enabled: !!selectedItem && historyDialogOpen,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, type, quantity, notes }: { id: number; type: string; quantity: number; notes: string }) => {
      return apiRequest(`/api/technician-inventory/${id}`, "PATCH", { type, quantity, notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/technician-inventory"] });
      setUseItemDialogOpen(false);
      setRestockDialogOpen(false);
      setQuantity(1);
      setNotes("");
      toast({
        title: "Inventory Updated",
        description: "Your inventory has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update inventory",
        variant: "destructive",
      });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (data: { verificationDetails: VerificationDetail[]; notes: string }) => {
      return apiRequest("/api/daily-inventory-verification", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-inventory-verification"] });
      queryClient.invalidateQueries({ queryKey: ["/api/technician-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/technician-daily-flow"] });
      setConfirmDialogOpen(false);
      setVerificationDetails([]);
      setVerificationNotes("");
      toast({
        title: "Inventory Confirmed",
        description: "Your daily inventory verification has been submitted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit verification",
        variant: "destructive",
      });
    },
  });

  const filteredInventory = inventory.filter((item) => {
    const partName = item.part?.name?.toLowerCase() || "";
    const category = item.part?.category?.toLowerCase() || "";
    const location = item.location?.toLowerCase() || "";
    const query = searchQuery.toLowerCase();
    return partName.includes(query) || category.includes(query) || location.includes(query);
  });

  const lowStockItems = filteredInventory.filter((item) => item.isLowStock);
  const totalItems = filteredInventory.length;
  const totalQuantity = filteredInventory.reduce((sum, item) => sum + (item.currentQuantity || 0), 0);

  const handleUseItem = (item: TechnicianInventoryItem) => {
    setSelectedItem(item);
    setQuantity(1);
    setNotes("");
    setUseItemDialogOpen(true);
  };

  const handleRequestRestock = (item: TechnicianInventoryItem) => {
    setSelectedItem(item);
    setQuantity(item.minQuantity ? Math.max(1, item.minQuantity - item.currentQuantity) : 5);
    setNotes("");
    setRestockDialogOpen(true);
  };

  const handleViewHistory = (item: TechnicianInventoryItem) => {
    setSelectedItem(item);
    setHistoryDialogOpen(true);
  };

  const handleOpenConfirmDialog = () => {
    if (isLoading || inventory.length === 0) {
      toast({
        title: "Not Ready",
        description: "Please wait for inventory to load.",
        variant: "destructive",
      });
      return;
    }
    const details = inventory.map((item) => ({
      partId: item.partId,
      partName: item.part?.name || "Unknown Item",
      expectedQty: item.currentQuantity,
      actualQty: item.currentQuantity,
      confirmed: true,
      notes: "",
    }));
    setVerificationDetails(details);
    setVerificationNotes("");
    setConfirmDialogOpen(true);
  };

  const handleQuantityChange = (partId: number, newQty: number) => {
    setVerificationDetails((prev) =>
      prev.map((d) =>
        d.partId === partId ? { ...d, actualQty: Math.max(0, newQty) } : d
      )
    );
  };

  const handleConfirmToggle = (partId: number, confirmed: boolean) => {
    setVerificationDetails((prev) =>
      prev.map((d) =>
        d.partId === partId ? { ...d, confirmed } : d
      )
    );
  };

  const handleItemNoteChange = (partId: number, notes: string) => {
    setVerificationDetails((prev) =>
      prev.map((d) =>
        d.partId === partId ? { ...d, notes } : d
      )
    );
  };

  const submitVerification = () => {
    const allConfirmed = verificationDetails.every((d) => d.confirmed);
    if (!allConfirmed) {
      toast({
        title: "Incomplete Verification",
        description: "Please confirm all items before submitting.",
        variant: "destructive",
      });
      return;
    }
    verifyMutation.mutate({
      verificationDetails,
      notes: verificationNotes,
    });
  };

  const confirmUseItem = () => {
    if (!selectedItem) return;
    updateMutation.mutate({
      id: selectedItem.id,
      type: "use",
      quantity,
      notes,
    });
  };

  const confirmRestock = () => {
    if (!selectedItem) return;
    updateMutation.mutate({
      id: selectedItem.id,
      type: "restock",
      quantity,
      notes: notes || "Restocked by technician",
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {isFromDailyFlow && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">Daily Flow: Check Inventory</p>
              <p className="text-sm text-muted-foreground">Review your parts and supplies then click "Done" to continue</p>
            </div>
            <Button
              onClick={completeAndReturn}
              disabled={isDailyFlowPending}
              data-testid="button-complete-daily-flow-step"
            >
              {isDailyFlowPending ? "Saving..." : "Done - Return to Daily Flow"}
            </Button>
          </CardContent>
        </Card>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Tech Inventory</h1>
          <p className="text-muted-foreground">
            View and confirm your assigned parts and supplies
          </p>
        </div>
        {inventory.length > 0 && (
          <Button
            onClick={handleOpenConfirmDialog}
            disabled={isVerifiedToday || isVerificationLoading}
            className="gap-2"
            data-testid="button-confirm-inventory"
          >
            {isVerificationLoading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : isVerifiedToday ? (
              <>
                <CheckCircle className="h-4 w-4" />
                Confirmed Today
              </>
            ) : (
              <>
                <ClipboardCheck className="h-4 w-4" />
                Confirm Inventory
              </>
            )}
          </Button>
        )}
      </div>

      {isVerifiedToday && (
        <Card className="border-green-500 bg-green-50 dark:bg-green-950/20">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-green-800 dark:text-green-400">Daily Inventory Confirmed</p>
              <p className="text-sm text-green-700 dark:text-green-500">
                You have verified your inventory for today
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{totalItems}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Quantity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{totalQuantity}</span>
            </div>
          </CardContent>
        </Card>
        <Card className={lowStockItems.length > 0 ? "border-yellow-500" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className={`h-5 w-5 ${lowStockItems.length > 0 ? "text-yellow-500" : "text-muted-foreground"}`} />
              <span className="text-2xl font-bold">{lowStockItems.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>My Inventory</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
                data-testid="input-search"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredInventory.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Items Found</h3>
              <p className="text-muted-foreground">
                {searchQuery
                  ? "No items match your search."
                  : "You don't have any inventory items assigned yet."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-center">Quantity</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInventory.map((item) => (
                    <TableRow key={item.id} data-testid={`row-inventory-${item.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {item.part?.imageUrl ? (
                            <img
                              src={item.part.imageUrl}
                              alt={item.part.name}
                              className="h-10 w-10 rounded object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                              <Package className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{item.part?.name || "Unknown Item"}</p>
                            {item.part?.sku && (
                              <p className="text-xs text-muted-foreground">SKU: {item.part.sku}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.part?.category || "Uncategorized"}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {item.location && (
                            <div className="flex items-center gap-1 text-sm">
                              <MapPin className="h-3 w-3" />
                              {item.location}
                            </div>
                          )}
                          {item.vehicle && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Truck className="h-3 w-3" />
                              {item.vehicle.vehicleNumber}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-bold text-lg">{item.currentQuantity}</span>
                        <span className="text-muted-foreground text-sm"> / {item.assignedQuantity}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        {item.isLowStock ? (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Low Stock
                          </Badge>
                        ) : item.currentQuantity === 0 ? (
                          <Badge variant="destructive">Out of Stock</Badge>
                        ) : (
                          <Badge variant="secondary">In Stock</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUseItem(item)}
                            disabled={item.currentQuantity === 0}
                            data-testid={`button-use-${item.id}`}
                          >
                            <Minus className="h-4 w-4 mr-1" />
                            Use
                          </Button>
                          {(user?.role === "admin" || user?.role === "manager") && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRequestRestock(item)}
                              data-testid={`button-restock-${item.id}`}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Restock
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewHistory(item)}
                            data-testid={`button-history-${item.id}`}
                          >
                            <History className="h-4 w-4" />
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

      <Dialog open={useItemDialogOpen} onOpenChange={setUseItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Use Item</DialogTitle>
            <DialogDescription>
              Record usage of {selectedItem?.part?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="use-quantity">Quantity to Use</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  data-testid="button-decrease-quantity"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  id="use-quantity"
                  type="number"
                  min={1}
                  max={selectedItem?.currentQuantity || 1}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.min(parseInt(e.target.value) || 1, selectedItem?.currentQuantity || 1))}
                  className="w-20 text-center"
                  data-testid="input-use-quantity"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.min(quantity + 1, selectedItem?.currentQuantity || 1))}
                  data-testid="button-increase-quantity"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Available: {selectedItem?.currentQuantity || 0} {selectedItem?.part?.unit || "units"}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="use-notes">Notes (optional)</Label>
              <Textarea
                id="use-notes"
                placeholder="Add notes about this usage..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                data-testid="input-use-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUseItemDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmUseItem}
              disabled={updateMutation.isPending}
              data-testid="button-confirm-use"
            >
              {updateMutation.isPending ? "Updating..." : "Confirm Use"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={restockDialogOpen} onOpenChange={setRestockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restock Item</DialogTitle>
            <DialogDescription>
              Add stock for {selectedItem?.part?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="restock-quantity">Quantity to Add</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  id="restock-quantity"
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-20 text-center"
                  data-testid="input-restock-quantity"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Current: {selectedItem?.currentQuantity || 0} → New: {(selectedItem?.currentQuantity || 0) + quantity}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="restock-notes">Notes</Label>
              <Textarea
                id="restock-notes"
                placeholder="Restock reason or source..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                data-testid="input-restock-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestockDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmRestock}
              disabled={updateMutation.isPending}
              data-testid="button-confirm-restock"
            >
              {updateMutation.isPending ? "Updating..." : "Confirm Restock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Usage History</DialogTitle>
            <DialogDescription>
              Transaction history for {selectedItem?.part?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No transaction history found.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-center">Change</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-sm">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={tx.type === "use" ? "destructive" : tx.type === "restock" ? "default" : "secondary"}
                        >
                          {tx.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={tx.type === "use" ? "text-red-600" : "text-green-600"}>
                          {tx.type === "use" ? "-" : "+"}{tx.quantity}
                        </span>
                        <span className="text-muted-foreground text-sm ml-1">
                          ({tx.previousQuantity} → {tx.newQuantity})
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {tx.notes || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Daily Inventory Verification
            </DialogTitle>
            <DialogDescription>
              Confirm your inventory counts. Check each item and adjust quantities if needed.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4">
            {verificationDetails.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No inventory items to verify.
              </div>
            ) : (
              <div className="space-y-4">
                {verificationDetails.map((detail) => (
                  <div
                    key={detail.partId}
                    className={`p-4 border rounded-lg ${
                      detail.confirmed
                        ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20"
                        : "border-border"
                    }`}
                    data-testid={`verification-item-${detail.partId}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={detail.confirmed}
                          onCheckedChange={(checked) =>
                            handleConfirmToggle(detail.partId, checked as boolean)
                          }
                          data-testid={`checkbox-confirm-${detail.partId}`}
                        />
                        <div>
                          <p className="font-medium">{detail.partName}</p>
                          <p className="text-sm text-muted-foreground">
                            Expected: {detail.expectedQty}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm text-muted-foreground">Actual:</Label>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              handleQuantityChange(detail.partId, detail.actualQty - 1)
                            }
                            data-testid={`button-decrease-${detail.partId}`}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            min={0}
                            value={detail.actualQty}
                            onChange={(e) =>
                              handleQuantityChange(
                                detail.partId,
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-16 h-8 text-center"
                            data-testid={`input-quantity-${detail.partId}`}
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              handleQuantityChange(detail.partId, detail.actualQty + 1)
                            }
                            data-testid={`button-increase-${detail.partId}`}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    {detail.expectedQty !== detail.actualQty && (
                      <div className="mt-3 pl-7">
                        <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 mb-2">
                          <AlertTriangle className="h-4 w-4" />
                          Quantity mismatch detected
                        </div>
                        <Input
                          placeholder="Add note for this discrepancy..."
                          value={detail.notes || ""}
                          onChange={(e) =>
                            handleItemNoteChange(detail.partId, e.target.value)
                          }
                          className="text-sm"
                          data-testid={`input-note-${detail.partId}`}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 space-y-2">
              <Label>Additional Notes (optional)</Label>
              <Textarea
                placeholder="Add any additional notes about today's inventory check..."
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                data-testid="input-verification-notes"
              />
            </div>
          </div>
          <DialogFooter className="border-t pt-4">
            <div className="flex items-center justify-between w-full">
              <div className="text-sm text-muted-foreground">
                {verificationDetails.filter((d) => d.confirmed).length} of{" "}
                {verificationDetails.length} items confirmed
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setConfirmDialogOpen(false)}
                  data-testid="button-cancel-verification"
                >
                  Cancel
                </Button>
                <Button
                  onClick={submitVerification}
                  disabled={
                    verifyMutation.isPending ||
                    !verificationDetails.every((d) => d.confirmed)
                  }
                  className="gap-2"
                  data-testid="button-submit-verification"
                >
                  {verifyMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Submit Verification
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
