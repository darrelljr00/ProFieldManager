import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, Download, MoreHorizontal, Send, CheckCircle, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Invoice, Customer, InvoiceLineItem } from "@shared/schema";

interface InvoicesTableProps {
  invoices: (Invoice & { customer: Customer; lineItems: InvoiceLineItem[] })[];
  isLoading?: boolean;
  title: string;
  showViewAll?: boolean;
}

export function InvoicesTable({ invoices, isLoading, title, showViewAll }: InvoicesTableProps) {
  const { toast } = useToast();
  const [selectedInvoice, setSelectedInvoice] = useState<(Invoice & { customer: Customer; lineItems: InvoiceLineItem[] }) | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Fetch company settings for logo and company info
  const { data: companySettings } = useQuery({
    queryKey: ['/api/settings', 'company'],
    queryFn: async () => {
      const response = await fetch('/api/settings?category=company', {
        credentials: 'include'
      });
      if (!response.ok) return [];
      return response.json();
    },
  });

  const sendInvoiceMutation = useMutation({
    mutationFn: (invoiceId: number) => apiRequest(`/api/invoices/${invoiceId}/send`, "POST"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Success",
        description: "Invoice sent successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send invoice",
        variant: "destructive",
      });
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: (invoiceId: number) => apiRequest(`/api/invoices/${invoiceId}/mark-paid`, "POST", {
      method: "manual",
      notes: "Marked as paid manually"
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Invoice marked as paid",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark invoice as paid",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'sent': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatSafeDate = (dateValue: string | Date | null | undefined, fallback: string = 'N/A'): string => {
    if (!dateValue) return fallback;
    
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return fallback;
      return format(date, 'MMM dd, yyyy');
    } catch (error) {
      console.error('Date formatting error:', error);
      return fallback;
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
        <CardHeader className="border-b border-gray-200">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-900">{title}</CardTitle>
            {showViewAll && (
              <Button variant="ghost" className="text-primary hover:text-blue-700 font-medium text-sm">
                View All <ArrowRight className="ml-1 w-4 h-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {invoices.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No invoices found</p>
            </div>
          ) : (
            <div className="overflow-x-auto mobile-table-container">
              <table className="w-full mobile-table">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice
                    </th>
                    <th className="hidden sm:table-cell px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{invoice.invoiceNumber}</div>
                        <div className="text-sm text-gray-500">
                          {formatSafeDate(invoice.invoiceDate)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{invoice.customer?.name || 'N/A'}</div>
                        <div className="text-sm text-gray-500">{invoice.customer?.email || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${parseFloat(invoice.total).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={getStatusColor(invoice.status)}>
                          {invoice.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatSafeDate(invoice.dueDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex items-center justify-end space-x-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setIsViewDialogOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Download className="w-4 h-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {invoice.status === 'draft' && (
                                <DropdownMenuItem 
                                  onClick={() => sendInvoiceMutation.mutate(invoice.id)}
                                  disabled={sendInvoiceMutation.isPending}
                                >
                                  <Send className="w-4 h-4 mr-2" />
                                  Send Invoice
                                </DropdownMenuItem>
                              )}
                              {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                                <DropdownMenuItem 
                                  onClick={() => markPaidMutation.mutate(invoice.id)}
                                  disabled={markPaidMutation.isPending}
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Mark as Paid
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-6">
              {/* Company Header with Logo */}
              <div className="flex justify-between items-start border-b pb-6">
                <div className="flex items-center space-x-4">
                  {Array.isArray(companySettings) && companySettings.find((s: any) => s.key === 'logo')?.value && (
                    <img 
                      src={companySettings.find((s: any) => s.key === 'logo')?.value || "/uploads/logo-1749855277221-54980640.jpg"} 
                      alt="Company Logo" 
                      className={`object-contain ${
                        Array.isArray(companySettings) && companySettings.find((s: any) => s.key === 'logoSize')?.value === 'small' ? 'h-12 w-12' :
                        Array.isArray(companySettings) && companySettings.find((s: any) => s.key === 'logoSize')?.value === 'large' ? 'h-24 w-24' :
                        Array.isArray(companySettings) && companySettings.find((s: any) => s.key === 'logoSize')?.value === 'xlarge' ? 'h-32 w-32' :
                        'h-16 w-16'
                      }`}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {Array.isArray(companySettings) && companySettings.find((s: any) => s.key === 'name')?.value || "Your Company Name"}
                    </h2>
                    <p className="text-sm text-gray-600">
                      {Array.isArray(companySettings) && companySettings.find((s: any) => s.key === 'address')?.value || "123 Business Street"}
                    </p>
                    <p className="text-sm text-gray-600">
                      {Array.isArray(companySettings) && companySettings.find((s: any) => s.key === 'city')?.value || "City"}, {Array.isArray(companySettings) && companySettings.find((s: any) => s.key === 'state')?.value || "State"} {Array.isArray(companySettings) && companySettings.find((s: any) => s.key === 'zip')?.value || "12345"}
                    </p>
                    <p className="text-sm text-gray-600">
                      Phone: {Array.isArray(companySettings) && companySettings.find((s: any) => s.key === 'phone')?.value || "(555) 123-4567"}
                    </p>
                    {Array.isArray(companySettings) && companySettings.find((s: any) => s.key === 'email')?.value && (
                      <p className="text-sm text-gray-600">
                        Email: {companySettings.find((s: any) => s.key === 'email')?.value}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <h1 className="text-3xl font-bold text-gray-900">INVOICE</h1>
                  <p className="text-lg text-gray-600">#{selectedInvoice.invoiceNumber}</p>
                </div>
              </div>

              {/* Invoice Header */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Invoice Information</h3>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Invoice Number</Label>
                      <p className="text-sm">{selectedInvoice.invoiceNumber}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Status</Label>
                      <div>
                        <Badge className={getStatusColor(selectedInvoice.status)}>
                          {selectedInvoice.status}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Invoice Date</Label>
                      <p className="text-sm">{formatSafeDate(selectedInvoice.invoiceDate)}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Due Date</Label>
                      <p className="text-sm">{formatSafeDate(selectedInvoice.dueDate)}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Customer Information</h3>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Customer Name</Label>
                      <p className="text-sm">{selectedInvoice.customer?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Email</Label>
                      <p className="text-sm">{selectedInvoice.customer?.email || 'N/A'}</p>
                    </div>
                    {selectedInvoice.customer?.phone && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Phone</Label>
                        <p className="text-sm">{selectedInvoice.customer.phone}</p>
                      </div>
                    )}
                    {selectedInvoice.customer?.address && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Address</Label>
                        <p className="text-sm">{selectedInvoice.customer.address}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Line Items</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedInvoice.lineItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">${parseFloat(item.rate).toFixed(2)}</TableCell>
                        <TableCell className="text-right">${parseFloat(item.amount).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Totals */}
              <div className="border-t pt-4">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Subtotal:</span>
                      <span className="text-sm">${parseFloat(selectedInvoice.subtotal).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Tax:</span>
                      <span className="text-sm">${parseFloat(selectedInvoice.taxAmount || '0').toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-semibold">Total:</span>
                      <span className="font-semibold">${parseFloat(selectedInvoice.total).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedInvoice.notes && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Notes</h3>
                  <p className="text-sm text-gray-600">{selectedInvoice.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
