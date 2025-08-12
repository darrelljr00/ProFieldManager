import { useState, useEffect } from "react";
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
import type { InsertInvoice, Customer } from "@shared/schema";

const lineItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().positive("Quantity must be positive"),
  rate: z.number().positive("Rate must be positive"),
  amount: z.number().positive("Amount must be positive"),
});

const invoiceSchema = z.object({
  customerId: z.number().positive("Customer is required"),
  invoiceDate: z.string().min(1, "Invoice date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  currency: z.string().default("USD"),
  paymentMethod: z.enum(["check", "ach", "square"]).default("check"),
  notes: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required"),
  subtotal: z.number().default(0),
  taxRate: z.number().min(0).default(0),
  taxAmount: z.number().default(0),
  total: z.number().default(0),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface InvoiceFormProps {
  onSuccess?: () => void;
}

export function InvoiceForm({ onSuccess }: InvoiceFormProps) {
  const [lineItems, setLineItems] = useState([
    { description: "", quantity: 1, rate: 0, amount: 0 }
  ]);
  const [taxRate, setTaxRate] = useState(0.1); // Default to 10%
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"check" | "ach" | "square">("check");
  const { toast } = useToast();

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  // Fetch company settings for invoice header
  const { data: companySettings } = useQuery({
    queryKey: ["/api/settings/company"],
  });

  // Fetch invoice settings for default values
  const { data: invoiceSettings } = useQuery({
    queryKey: ["/api/settings/invoice"],
  });

  // Fetch payment settings for Square integration
  const { data: paymentSettings } = useQuery({
    queryKey: ["/api/settings/payment"],
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      currency: "USD",
      paymentMethod: "check",
      lineItems: [{ description: "", quantity: 1, rate: 0, amount: 0 }],
      subtotal: 0,
      taxRate: 0.1,
      taxAmount: 0,
      total: 0,
      invoiceDate: new Date().toISOString().split('T')[0], // Current date in YYYY-MM-DD format
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    },
  });

  // Update defaults when invoice settings are loaded
  useEffect(() => {
    if (invoiceSettings?.taxRate) {
      setTaxRate(invoiceSettings.taxRate / 100);
      setValue('taxRate', invoiceSettings.taxRate / 100);
    }
    if (invoiceSettings?.defaultCurrency) {
      setValue('currency', invoiceSettings.defaultCurrency);
    }
    if (invoiceSettings?.invoiceFooter) {
      setValue('notes', invoiceSettings.invoiceFooter);
    }
  }, [invoiceSettings, setValue]);

  // Sync line items with form when they change
  useEffect(() => {
    setValue('lineItems', lineItems);
    calculateTotals(lineItems);
  }, [lineItems, setValue]);

  const createInvoiceMutation = useMutation({
    mutationFn: (data: InsertInvoice) => apiRequest("POST", "/api/invoices", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Invoice created successfully",
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create invoice",
        variant: "destructive",
      });
    },
  });

  const updateLineItem = (index: number, field: keyof typeof lineItems[0], value: string | number) => {
    const updatedItems = [...lineItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    if (field === 'quantity' || field === 'rate') {
      const quantity = Number(updatedItems[index].quantity);
      const rate = Number(updatedItems[index].rate);
      updatedItems[index].amount = quantity * rate;
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

  const onSubmit = (data: InvoiceFormData) => {
    const invoiceData: InsertInvoice = {
      ...data,
      userId: 1, // This will be set by the backend from authenticated user
      invoiceNumber: `INV-${Date.now()}`, // Generate invoice number
      invoiceDate: new Date(data.invoiceDate),
      dueDate: new Date(data.dueDate),
      subtotal: data.subtotal.toString(),
      taxRate: (taxRate * 100).toString(), // Convert to percentage
      taxAmount: data.taxAmount.toString(),
      total: data.total.toString(),
      status: "draft", // Default status
      paymentMethod: selectedPaymentMethod,
    };
    
    // If Square is selected and enabled, initiate Square payment sync
    if (selectedPaymentMethod === "square" && paymentSettings?.squareEnabled) {
      handleSquarePayment(invoiceData);
    } else {
      createInvoiceMutation.mutate(invoiceData);
    }
  };

  const handleSquarePayment = async (invoiceData: InsertInvoice) => {
    try {
      toast({
        title: "Square Integration",
        description: "Syncing with Square payment system...",
      });
      
      // Create invoice with Square payment method
      createInvoiceMutation.mutate(invoiceData);
    } catch (error) {
      toast({
        title: "Square Sync Error",
        description: "Failed to sync with Square. Invoice created without Square integration.",
        variant: "destructive",
      });
      // Fallback to creating invoice without Square integration
      createInvoiceMutation.mutate({ ...invoiceData, paymentMethod: "check" });
    }
  };

  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900">Create New Invoice</h3>
      </div>

      {/* Company Information Header */}
      <div className="mb-6 bg-gray-50 border rounded-lg p-4">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <h4 className="text-lg font-semibold text-gray-900">
              {companySettings?.companyName || "Your Company Name"}
            </h4>
            <div className="text-sm text-gray-600 space-y-1">
              {companySettings?.companyStreetAddress && (
                <p>{companySettings.companyStreetAddress}</p>
              )}
              {(companySettings?.companyCity || companySettings?.companyState || companySettings?.companyZipCode) && (
                <p>
                  {[companySettings?.companyCity, companySettings?.companyState, companySettings?.companyZipCode]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              )}
              {companySettings?.companyCountry && (
                <p>{companySettings.companyCountry}</p>
              )}
              {companySettings?.companyPhone && (
                <p>Phone: {companySettings.companyPhone}</p>
              )}
              {companySettings?.companyEmail && (
                <p>Email: {companySettings.companyEmail}</p>
              )}
              {companySettings?.companyWebsite && (
                <p>Website: {companySettings.companyWebsite}</p>
              )}
            </div>
          </div>
          {companySettings?.logo && (
            <div className="ml-4">
              <img 
                src={companySettings.logo} 
                alt="Company Logo" 
                className="h-16 w-16 object-contain"
              />
            </div>
          )}
        </div>
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="customerId">Customer *</Label>
            <Select onValueChange={(value) => setValue('customerId', parseInt(value))}>
              <SelectTrigger>
                <SelectValue placeholder={customers.length === 0 ? "No customers available" : "Select Customer"} />
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
            {errors.customerId && (
              <p className="text-sm text-red-600 mt-1">{errors.customerId.message}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="invoiceDate">Invoice Date *</Label>
            <Input
              id="invoiceDate"
              type="date"
              {...register('invoiceDate')}
            />
            {errors.invoiceDate && (
              <p className="text-sm text-red-600 mt-1">{errors.invoiceDate.message}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="dueDate">Due Date *</Label>
            <Input
              id="dueDate"
              type="date"
              {...register('dueDate')}
            />
            {errors.dueDate && (
              <p className="text-sm text-red-600 mt-1">{errors.dueDate.message}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="currency">Currency</Label>
            <Select defaultValue="USD" onValueChange={(value) => setValue('currency', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD ($)</SelectItem>
                <SelectItem value="EUR">EUR (€)</SelectItem>
                <SelectItem value="GBP">GBP (£)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="paymentMethod">Payment Method *</Label>
            <Select 
              defaultValue="check" 
              onValueChange={(value) => {
                const method = value as "check" | "ach" | "square";
                setSelectedPaymentMethod(method);
                setValue('paymentMethod', method);
                
                // Show Square sync notification
                if (method === "square" && paymentSettings?.squareEnabled) {
                  toast({
                    title: "Square Selected",
                    description: "Invoice will be automatically synced with your Square account when created.",
                  });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="check">Pay by Check</SelectItem>
                <SelectItem value="ach">Pay by ACH</SelectItem>
                <SelectItem 
                  value="square" 
                  disabled={!paymentSettings?.squareEnabled}
                >
                  Pay by Square
                  {paymentSettings?.squareEnabled && (
                    <span className="ml-2 text-xs text-green-600">(Connected)</span>
                  )}
                  {!paymentSettings?.squareEnabled && (
                    <span className="ml-2 text-xs text-red-600">(Not Connected)</span>
                  )}
                </SelectItem>
              </SelectContent>
            </Select>
            {!paymentSettings?.squareEnabled && (
              <p className="text-xs text-amber-600 mt-1">
                Square integration not configured. Enable in Payment Settings to accept Square payments.
              </p>
            )}
          </div>
        </div>
        
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">Line Items *</Label>
          <div className="space-y-3">
            {lineItems.map((item, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-5">
                      <Input
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Input
                        type="number"
                        placeholder="Quantity"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Rate"
                        value={item.rate}
                        onChange={(e) => updateLineItem(index, 'rate', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Input
                        placeholder="$0.00"
                        value={`$${item.amount.toFixed(2)}`}
                        readOnly
                        className="bg-gray-50"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeLineItem(index)}
                        disabled={lineItems.length === 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={addLineItem}
            className="mt-3"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Line Item
          </Button>
          {errors.lineItems && (
            <p className="text-sm text-red-600 mt-1">{errors.lineItems.message}</p>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              rows={4}
              placeholder={invoiceSettings?.invoiceFooter || "Additional notes..."}
              {...register('notes')}
            />
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tax ({(taxRate * 100).toFixed(0)}%):</span>
              <span className="font-medium">${taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-semibold border-t pt-2">
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <Button type="button" variant="outline" onClick={onSuccess}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={createInvoiceMutation.isPending}
            className="bg-primary hover:bg-blue-700"
          >
            {createInvoiceMutation.isPending ? "Creating..." : "Create Invoice"}
          </Button>
        </div>
      </form>
    </div>
  );
}
