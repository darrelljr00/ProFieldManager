import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit, Trash2, Phone, Mail, DollarSign, Calendar, Search, Filter, X } from "lucide-react";
import type { Lead, InsertLead } from "@shared/schema";

export default function Leads() {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  // Filter leads based on search query and filters
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch = searchQuery === "" || 
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.serviceDescription?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.leadSource?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.notes?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || lead.priority === priorityFilter;
    const matchesGrade = gradeFilter === "all" || lead.grade === gradeFilter;

    return matchesSearch && matchesStatus && matchesPriority && matchesGrade;
  });

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setGradeFilter("all");
    setShowFilters(false);
  };

  // Check if any filters are active
  const hasActiveFilters = searchQuery !== "" || statusFilter !== "all" || priorityFilter !== "all" || gradeFilter !== "all";

  // Get row color based on lead grade
  const getRowColor = (grade: string) => {
    switch (grade) {
      case "hot":
        return "bg-red-50 border-l-4 border-red-500 hover:bg-red-100";
      case "warm":
        return "bg-orange-50 border-l-4 border-orange-500 hover:bg-orange-100";
      case "cold":
        return "bg-blue-50 border-l-4 border-blue-500 hover:bg-blue-100";
      default:
        return "hover:bg-gray-50";
    }
  };

  // Get grade badge styling
  const getGradeBadge = (grade: string) => {
    switch (grade) {
      case "hot":
        return "bg-red-100 text-red-800 border-red-200";
      case "warm":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "cold":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const createMutation = useMutation({
    mutationFn: (data: Partial<InsertLead>) => 
      apiRequest("/api/leads", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setIsDialogOpen(false);
      setSelectedLead(null);
      toast({
        title: "Success",
        description: "Lead created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create lead",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertLead> }) =>
      apiRequest(`/api/leads/${id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setIsDialogOpen(false);
      setSelectedLead(null);
      toast({
        title: "Success",
        description: "Lead updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update lead",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/leads/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Success",
        description: "Lead deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete lead",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const leadData = {
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      serviceDescription: formData.get('serviceDescription') as string,
      leadPrice: formData.get('leadPrice') as string,
      leadSource: formData.get('leadSource') as string,
      status: formData.get('status') as string,
      priority: formData.get('priority') as string,
      notes: formData.get('notes') as string,
      followUpDate: formData.get('followUpDate') as string || null,
    };

    if (selectedLead) {
      updateMutation.mutate({ id: selectedLead.id, data: leadData });
    } else {
      createMutation.mutate(leadData);
    }
  };

  const openDialog = (lead?: Lead) => {
    setSelectedLead(lead || null);
    setIsDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800';
      case 'contacted':
        return 'bg-yellow-100 text-yellow-800';
      case 'qualified':
        return 'bg-purple-100 text-purple-800';
      case 'proposal_sent':
        return 'bg-orange-100 text-orange-800';
      case 'won':
        return 'bg-green-100 text-green-800';
      case 'lost':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="h-32 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leads Management</h1>
          <p className="text-muted-foreground">Track and manage your business leads</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedLead ? "Edit Lead" : "Add New Lead"}</DialogTitle>
              <DialogDescription>
                {selectedLead ? "Update lead information" : "Enter the details for the new lead"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    required
                    defaultValue={selectedLead?.name}
                    placeholder="Lead name"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    defaultValue={selectedLead?.phone || ""}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={selectedLead?.email || ""}
                    placeholder="lead@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="leadPrice">Lead Price</Label>
                  <Input
                    id="leadPrice"
                    name="leadPrice"
                    type="number"
                    step="0.01"
                    defaultValue={selectedLead?.leadPrice || ""}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="serviceDescription">Service Description *</Label>
                <Textarea
                  id="serviceDescription"
                  name="serviceDescription"
                  required
                  defaultValue={selectedLead?.serviceDescription}
                  placeholder="Describe the service requested"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="leadSource">Lead Source *</Label>
                  <Select name="leadSource" defaultValue={selectedLead?.leadSource || "website"}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="referral">Referral</SelectItem>
                      <SelectItem value="advertising">Advertising</SelectItem>
                      <SelectItem value="social_media">Social Media</SelectItem>
                      <SelectItem value="cold_call">Cold Call</SelectItem>
                      <SelectItem value="trade_show">Trade Show</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select name="status" defaultValue={selectedLead?.status || "new"}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="qualified">Qualified</SelectItem>
                      <SelectItem value="proposal_sent">Proposal Sent</SelectItem>
                      <SelectItem value="won">Won</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select name="priority" defaultValue={selectedLead?.priority || "medium"}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="grade">Grade</Label>
                  <Select name="grade" defaultValue={selectedLead?.grade || "cold"}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cold">🧊 Cold</SelectItem>
                      <SelectItem value="warm">🟠 Warm</SelectItem>
                      <SelectItem value="hot">🔥 Hot</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="followUpDate">Follow-up Date</Label>
                <Input
                  id="followUpDate"
                  name="followUpDate"
                  type="date"
                  defaultValue={selectedLead?.followUpDate ? new Date(selectedLead.followUpDate).toISOString().split('T')[0] : ""}
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  defaultValue={selectedLead?.notes || ""}
                  placeholder="Additional notes about the lead"
                  rows={3}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {selectedLead ? "Update Lead" : "Create Lead"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter Section */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search leads by name, phone, email, service, source, or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filter Toggle */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filters
                {hasActiveFilters && (
                  <Badge variant="destructive" className="ml-1 px-1 py-0 text-xs">
                    {[searchQuery !== "", statusFilter !== "all", priorityFilter !== "all", gradeFilter !== "all"].filter(Boolean).length}
                  </Badge>
                )}
              </Button>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  onClick={clearFilters}
                  className="flex items-center gap-2 text-gray-600"
                >
                  <X className="h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="statusFilter">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="qualified">Qualified</SelectItem>
                      <SelectItem value="proposal_sent">Proposal Sent</SelectItem>
                      <SelectItem value="won">Won</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="priorityFilter">Priority</Label>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All priorities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="gradeFilter">Grade</Label>
                  <Select value={gradeFilter} onValueChange={setGradeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All grades" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Grades</SelectItem>
                      <SelectItem value="hot">🔥 Hot</SelectItem>
                      <SelectItem value="warm">🟠 Warm</SelectItem>
                      <SelectItem value="cold">🧊 Cold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <div className="text-sm text-gray-600">
                    Showing {filteredLeads.length} of {leads.length} leads
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Leads</CardTitle>
          <CardDescription>
            Manage all your business leads in one place
          </CardDescription>
        </CardHeader>
        <CardContent>
          {leads.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No leads found</p>
              <Button onClick={() => openDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add your first lead
              </Button>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="text-center py-8">
              <div className="flex flex-col items-center space-y-4">
                <Search className="h-12 w-12 text-gray-400" />
                <p className="text-muted-foreground">No leads match your search criteria</p>
                <Button variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Follow-up</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => (
                  <TableRow key={lead.id} className={getRowColor(lead.grade || "cold")}>
                    <TableCell className="font-medium">{lead.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col space-y-1">
                        {lead.phone && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Phone className="h-3 w-3 mr-1" />
                            {lead.phone}
                          </div>
                        )}
                        {lead.email && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Mail className="h-3 w-3 mr-1" />
                            {lead.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate" title={lead.serviceDescription}>
                        {lead.serviceDescription}
                      </div>
                    </TableCell>
                    <TableCell>
                      {lead.leadPrice && (
                        <div className="flex items-center">
                          <DollarSign className="h-3 w-3" />
                          {parseFloat(lead.leadPrice).toLocaleString()}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {lead.leadSource.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(lead.status)}>
                        {lead.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPriorityColor(lead.priority)}>
                        {lead.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getGradeBadge(lead.grade || "cold")} border`}>
                        {lead.grade === "hot" ? "🔥 Hot" : lead.grade === "warm" ? "🟠 Warm" : "🧊 Cold"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {lead.followUpDate && (
                        <div className="flex items-center text-sm">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(lead.followUpDate).toLocaleDateString()}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDialog(lead)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteMutation.mutate(lead.id)}
                        >
                          <Trash2 className="h-3 w-3" />
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
    </div>
  );
}