import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QuoteForm } from "@/components/quote-form";
import { QuotesTable } from "@/components/quotes-table";
import { TrashedQuotesTable } from "@/components/trashed-quotes-table";
import { Plus, FileText, TrendingUp, Clock, CheckCircle, Search, Filter, Trash2 } from "lucide-react";
import type { Quote, Customer, QuoteLineItem } from "@shared/schema";

export default function Quotes() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("active");

  const { data: quotes = [], isLoading, error } = useQuery<(Quote & { customer: Customer; lineItems: QuoteLineItem[] })[]>({
    queryKey: ["/api/quotes"],
  });

  const { data: trashedQuotes = [], isLoading: trashedLoading, error: trashedError } = useQuery<(Quote & { customer: Customer; lineItems: QuoteLineItem[] })[]>({
    queryKey: ["/api/quotes/trash"],
  });

  // Calculate pending approvals count (sent quotes without response)
  const pendingApprovalsCount = useMemo(() => {
    return quotes.filter(quote => 
      quote.status === 'sent' && !quote.respondedAt
    ).length;
  }, [quotes]);

  // Filter quotes based on search criteria
  const filteredQuotes = useMemo(() => {
    return quotes.filter(quote => {
      // Text search
      const searchMatch = !searchTerm || 
        quote.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.lineItems.some(item => 
          item.description?.toLowerCase().includes(searchTerm.toLowerCase())
        );

      // Status filter
      const statusMatch = statusFilter === "all" || quote.status === statusFilter;

      // Date filter
      const quoteDate = new Date(quote.quoteDate);
      const now = new Date();
      let dateMatch = true;
      
      if (dateFilter === "today") {
        dateMatch = quoteDate.toDateString() === now.toDateString();
      } else if (dateFilter === "this-week") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateMatch = quoteDate >= weekAgo;
      } else if (dateFilter === "this-month") {
        dateMatch = quoteDate.getMonth() === now.getMonth() && 
                   quoteDate.getFullYear() === now.getFullYear();
      } else if (dateFilter === "this-year") {
        dateMatch = quoteDate.getFullYear() === now.getFullYear();
      }

      return searchMatch && statusMatch && dateMatch;
    });
  }, [quotes, searchTerm, statusFilter, dateFilter]);

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-red-600">
          Failed to load quotes. Please try again.
        </div>
      </div>
    );
  }

  // Calculate quote statistics based on filtered results
  const stats = {
    totalQuotes: filteredQuotes.length,
    draftQuotes: filteredQuotes.filter(q => q.status === 'draft').length,
    sentQuotes: filteredQuotes.filter(q => q.status === 'sent').length,
    acceptedQuotes: filteredQuotes.filter(q => q.status === 'accepted').length,
    totalValue: filteredQuotes.reduce((sum, quote) => sum + parseFloat(quote.total), 0),
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Quotes</h1>
          <p className="text-muted-foreground">
            Create and manage your quotes
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Quote
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Quote</DialogTitle>
            </DialogHeader>
            <QuoteForm onSuccess={() => setIsDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active" className="flex items-center gap-2 relative">
            <FileText className="h-4 w-4" />
            Active Quotes ({quotes.length})
            {pendingApprovalsCount > 0 && (
              <Badge 
                variant="destructive" 
                className="ml-1 h-5 w-5 text-xs flex items-center justify-center p-0 rounded-full"
                data-testid="pending-approvals-badge"
              >
                {pendingApprovalsCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="trash" className="flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Trash ({trashedQuotes.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-6 mt-6">

      {/* Search and Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search & Filter Quotes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {/* Search Input */}
            <div className="md:col-span-2">
              <Input
                placeholder="Search quotes by number, customer, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Filter */}
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="this-week">This Week</SelectItem>
                <SelectItem value="this-month">This Month</SelectItem>
                <SelectItem value="this-year">This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active Filters Display */}
          {(searchTerm || statusFilter !== "all" || dateFilter !== "all") && (
            <div className="flex gap-2 mt-4 flex-wrap">
              {searchTerm && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Search: "{searchTerm}"
                  <button
                    onClick={() => setSearchTerm("")}
                    className="ml-1 hover:text-red-600"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {statusFilter !== "all" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Status: {statusFilter}
                  <button
                    onClick={() => setStatusFilter("all")}
                    className="ml-1 hover:text-red-600"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {dateFilter !== "all" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Date: {dateFilter.replace("-", " ")}
                  <button
                    onClick={() => setDateFilter("all")}
                    className="ml-1 hover:text-red-600"
                  >
                    ×
                  </button>
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setDateFilter("all");
                }}
              >
                Clear All Filters
              </Button>
            </div>
          )}

          {/* Results Summary */}
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredQuotes.length} of {quotes.length} quotes
            {(searchTerm || statusFilter !== "all" || dateFilter !== "all") && " (filtered)"}
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quotes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalQuotes}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.draftQuotes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sent</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sentQuotes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accepted</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.acceptedQuotes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalValue.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

          {/* Quotes Table */}
          <QuotesTable quotes={filteredQuotes} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="trash" className="space-y-6 mt-6">
          {/* Trash Content */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Deleted Quotes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                These quotes have been deleted. You can restore or permanently delete them.
              </p>
              
              {trashedError ? (
                <div className="text-center text-red-600 py-8">
                  Failed to load deleted quotes. Please try again.
                </div>
              ) : trashedLoading ? (
                <div className="text-center text-muted-foreground py-8">
                  Loading deleted quotes...
                </div>
              ) : trashedQuotes.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Trash2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-lg font-medium mb-2">No deleted quotes</p>
                  <p>When you delete quotes, they'll appear here for recovery.</p>
                </div>
              ) : (
                <TrashedQuotesTable quotes={trashedQuotes} isLoading={trashedLoading} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}