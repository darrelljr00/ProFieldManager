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
import { Eye, Download, MoreHorizontal, Send, CheckCircle, ArrowRight, Clock, X, AlertTriangle, Mail, MessageSquare } from "lucide-react";
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
  const { data: companySettings, isLoading: companySettingsLoading, error: companyError } = useQuery({
    queryKey: ['/api/settings/company'],
  });

  // Debug company settings
  console.log("🔍 COMPANY DEBUG:", {
    companySettings,
    isLoading: companySettingsLoading,
    error: companyError?.message || 'none',
    isObject: typeof companySettings === 'object' && companySettings !== null,
    keys: companySettings ? Object.keys(companySettings) : 'no keys'
  });

  const sendInvoiceMutation = useMutation({
    mutationFn: (invoiceId: number) => apiRequest("POST", `/api/invoices/${invoiceId}/send`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Success",
        description: "Invoice sent via email successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send invoice via email",
        variant: "destructive",
      });
    },
  });

  const sendInvoiceSmsMutation = useMutation({
    mutationFn: (invoiceId: number) => apiRequest("POST", `/api/invoices/${invoiceId}/send-sms`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Success",
        description: "Invoice sent via SMS successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send invoice via SMS",
        variant: "destructive",
      });
    },
  });

  // Download/Print invoice function
  const handleDownloadInvoice = (invoice: Invoice & { customer: Customer; lineItems: InvoiceLineItem[] }) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${invoice.invoiceNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; }
          .company-info { flex: 1; }
          .invoice-title { text-align: right; }
          .invoice-title h1 { font-size: 32px; margin: 0; }
          .invoice-title p { font-size: 18px; color: #6b7280; margin: 5px 0 0 0; }
          .info-section { display: flex; gap: 40px; margin-bottom: 30px; }
          .info-box { flex: 1; }
          .info-box h3 { font-size: 16px; font-weight: 600; margin-bottom: 10px; }
          .info-box p { margin: 5px 0; font-size: 14px; color: #374151; }
          .label { color: #6b7280; font-size: 12px; font-weight: 500; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background: #f3f4f6; padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb; }
          td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
          .text-right { text-align: right; }
          .totals { margin-top: 20px; text-align: right; }
          .totals-box { display: inline-block; min-width: 300px; }
          .total-row { display: flex; justify-content: space-between; padding: 8px 0; }
          .total-row.final { border-top: 2px solid #e5e7eb; margin-top: 10px; padding-top: 10px; font-weight: 600; font-size: 18px; }
          .notes { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
          .footer { margin-top: 50px; text-align: center; color: #6b7280; font-size: 14px; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-info">
            ${companySettings?.logo ? `<img src="${companySettings.logo}" alt="Logo" style="max-height: 80px; max-width: 200px; margin-bottom: 10px;">` : ''}
            <h2>${companySettings?.companyName || 'Your Company'}</h2>
            <p>${companySettings?.companyStreetAddress || ''}</p>
            <p>${companySettings?.companyCity || ''}, ${companySettings?.companyState || ''} ${companySettings?.companyZipCode || ''}</p>
            <p>Phone: ${companySettings?.companyPhone || ''}</p>
            ${companySettings?.companyEmail ? `<p>Email: ${companySettings.companyEmail}</p>` : ''}
          </div>
          <div class="invoice-title">
            <h1>INVOICE</h1>
            <p>#${invoice.invoiceNumber}</p>
          </div>
        </div>

        <div class="info-section">
          <div class="info-box">
            <h3>Invoice Information</h3>
            <p><span class="label">Date:</span> ${formatSafeDate(invoice.invoiceDate)}</p>
            <p><span class="label">Due Date:</span> ${formatSafeDate(invoice.dueDate)}</p>
            <p><span class="label">Status:</span> ${invoice.status.toUpperCase()}</p>
          </div>
          <div class="info-box">
            <h3>Bill To</h3>
            <p><strong>${invoice.customer?.name || 'N/A'}</strong></p>
            <p>${invoice.customer?.email || ''}</p>
            <p>${invoice.customer?.phone || ''}</p>
            <p>${invoice.customer?.address || ''}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th class="text-right">Quantity</th>
              <th class="text-right">Rate</th>
              <th class="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.lineItems?.map(item => `
              <tr>
                <td>${item.description}</td>
                <td class="text-right">${item.quantity}</td>
                <td class="text-right">$${parseFloat(item.rate).toFixed(2)}</td>
                <td class="text-right">$${parseFloat(item.amount).toFixed(2)}</td>
              </tr>
            `).join('') || ''}
          </tbody>
        </table>

        <div class="totals">
          <div class="totals-box">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>$${parseFloat(invoice.subtotal).toFixed(2)}</span>
            </div>
            <div class="total-row">
              <span>Tax:</span>
              <span>$${parseFloat(invoice.taxAmount || '0').toFixed(2)}</span>
            </div>
            <div class="total-row final">
              <span>Total:</span>
              <span>$${parseFloat(invoice.total).toFixed(2)}</span>
            </div>
          </div>
        </div>

        ${invoice.notes ? `
          <div class="notes">
            <h3>Notes</h3>
            <p>${invoice.notes}</p>
          </div>
        ` : ''}

        <div class="footer">
          <p>Thank you for your business!</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const updateStatusMutation = useMutation({
    mutationFn: ({ invoiceId, status, paymentMethod }: { invoiceId: number; status: string; paymentMethod?: string }) => 
      apiRequest("PATCH", `/api/invoices/${invoiceId}/status`, {
        status,
        paymentMethod,
        paidAt: status === 'paid' ? new Date().toISOString() : undefined
      }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      const statusText = variables.status === 'paid' ? 'paid' : 
                        variables.status === 'overdue' ? 'overdue' : 
                        variables.status === 'sent' ? 'sent' :
                        variables.status === 'cancelled' ? 'cancelled' : 'updated';
      toast({
        title: "Success",
        description: `Invoice marked as ${statusText}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update invoice status",
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
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                data-testid="button-share-invoice"
                              >
                                <Send className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={() => handleDownloadInvoice(invoice)}
                                data-testid="menu-download-invoice"
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Download/Print
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => sendInvoiceMutation.mutate(invoice.id)}
                                disabled={sendInvoiceMutation.isPending}
                                data-testid="menu-email-invoice"
                              >
                                <Mail className="w-4 h-4 mr-2" />
                                Send via Email
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => sendInvoiceSmsMutation.mutate(invoice.id)}
                                disabled={sendInvoiceSmsMutation.isPending}
                                data-testid="menu-sms-invoice"
                              >
                                <MessageSquare className="w-4 h-4 mr-2" />
                                Send via SMS
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              
                              {/* Mark as Paid */}
                              {(invoice.status === 'sent' || invoice.status === 'overdue' || invoice.status === 'draft') && (
                                <DropdownMenuItem 
                                  onClick={() => updateStatusMutation.mutate({
                                    invoiceId: invoice.id,
                                    status: 'paid',
                                    paymentMethod: 'manual'
                                  })}
                                  disabled={updateStatusMutation.isPending}
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Mark as Paid
                                </DropdownMenuItem>
                              )}
                              
                              {/* Mark as Overdue */}
                              {invoice.status === 'sent' && (
                                <DropdownMenuItem 
                                  onClick={() => updateStatusMutation.mutate({
                                    invoiceId: invoice.id,
                                    status: 'overdue'
                                  })}
                                  disabled={updateStatusMutation.isPending}
                                >
                                  <AlertTriangle className="w-4 h-4 mr-2" />
                                  Mark as Late
                                </DropdownMenuItem>
                              )}
                              
                              {/* Mark as Unpaid (back to sent) */}
                              {invoice.status === 'paid' && (
                                <DropdownMenuItem 
                                  onClick={() => updateStatusMutation.mutate({
                                    invoiceId: invoice.id,
                                    status: 'sent'
                                  })}
                                  disabled={updateStatusMutation.isPending}
                                >
                                  <Clock className="w-4 h-4 mr-2" />
                                  Mark as Unpaid
                                </DropdownMenuItem>
                              )}
                              
                              {/* Cancel Invoice */}
                              {(invoice.status !== 'cancelled' && invoice.status !== 'paid') && (
                                <DropdownMenuItem 
                                  onClick={() => updateStatusMutation.mutate({
                                    invoiceId: invoice.id,
                                    status: 'cancelled'
                                  })}
                                  disabled={updateStatusMutation.isPending}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <X className="w-4 h-4 mr-2" />
                                  Cancel Invoice
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
                  {companySettings?.logo && (
                    <img 
                      src={companySettings.logo} 
                      alt="Company Logo" 
                      className={`object-contain ${
                        companySettings.logoSize === 'small' ? 'h-12 w-12' :
                        companySettings.logoSize === 'large' ? 'h-24 w-24' :
                        companySettings.logoSize === 'xlarge' ? 'h-32 w-32' :
                        'h-16 w-16'
                      }`}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {companySettings?.companyName || "Your Company Name"}
                    </h2>
                    <p className="text-sm text-gray-600">
                      {companySettings?.companyStreetAddress || "123 Business Street"}
                    </p>
                    <p className="text-sm text-gray-600">
                      {companySettings?.companyCity || "City"}, {companySettings?.companyState || "State"} {companySettings?.companyZipCode || "12345"}
                    </p>
                    <p className="text-sm text-gray-600">
                      Phone: {companySettings?.companyPhone || "(555) 123-4567"}
                    </p>
                    {companySettings?.companyEmail && (
                      <p className="text-sm text-gray-600">
                        Email: {companySettings.companyEmail}
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
                    {(selectedInvoice.lineItems || []).map((item, index) => (
                      <TableRow key={`${selectedInvoice.id}-line-${index}`}>
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
