import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { type Quote, type Customer, type QuoteLineItem } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Eye, Mail, FileText, Trash2, Check, X, Download, Briefcase } from "lucide-react";
import { useLocation } from "wouter";

interface QuotesTableProps {
  quotes: (Quote & { customer: Customer; lineItems: QuoteLineItem[] })[];
  isLoading?: boolean;
}

export function QuotesTable({ quotes, isLoading }: QuotesTableProps) {
  const [selectedQuote, setSelectedQuote] = useState<Quote & { customer: Customer; lineItems: QuoteLineItem[] } | null>(null);
  const [emailDialog, setEmailDialog] = useState<Quote & { customer: Customer } | null>(null);
  const [viewDialog, setViewDialog] = useState<Quote | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<Quote | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Fetch company settings for business name
  const { data: companySettings } = useQuery({
    queryKey: ["/api/settings/company"],
  });

  // Download handler for PDF and Word documents
  const handleDownload = async (quoteId: number, format: 'pdf' | 'word') => {
    try {
      const response = await fetch(`/api/quotes/${quoteId}/download/${format}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to download ${format.toUpperCase()}`);
      }

      // Get the filename from the Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `quote-${quoteId}.${format === 'pdf' ? 'pdf' : 'docx'}`;

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: `Quote downloaded as ${format.toUpperCase()}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to download ${format.toUpperCase()}: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  // Fetch company settings for logo
  const { data: companySettings } = useQuery<{
    companyName?: string;
    companyEmail?: string;
    companyPhone?: string;
    companyWebsite?: string;
    companyStreetAddress?: string;
    companyCity?: string;
    companyState?: string;
    companyZipCode?: string;
    companyCountry?: string;
    logo?: string;
  }>({
    queryKey: ["/api/settings/company"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest("PATCH", `/api/quotes/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({
        title: "Success",
        description: "Quote status updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update quote status",
        variant: "destructive",
      });
    },
  });

  const convertToInvoiceMutation = useMutation({
    mutationFn: (quoteId: number) =>
      apiRequest("POST", `/api/quotes/${quoteId}/convert-to-invoice`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Success",
        description: "Quote converted to invoice successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to convert quote to invoice",
        variant: "destructive",
      });
    },
  });

  const deleteQuoteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/quotes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({
        title: "Success",
        description: "Quote deleted successfully",
      });
      setDeleteDialog(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete quote",
        variant: "destructive",
      });
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: ({ quoteId, subject, message }: { quoteId: number; subject: string; message: string }) =>
      apiRequest("POST", `/api/quotes/${quoteId}/send-email`, { subject, message }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({
        title: "Success",
        description: "Quote sent via email successfully",
      });
      setEmailDialog(null);
      setEmailSubject("");
      setEmailMessage("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send email",
        variant: "destructive",
      });
    },
  });

  const openEmailDialog = (quote: Quote & { customer: Customer }) => {
    const businessName = companySettings?.businessName || companySettings?.name || 'Your Company';
    setEmailDialog(quote);
    setEmailSubject(`Quote ${quote.quoteNumber} from ${businessName}`);
    setEmailMessage(`Dear ${quote.customer.name},\n\nPlease find attached your quote ${quote.quoteNumber}.\n\nBest regards,\n${businessName}`);
  };

  // Mark quote as viewed mutation
  const markAsViewedMutation = useMutation({
    mutationFn: async (quoteId: number) => {
      await apiRequest(`/api/quotes/${quoteId}/mark-viewed`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
    },
  });

  const openViewDialog = (quote: Quote) => {
    const fullQuote = quotes.find(q => q.id === quote.id);
    if (fullQuote) {
      setSelectedQuote(fullQuote);
      setViewDialog(quote);
      // Mark as viewed if not already viewed
      if (!quote.viewedAt) {
        markAsViewedMutation.mutate(quote.id);
      }
    }
  };

  const handleConvertToJob = (quote: Quote & { customer: Customer; lineItems: QuoteLineItem[] }) => {
    // Create description from line items
    const description = quote.lineItems.map(item => 
      `${item.description} (Qty: ${parseFloat(item.quantity).toFixed(0)})`
    ).join('\n');

    // Store quote conversion data in sessionStorage
    const conversionData = {
      customerId: quote.customerId,
      customerName: quote.customer.name,
      customerAddress: quote.customer.address,
      customerCity: quote.customer.city,
      customerState: quote.customer.state,
      customerZipCode: quote.customer.zipCode,
      description: description,
      notes: quote.notes || '',
      quoteId: quote.id,
      quoteNumber: quote.quoteNumber
    };

    sessionStorage.setItem('quoteToJobConversion', JSON.stringify(conversionData));
    
    toast({
      title: "Converting to Job",
      description: "Redirecting to create new job with quote details...",
    });

    // Navigate to jobs page
    setLocation('/jobs?action=create');
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "pending":
        return "secondary";
      case "accepted":
        return "default";
      case "declined":
        return "destructive";
      default:
        return "secondary";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="h-32 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quote #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Issue Date</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No quotes found
                </TableCell>
              </TableRow>
            ) : (
              quotes.map((quote) => (
                <TableRow key={quote.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {!quote.viewedAt && (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                      )}
                      {quote.quoteNumber}
                    </div>
                  </TableCell>
                  <TableCell>{quote.customer.name}</TableCell>
                  <TableCell>{format(new Date(quote.quoteDate), "MMM dd, yyyy")}</TableCell>
                  <TableCell>{format(new Date(quote.expiryDate), "MMM dd, yyyy")}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(quote.status)}>
                      {quote.status}
                    </Badge>
                  </TableCell>
                  <TableCell>${parseFloat(quote.total).toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openViewDialog(quote)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEmailDialog(quote)}
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                      {quote.status === "pending" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateStatusMutation.mutate({ id: quote.id, status: "accepted" })}
                            disabled={updateStatusMutation.isPending}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateStatusMutation.mutate({ id: quote.id, status: "declined" })}
                            disabled={updateStatusMutation.isPending}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {quote.status === "accepted" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => convertToInvoiceMutation.mutate(quote.id)}
                          disabled={convertToInvoiceMutation.isPending}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(quote.id, 'pdf')}
                        title="Download PDF"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(quote.id, 'word')}
                        title="Download Word"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteDialog(quote)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* View Quote Dialog */}
      <Dialog open={!!viewDialog} onOpenChange={() => setViewDialog(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quote Details</DialogTitle>
            <DialogDescription>
              Quote #{selectedQuote?.quoteNumber}
            </DialogDescription>
          </DialogHeader>
          {selectedQuote && (
            <div className="space-y-6">
              {/* Company Header with Logo */}
              {companySettings && (
                <div className="flex items-center justify-between border-b pb-4">
                  <div className="flex items-center space-x-4">
                    {companySettings.logo && (
                      <img
                        src={companySettings.logo.startsWith('/uploads') ? companySettings.logo : `/uploads/${companySettings.logo}`}
                        alt="Company logo"
                        className="h-12 w-12 object-contain"
                      />
                    )}
                    <div>
                      <h3 className="text-lg font-semibold">{companySettings.companyName || 'Your Company'}</h3>
                      <div className="text-sm text-muted-foreground space-y-1">
                        {companySettings.companyEmail && (
                          <p>{companySettings.companyEmail}</p>
                        )}
                        {companySettings.companyPhone && (
                          <p>{companySettings.companyPhone}</p>
                        )}
                        {(companySettings.companyStreetAddress || companySettings.companyCity || companySettings.companyState) && (
                          <div className="space-y-0.5">
                            {companySettings.companyStreetAddress && (
                              <p>{companySettings.companyStreetAddress}</p>
                            )}
                            <p>
                              {[
                                companySettings.companyCity,
                                companySettings.companyState,
                                companySettings.companyZipCode
                              ].filter(Boolean).join(', ')}
                              {companySettings.companyCountry && companySettings.companyCountry !== 'United States' && (
                                <span>, {companySettings.companyCountry}</span>
                              )}
                            </p>
                          </div>
                        )}
                        {companySettings.companyWebsite && (
                          <p className="text-blue-600 hover:underline">
                            <a href={companySettings.companyWebsite.startsWith('http') ? companySettings.companyWebsite : `https://${companySettings.companyWebsite}`} target="_blank" rel="noopener noreferrer">
                              {companySettings.companyWebsite}
                            </a>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <h2 className="text-2xl font-bold">QUOTE</h2>
                    <p className="text-sm text-muted-foreground">#{selectedQuote.quoteNumber}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-semibold">Customer</Label>
                  <p>{selectedQuote.customer.name}</p>
                </div>
                <div>
                  <Label className="font-semibold">Status</Label>
                  <Badge variant={getStatusBadgeVariant(selectedQuote.status)}>
                    {selectedQuote.status}
                  </Badge>
                </div>
                <div>
                  <Label className="font-semibold">Quote Date</Label>
                  <p>{format(new Date(selectedQuote.quoteDate), "MMMM dd, yyyy")}</p>
                </div>
                <div>
                  <Label className="font-semibold">Expiry Date</Label>
                  <p>{format(new Date(selectedQuote.expiryDate), "MMMM dd, yyyy")}</p>
                </div>
              </div>

              <div>
                <Label className="font-semibold">Line Items</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedQuote.lineItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell>{parseFloat(item.quantity).toFixed(0)}</TableCell>
                        <TableCell>${parseFloat(item.amount).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex justify-end mt-4">
                  <div className="text-lg font-semibold">
                    Total: ${parseFloat(selectedQuote.total).toFixed(2)}
                  </div>
                </div>
              </div>

              {selectedQuote.notes && (
                <div>
                  <Label className="font-semibold">Notes</Label>
                  <p className="mt-1">{selectedQuote.notes}</p>
                </div>
              )}

              <div className="flex justify-end mt-6 pt-4 border-t">
                <Button
                  onClick={() => {
                    handleConvertToJob(selectedQuote);
                    setSelectedQuote(null);
                    setViewDialog(null);
                  }}
                  className="gap-2"
                  data-testid="button-convert-to-job"
                >
                  <Briefcase className="h-4 w-4" />
                  Convert to Job
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Email Dialog */}
      <Dialog open={!!emailDialog} onOpenChange={() => setEmailDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Quote via Email</DialogTitle>
            <DialogDescription>
              Send quote #{emailDialog?.quoteNumber} to {emailDialog?.customer.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email-subject">Subject</Label>
              <Input
                id="email-subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="email-message">Message</Label>
              <Textarea
                id="email-message"
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                rows={6}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setEmailDialog(null)}>
                Cancel
              </Button>
              <Button
                onClick={() =>
                  emailDialog &&
                  sendEmailMutation.mutate({
                    quoteId: emailDialog.id,
                    subject: emailSubject,
                    message: emailMessage,
                  })
                }
                disabled={sendEmailMutation.isPending}
              >
                {sendEmailMutation.isPending ? "Sending..." : "Send Email"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move Quote to Trash?</AlertDialogTitle>
            <AlertDialogDescription>
              Quote #{deleteDialog?.quoteNumber} will be moved to the trash. You can restore it later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDialog && deleteQuoteMutation.mutate(deleteDialog.id)}
              disabled={deleteQuoteMutation.isPending}
            >
              {deleteQuoteMutation.isPending ? "Moving..." : "Move to Trash"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}