import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertGasCardSchema, insertGasCardAssignmentSchema } from "@shared/schema";
import { CreditCard, Plus, ArrowLeftRight, Calendar, User, Building2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { GasCard, GasCardAssignment, User as UserType } from "@shared/schema";

export default function GasCards() {
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch gas cards
  const { data: gasCards = [], isLoading: cardsLoading } = useQuery({
    queryKey: ['/api/gas-cards'],
  });

  // Fetch gas card assignments
  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['/api/gas-card-assignments'],
  });

  // Fetch active assignments
  const { data: activeAssignments = [], isLoading: activeLoading } = useQuery({
    queryKey: ['/api/gas-card-assignments/active'],
  });

  // Fetch users for assignment dropdown
  const { data: users = [] } = useQuery({
    queryKey: ['/api/admin/users'],
  });

  // Gas card form
  const gasCardForm = useForm({
    resolver: zodResolver(insertGasCardSchema),
    defaultValues: {
      cardNumber: "",
      cardName: "",
      provider: "",
      status: "active",
      notes: "",
    },
  });

  // Assignment form
  const assignmentForm = useForm({
    resolver: zodResolver(insertGasCardAssignmentSchema.omit({ assignedBy: true, assignedDate: true })),
    defaultValues: {
      cardId: 0,
      assignedToUserId: 0,
      purpose: "",
      notes: "",
    },
  });

  // Create gas card mutation
  const createGasCardMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/gas-cards', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gas-cards'] });
      setCardDialogOpen(false);
      gasCardForm.reset();
      toast({ title: "Gas card created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error creating gas card", description: error.message, variant: "destructive" });
    },
  });

  // Create assignment mutation
  const createAssignmentMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/gas-card-assignments', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gas-card-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/gas-card-assignments/active'] });
      setAssignmentDialogOpen(false);
      assignmentForm.reset();
      toast({ title: "Gas card assigned successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error assigning gas card", description: error.message, variant: "destructive" });
    },
  });

  // Return gas card mutation
  const returnGasCardMutation = useMutation({
    mutationFn: (assignmentId: number) => apiRequest(`/api/gas-card-assignments/${assignmentId}/return`, 'PUT', { returnedDate: new Date() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gas-card-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/gas-card-assignments/active'] });
      toast({ title: "Gas card returned successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error returning gas card", description: error.message, variant: "destructive" });
    },
  });

  const handleCreateGasCard = (data: any) => {
    createGasCardMutation.mutate(data);
  };

  const handleCreateAssignment = (data: any) => {
    createAssignmentMutation.mutate(data);
  };

  const handleReturnCard = (assignmentId: number) => {
    returnGasCardMutation.mutate(assignmentId);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      inactive: "secondary",
      lost: "destructive",
      expired: "outline",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  const getAssignmentStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      assigned: "default",
      returned: "secondary",
      overdue: "destructive",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  const availableCards = gasCards.filter((card: GasCard) => 
    card.status === 'active' && !activeAssignments.some((assignment: any) => assignment.cardId === card.id)
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gas Card Tracker</h1>
          <p className="text-muted-foreground">Monitor gas card assignments and track who has which card</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={cardDialogOpen} onOpenChange={setCardDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Gas Card
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Gas Card</DialogTitle>
                <DialogDescription>Create a new gas card for assignment tracking</DialogDescription>
              </DialogHeader>
              <Form {...gasCardForm}>
                <form onSubmit={gasCardForm.handleSubmit(handleCreateGasCard)} className="space-y-4">
                  <FormField
                    control={gasCardForm.control}
                    name="cardNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Card Number</FormLabel>
                        <FormControl>
                          <Input placeholder="**** **** **** 1234" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={gasCardForm.control}
                    name="cardName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Card Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Company Fleet Card 1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={gasCardForm.control}
                    name="provider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Provider</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select provider" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Shell">Shell</SelectItem>
                            <SelectItem value="BP">BP</SelectItem>
                            <SelectItem value="Exxon">Exxon</SelectItem>
                            <SelectItem value="Chevron">Chevron</SelectItem>
                            <SelectItem value="Speedway">Speedway</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={gasCardForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Additional notes about this card..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setCardDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createGasCardMutation.isPending}>
                      {createGasCardMutation.isPending ? "Creating..." : "Create Card"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog open={assignmentDialogOpen} onOpenChange={setAssignmentDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <ArrowLeftRight className="mr-2 h-4 w-4" />
                Assign Card
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Gas Card</DialogTitle>
                <DialogDescription>Assign a gas card to a team member</DialogDescription>
              </DialogHeader>
              <Form {...assignmentForm}>
                <form onSubmit={assignmentForm.handleSubmit(handleCreateAssignment)} className="space-y-4">
                  <FormField
                    control={assignmentForm.control}
                    name="cardId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gas Card</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a gas card" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableCards.map((card: GasCard) => (
                              <SelectItem key={card.id} value={card.id.toString()}>
                                {card.cardName} - {card.provider}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={assignmentForm.control}
                    name="assignedToUserId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assign To</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a user" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {users.map((user: UserType) => (
                              <SelectItem key={user.id} value={user.id.toString()}>
                                {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={assignmentForm.control}
                    name="purpose"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Purpose</FormLabel>
                        <FormControl>
                          <Input placeholder="Job site, project, etc." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={assignmentForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Additional notes..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setAssignmentDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createAssignmentMutation.isPending}>
                      {createAssignmentMutation.isPending ? "Assigning..." : "Assign Card"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active Assignments</TabsTrigger>
          <TabsTrigger value="cards">All Gas Cards</TabsTrigger>
          <TabsTrigger value="history">Assignment History</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Currently Assigned Gas Cards
              </CardTitle>
              <CardDescription>
                Gas cards that are currently assigned to team members
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeLoading ? (
                <div className="flex justify-center py-8">Loading active assignments...</div>
              ) : activeAssignments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No gas cards are currently assigned
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Gas Card</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Assigned Date</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeAssignments.map((assignment: any) => (
                      <TableRow key={assignment.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{assignment.gasCard?.cardName}</div>
                            <div className="text-sm text-muted-foreground">{assignment.gasCard?.provider}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {assignment.assignedToUser?.firstName && assignment.assignedToUser?.lastName 
                              ? `${assignment.assignedToUser.firstName} ${assignment.assignedToUser.lastName}`
                              : assignment.assignedToUser?.username}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(assignment.assignedDate), 'MMM d, yyyy')}
                          </div>
                        </TableCell>
                        <TableCell>{assignment.purpose || "—"}</TableCell>
                        <TableCell>{getAssignmentStatusBadge(assignment.status)}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReturnCard(assignment.id)}
                            disabled={returnGasCardMutation.isPending}
                          >
                            Return Card
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

        <TabsContent value="cards" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                All Gas Cards
              </CardTitle>
              <CardDescription>
                Manage your company's gas card inventory
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cardsLoading ? (
                <div className="flex justify-center py-8">Loading gas cards...</div>
              ) : gasCards.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No gas cards found. Add your first gas card to get started.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Card Name</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Card Number</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gasCards.map((card: GasCard) => (
                      <TableRow key={card.id}>
                        <TableCell className="font-medium">{card.cardName}</TableCell>
                        <TableCell>{card.provider}</TableCell>
                        <TableCell className="font-mono text-sm">{card.cardNumber}</TableCell>
                        <TableCell>{getStatusBadge(card.status)}</TableCell>
                        <TableCell>{card.notes || "—"}</TableCell>
                        <TableCell>{format(new Date(card.createdAt), 'MMM d, yyyy')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Assignment History</CardTitle>
              <CardDescription>
                Complete history of gas card assignments and returns
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assignmentsLoading ? (
                <div className="flex justify-center py-8">Loading assignment history...</div>
              ) : assignments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No assignment history found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Gas Card</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Assigned By</TableHead>
                      <TableHead>Assigned Date</TableHead>
                      <TableHead>Returned Date</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.map((assignment: any) => (
                      <TableRow key={assignment.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{assignment.gasCard?.cardName}</div>
                            <div className="text-sm text-muted-foreground">{assignment.gasCard?.provider}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {assignment.assignedToUser?.firstName && assignment.assignedToUser?.lastName 
                            ? `${assignment.assignedToUser.firstName} ${assignment.assignedToUser.lastName}`
                            : assignment.assignedToUser?.username}
                        </TableCell>
                        <TableCell>
                          {assignment.assignedByUser?.firstName && assignment.assignedByUser?.lastName 
                            ? `${assignment.assignedByUser.firstName} ${assignment.assignedByUser.lastName}`
                            : assignment.assignedByUser?.username}
                        </TableCell>
                        <TableCell>{format(new Date(assignment.assignedDate), 'MMM d, yyyy')}</TableCell>
                        <TableCell>
                          {assignment.returnedDate 
                            ? format(new Date(assignment.returnedDate), 'MMM d, yyyy')
                            : "—"}
                        </TableCell>
                        <TableCell>{assignment.purpose || "—"}</TableCell>
                        <TableCell>{getAssignmentStatusBadge(assignment.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}