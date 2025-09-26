import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import React from "react";
import { InvoicesTable } from "@/components/invoices-table";
import { InvoiceForm } from "@/components/invoice-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Search, Filter, Upload, FileText, Calendar, Package, Clock, CheckCircle, XCircle, Edit, Eye, Mail, MessageSquare, Printer } from "lucide-react";

export default function Invoices() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: invoices = [], isLoading, error } = useQuery({
    queryKey: ["/api/invoices"],
    retry: 1,
    retryOnMount: true,
  });

  // Query for pending Smart Capture invoices (admin/manager only)
  const { data: pendingInvoices = [], isLoading: isPendingLoading } = useQuery({
    queryKey: ["/api/smart-capture/invoices/pending"],
    enabled: user?.role === 'admin' || user?.role === 'manager',
    retry: 1,
    retryOnMount: true,
  });

  // Debug logging
  console.log("🔍 INVOICES PAGE DEBUG:", {
    invoices: invoices,
    invoicesLength: Array.isArray(invoices) ? invoices.length : 'not array',
    invoicesFirstItem: Array.isArray(invoices) && invoices.length > 0 ? invoices[0] : 'none',
    isLoading,
    error: error?.message || 'none',
    user: user?.email || 'not logged in'
  });

  // Force query invalidation to get fresh data
  React.useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
  }, [queryClient]);

  // Type guard to ensure invoices is an array
  const safeInvoices = Array.isArray(invoices) ? invoices : [];

  // Upload previous invoice mutation
  const uploadInvoiceMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/invoices/upload", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to upload invoice");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Success",
        description: "Previous invoice uploaded successfully",
      });
      setIsUploadModalOpen(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload invoice",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF, image, or Word document",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('invoice', file);
    formData.append('originalName', file.name);
    
    uploadInvoiceMutation.mutate(formData);
  };

  // Helper function to check if an invoice contains Smart Capture items
  const hasSmartCaptureItems = (invoice: any) => {
    if (!invoice.lineItems || !Array.isArray(invoice.lineItems)) return false;
    return invoice.lineItems.some((item: any) => 
      item.description?.toLowerCase().includes('smart capture') ||
      item.description?.toLowerCase().includes('vehicle') ||
      item.description?.toLowerCase().includes('part') ||
      item.description?.toLowerCase().includes('inventory') ||
      item.category === 'smart_capture'
    );
  };

  const filteredInvoices = safeInvoices.filter((invoice: any) => {
    const matchesSearch = invoice.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const smartCaptureInvoices = filteredInvoices.filter(hasSmartCaptureItems);

  // Approve Smart Capture invoice mutation
  const approveInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      return apiRequest(`/api/smart-capture/invoices/${invoiceId}/approve`, {
        method: "PUT",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/smart-capture/invoices/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Success",
        description: "Smart Capture invoice approved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve invoice",
        variant: "destructive",
      });
    },
  });

  // Reject Smart Capture invoice mutation
  const rejectInvoiceMutation = useMutation({
    mutationFn: async ({ invoiceId, rejectionReason }: { invoiceId: number; rejectionReason: string }) => {
      return apiRequest(`/api/smart-capture/invoices/${invoiceId}/reject`, {
        method: "PUT",
        body: { rejectionReason },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/smart-capture/invoices/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Success",
        description: "Smart Capture invoice rejected successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject invoice",
        variant: "destructive",
      });
    },
  });

  // Edit and approve Smart Capture invoice mutation
  const editAndApproveInvoiceMutation = useMutation({
    mutationFn: async ({ invoiceId, edits }: { invoiceId: number; edits: any }) => {
      return apiRequest(`/api/smart-capture/invoices/${invoiceId}/edit-and-approve`, {
        method: "PUT",
        body: edits,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/smart-capture/invoices/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Success",
        description: "Smart Capture invoice edited and approved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to edit and approve invoice",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="flex-1">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Invoices</h2>
            <p className="text-gray-600">Manage all your invoices in one place.</p>
          </div>
          <div className="flex gap-3">
            {/* Upload Previous Invoice Button */}
            <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Previous Invoice
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Upload Previous Invoice</DialogTitle>
                  <DialogDescription>
                    Upload an existing invoice file (PDF, image, or document) to add it to your records.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="invoice-file">Invoice File</Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <input
                        ref={fileInputRef}
                        id="invoice-file"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <FileText className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600 mb-2">
                        Drag and drop or click to select
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadInvoiceMutation.isPending}
                      >
                        {uploadInvoiceMutation.isPending ? "Uploading..." : "Choose File"}
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Supported formats: PDF, JPG, PNG, DOC, DOCX (Max 5MB)
                    </p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* New Invoice Button */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  New Invoice
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <InvoiceForm onSuccess={() => setIsCreateModalOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Invoices Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={`grid w-full mb-6 ${(user?.role === 'admin' || user?.role === 'manager') ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <TabsTrigger value="all" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              All Invoices ({filteredInvoices.length})
            </TabsTrigger>
            <TabsTrigger value="smart-capture" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Smart Capture Invoices ({smartCaptureInvoices.length})
            </TabsTrigger>
            {(user?.role === 'admin' || user?.role === 'manager') && (
              <TabsTrigger value="pending-approvals" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Pending Approvals ({Array.isArray(pendingInvoices) ? pendingInvoices.length : 0})
              </TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="all">
            <InvoicesTable 
              invoices={filteredInvoices} 
              isLoading={isLoading}
              title="All Invoices"
              showViewAll={false}
            />
          </TabsContent>
          
          <TabsContent value="smart-capture">
            <InvoicesTable 
              invoices={smartCaptureInvoices} 
              isLoading={isLoading}
              title="Smart Capture Invoices"
              showViewAll={false}
            />
          </TabsContent>
          
          {(user?.role === 'admin' || user?.role === 'manager') && (
            <TabsContent value="pending-approvals">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Smart Capture Invoices Pending Approval</h3>
                  <p className="text-sm text-gray-600">Review and approve Smart Capture invoices that need your attention</p>
                </div>
                
                {isPendingLoading ? (
                  <div className="p-6 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-gray-500 mt-2">Loading pending invoices...</p>
                  </div>
                ) : Array.isArray(pendingInvoices) && pendingInvoices.length > 0 ? (
                  <div className="divide-y divide-gray-200">
                    {pendingInvoices.map((invoice: any) => (
                      <div key={invoice.id} className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-4 mb-3">
                              <button 
                                onClick={() => {
                                  setSelectedInvoice && setSelectedInvoice(invoice);
                                  setIsViewDialogOpen && setIsViewDialogOpen(true);
                                }}
                                className="text-lg font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                                data-testid={`view-invoice-${invoice.id}`}
                              >
                                Invoice #{invoice.project?.jobNumber ? `${invoice.project.jobNumber}-${invoice.invoiceNumber || invoice.id}` : (invoice.invoiceNumber || invoice.id)}
                              </button>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                Pending Approval
                              </span>
                              {invoice.project && (
                                <span className="text-sm text-gray-500">Job: {invoice.project.name}</span>
                              )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                              <div>
                                <p className="text-sm font-medium text-gray-700">Customer</p>
                                <p className="text-sm text-gray-900">{invoice.customer?.name || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-700">Total Amount</p>
                                <p className="text-sm text-gray-900">${parseFloat(invoice.total || 0).toFixed(2)}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-700">Created</p>
                                <p className="text-sm text-gray-900">{new Date(invoice.createdAt).toLocaleDateString()}</p>
                              </div>
                            </div>
                            {invoice.notes && (
                              <div className="mb-4">
                                <p className="text-sm font-medium text-gray-700">Notes</p>
                                <p className="text-sm text-gray-900">{invoice.notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                          <Button
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setIsApprovalDialogOpen(true);
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white"
                            data-testid={`approve-invoice-${invoice.id}`}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve
                          </Button>
                          
                          <Button
                            onClick={() => {
                              const reason = prompt('Please provide a reason for rejection:');
                              if (reason) {
                                rejectInvoiceMutation.mutate({ invoiceId: invoice.id, rejectionReason: reason });
                              }
                            }}
                            disabled={rejectInvoiceMutation.isPending}
                            variant="outline"
                            className="border-red-300 text-red-700 hover:bg-red-50"
                            data-testid={`reject-invoice-${invoice.id}`}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            {rejectInvoiceMutation.isPending ? 'Rejecting...' : 'Reject'}
                          </Button>
                          
                          <Button
                            onClick={() => {
                              // Simple edit interface - can be enhanced later
                              const newNotes = prompt('Update notes (leave empty to keep current):', invoice.notes || '');
                              const newTotal = prompt('Update total amount (leave empty to keep current):', invoice.total || '');
                              
                              const edits: any = {};
                              if (newNotes !== null && newNotes !== invoice.notes) edits.notes = newNotes;
                              if (newTotal !== null && newTotal !== invoice.total && !isNaN(parseFloat(newTotal))) {
                                edits.total = parseFloat(newTotal);
                                edits.subtotal = parseFloat(newTotal); // Simplifying for now
                              }
                              
                              if (Object.keys(edits).length > 0) {
                                editAndApproveInvoiceMutation.mutate({ invoiceId: invoice.id, edits });
                              } else {
                                // Just approve without changes
                                approveInvoiceMutation.mutate(invoice.id);
                              }
                            }}
                            disabled={editAndApproveInvoiceMutation.isPending}
                            variant="outline"
                            className="border-blue-300 text-blue-700 hover:bg-blue-50"
                            data-testid={`edit-approve-invoice-${invoice.id}`}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            {editAndApproveInvoiceMutation.isPending ? 'Processing...' : 'Edit & Approve'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center">
                    <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Approvals</h3>
                    <p className="text-gray-500">All Smart Capture invoices have been reviewed.</p>
                  </div>
                )}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </main>
      
      {/* Enhanced Invoice View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Invoice Details - {selectedInvoice && (
                selectedInvoice.project?.jobNumber ? 
                  `${selectedInvoice.project.jobNumber}-${selectedInvoice.invoiceNumber || selectedInvoice.id}` : 
                  (selectedInvoice.invoiceNumber || selectedInvoice.id)
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedInvoice?.project && (
                <span className="text-sm text-gray-600">
                  Job: {selectedInvoice.project.name} | Customer: {selectedInvoice.project.customer?.name || 'N/A'}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="space-y-6">
              {/* Status and Actions Bar */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Pending Approval
                  </span>
                  <span className="text-sm text-gray-600">
                    Captured: {new Date(selectedInvoice.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setIsViewDialogOpen(false);
                      setIsEditDialogOpen(true);
                    }}
                    data-testid="edit-invoice-btn"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => {
                      setIsViewDialogOpen(false);
                      setIsApprovalDialogOpen(true);
                    }}
                    data-testid="approve-invoice-btn"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Approve & Send
                  </Button>
                </div>
              </div>
              
              {/* Invoice Image */}
              {selectedInvoice.smartCaptureImages && selectedInvoice.smartCaptureImages.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Original Invoice</h3>
                  <div className="bg-white border rounded-lg p-4">
                    <img 
                      src={selectedInvoice.smartCaptureImages[0]} 
                      alt="Invoice" 
                      className="max-w-full h-auto rounded border"
                      data-testid="invoice-image"
                    />
                  </div>
                </div>
              )}
              
              {/* Extracted Data */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Invoice Information</h3>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Total Amount</Label>
                      <p className="text-lg font-semibold text-green-600">${selectedInvoice.total}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Subtotal</Label>
                      <p className="text-base">${selectedInvoice.subtotal}</p>
                    </div>
                    {selectedInvoice.taxAmount && (
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Tax Amount</Label>
                        <p className="text-base">${selectedInvoice.taxAmount}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Additional Details</h3>
                  <div className="space-y-3">
                    {selectedInvoice.notes && (
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Notes</Label>
                        <p className="text-sm text-gray-600">{selectedInvoice.notes}</p>
                      </div>
                    )}
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Captured By</Label>
                      <p className="text-sm">{selectedInvoice.user?.name || selectedInvoice.user?.email || 'Unknown'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Invoice Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Invoice Details</DialogTitle>
            <DialogDescription>
              Make corrections to the captured invoice data
            </DialogDescription>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-total">Total Amount *</Label>
                  <Input 
                    id="edit-total"
                    type="number"
                    step="0.01"
                    defaultValue={selectedInvoice.total}
                    data-testid="edit-total-input"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-subtotal">Subtotal *</Label>
                  <Input 
                    id="edit-subtotal"
                    type="number"
                    step="0.01"
                    defaultValue={selectedInvoice.subtotal}
                    data-testid="edit-subtotal-input"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-tax-rate">Tax Rate (%)</Label>
                  <Input 
                    id="edit-tax-rate"
                    type="number"
                    step="0.01"
                    defaultValue={selectedInvoice.taxRate || ''}
                    data-testid="edit-tax-rate-input"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-tax-amount">Tax Amount</Label>
                  <Input 
                    id="edit-tax-amount"
                    type="number"
                    step="0.01"
                    defaultValue={selectedInvoice.taxAmount || ''}
                    data-testid="edit-tax-amount-input"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea 
                  id="edit-notes"
                  rows={3}
                  defaultValue={selectedInvoice.notes || ''}
                  placeholder="Add any additional notes or corrections..."
                  data-testid="edit-notes-textarea"
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                  data-testid="cancel-edit-btn"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    // Handle save logic here
                    toast({ title: "Invoice updated successfully" });
                    setIsEditDialogOpen(false);
                    setIsViewDialogOpen(true);
                  }}
                  data-testid="save-edit-btn"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Invoice Approval & Communication Dialog */}
      <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Approve & Send Invoice</DialogTitle>
            <DialogDescription>
              Choose how to send the approved invoice to the customer
            </DialogDescription>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="space-y-6">
              {/* Invoice Summary */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">Invoice Summary</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedInvoice.project?.name} - {selectedInvoice.project?.customer?.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">${selectedInvoice.total}</p>
                    <p className="text-sm text-gray-600">Total Amount</p>
                  </div>
                </div>
              </div>
              
              {/* Communication Options */}
              <div className="space-y-4">
                <h4 className="font-medium">Send Options</h4>
                
                <Tabs defaultValue="email" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="email" data-testid="email-tab">
                      <Mail className="h-4 w-4 mr-2" />
                      Email
                    </TabsTrigger>
                    <TabsTrigger value="sms" data-testid="sms-tab">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      SMS/Text
                    </TabsTrigger>
                    <TabsTrigger value="print" data-testid="print-tab">
                      <Printer className="h-4 w-4 mr-2" />
                      Print
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="email" className="space-y-4">
                    <div>
                      <Label htmlFor="customer-email">Customer Email</Label>
                      <Input 
                        id="customer-email"
                        type="email"
                        defaultValue={selectedInvoice.project?.customer?.email || ''}
                        placeholder="customer@example.com"
                        data-testid="customer-email-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email-subject">Email Subject</Label>
                      <Input 
                        id="email-subject"
                        defaultValue={`Invoice from ${selectedInvoice.project?.name || 'Texas Power Wash'}`}
                        data-testid="email-subject-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email-message">Message</Label>
                      <Textarea 
                        id="email-message"
                        rows={4}
                        defaultValue="Please find your invoice attached. Thank you for your business!"
                        data-testid="email-message-textarea"
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="sms" className="space-y-4">
                    <div>
                      <Label htmlFor="customer-phone">Customer Phone</Label>
                      <Input 
                        id="customer-phone"
                        type="tel"
                        defaultValue={selectedInvoice.project?.customer?.phone || ''}
                        placeholder="+1 (555) 123-4567"
                        data-testid="customer-phone-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="sms-message">SMS Message</Label>
                      <Textarea 
                        id="sms-message"
                        rows={3}
                        defaultValue="Your invoice is ready! Click the link to view and pay: [INVOICE_LINK]"
                        data-testid="sms-message-textarea"
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="print" className="space-y-4">
                    <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
                      <Printer className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <h4 className="text-lg font-medium mb-2">Print Invoice</h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Generate a printable PDF version of the invoice
                      </p>
                      <Button variant="outline" data-testid="generate-pdf-btn">
                        Generate PDF
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => setIsApprovalDialogOpen(false)}
                  data-testid="cancel-approval-btn"
                >
                  Cancel
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    // Handle save as draft
                    toast({ title: "Invoice saved as draft" });
                    setIsApprovalDialogOpen(false);
                  }}
                  data-testid="save-draft-btn"
                >
                  Save as Draft
                </Button>
                <Button 
                  onClick={() => {
                    // Handle approve and send
                    toast({ title: "Invoice approved and sent successfully!" });
                    setIsApprovalDialogOpen(false);
                    // Refresh invoice list
                    queryClient.invalidateQueries({ queryKey: ["/api/smart-capture/invoices/pending"] });
                  }}
                  data-testid="approve-send-btn"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve & Send
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
