import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Mail, CheckCircle, FileText, ArrowRight, Eye, Trash2 } from "lucide-react";
import type { Quote, Customer, QuoteLineItem } from "@shared/schema";

interface QuotesTableProps {
  quotes: (Quote & { customer: Customer; lineItems: QuoteLineItem[] })[];
  isLoading?: boolean;
}

export function QuotesTable({ quotes, isLoading }: QuotesTableProps) {
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [emailForm, setEmailForm] = useState({
    to: "",
    subject: "",
    message: ""
  });
  const { toast } = useToast();

  const sendEmailMutation = useMutation({
    mutationFn: ({ quoteId, emailData }: { quoteId: number; emailData: any }) => 
      apiRequest("POST", `/api/quotes/${quoteId}/email`, emailData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({
        title: "Success",
        description: "Quote emailed successfully",
      });
      setEmailDialogOpen(false);
      setEmailForm({ to: "", subject: "", message: "" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send email",
        variant: "destructive",
      });
    },
  });

  const acceptQuoteMutation = useMutation({
    mutationFn: (quoteId: number) => apiRequest("POST", `/api/quotes/${quoteId}/accept`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({
        title: "Success",
        description: "Quote accepted successfully",
      });
    },
  });

  const convertToInvoiceMutation = useMutation({
    mutationFn: (quoteId: number) => apiRequest("POST", `/api/quotes/${quoteId}/convert-to-invoice`),
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
        description: error.message || "Failed to convert quote",
        variant: "destructive",
      });
    },
  });

  const deleteQuoteMutation = useMutation({
    mutationFn: (quoteId: number) => apiRequest("DELETE", `/api/quotes/${quoteId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({
        title: "Success",
        description: "Quote deleted successfully",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: "secondary",
      sent: "outline",
      accepted: "default",
      rejected: "destructive",
      expired: "secondary"
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || "secondary"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const openEmailDialog = (quote: Quote & { customer: Customer }) => {
    setSelectedQuote(quote);
    setEmailForm({
      to: quote.customer.email,
      subject: `Quote ${quote.quoteNumber}`,
      message: `Dear ${quote.customer.name},\n\nPlease find attached our quote ${quote.quoteNumber} for your review.\n\nBest regards,`
    });
    setEmailDialogOpen(true);
  };

  const openViewDialog = (quote: Quote) => {
    setSelectedQuote(quote);
    setViewDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quotes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Loading quotes...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (quotes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quotes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No quotes found. Create your first quote to get started.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>All Quotes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quote #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.map((quote) => (
                <TableRow key={quote.id}>
                  <TableCell className="font-medium">{quote.quoteNumber}</TableCell>
                  <TableCell>{quote.customer.name}</TableCell>
                  <TableCell>
                    {new Date(quote.quoteDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {new Date(quote.expiryDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>${parseFloat(quote.total).toFixed(2)}</TableCell>
                  <TableCell>{getStatusBadge(quote.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openViewDialog(quote)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      {quote.status === 'draft' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEmailDialog(quote)}
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {quote.status === 'sent' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => acceptQuoteMutation.mutate(quote.id)}
                          disabled={acceptQuoteMutation.isPending}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {quote.status === 'accepted' && !quote.convertedInvoiceId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => convertToInvoiceMutation.mutate(quote.id)}
                          disabled={convertToInvoiceMutation.isPending}
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {quote.status === 'draft' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteQuoteMutation.mutate(quote.id)}
                          disabled={deleteQuoteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email Quote</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email-to">To</Label>
              <Input
                id="email-to"
                value={emailForm.to}
                onChange={(e) => setEmailForm(prev => ({ ...prev, to: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="email-subject">Subject</Label>
              <Input
                id="email-subject"
                value={emailForm.subject}
                onChange={(e) => setEmailForm(prev => ({ ...prev, subject: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="email-message">Message</Label>
              <Textarea
                id="email-message"
                rows={6}
                value={emailForm.message}
                onChange={(e) => setEmailForm(prev => ({ ...prev, message: e.target.value }))}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedQuote) {
                    sendEmailMutation.mutate({
                      quoteId: selectedQuote.id,
                      emailData: emailForm
                    });
                  }
                }}
                disabled={sendEmailMutation.isPending}
              >
                {sendEmailMutation.isPending ? "Sending..." : "Send Email"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Quote Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quote Details</DialogTitle>
          </DialogHeader>
          {selectedQuote && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Quote Number</Label>
                  <p>{selectedQuote.quoteNumber}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedQuote.status)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Quote Date</Label>
                  <p>{new Date(selectedQuote.quoteDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Expiry Date</Label>
                  <p>{new Date(selectedQuote.expiryDate).toLocaleDateString()}</p>
                </div>
              </div>
              
              {selectedQuote.notes && (
                <div>
                  <Label className="text-sm font-medium">Notes</Label>
                  <p className="text-sm text-muted-foreground">{selectedQuote.notes}</p>
                </div>
              )}
              
              <div className="border-t pt-4">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total Amount:</span>
                  <span>${parseFloat(selectedQuote.total).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}