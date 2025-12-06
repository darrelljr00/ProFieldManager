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
import { insertGasCardSchema, insertGasCardAssignmentSchema, insertGasCardUsageSchema } from "@shared/schema";
import { CreditCard, Plus, ArrowLeftRight, Calendar, User, Building2, Fuel, History, CheckCircle, AlertCircle, LogIn, LogOut, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { GasCard, GasCardAssignment, GasCardUsage, User as UserType } from "@shared/schema";

export default function GasCards() {
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [usageDialogOpen, setUsageDialogOpen] = useState(false);
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
    queryKey: ['/api/users/assignment'],
  });

  // Fetch gas card usage
  const { data: usageData = [], isLoading: usageLoading } = useQuery({
    queryKey: ['/api/gas-card-usage'],
  });

  // Fetch gas card providers
  const { data: gasCardProviders = [] } = useQuery({
    queryKey: ['/api/gas-card-providers'],
  });

  // Self-service: Fetch current user gas card assignment
  const { data: myGasCard, isLoading: myGasCardLoading, refetch: refetchMyGasCard } = useQuery({
    queryKey: ['/api/my-gas-card'],
  });

  // Self-service: Fetch available cards for checkout
  const { data: availableCardsForCheckout = [], isLoading: availableCardsLoading } = useQuery({
    queryKey: ['/api/my-gas-card/available'],
  });

  // Self-service checkout state
  const [selfServicePurpose, setSelfServicePurpose] = useState("");
  const [selfServiceNotes, setSelfServiceNotes] = useState("");
  const [selectedCardForCheckout, setSelectedCardForCheckout] = useState<number | null>(null);
  const [returnNotes, setReturnNotes] = useState("");

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
    resolver: zodResolver(insertGasCardAssignmentSchema.omit({ assignedBy: true })),
    defaultValues: {
      cardId: 0,
      assignedToUserId: 0,
      assignedDate: new Date(),
      expectedReturnDate: undefined,
      purpose: "",
      notes: "",
    },
  });

  // Create gas card mutation
  const createGasCardMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/gas-cards', data);
      return response.json();
    },
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
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/gas-card-assignments', data);
      return response.json();
    },
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
    mutationFn: async (assignmentId: number) => {
      const response = await apiRequest('PUT', `/api/gas-card-assignments/${assignmentId}/return`, { returnedDate: new Date() });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gas-card-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/gas-card-assignments/active'] });
      toast({ title: "Gas card returned successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error returning gas card", description: error.message, variant: "destructive" });
    },
  });

  // Gas card usage form
  const usageForm = useForm({
    resolver: zodResolver(insertGasCardUsageSchema.omit({ organizationId: true, createdBy: true })),
    defaultValues: {
      cardId: 0,
      userId: 0,
      purchaseDate: new Date(),
      location: "",
      fuelType: "regular",
      gallons: 0,
      pricePerGallon: 0,
      totalAmount: 0,
      mileage: 0,
      vehicleInfo: "",
      purpose: "",
      notes: ""
    }
  });

  // Create gas card usage mutation
  const createUsageMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/gas-card-usage', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gas-card-usage'] });
      setUsageDialogOpen(false);
      usageForm.reset();
      toast({ title: "Gas card usage recorded successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error recording usage", description: error.message, variant: "destructive" });
    },
  });

  // Self-service checkout mutation
  const checkoutMutation = useMutation({
    mutationFn: async (data: { cardId: number; purpose: string; notes: string }) => {
      const response = await apiRequest('POST', '/api/my-gas-card/checkout', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/my-gas-card'] });
      queryClient.invalidateQueries({ queryKey: ['/api/my-gas-card/available'] });
      queryClient.invalidateQueries({ queryKey: ['/api/gas-card-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/gas-card-assignments/active'] });
      setSelectedCardForCheckout(null);
      setSelfServicePurpose("");
      setSelfServiceNotes("");
      toast({ title: "Gas Card Checked Out", description: "You have successfully checked out a gas card." });
    },
    onError: (error: any) => {
      toast({ title: "Checkout Failed", description: error.message || "Failed to check out gas card", variant: "destructive" });
    },
  });

  // Self-service check-in mutation
  const checkinMutation = useMutation({
    mutationFn: async (data: { notes?: string }) => {
      const response = await apiRequest('POST', '/api/my-gas-card/checkin', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/my-gas-card'] });
      queryClient.invalidateQueries({ queryKey: ['/api/my-gas-card/available'] });
      queryClient.invalidateQueries({ queryKey: ['/api/gas-card-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/gas-card-assignments/active'] });
      setReturnNotes("");
      toast({ title: "Gas Card Returned", description: "You have successfully returned your gas card." });
    },
    onError: (error: any) => {
      toast({ title: "Return Failed", description: error.message || "Failed to return gas card", variant: "destructive" });
    },
  });

  const handleSelfServiceCheckout = () => {
    if (selectedCardForCheckout) {
      checkoutMutation.mutate({
        cardId: selectedCardForCheckout,
        purpose: selfServicePurpose,
        notes: selfServiceNotes,
      });
    }
  };

  const handleSelfServiceCheckin = () => {
    checkinMutation.mutate({ notes: returnNotes });
  };

  const handleCreateGasCard = (data: any) => {
    createGasCardMutation.mutate(data);
  };

  const handleCreateAssignment = (data: any) => {
    createAssignmentMutation.mutate(data);
  };

  const handleCreateUsage = (data: any) => {
    createUsageMutation.mutate(data);
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
                            {gasCardProviders.map((provider: any) => (
                              <SelectItem key={provider.id} value={provider.name}>
                                {provider.name}
                              </SelectItem>
                            ))}
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
                    name="assignedDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assignment Date</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                            onChange={(e) => field.onChange(new Date(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={assignmentForm.control}
                    name="expectedReturnDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expected Return Date (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
                            onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                          />
                        </FormControl>
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
        <TabsList className="flex-wrap">
          <TabsTrigger value="my-card">My Gas Card</TabsTrigger>
          <TabsTrigger value="active">Active Assignments</TabsTrigger>
          <TabsTrigger value="cards">All Gas Cards</TabsTrigger>
          <TabsTrigger value="history">Assignment History</TabsTrigger>
          <TabsTrigger value="usage">Historical Usage</TabsTrigger>
        </TabsList>

        {/* My Gas Card - Self-Service Tab */}
        <TabsContent value="my-card" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                My Gas Card
              </CardTitle>
              <CardDescription>
                Check out or return gas cards yourself
              </CardDescription>
            </CardHeader>
            <CardContent>
              {myGasCardLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading your gas card status...</span>
                </div>
              ) : myGasCard ? (
                /* User has a gas card checked out */
                <div className="space-y-6">
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                      <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">You Have a Gas Card</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Card Name</p>
                        <p className="font-medium">{(myGasCard as any).gasCard?.cardName || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Card Number</p>
                        <p className="font-medium">{(myGasCard as any).gasCard?.cardNumber || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Provider</p>
                        <p className="font-medium">{(myGasCard as any).gasCard?.provider || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Checked Out</p>
                        <p className="font-medium">
                          {(myGasCard as any).assignedDate
                            ? format(new Date((myGasCard as any).assignedDate), 'MMM d, yyyy h:mm a')
                            : 'N/A'}
                        </p>
                      </div>
                      {(myGasCard as any).purpose && (
                        <div className="md:col-span-2">
                          <p className="text-sm text-muted-foreground">Purpose</p>
                          <p className="font-medium">{(myGasCard as any).purpose}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Return Card Section */}
                  <div className="border rounded-lg p-6">
                    <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <LogIn className="h-5 w-5" />
                      Return This Card
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Return Notes (optional)</label>
                        <Textarea
                          placeholder="Any notes about the return, e.g., remaining balance, issues..."
                          value={returnNotes}
                          onChange={(e) => setReturnNotes(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <Button
                        onClick={handleSelfServiceCheckin}
                        disabled={checkinMutation.isPending}
                        className="w-full md:w-auto"
                        data-testid="button-return-gas-card"
                      >
                        {checkinMutation.isPending ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Returning...</>
                        ) : (
                          <><LogIn className="h-4 w-4 mr-2" /> Return Gas Card</>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                /* User does not have a gas card - show checkout options */
                <div className="space-y-6">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <AlertCircle className="h-6 w-6 text-blue-600" />
                      <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200">No Gas Card Checked Out</h3>
                    </div>
                    <p className="text-blue-700 dark:text-blue-300">You don't currently have a gas card. Select one below to check it out.</p>
                  </div>

                  {/* Checkout Section */}
                  <div className="border rounded-lg p-6">
                    <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <LogOut className="h-5 w-5" />
                      Check Out a Gas Card
                    </h4>
                    
                    {availableCardsLoading ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span className="ml-2">Loading available cards...</span>
                      </div>
                    ) : availableCardsForCheckout.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <AlertCircle className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                        <p>No gas cards are currently available for checkout.</p>
                        <p className="text-sm">Please check with your manager.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Available Cards Grid */}
                        <div>
                          <label className="text-sm font-medium">Select a Card</label>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
                            {availableCardsForCheckout.map((card: GasCard) => (
                              <div
                                key={card.id}
                                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                                  selectedCardForCheckout === card.id
                                    ? 'border-primary bg-primary/5 ring-2 ring-primary'
                                    : 'hover:border-gray-400'
                                }`}
                                onClick={() => setSelectedCardForCheckout(card.id)}
                                data-testid={`card-gas-card-${card.id}`}
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <CreditCard className="h-5 w-5" />
                                  <span className="font-medium">{card.cardName}</span>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  <p>{card.provider}</p>
                                  <p>****{card.cardNumber?.slice(-4)}</p>
                                </div>
                                {selectedCardForCheckout === card.id && (
                                  <CheckCircle className="h-5 w-5 text-primary mt-2" />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Purpose and Notes */}
                        <div>
                          <label className="text-sm font-medium">Purpose (optional)</label>
                          <Input
                            placeholder="e.g., Job site visit, supply run..."
                            value={selfServicePurpose}
                            onChange={(e) => setSelfServicePurpose(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Notes (optional)</label>
                          <Textarea
                            placeholder="Any additional notes..."
                            value={selfServiceNotes}
                            onChange={(e) => setSelfServiceNotes(e.target.value)}
                            className="mt-1"
                          />
                        </div>

                        <Button
                          onClick={handleSelfServiceCheckout}
                          disabled={!selectedCardForCheckout || checkoutMutation.isPending}
                          className="w-full md:w-auto"
                          data-testid="button-checkout-gas-card"
                        >
                          {checkoutMutation.isPending ? (
                            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Checking Out...</>
                          ) : (
                            <><LogOut className="h-4 w-4 mr-2" /> Check Out Selected Card</>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

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
                      <TableHead>Expected Return</TableHead>
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
                        <TableCell>
                          {assignment.expectedReturnDate 
                            ? format(new Date(assignment.expectedReturnDate), 'MMM d, yyyy')
                            : "—"}
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
                      <TableHead>Expected Return</TableHead>
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
                          {assignment.assignedBy === assignment.assignedTo ? (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                              <Users className="h-3 w-3 mr-1" />
                              Self-Service
                            </Badge>
                          ) : (
                            <span>
                              {assignment.assignedByUser?.firstName && assignment.assignedByUser?.lastName 
                                ? `${assignment.assignedByUser.firstName} ${assignment.assignedByUser.lastName}`
                                : assignment.assignedByUser?.username}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{format(new Date(assignment.assignedDate), 'MMM d, yyyy')}</TableCell>
                        <TableCell>
                          {assignment.expectedReturnDate 
                            ? format(new Date(assignment.expectedReturnDate), 'MMM d, yyyy')
                            : "—"}
                        </TableCell>
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

        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Historical Gas Card Usage
                  </CardTitle>
                  <CardDescription>
                    Record and track historical fuel purchases for gas cards
                  </CardDescription>
                </div>
                <Dialog open={usageDialogOpen} onOpenChange={setUsageDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Record Usage
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Record Gas Card Usage</DialogTitle>
                      <DialogDescription>Record a historical fuel purchase for tracking purposes</DialogDescription>
                    </DialogHeader>
                    <Form {...usageForm}>
                      <form onSubmit={usageForm.handleSubmit(handleCreateUsage)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={usageForm.control}
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
                                    {gasCards.map((card: GasCard) => (
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
                            control={usageForm.control}
                            name="userId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>User</FormLabel>
                                <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select user" />
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
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={usageForm.control}
                            name="purchaseDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Purchase Date</FormLabel>
                                <FormControl>
                                  <Input type="datetime-local" {...field} value={field.value instanceof Date ? field.value.toISOString().slice(0, 16) : field.value} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={usageForm.control}
                            name="location"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Location</FormLabel>
                                <FormControl>
                                  <Input placeholder="Gas station location" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <FormField
                            control={usageForm.control}
                            name="gallons"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Gallons</FormLabel>
                                <FormControl>
                                  <Input type="number" step="0.01" placeholder="0.00" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={usageForm.control}
                            name="pricePerGallon"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Price Per Gallon</FormLabel>
                                <FormControl>
                                  <Input type="number" step="0.01" placeholder="$0.00" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={usageForm.control}
                            name="totalAmount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Total Amount</FormLabel>
                                <FormControl>
                                  <Input type="number" step="0.01" placeholder="$0.00" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={usageForm.control}
                            name="fuelType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Fuel Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select fuel type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="regular">Regular</SelectItem>
                                    <SelectItem value="mid-grade">Mid-Grade</SelectItem>
                                    <SelectItem value="premium">Premium</SelectItem>
                                    <SelectItem value="diesel">Diesel</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={usageForm.control}
                            name="mileage"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Odometer Reading</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="Miles" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={usageForm.control}
                          name="vehicleInfo"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Vehicle Information</FormLabel>
                              <FormControl>
                                <Input placeholder="Vehicle make, model, license plate" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={usageForm.control}
                          name="purpose"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Purpose</FormLabel>
                              <FormControl>
                                <Input placeholder="Business purpose for fuel purchase" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={usageForm.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Notes</FormLabel>
                              <FormControl>
                                <textarea 
                                  className="w-full p-2 border rounded-md" 
                                  rows={3} 
                                  placeholder="Additional notes about the purchase"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => setUsageDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={createUsageMutation.isPending}>
                            {createUsageMutation.isPending ? "Recording..." : "Record Usage"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {usageLoading ? (
                <div className="flex justify-center py-8">Loading usage history...</div>
              ) : usageData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No gas card usage recorded yet
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Gas Card</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Fuel Type</TableHead>
                      <TableHead>Gallons</TableHead>
                      <TableHead>Price/Gal</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Odometer</TableHead>
                      <TableHead>Purpose</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usageData.map((usage: GasCardUsage) => (
                      <TableRow key={usage.id}>
                        <TableCell>{format(new Date(usage.purchaseDate), 'MMM d, yyyy')}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{usage.cardName}</div>
                            <div className="text-sm text-muted-foreground">{usage.cardNumber}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {usage.userFirstName && usage.userLastName 
                            ? `${usage.userFirstName} ${usage.userLastName}`
                            : usage.userName}
                        </TableCell>
                        <TableCell>{usage.location}</TableCell>
                        <TableCell className="capitalize">{usage.fuelType}</TableCell>
                        <TableCell>{usage.gallons} gal</TableCell>
                        <TableCell>${usage.pricePerGallon.toFixed(2)}</TableCell>
                        <TableCell className="font-medium">${usage.totalAmount}</TableCell>
                        <TableCell>{usage.mileage ? `${usage.mileage} mi` : "—"}</TableCell>
                        <TableCell>{usage.purpose || "—"}</TableCell>
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