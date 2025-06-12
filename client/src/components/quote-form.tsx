import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Trash2 } from "lucide-react";
import type { InsertQuote, Customer } from "@shared/schema";

const lineItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().positive("Quantity must be positive"),
  rate: z.number().positive("Rate must be positive"),
  amount: z.number().positive("Amount must be positive"),
});

const quoteSchema = z.object({
  customerId: z.number().positive("Customer is required"),
  quoteDate: z.string().min(1, "Quote date is required"),
  expiryDate: z.string().min(1, "Expiry date is required"),
  currency: z.string().default("USD"),
  notes: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required"),
  subtotal: z.number(),
  taxRate: z.number().min(0),
  taxAmount: z.number(),
  total: z.number(),
});

type QuoteFormData = z.infer<typeof quoteSchema>;

interface QuoteFormProps {
  onSuccess?: () => void;
}

export function QuoteForm({ onSuccess }: QuoteFormProps) {
  const [lineItems, setLineItems] = useState([
    { description: "", quantity: 1, rate: 0, amount: 0 }
  ]);
  const [taxRate, setTaxRate] = useState(0.1); // 10% default
  const { toast } = useToast();

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      currency: "USD",
      lineItems: lineItems,
      subtotal: 0,
      taxRate: taxRate,
      taxAmount: 0,
      total: 0,
    },
  });

  const createQuoteMutation = useMutation({
    mutationFn: (data: InsertQuote) => apiRequest("POST", "/api/quotes", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({
        title: "Success",
        description: "Quote created successfully",
      });
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create quote",
        variant: "destructive",
      });
    },
  });

  const updateLineItem = (index: number, field: keyof typeof lineItems[0], value: string | number) => {
    const updatedItems = [...lineItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Recalculate amount if quantity or rate changed
    if (field === 'quantity' || field === 'rate') {
      updatedItems[index].amount = updatedItems[index].quantity * updatedItems[index].rate;
    }
    
    setLineItems(updatedItems);
    setValue('lineItems', updatedItems);
    calculateTotals(updatedItems);
  };

  const addLineItem = () => {
    const newItem = { description: "", quantity: 1, rate: 0, amount: 0 };
    const updatedItems = [...lineItems, newItem];
    setLineItems(updatedItems);
    setValue('lineItems', updatedItems);
  };

  const removeLineItem = (index: number) => {
    const updatedItems = lineItems.filter((_, i) => i !== index);
    setLineItems(updatedItems);
    setValue('lineItems', updatedItems);
    calculateTotals(updatedItems);
  };

  const calculateTotals = (items: typeof lineItems) => {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = subtotal * taxRate;
    const total = subtotal + taxAmount;
    
    setValue('subtotal', subtotal);
    setValue('taxAmount', taxAmount);
    setValue('total', total);
  };

  const onSubmit = (data: QuoteFormData) => {
    const quoteData: InsertQuote = {
      ...data,
      userId: 1, // This will be set by the backend from authenticated user
      quoteNumber: `QUO-${Date.now()}`, // Generate quote number
      quoteDate: new Date(data.quoteDate),
      expiryDate: new Date(data.expiryDate),
      subtotal: data.subtotal.toString(),
      taxRate: (taxRate * 100).toString(), // Convert to percentage
      taxAmount: data.taxAmount.toString(),
      total: data.total.toString(),
      status: "draft", // Default status
    };
    
    createQuoteMutation.mutate(quoteData);
  };

  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="customerId">Customer *</Label>
          <Select onValueChange={(value) => setValue('customerId', parseInt(value))}>
            <SelectTrigger>
              <SelectValue placeholder="Select Customer" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((customer: Customer) => (
                <SelectItem key={customer.id} value={customer.id.toString()}>
                  {customer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.customerId && (
            <p className="text-sm text-red-600 mt-1">{errors.customerId.message}</p>
          )}
        </div>
        
        <div>
          <Label htmlFor="quoteDate">Quote Date *</Label>
          <Input
            id="quoteDate"
            type="date"
            {...register("quoteDate")}
          />
          {errors.quoteDate && (
            <p className="text-sm text-red-600 mt-1">{errors.quoteDate.message}</p>
          )}
        </div>
        
        <div>
          <Label htmlFor="expiryDate">Expiry Date *</Label>
          <Input
            id="expiryDate"
            type="date"
            {...register("expiryDate")}
          />
          {errors.expiryDate && (
            <p className="text-sm text-red-600 mt-1">{errors.expiryDate.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="currency">Currency</Label>
          <Select onValueChange={(value) => setValue('currency', value)} defaultValue="USD">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
              <SelectItem value="GBP">GBP</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Line Items */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <Label className="text-lg font-semibold">Line Items</Label>
          <Button type="button" onClick={addLineItem} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
        
        <div className="space-y-3">
          {lineItems.map((item, index) => (
            <Card key={index}>
              <CardContent className="pt-4">
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-4">
                    <Label className="text-xs">Description *</Label>
                    <Input
                      placeholder="Item description"
                      value={item.description}
                      onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Quantity *</Label>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Rate *</Label>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={item.rate}
                      onChange={(e) => updateLineItem(index, 'rate', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Amount</Label>
                    <Input
                      type="number"
                      value={item.amount.toFixed(2)}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                  <div className="col-span-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => removeLineItem(index)}
                      disabled={lineItems.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {errors.lineItems && (
          <p className="text-sm text-red-600 mt-1">{errors.lineItems.message}</p>
        )}
      </div>

      {/* Totals */}
      <div className="space-y-4 border-t pt-4">
        <div className="flex justify-between text-sm">
          <span>Subtotal:</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Tax ({(taxRate * 100).toFixed(1)}%):</span>
          <span>${taxAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-lg font-semibold border-t pt-2">
          <span>Total:</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Additional notes or terms..."
          {...register("notes")}
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button 
          type="submit" 
          disabled={createQuoteMutation.isPending}
        >
          {createQuoteMutation.isPending ? "Creating..." : "Create Quote"}
        </Button>
      </div>
    </form>
  );
}