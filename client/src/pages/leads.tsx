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
import { Plus, Edit, Trash2, Phone, Mail, DollarSign, Calendar } from "lucide-react";
import type { Lead, InsertLead } from "@shared/schema";

export default function Leads() {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<InsertLead>) => 
      apiRequest("POST", "/api/leads", data),
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
      apiRequest("PUT", `/api/leads/${id}`, data),
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
      apiRequest("DELETE", `/api/leads/${id}`),
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

              <div className="grid grid-cols-3 gap-4">
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
                  <TableHead>Follow-up</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.id}>
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