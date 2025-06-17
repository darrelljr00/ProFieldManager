import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Calculator } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface LineItem {
  id?: number;
  description: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  category?: string;
}

interface ExpenseLineItemsFormProps {
  lineItems: LineItem[];
  onLineItemsChange: (lineItems: LineItem[]) => void;
  onTotalChange: (total: number) => void;
  categories?: string[];
}

const defaultCategories = [
  "Office Supplies",
  "Travel",
  "Meals & Entertainment",
  "Equipment",
  "Software",
  "Professional Services",
  "Marketing",
  "Utilities",
  "Other"
];

export function ExpenseLineItemsForm({ 
  lineItems, 
  onLineItemsChange, 
  onTotalChange,
  categories = defaultCategories 
}: ExpenseLineItemsFormProps) {
  const [newItem, setNewItem] = useState<Omit<LineItem, 'id'>>({
    description: "",
    quantity: 1,
    unitPrice: 0,
    totalAmount: 0,
    category: ""
  });

  const calculateTotal = (items: LineItem[]) => {
    return items.reduce((sum, item) => sum + item.totalAmount, 0);
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updatedItems = [...lineItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Auto-calculate total amount when quantity or unit price changes
    if (field === 'quantity' || field === 'unitPrice') {
      const quantity = field === 'quantity' ? Number(value) : updatedItems[index].quantity;
      const unitPrice = field === 'unitPrice' ? Number(value) : updatedItems[index].unitPrice;
      updatedItems[index].totalAmount = quantity * unitPrice;
    }
    
    onLineItemsChange(updatedItems);
    onTotalChange(calculateTotal(updatedItems));
  };

  const addLineItem = () => {
    if (!newItem.description) return;
    
    const calculatedTotal = newItem.quantity * newItem.unitPrice;
    const itemToAdd = { ...newItem, totalAmount: calculatedTotal };
    const updatedItems = [...lineItems, itemToAdd];
    
    onLineItemsChange(updatedItems);
    onTotalChange(calculateTotal(updatedItems));
    
    // Reset form
    setNewItem({
      description: "",
      quantity: 1,
      unitPrice: 0,
      totalAmount: 0,
      category: ""
    });
  };

  const removeLineItem = (index: number) => {
    const updatedItems = lineItems.filter((_, i) => i !== index);
    onLineItemsChange(updatedItems);
    onTotalChange(calculateTotal(updatedItems));
  };

  const updateNewItem = (field: keyof Omit<LineItem, 'id'>, value: string | number) => {
    const updated = { ...newItem, [field]: value };
    
    // Auto-calculate total amount
    if (field === 'quantity' || field === 'unitPrice') {
      const quantity = field === 'quantity' ? Number(value) : updated.quantity;
      const unitPrice = field === 'unitPrice' ? Number(value) : updated.unitPrice;
      updated.totalAmount = quantity * unitPrice;
    }
    
    setNewItem(updated);
  };

  const grandTotal = calculateTotal(lineItems);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Line Items
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing Line Items */}
        {lineItems.length > 0 && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Current Items</Label>
            {lineItems.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 p-3 border rounded-lg bg-muted/30">
                <div className="col-span-4">
                  <Input
                    placeholder="Item description"
                    value={item.description}
                    onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                    className="h-8"
                  />
                </div>
                <div className="col-span-2">
                  <Select
                    value={item.category}
                    onValueChange={(value) => updateLineItem(index, 'category', value)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 1)}
                    className="h-8"
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Unit Price"
                    value={item.unitPrice}
                    onChange={(e) => updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                    className="h-8"
                  />
                </div>
                <div className="col-span-1">
                  <div className="h-8 flex items-center text-sm font-medium">
                    ${item.totalAmount.toFixed(2)}
                  </div>
                </div>
                <div className="col-span-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeLineItem(index)}
                    className="h-8 w-8 p-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add New Item Form */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Add New Item</Label>
          <div className="grid grid-cols-12 gap-2 p-3 border rounded-lg bg-background">
            <div className="col-span-4">
              <Input
                placeholder="Item description"
                value={newItem.description}
                onChange={(e) => updateNewItem('description', e.target.value)}
                className="h-8"
              />
            </div>
            <div className="col-span-2">
              <Select
                value={newItem.category}
                onValueChange={(value) => updateNewItem('category', value)}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Input
                type="number"
                min="1"
                step="1"
                placeholder="Qty"
                value={newItem.quantity}
                onChange={(e) => updateNewItem('quantity', parseFloat(e.target.value) || 1)}
                className="h-8"
              />
            </div>
            <div className="col-span-2">
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="Unit Price"
                value={newItem.unitPrice}
                onChange={(e) => updateNewItem('unitPrice', parseFloat(e.target.value) || 0)}
                className="h-8"
              />
            </div>
            <div className="col-span-1">
              <div className="h-8 flex items-center text-sm font-medium">
                ${newItem.totalAmount.toFixed(2)}
              </div>
            </div>
            <div className="col-span-1">
              <Button
                type="button"
                onClick={addLineItem}
                disabled={!newItem.description}
                className="h-8 w-8 p-0"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        {/* Total Summary */}
        {lineItems.length > 0 && (
          <div className="flex justify-between items-center pt-3 border-t">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {lineItems.length} item{lineItems.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            <div className="text-lg font-semibold">
              Total: ${grandTotal.toFixed(2)}
            </div>
          </div>
        )}

        {/* Helper Text */}
        {lineItems.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <Calculator className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Add line items to track individual expense components</p>
            <p className="text-xs mt-1">This helps with detailed expense reporting and analysis</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}