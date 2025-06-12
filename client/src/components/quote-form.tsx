import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type Customer } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  rate: number;
  amount: number;
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
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const mutation = useMutation({
    mutationFn: (data: InsertQuote) => apiRequest("POST", "/api/quotes", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({
        title: "Success",
        description: "Quote created successfully",
      });
      setOpen(false);
      form.reset();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create quote",
        variant: "destructive",
      });
    },
  });

  const form = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      customerId: 0,
      quoteNumber: "",
      quoteDate: new Date().toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: "pending",
      subtotal: "",
      total: "",
      currency: "USD",
      notes: "",
      lineItems: [{ description: "", quantity: 1, rate: 0, amount: 0 }],
    },
  });

  const onSubmit = (data: QuoteFormData) => {
    const subtotal = data.lineItems.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
    const quoteData: InsertQuote = {
      ...data,
      quoteDate: new Date(data.quoteDate),
      expiryDate: new Date(data.expiryDate),
      subtotal: subtotal.toString(),
      total: subtotal.toString(),
      userId: 1, // This would come from auth context in a real app
      lineItems: data.lineItems.map(item => ({
        ...item,
        amount: item.quantity * item.rate
      }))
    };
    mutation.mutate(quoteData);
  };

  const addLineItem = () => {
    const currentItems = form.getValues("lineItems");
    form.setValue("lineItems", [...currentItems, { description: "", quantity: 1, rate: 0, amount: 0 }]);
  };

  const removeLineItem = (index: number) => {
    const currentItems = form.getValues("lineItems");
    if (currentItems.length > 1) {
      form.setValue("lineItems", currentItems.filter((_, i) => i !== index));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create Quote</Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Quote</DialogTitle>
          <DialogDescription>
            Create a new quote for a customer. You can add multiple line items.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a customer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers.map((customer: Customer) => (
                          <SelectItem key={customer.id} value={customer.id.toString()}>
                            {customer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="quoteNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quote Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Q-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="issueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issue Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expiryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiry Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Line Items</h3>
                <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>
              {form.watch("lineItems").map((_, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 mb-2">
                  <div className="col-span-6">
                    <FormField
                      control={form.control}
                      name={`lineItems.${index}.description`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="Description" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="col-span-2">
                    <FormField
                      control={form.control}
                      name={`lineItems.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Qty"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="col-span-3">
                    <FormField
                      control={form.control}
                      name={`lineItems.${index}.unitPrice`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Unit Price"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="col-span-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeLineItem(index)}
                      disabled={form.watch("lineItems").length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <FormField
              control={form.control}
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
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Creating..." : "Create Quote"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}