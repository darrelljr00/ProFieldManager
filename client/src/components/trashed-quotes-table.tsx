import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  RotateCcw, 
  Trash2, 
  FileText, 
  Calendar, 
  DollarSign,
  AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Quote, Customer, QuoteLineItem } from "@shared/schema";

interface TrashedQuotesTableProps {
  quotes: (Quote & { customer: Customer; lineItems: QuoteLineItem[] })[];
  isLoading: boolean;
}

export function TrashedQuotesTable({ quotes, isLoading }: TrashedQuotesTableProps) {
  const [restoringQuoteId, setRestoringQuoteId] = useState<number | null>(null);
  const [deletingQuoteId, setDeletingQuoteId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const restoreMutation = useMutation({
    mutationFn: (quoteId: number) => 
      apiRequest(`/api/quotes/${quoteId}/restore`, {
        method: 'POST',
      }),
    onMutate: (quoteId) => {
      setRestoringQuoteId(quoteId);
    },
    onSuccess: () => {
      toast({
        title: "Quote Restored",
        description: "The quote has been successfully restored.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/quotes/trash'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to restore quote",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setRestoringQuoteId(null);
    }
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: (quoteId: number) => 
      apiRequest(`/api/quotes/${quoteId}/permanent`, {
        method: 'DELETE',
      }),
    onMutate: (quoteId) => {
      setDeletingQuoteId(quoteId);
    },
    onSuccess: () => {
      toast({
        title: "Quote Permanently Deleted",
        description: "The quote has been permanently removed and cannot be recovered.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/quotes/trash'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error", 
        description: error.message || "Failed to permanently delete quote",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setDeletingQuoteId(null);
    }
  });

  const handleRestore = (quoteId: number) => {
    restoreMutation.mutate(quoteId);
  };

  const handlePermanentDelete = (quoteId: number) => {
    permanentDeleteMutation.mutate(quoteId);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      'draft': 'bg-gray-100 text-gray-800',
      'sent': 'bg-blue-100 text-blue-800',
      'accepted': 'bg-green-100 text-green-800',
      'rejected': 'bg-red-100 text-red-800',
      'expired': 'bg-orange-100 text-orange-800'
    };
    
    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || statusColors.draft}>
        {status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading deleted quotes...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quote #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Deleted On</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotes.map((quote) => (
              <TableRow key={quote.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono">{quote.quoteNumber}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{quote.customer.name}</div>
                    <div className="text-sm text-muted-foreground">{quote.customer.email}</div>
                  </div>
                </TableCell>
                <TableCell>
                  {getStatusBadge(quote.status)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>${parseFloat(quote.total).toFixed(2)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {quote.deletedAt ? formatDate(quote.deletedAt) : 'Unknown'}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {/* Restore Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestore(quote.id)}
                      disabled={restoringQuoteId === quote.id}
                      data-testid={`button-restore-quote-${quote.id}`}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      {restoringQuoteId === quote.id ? "Restoring..." : "Restore"}
                    </Button>

                    {/* Permanent Delete Button with Confirmation */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          disabled={deletingQuoteId === quote.id}
                          data-testid={`button-delete-quote-${quote.id}`}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          {deletingQuoteId === quote.id ? "Deleting..." : "Delete Forever"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                            Permanently Delete Quote
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to permanently delete quote <strong>{quote.quoteNumber}</strong> for {quote.customer.name}?
                            <br /><br />
                            <span className="text-red-600 font-medium">This action cannot be undone.</span> The quote and all its data will be permanently removed from the system.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => handlePermanentDelete(quote.id)}
                          >
                            Delete Forever
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {quotes.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            <Trash2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-lg font-medium mb-2">No deleted quotes</p>
            <p>When you delete quotes, they'll appear here for recovery.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}