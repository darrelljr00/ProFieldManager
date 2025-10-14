import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type Customer, type Service } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Trash2, Plus } from "lucide-react";

type LineItem = {
  description: string;
  quantity: number;
  amount: number;
  serviceId?: number;
  unitPrice?: number;
};

type QuoteFormData = {
  customerId: number;
  quoteNumber: string;
  quoteDate: string;
  expiryDate: string;
  status: string;
  subtotal: string;
  total: string;
  currency: string;
  notes: string;
  lineItems: LineItem[];
};

interface QuoteFormProps {
  onSuccess?: () => void;
}

export function QuoteForm({ onSuccess }: QuoteFormProps) {
  const [formData, setFormData] = useState<QuoteFormData>({
    customerId: 0,
    quoteNumber: "",
    quoteDate: new Date().toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: "draft",
    subtotal: "",
    total: "",
    currency: "USD",
    notes: "",
    lineItems: [{ description: "", quantity: 1, amount: 0 }],
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/quotes", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({
        title: "Success",
        description: "Quote created successfully",
      });
      setFormData({
        customerId: 0,
        quoteNumber: "",
        quoteDate: new Date().toISOString().split('T')[0],
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: "draft",
        subtotal: "",
        total: "",
        currency: "USD",
        notes: "",
        lineItems: [{ description: "", quantity: 1, amount: 0 }],
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      console.error("Quote creation error:", error);
      
      // Parse validation errors if they exist
      let errorMessage = "Failed to create quote";
      
      if (error.errors && Array.isArray(error.errors)) {
        // Format validation errors
        const errorList = error.errors.map((err: any) => {
          const field = err.path?.join('.') || 'unknown field';
          return `${field}: ${err.message}`;
        }).join('\n');
        errorMessage = `Validation failed:\n${errorList}`;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Cannot Create Quote",
        description: errorMessage,
        variant: "destructive",
        duration: 10000, // Show for 10 seconds
      });
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate customer selection
    if (!formData.customerId || formData.customerId === 0) {
      toast({
        title: "Validation Error",
        description: "Please select a customer",
        variant: "destructive",
      });
      return;
    }

    // Validate dates
    if (!formData.quoteDate || !formData.expiryDate) {
      toast({
        title: "Validation Error",
        description: "Please enter quote and expiry dates",
        variant: "destructive",
      });
      return;
    }

    // Validate line items
    const validLineItems = formData.lineItems.filter(item => 
      item.description.trim() && item.amount > 0
    );

    if (validLineItems.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one line item with description and amount",
        variant: "destructive",
      });
      return;
    }
    
    const subtotal = validLineItems.reduce((sum, item) => sum + item.amount, 0);
    const tax = subtotal * 0.08; // 8% tax rate - you can make this configurable
    const total = subtotal + tax;
    
    const quoteData = {
      ...formData,
      subtotal: subtotal,
      tax: tax,
      total: total,
      lineItems: validLineItems
    };
    mutation.mutate(quoteData);
  };

  const addLineItem = () => {
    setFormData(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, { description: "", quantity: 1, amount: 0 }]
    }));
  };

  const removeLineItem = (index: number) => {
    if (formData.lineItems.length > 1) {
      setFormData(prev => ({
        ...prev,
        lineItems: prev.lineItems.filter((_, i) => i !== index)
      }));
    }
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      lineItems: prev.lineItems.map((item, i) => {
        if (i !== index) return item;
        
        const updated = { ...item, [field]: value };
        
        // If quantity changes and we have a unit price from a service, recalculate amount
        if (field === 'quantity' && item.unitPrice !== undefined) {
          updated.amount = item.unitPrice * (value || 0);
        }
        
        // If amount is manually changed, clear the service link
        if (field === 'amount') {
          updated.serviceId = undefined;
          updated.unitPrice = undefined;
        }
        
        return updated;
      })
    }));
  };

  const selectService = (index: number, serviceId: string) => {
    const service = services.find(s => s.id.toString() === serviceId);
    if (service) {
      const unitPrice = parseFloat(service.price);
      setFormData(prev => ({
        ...prev,
        lineItems: prev.lineItems.map((item, i) => 
          i === index ? { 
            ...item, 
            serviceId: service.id,
            unitPrice: unitPrice,
            description: service.name,
            amount: unitPrice * item.quantity
          } : item
        )
      }));
    }
  };

  return (
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customerId">Customer</Label>
              <Select onValueChange={(value) => setFormData(prev => ({ ...prev, customerId: parseInt(value) }))}>
                <SelectTrigger>
                  <SelectValue placeholder={customers.length === 0 ? "No customers available" : "Select a customer"} />
                </SelectTrigger>
                <SelectContent>
                  {customers.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      <p>No customers found.</p>
                      <p className="text-blue-600 cursor-pointer hover:underline" 
                         onClick={() => window.location.href = '/customers'}>
                        Create a customer first
                      </p>
                    </div>
                  ) : (
                    customers.map((customer: Customer) => (
                      <SelectItem key={customer.id} value={customer.id.toString()}>
                        {customer.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="quoteNumber">Quote Number</Label>
              <Input
                id="quoteNumber"
                placeholder="Q-001"
                value={formData.quoteNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, quoteNumber: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quoteDate">Quote Date</Label>
              <Input
                id="quoteDate"
                type="date"
                value={formData.quoteDate}
                onChange={(e) => setFormData(prev => ({ ...prev, quoteDate: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="expiryDate">Expiry Date</Label>
              <Input
                id="expiryDate"
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Line Items</h3>
              <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </div>
            
            {/* Header row for line items */}
            <div className="grid grid-cols-12 gap-2 mb-2 font-medium text-sm text-muted-foreground">
              <div className="col-span-3">Service / Item</div>
              <div className="col-span-4">Description</div>
              <div className="col-span-2">Quantity</div>
              <div className="col-span-2">Amount ($)</div>
              <div className="col-span-1">Action</div>
            </div>
            
            {formData.lineItems.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 mb-3 p-3 border rounded-lg bg-muted/30">
                <div className="col-span-3">
                  <Label className="text-xs text-muted-foreground">Select Service</Label>
                  <Select onValueChange={(value) => selectService(index, value)}>
                    <SelectTrigger className="mt-1" data-testid={`select-service-${index}`}>
                      <SelectValue placeholder="Choose service..." />
                    </SelectTrigger>
                    <SelectContent>
                      {services.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">
                          No services available
                        </div>
                      ) : (
                        services.map((service) => (
                          <SelectItem key={service.id} value={service.id.toString()}>
                            {service.name} - ${parseFloat(service.price).toFixed(2)}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-4">
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <Input
                    placeholder="Or enter custom description..."
                    value={item.description}
                    onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                    className="mt-1"
                    data-testid={`input-description-${index}`}
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground">Quantity</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={item.quantity}
                    onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value) || 0)}
                    className="mt-1"
                    min="0"
                    data-testid={`input-quantity-${index}`}
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground">Amount ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={item.amount}
                    onChange={(e) => updateLineItem(index, 'amount', parseFloat(e.target.value) || 0)}
                    className="mt-1"
                    min="0"
                    data-testid={`input-amount-${index}`}
                  />
                </div>
                <div className="col-span-1 flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeLineItem(index)}
                    disabled={formData.lineItems.length === 1}
                    className="mt-6"
                    data-testid={`button-remove-item-${index}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            
            {/* Summary section */}
            <div className="mt-6 p-4 border-t bg-muted/20">
              <div className="flex justify-end space-y-2 flex-col">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Subtotal:</span>
                  <span className="font-medium">
                    ${formData.lineItems.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Tax (8%):</span>
                  <span className="text-sm">
                    ${(formData.lineItems.reduce((sum, item) => sum + item.amount, 0) * 0.08).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>
                    ${(formData.lineItems.reduce((sum, item) => sum + item.amount, 0) * 1.08).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Creating..." : "Create Quote"}
            </Button>
          </div>
        </form>
  );
}