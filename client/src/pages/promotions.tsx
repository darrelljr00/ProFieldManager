import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Copy, Tag, Ticket, BarChart3, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface Promotion {
  id: number;
  organizationId: number;
  name: string;
  description: string | null;
  status: string;
  discountType: string;
  discountValue: string | null;
  startDate: string | null;
  endDate: string | null;
  maxRedemptions: number | null;
  currentRedemptions: number;
  perCustomerLimit: number;
  appliesTo: string;
  minimumPurchase: string | null;
  restrictedToPlanIds: number[] | null;
  recurringDuration: number | null;
  stackable: boolean;
  autoApply: boolean;
  stripeCouponId: string | null;
  stripePromotionCodeId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CouponCode {
  id: number;
  promotionId: number;
  code: string;
  maxRedemptions: number | null;
  currentRedemptions: number;
  isActive: boolean;
  createdAt: string;
  expiresAt: string | null;
}

interface PromotionRedemption {
  id: number;
  promotionId: number;
  couponCodeId: number | null;
  organizationId: number | null;
  userId: number | null;
  customerId: number | null;
  subscriptionId: string | null;
  invoiceId: number | null;
  discountAmount: string;
  originalAmount: string | null;
  status: string;
  redeemedAt: string;
}

export default function PromotionsPage() {
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
  const [activeTab, setActiveTab] = useState("promotions");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "active",
    discountType: "percentage",
    discountValue: "",
    startDate: "",
    endDate: "",
    maxRedemptions: "",
    perCustomerLimit: "1",
    appliesTo: "all",
    minimumPurchase: "",
    stackable: false,
    autoApply: false
  });

  const [codeFormData, setCodeFormData] = useState({
    code: "",
    maxRedemptions: "",
    expiresAt: ""
  });

  const { data: promotions = [], isLoading: promotionsLoading, refetch: refetchPromotions } = useQuery<Promotion[]>({
    queryKey: ["/api/promotions"]
  });

  const { data: promotionWithCodes, isLoading: codesLoading, refetch: refetchCodes } = useQuery<Promotion & { couponCodes: CouponCode[] }>({
    queryKey: ["/api/promotions", selectedPromotion?.id],
    enabled: !!selectedPromotion?.id
  });

  const { data: redemptions = [], isLoading: redemptionsLoading, refetch: refetchRedemptions } = useQuery<PromotionRedemption[]>({
    queryKey: ["/api/promotions", selectedPromotion?.id, "redemptions"],
    enabled: !!selectedPromotion?.id && activeTab === "redemptions"
  });

  const createPromotionMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/promotions", {
        name: data.name,
        description: data.description || null,
        status: data.status,
        discountType: data.discountType,
        discountValue: data.discountValue || null,
        startDate: data.startDate ? new Date(data.startDate).toISOString() : null,
        endDate: data.endDate ? new Date(data.endDate).toISOString() : null,
        maxRedemptions: data.maxRedemptions ? parseInt(data.maxRedemptions) : null,
        perCustomerLimit: parseInt(data.perCustomerLimit) || 1,
        appliesTo: data.appliesTo,
        minimumPurchase: data.minimumPurchase || null,
        stackable: data.stackable,
        autoApply: data.autoApply
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Promotion created successfully" });
      setShowCreateDialog(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["/api/promotions"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create promotion", variant: "destructive" });
    }
  });

  const updatePromotionMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!selectedPromotion) throw new Error("No promotion selected");
      return apiRequest("PUT", `/api/promotions/${selectedPromotion.id}`, {
        name: data.name,
        description: data.description || null,
        status: data.status,
        discountType: data.discountType,
        discountValue: data.discountValue || null,
        startDate: data.startDate ? new Date(data.startDate).toISOString() : null,
        endDate: data.endDate ? new Date(data.endDate).toISOString() : null,
        maxRedemptions: data.maxRedemptions ? parseInt(data.maxRedemptions) : null,
        perCustomerLimit: parseInt(data.perCustomerLimit) || 1,
        appliesTo: data.appliesTo,
        minimumPurchase: data.minimumPurchase || null,
        stackable: data.stackable,
        autoApply: data.autoApply
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Promotion updated successfully" });
      setShowEditDialog(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["/api/promotions"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update promotion", variant: "destructive" });
    }
  });

  const deletePromotionMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/promotions/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Promotion deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/promotions"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete promotion", variant: "destructive" });
    }
  });

  const createCodeMutation = useMutation({
    mutationFn: async (data: typeof codeFormData) => {
      if (!selectedPromotion) throw new Error("No promotion selected");
      return apiRequest("POST", `/api/promotions/${selectedPromotion.id}/codes`, {
        code: data.code,
        maxRedemptions: data.maxRedemptions ? parseInt(data.maxRedemptions) : null,
        expiresAt: data.expiresAt || null
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Coupon code created successfully" });
      setShowCodeDialog(false);
      setCodeFormData({ code: "", maxRedemptions: "", expiresAt: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/promotions", selectedPromotion?.id] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create coupon code", variant: "destructive" });
    }
  });

  const toggleCodeMutation = useMutation({
    mutationFn: async (codeId: number) => {
      return apiRequest("PATCH", `/api/promotions/codes/${codeId}/toggle`);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Coupon code status updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/promotions", selectedPromotion?.id] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to toggle coupon code", variant: "destructive" });
    }
  });

  const deleteCodeMutation = useMutation({
    mutationFn: async (codeId: number) => {
      return apiRequest("DELETE", `/api/promotions/codes/${codeId}`);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Coupon code deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/promotions", selectedPromotion?.id] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete coupon code", variant: "destructive" });
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      status: "active",
      discountType: "percentage",
      discountValue: "",
      startDate: "",
      endDate: "",
      maxRedemptions: "",
      perCustomerLimit: "1",
      appliesTo: "all",
      minimumPurchase: "",
      stackable: false,
      autoApply: false
    });
    setSelectedPromotion(null);
  };

  const handleEditPromotion = (promo: Promotion) => {
    setSelectedPromotion(promo);
    setFormData({
      name: promo.name,
      description: promo.description || "",
      status: promo.status,
      discountType: promo.discountType,
      discountValue: promo.discountValue || "",
      startDate: promo.startDate ? promo.startDate.split('T')[0] : "",
      endDate: promo.endDate ? promo.endDate.split('T')[0] : "",
      maxRedemptions: promo.maxRedemptions?.toString() || "",
      perCustomerLimit: promo.perCustomerLimit?.toString() || "1",
      appliesTo: promo.appliesTo,
      minimumPurchase: promo.minimumPurchase || "",
      stackable: promo.stackable,
      autoApply: promo.autoApply
    });
    setShowEditDialog(true);
  };

  const handleManageCodes = (promo: Promotion) => {
    setSelectedPromotion(promo);
    setActiveTab("codes");
  };

  const copyCodeToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied", description: `Code "${code}" copied to clipboard` });
  };

  const generateRandomCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCodeFormData({ ...codeFormData, code });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500" data-testid="badge-status-active">Active</Badge>;
      case "inactive":
        return <Badge variant="secondary" data-testid="badge-status-inactive">Inactive</Badge>;
      case "expired":
        return <Badge variant="destructive" data-testid="badge-status-expired">Expired</Badge>;
      case "archived":
        return <Badge variant="outline" data-testid="badge-status-archived">Archived</Badge>;
      default:
        return <Badge data-testid="badge-status-unknown">{status}</Badge>;
    }
  };

  const getDiscountDisplay = (promo: Promotion) => {
    if (promo.discountType === "percentage") {
      return `${promo.discountValue}%`;
    } else if (promo.discountType === "fixed_amount") {
      return `$${promo.discountValue}`;
    } else if (promo.discountType === "free_trial") {
      return "Free Trial";
    }
    return promo.discountValue || "-";
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Promotions & Coupons</h1>
          <p className="text-muted-foreground">Create and manage promotional offers and coupon codes</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-promotion">
          <Plus className="w-4 h-4 mr-2" />
          Create Promotion
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="promotions" data-testid="tab-promotions">
            <Tag className="w-4 h-4 mr-2" />
            Promotions
          </TabsTrigger>
          <TabsTrigger value="codes" data-testid="tab-codes" disabled={!selectedPromotion}>
            <Ticket className="w-4 h-4 mr-2" />
            Coupon Codes
          </TabsTrigger>
          <TabsTrigger value="redemptions" data-testid="tab-redemptions" disabled={!selectedPromotion}>
            <BarChart3 className="w-4 h-4 mr-2" />
            Redemptions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="promotions">
          <Card>
            <CardHeader>
              <CardTitle>All Promotions</CardTitle>
              <CardDescription>Manage your promotional offers and discounts</CardDescription>
            </CardHeader>
            <CardContent>
              {promotionsLoading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                </div>
              ) : promotions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Tag className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No promotions yet. Create your first promotion to get started.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Redemptions</TableHead>
                      <TableHead>Validity</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {promotions.map((promo) => (
                      <TableRow key={promo.id} data-testid={`row-promotion-${promo.id}`}>
                        <TableCell>
                          <div>
                            <p className="font-medium" data-testid={`text-promo-name-${promo.id}`}>{promo.name}</p>
                            <p className="text-sm text-muted-foreground">{promo.description}</p>
                          </div>
                        </TableCell>
                        <TableCell data-testid={`text-promo-discount-${promo.id}`}>
                          {getDiscountDisplay(promo)}
                        </TableCell>
                        <TableCell>{getStatusBadge(promo.status)}</TableCell>
                        <TableCell data-testid={`text-promo-redemptions-${promo.id}`}>
                          {promo.currentRedemptions} / {promo.maxRedemptions || "∞"}
                        </TableCell>
                        <TableCell>
                          {promo.startDate || promo.endDate ? (
                            <span className="text-sm">
                              {promo.startDate && format(new Date(promo.startDate), "MMM d, yyyy")}
                              {promo.startDate && promo.endDate && " - "}
                              {promo.endDate && format(new Date(promo.endDate), "MMM d, yyyy")}
                            </span>
                          ) : (
                            "Always"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleManageCodes(promo)}
                              data-testid={`button-manage-codes-${promo.id}`}
                            >
                              <Ticket className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditPromotion(promo)}
                              data-testid={`button-edit-promo-${promo.id}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deletePromotionMutation.mutate(promo.id)}
                              data-testid={`button-delete-promo-${promo.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
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

        <TabsContent value="codes">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Coupon Codes for: {selectedPromotion?.name}</CardTitle>
                <CardDescription>Manage individual coupon codes for this promotion</CardDescription>
              </div>
              <Button onClick={() => setShowCodeDialog(true)} data-testid="button-add-code">
                <Plus className="w-4 h-4 mr-2" />
                Add Code
              </Button>
            </CardHeader>
            <CardContent>
              {codesLoading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                </div>
              ) : !promotionWithCodes?.couponCodes?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Ticket className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No coupon codes yet. Add your first code.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Redemptions</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {promotionWithCodes.couponCodes.map((code) => (
                      <TableRow key={code.id} data-testid={`row-code-${code.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="bg-muted px-2 py-1 rounded font-mono" data-testid={`text-code-${code.id}`}>
                              {code.code}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyCodeToClipboard(code.code)}
                              data-testid={`button-copy-code-${code.id}`}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={code.isActive}
                            onCheckedChange={() => toggleCodeMutation.mutate(code.id)}
                            data-testid={`switch-code-active-${code.id}`}
                          />
                        </TableCell>
                        <TableCell data-testid={`text-code-redemptions-${code.id}`}>
                          {code.currentRedemptions} / {code.maxRedemptions || "∞"}
                        </TableCell>
                        <TableCell>
                          {code.expiresAt ? format(new Date(code.expiresAt), "MMM d, yyyy") : "Never"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteCodeMutation.mutate(code.id)}
                            data-testid={`button-delete-code-${code.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="redemptions">
          <Card>
            <CardHeader>
              <CardTitle>Redemption History for: {selectedPromotion?.name}</CardTitle>
              <CardDescription>Track how your promotion has been used</CardDescription>
            </CardHeader>
            <CardContent>
              {redemptionsLoading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                </div>
              ) : redemptions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No redemptions yet.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Discount Amount</TableHead>
                      <TableHead>Original Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {redemptions.map((redemption) => (
                      <TableRow key={redemption.id} data-testid={`row-redemption-${redemption.id}`}>
                        <TableCell>
                          {format(new Date(redemption.redeemedAt), "MMM d, yyyy h:mm a")}
                        </TableCell>
                        <TableCell data-testid={`text-discount-amount-${redemption.id}`}>
                          ${redemption.discountAmount}
                        </TableCell>
                        <TableCell>
                          {redemption.originalAmount ? `$${redemption.originalAmount}` : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={redemption.status === "applied" ? "default" : "secondary"}>
                            {redemption.status}
                          </Badge>
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

      {/* Create Promotion Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Promotion</DialogTitle>
            <DialogDescription>Set up a new promotional offer for your customers</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Promotion Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Summer Sale 20% Off"
                  data-testid="input-promo-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger data-testid="select-promo-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
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
                placeholder="Describe this promotion..."
                data-testid="input-promo-description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Discount Type</Label>
                <Select value={formData.discountType} onValueChange={(value) => setFormData({ ...formData, discountType: value })}>
                  <SelectTrigger data-testid="select-discount-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage Off</SelectItem>
                    <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                    <SelectItem value="free_trial">Free Trial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="discountValue">
                  {formData.discountType === "percentage" ? "Percentage" : formData.discountType === "fixed_amount" ? "Amount ($)" : "Trial Days"}
                </Label>
                <Input
                  id="discountValue"
                  type="number"
                  value={formData.discountValue}
                  onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                  placeholder={formData.discountType === "percentage" ? "e.g., 20" : "e.g., 50"}
                  data-testid="input-discount-value"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  data-testid="input-start-date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  data-testid="input-end-date"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxRedemptions">Max Redemptions</Label>
                <Input
                  id="maxRedemptions"
                  type="number"
                  value={formData.maxRedemptions}
                  onChange={(e) => setFormData({ ...formData, maxRedemptions: e.target.value })}
                  placeholder="Leave empty for unlimited"
                  data-testid="input-max-redemptions"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="perCustomerLimit">Per Customer Limit</Label>
                <Input
                  id="perCustomerLimit"
                  type="number"
                  value={formData.perCustomerLimit}
                  onChange={(e) => setFormData({ ...formData, perCustomerLimit: e.target.value })}
                  data-testid="input-per-customer-limit"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Applies To</Label>
                <Select value={formData.appliesTo} onValueChange={(value) => setFormData({ ...formData, appliesTo: value })}>
                  <SelectTrigger data-testid="select-applies-to">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Customers</SelectItem>
                    <SelectItem value="new_customers">New Customers Only</SelectItem>
                    <SelectItem value="existing_customers">Existing Customers Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="minimumPurchase">Minimum Purchase ($)</Label>
                <Input
                  id="minimumPurchase"
                  type="number"
                  value={formData.minimumPurchase}
                  onChange={(e) => setFormData({ ...formData, minimumPurchase: e.target.value })}
                  placeholder="Leave empty for no minimum"
                  data-testid="input-min-purchase"
                />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="stackable"
                  checked={formData.stackable}
                  onCheckedChange={(checked) => setFormData({ ...formData, stackable: checked })}
                  data-testid="switch-stackable"
                />
                <Label htmlFor="stackable">Stackable with other promotions</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="autoApply"
                  checked={formData.autoApply}
                  onCheckedChange={(checked) => setFormData({ ...formData, autoApply: checked })}
                  data-testid="switch-auto-apply"
                />
                <Label htmlFor="autoApply">Auto-apply without code</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateDialog(false); resetForm(); }}>
              Cancel
            </Button>
            <Button
              onClick={() => createPromotionMutation.mutate(formData)}
              disabled={createPromotionMutation.isPending}
              data-testid="button-save-promotion"
            >
              {createPromotionMutation.isPending ? "Creating..." : "Create Promotion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Promotion Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Promotion</DialogTitle>
            <DialogDescription>Update the promotion details</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Promotion Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  data-testid="input-edit-promo-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger data-testid="select-edit-promo-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                data-testid="input-edit-promo-description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Discount Type</Label>
                <Select value={formData.discountType} onValueChange={(value) => setFormData({ ...formData, discountType: value })}>
                  <SelectTrigger data-testid="select-edit-discount-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage Off</SelectItem>
                    <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                    <SelectItem value="free_trial">Free Trial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-discountValue">
                  {formData.discountType === "percentage" ? "Percentage" : formData.discountType === "fixed_amount" ? "Amount ($)" : "Trial Days"}
                </Label>
                <Input
                  id="edit-discountValue"
                  type="number"
                  value={formData.discountValue}
                  onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                  data-testid="input-edit-discount-value"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-startDate">Start Date</Label>
                <Input
                  id="edit-startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  data-testid="input-edit-start-date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-endDate">End Date</Label>
                <Input
                  id="edit-endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  data-testid="input-edit-end-date"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-maxRedemptions">Max Redemptions</Label>
                <Input
                  id="edit-maxRedemptions"
                  type="number"
                  value={formData.maxRedemptions}
                  onChange={(e) => setFormData({ ...formData, maxRedemptions: e.target.value })}
                  placeholder="Leave empty for unlimited"
                  data-testid="input-edit-max-redemptions"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-perCustomerLimit">Per Customer Limit</Label>
                <Input
                  id="edit-perCustomerLimit"
                  type="number"
                  value={formData.perCustomerLimit}
                  onChange={(e) => setFormData({ ...formData, perCustomerLimit: e.target.value })}
                  data-testid="input-edit-per-customer-limit"
                />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-stackable"
                  checked={formData.stackable}
                  onCheckedChange={(checked) => setFormData({ ...formData, stackable: checked })}
                  data-testid="switch-edit-stackable"
                />
                <Label htmlFor="edit-stackable">Stackable</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-autoApply"
                  checked={formData.autoApply}
                  onCheckedChange={(checked) => setFormData({ ...formData, autoApply: checked })}
                  data-testid="switch-edit-auto-apply"
                />
                <Label htmlFor="edit-autoApply">Auto-apply</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditDialog(false); resetForm(); }}>
              Cancel
            </Button>
            <Button
              onClick={() => updatePromotionMutation.mutate(formData)}
              disabled={updatePromotionMutation.isPending}
              data-testid="button-update-promotion"
            >
              {updatePromotionMutation.isPending ? "Updating..." : "Update Promotion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Coupon Code Dialog */}
      <Dialog open={showCodeDialog} onOpenChange={setShowCodeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Coupon Code</DialogTitle>
            <DialogDescription>Create a new coupon code for this promotion</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code">Coupon Code</Label>
              <div className="flex gap-2">
                <Input
                  id="code"
                  value={codeFormData.code}
                  onChange={(e) => setCodeFormData({ ...codeFormData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., SAVE20"
                  className="font-mono uppercase"
                  data-testid="input-coupon-code"
                />
                <Button type="button" variant="outline" onClick={generateRandomCode} data-testid="button-generate-code">
                  Generate
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="codeMaxRedemptions">Max Redemptions</Label>
              <Input
                id="codeMaxRedemptions"
                type="number"
                value={codeFormData.maxRedemptions}
                onChange={(e) => setCodeFormData({ ...codeFormData, maxRedemptions: e.target.value })}
                placeholder="Leave empty for unlimited"
                data-testid="input-code-max-redemptions"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="codeExpiresAt">Expires At</Label>
              <Input
                id="codeExpiresAt"
                type="date"
                value={codeFormData.expiresAt}
                onChange={(e) => setCodeFormData({ ...codeFormData, expiresAt: e.target.value })}
                data-testid="input-code-expires"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCodeDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createCodeMutation.mutate(codeFormData)}
              disabled={createCodeMutation.isPending || !codeFormData.code}
              data-testid="button-save-code"
            >
              {createCodeMutation.isPending ? "Creating..." : "Create Code"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
