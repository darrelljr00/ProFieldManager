import { useState, useEffect } from "react";

// TypeScript declaration for window timeout property
declare global {
  interface Window {
    smartCaptureSearchTimeout?: NodeJS.Timeout;
  }
}
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Package, List, Edit, AlertCircle, Trash2, Pencil, FileText, DollarSign, Download, ChevronDown, Search } from "lucide-react";
import * as XLSX from 'xlsx';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  insertSmartCaptureListSchema, 
  insertSmartCaptureItemSchema,
  type InsertSmartCaptureList,
  type InsertSmartCaptureItem,
  type SmartCaptureList,
  type SmartCaptureItem
} from "@shared/schema";

// Type for Smart Capture list with items (as returned by the API)
type SmartCaptureListWithItems = SmartCaptureList & {
  items: SmartCaptureItem[];
};

// Using shared schemas from @shared/schema.ts to ensure backend/frontend consistency

// Draft Invoice Preview Component
function DraftInvoicePreview({ projectId }: { projectId: number }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check if user is admin or manager for pricing visibility
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';

  // Fetch draft invoice data
  const { data: draftInvoice, isLoading, error } = useQuery<any>({
    queryKey: ['/api/projects', projectId, 'invoice-draft'],
    queryFn: () => apiRequest('GET', `/api/projects/${projectId}/invoice-draft`).then(res => res.json()),
    enabled: !!projectId
  });

  // Listen for real-time WebSocket updates
  useEffect(() => {
    const handleWebSocketUpdate = (event: CustomEvent) => {
      const { eventType, data } = event.detail;
      
      // Refresh draft invoice on Smart Capture or invoice changes
      if (eventType === 'smart_capture_item_created' ||
          eventType === 'smart_capture_item_updated' ||
          eventType === 'smart_capture_item_deleted' ||
          eventType === 'draft_invoice_created' ||
          eventType === 'project_invoice_finalized') {
        
        // Only refresh if it's for our project
        if (data?.projectId === projectId) {
          queryClient.invalidateQueries({ 
            queryKey: ['/api/projects', projectId, 'invoice-draft'] 
          });
        }
      }
    };

    window.addEventListener('websocket-update', handleWebSocketUpdate);
    return () => window.removeEventListener('websocket-update', handleWebSocketUpdate);
  }, [projectId, queryClient]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground animate-pulse" />
            <p className="text-muted-foreground">Loading draft invoice...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-500" />
            <p className="text-red-600">Error loading draft invoice</p>
            <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!draftInvoice) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">No draft invoice found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Smart Capture items will automatically create invoice line items
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate totals
  const subtotal = draftInvoice.lineItems?.reduce((sum: number, item: any) => {
    const price = parseFloat(item.rate?.toString() || '0');
    const qty = parseInt(item.quantity?.toString() || '0');
    return sum + (price * qty);
  }, 0) || 0;

  const taxAmount = subtotal * 0.08; // 8% tax rate - could be configurable
  const total = subtotal + taxAmount;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Draft Invoice Preview
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Real-time preview of invoice generated from Smart Capture items
            </p>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            Draft
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Invoice Details */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Invoice ID</Label>
            <p className="font-medium">{draftInvoice.id}</p>
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Project ID</Label>
            <p className="font-medium">{draftInvoice.projectId}</p>
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Status</Label>
            <Badge variant="secondary">Draft</Badge>
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Created</Label>
            <p className="text-sm">{new Date(draftInvoice.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Line Items */}
        <div>
          <h4 className="font-medium mb-3">Line Items</h4>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  {isAdminOrManager && <TableHead className="text-right">Unit Price</TableHead>}
                  {isAdminOrManager && <TableHead className="text-right">Total</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {!draftInvoice.lineItems || draftInvoice.lineItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdminOrManager ? 4 : 2} className="text-center text-muted-foreground py-6">
                      No line items yet. Add Smart Capture items to generate invoice lines.
                    </TableCell>
                  </TableRow>
                ) : (
                  draftInvoice.lineItems.map((item: any, index: number) => {
                    const unitPrice = parseFloat(item.rate?.toString() || '0');
                    const quantity = parseInt(item.quantity?.toString() || '0');
                    const lineTotal = unitPrice * quantity;
                    
                    return (
                      <TableRow key={item.id || index}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.description}</p>
                            {item.notes && (
                              <p className="text-sm text-muted-foreground">{item.notes}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{quantity}</TableCell>
                        {isAdminOrManager && (
                          <TableCell className="text-right">${unitPrice.toFixed(2)}</TableCell>
                        )}
                        {isAdminOrManager && (
                          <TableCell className="text-right">${lineTotal.toFixed(2)}</TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Totals (only for admins/managers) */}
        {isAdminOrManager && draftInvoice.lineItems && draftInvoice.lineItems.length > 0 && (
          <div className="border-t pt-4">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (8%):</span>
                  <span>${taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-medium text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status Information */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            💡 <strong>Real-time sync:</strong> This preview automatically updates when Smart Capture items are added, modified, or removed. 
            When the project is marked as completed, this draft will be automatically converted to a final invoice.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SmartCapturePage() {
  const [isCreateListDialogOpen, setIsCreateListDialogOpen] = useState(false);
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [isEditItemDialogOpen, setIsEditItemDialogOpen] = useState(false);
  const [isEditListDialogOpen, setIsEditListDialogOpen] = useState(false);
  const [isDeleteListDialogOpen, setIsDeleteListDialogOpen] = useState(false);
  const [isAddMasterItemDialogOpen, setIsAddMasterItemDialogOpen] = useState(false);
  const [selectedSmartCaptureList, setSelectedSmartCaptureList] = useState<any>(null);
  const [editingItem, setEditingItem] = useState<SmartCaptureItem | null>(null);
  const [editingList, setEditingList] = useState<SmartCaptureList | null>(null);
  const [activeTab, setActiveTab] = useState("lists");
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  
  // Smart Capture pricing visibility setting
  const [showSmartCapturePricing, setShowSmartCapturePricing] = useState(true);
  
  // State for automatic master item linking
  const [masterSearchResults, setMasterSearchResults] = useState<any[]>([]);
  const [matchedMasterItem, setMatchedMasterItem] = useState<any>(null);
  
  // State for master inventory search
  const [masterInventorySearch, setMasterInventorySearch] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Check if user is admin or manager
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';

  // State for customer locations
  const [customerLocations, setCustomerLocations] = useState<any[]>([]);

  // Fetch customer locations directly with useEffect
  useEffect(() => {
    const fetchCustomerLocations = async () => {
      try {
        const response = await apiRequest('GET', '/api/customers/locations');
        const data = await response.json();
        console.log('✅ Customer locations fetched:', data);
        setCustomerLocations(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('❌ Error fetching customer locations:', error);
        setCustomerLocations([]);
      }
    };
    
    fetchCustomerLocations();
  }, []);

  // Fetch Smart Capture lists
  const { data: smartCaptureLists = [], isLoading: smartCaptureLoading, error: smartCaptureError } = useQuery({
    queryKey: ['/api/smart-capture/lists']
  });

  // Find or create master inventory list
  const masterInventoryList = smartCaptureLists.find((list: any) => 
    list.name === 'Master Inventory' || list.description?.includes('Master Inventory')
  ) || smartCaptureLists[0]; // Fallback to first list if no master list found

  // Fetch ALL projects for project selection in forms (not just active ones)
  const { data: allProjects = [] } = useQuery<any[]>({
    queryKey: ['/api/projects']
  });

  // For the dropdown, we'll show active projects plus any currently assigned project
  const projects = allProjects.filter((project: any) => project.status === 'active') || [];

  // Fetch Smart Capture items for selected list
  const { data: selectedListWithItems, isLoading: itemsLoading, error: itemsError } = useQuery<SmartCaptureListWithItems>({
    queryKey: ['/api/smart-capture/lists', selectedSmartCaptureList?.id],
    enabled: !!selectedSmartCaptureList?.id
  });

  // Extract items from the selected list response
  const smartCaptureItems = selectedListWithItems?.items || [];

  // Fetch ALL master inventory items from all lists for Master Inventory display
  const { data: allMasterItems = [], isLoading: masterItemsLoading } = useQuery({
    queryKey: ['/api/smart-capture/search'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/smart-capture/search');
      const result = await response.json();
      return Array.isArray(result) ? result : [];
    }
  });

  // Filter master items based on search term
  const filteredMasterItems = allMasterItems.filter((item: SmartCaptureItem) => {
    if (!masterInventorySearch.trim()) return true;
    
    const searchTerm = masterInventorySearch.toLowerCase();
    return (
      item.partNumber?.toLowerCase().includes(searchTerm) ||
      item.vehicleNumber?.toLowerCase().includes(searchTerm) ||
      item.inventoryNumber?.toLowerCase().includes(searchTerm) ||
      item.description?.toLowerCase().includes(searchTerm) ||
      item.location?.toLowerCase().includes(searchTerm)
    );
  });

  // Function to handle location suggestions
  const handleLocationSearch = (value: string) => {
    console.log('🔍 handleLocationSearch called with value:', value);
    console.log('📍 Available customerLocations:', customerLocations);
    
    if (!value.trim()) {
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
      return;
    }

    const filtered = customerLocations.filter((location: any) => 
      location.address?.toLowerCase().includes(value.toLowerCase()) ||
      location.city?.toLowerCase().includes(value.toLowerCase()) ||
      location.state?.toLowerCase().includes(value.toLowerCase()) ||
      location.name?.toLowerCase().includes(value.toLowerCase())
    );
    
    console.log('✅ Filtered locations:', filtered);
    setLocationSuggestions(filtered);
    setShowLocationSuggestions(filtered.length > 0);
  };

  // Function to apply selected location
  const applyLocationSuggestion = (location: any) => {
    masterItemForm.setValue('address', location.address || '');
    masterItemForm.setValue('city', location.city || '');
    masterItemForm.setValue('state', location.state || '');
    setShowLocationSuggestions(false);
  };

  // Function to search master items for automatic linking
  const searchMasterItems = async (searchValue: string, searchType: 'partNumber' | 'vehicleNumber' | 'inventoryNumber') => {
    if (!searchValue.trim()) {
      setMasterSearchResults([]);
      setMatchedMasterItem(null);
      return;
    }

    try {
      const searchParams = new URLSearchParams();
      searchParams.set(searchType, searchValue);
      
      const response = await apiRequest('GET', `/api/smart-capture/search?${searchParams.toString()}`);
      const results = await response.json();
      
      // Validate that results is an array
      if (!Array.isArray(results)) {
        console.error('Expected array from master search API, got:', results);
        setMasterSearchResults([]);
        setMatchedMasterItem(null);
        return;
      }
      
      setMasterSearchResults(results);
      
      // If exactly one match found, auto-populate the form
      if (results.length === 1) {
        const masterItem = results[0];
        setMatchedMasterItem(masterItem);
        
        // Auto-populate the master price in the form
        smartCaptureItemForm.setValue('masterPrice', masterItem.masterPrice?.toString() || '0');
        
        toast({
          title: "Master Item Found",
          description: `Auto-linked to ${masterItem.name || masterItem.vehicleNumber || masterItem.partNumber} - $${masterItem.masterPrice || '0.00'}`,
        });
      } else if (results.length > 1) {
        setMatchedMasterItem(null);
        toast({
          title: "Multiple Items Found",
          description: `Found ${results.length} matching items. Please select one manually.`,
          variant: "default"
        });
      } else {
        setMatchedMasterItem(null);
      }
    } catch (error) {
      console.error('Error searching master items:', error);
      setMasterSearchResults([]);
      setMatchedMasterItem(null);
    }
  };

  // Export functions
  const getProjectName = (projectId: number) => {
    const project = allProjects.find(p => p.id === projectId);
    return project?.name || `Project_${projectId}`;
  };

  const getProjectLocation = (projectId: number) => {
    const project = allProjects.find(p => p.id === projectId);
    return project?.address || project?.city || 'Unknown_Location';
  };

  const generateFilename = (format: string) => {
    if (!selectedSmartCaptureList) return `smart_capture_export.${format}`;
    
    const projectName = selectedSmartCaptureList.projectId 
      ? getProjectName(selectedSmartCaptureList.projectId)
      : 'No_Project';
    
    const location = selectedSmartCaptureList.projectId 
      ? getProjectLocation(selectedSmartCaptureList.projectId)
      : 'No_Location';
    
    // Sanitize filename by removing invalid characters
    const sanitizedProjectName = projectName.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
    const sanitizedLocation = location.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
    
    return `${sanitizedProjectName}_${sanitizedLocation}_SmartCapture.${format}`;
  };

  const exportToCSV = () => {
    if (!smartCaptureItems.length) {
      toast({ title: "No Data", description: "No items to export", variant: "destructive" });
      return;
    }

    const headers = [
      'Part Number',
      'Vehicle Number', 
      'Inventory Number',
      'Description',
      'Notes',
      'Quantity',
      'Location'
    ];

    // Add Master Price column if user is admin/manager or if pricing is enabled for technicians
    if (isAdminOrManager || showSmartCapturePricing) {
      headers.push('Master Price');
    }

    const csvData = smartCaptureItems.map(item => {
      const row = [
        item.partNumber || '',
        item.vehicleNumber || '',
        item.inventoryNumber || '',
        item.description || '',
        item.notes || '',
        item.quantity?.toString() || '0',
        item.location || ''
      ];

      if (isAdminOrManager || showSmartCapturePricing) {
        row.push(`$${parseFloat(item.masterPrice?.toString() || '0').toFixed(2)}`);
      }

      return row;
    });

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = generateFilename('csv');
    a.click();
    window.URL.revokeObjectURL(url);

    toast({ title: "Export Complete", description: "CSV file downloaded successfully" });
  };

  const exportToExcel = () => {
    if (!smartCaptureItems.length) {
      toast({ title: "No Data", description: "No items to export", variant: "destructive" });
      return;
    }

    const headers = [
      'Part Number',
      'Vehicle Number',
      'Inventory Number', 
      'Description',
      'Notes',
      'Quantity',
      'Location'
    ];

    if (isAdminOrManager || showSmartCapturePricing) {
      headers.push('Master Price');
    }

    const worksheetData = [
      headers,
      ...smartCaptureItems.map(item => {
        const row = [
          item.partNumber || '',
          item.vehicleNumber || '',
          item.inventoryNumber || '',
          item.description || '',
          item.notes || '',
          item.quantity || 0,
          item.location || ''
        ];

        if (isAdminOrManager || showSmartCapturePricing) {
          row.push(parseFloat(item.masterPrice?.toString() || '0').toFixed(2));
        }

        return row;
      })
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Smart Capture Items');

    XLSX.writeFile(workbook, generateFilename('xlsx'));

    toast({ title: "Export Complete", description: "Excel file downloaded successfully" });
  };

  const exportToPDF = async () => {
    if (!smartCaptureItems.length) {
      toast({ title: "No Data", description: "No items to export", variant: "destructive" });
      return;
    }

    // Create HTML content for PDF
    const projectName = selectedSmartCaptureList?.projectId 
      ? getProjectName(selectedSmartCaptureList.projectId)
      : 'Unknown Project';
    
    const location = selectedSmartCaptureList?.projectId 
      ? getProjectLocation(selectedSmartCaptureList.projectId) 
      : 'Unknown Location';

    let htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .header-info { margin-bottom: 20px; }
            .header-info p { margin: 5px 0; }
          </style>
        </head>
        <body>
          <h1>Smart Capture Items Export</h1>
          <div class="header-info">
            <p><strong>Project:</strong> ${projectName}</p>
            <p><strong>Location:</strong> ${location}</p>
            <p><strong>List:</strong> ${selectedSmartCaptureList?.name || 'Unknown List'}</p>
            <p><strong>Exported:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Total Items:</strong> ${smartCaptureItems.length}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Part Number</th>
                <th>Vehicle Number</th>
                <th>Inventory Number</th>
                <th>Description</th>
                <th>Notes</th>
                <th>Quantity</th>
                ${isAdminOrManager || showSmartCapturePricing ? '<th>Master Price</th>' : ''}
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
    `;

    smartCaptureItems.forEach(item => {
      htmlContent += `
        <tr>
          <td>${item.partNumber || '-'}</td>
          <td>${item.vehicleNumber || '-'}</td>
          <td>${item.inventoryNumber || '-'}</td>
          <td>${item.description || '-'}</td>
          <td>${item.notes || '-'}</td>
          <td>${item.quantity || 0}</td>
          ${isAdminOrManager || showSmartCapturePricing ? `<td>$${parseFloat(item.masterPrice?.toString() || '0').toFixed(2)}</td>` : ''}
          <td>${item.location || '-'}</td>
        </tr>
      `;
    });

    htmlContent += `
            </tbody>
          </table>
        </body>
      </html>
    `;

    try {
      // Use the backend PDF generation service
      const response = await apiRequest('POST', '/api/generate-pdf', {
        html: htmlContent,
        filename: generateFilename('pdf')
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = generateFilename('pdf');
        a.click();
        window.URL.revokeObjectURL(url);

        toast({ title: "Export Complete", description: "PDF file downloaded successfully" });
      } else {
        throw new Error('PDF generation failed');
      }
    } catch (error) {
      console.error('PDF export error:', error);
      toast({ 
        title: "Export Failed", 
        description: "Could not generate PDF. Please try CSV or Excel export.", 
        variant: "destructive" 
      });
    }
  };

  // Smart Capture mutations
  const createSmartCaptureListMutation = useMutation({
    mutationFn: async (data: InsertSmartCaptureList) => {
      const response = await apiRequest('POST', '/api/smart-capture/lists', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/smart-capture/lists'] });
      setIsCreateListDialogOpen(false);
      smartCaptureListForm.reset();
      toast({ title: "Success", description: "Smart Capture list created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create Smart Capture list", variant: "destructive" });
    }
  });

  const createSmartCaptureItemMutation = useMutation({
    mutationFn: async (data: InsertSmartCaptureItem & { listId: number }) => {
      // Add master item linking information if available
      const payloadData = {
        ...data,
        masterItemId: matchedMasterItem?.id || null,
        masterPriceSnapshot: data.masterPrice || '0.00'
      };
      
      const response = await apiRequest('POST', `/api/smart-capture/lists/${data.listId}/items`, payloadData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/smart-capture/lists', selectedSmartCaptureList?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/smart-capture/lists'] });
      setIsAddItemDialogOpen(false);
      smartCaptureItemForm.reset();
      
      // Reset master item search state to prevent stale linkage
      setMatchedMasterItem(null);
      setMasterSearchResults([]);
      
      toast({ title: "Success", description: "Item added to Smart Capture list successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to add item to Smart Capture list", variant: "destructive" });
    }
  });

  // Mutation for creating master inventory items
  const createMasterItemMutation = useMutation({
    mutationFn: async (data: InsertSmartCaptureItem) => {
      if (!masterInventoryList) {
        throw new Error('No master inventory list found. Please create a Smart Capture list first.');
      }
      
      const response = await apiRequest('POST', `/api/smart-capture/lists/${masterInventoryList.id}/items`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/smart-capture/lists'] });
      queryClient.invalidateQueries({ queryKey: ['/api/smart-capture/search'] });
      setIsAddMasterItemDialogOpen(false);
      masterItemForm.reset();
      
      toast({ title: "Success", description: "Master inventory item created successfully" });
    },
    onError: (error: any) => {
      console.error('Error creating master item:', error);
      toast({ title: "Error", description: error.message || "Failed to create master item. Please try again.", variant: "destructive" });
    }
  });

  const updateSmartCaptureItemMutation = useMutation({
    mutationFn: async (data: { itemId: number; updateData: Partial<InsertSmartCaptureItem> }) => {
      const response = await apiRequest('PUT', `/api/smart-capture/items/${data.itemId}`, data.updateData);
      // Check if response has content before trying to parse JSON (avoid 204 No Content errors)
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return { success: true };
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/smart-capture/lists', selectedSmartCaptureList?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/smart-capture/lists'] });
      setIsEditItemDialogOpen(false);
      setEditingItem(null);
      toast({ title: "Success", description: "Item updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update item", variant: "destructive" });
    }
  });

  const deleteSmartCaptureItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      const response = await apiRequest('DELETE', `/api/smart-capture/items/${itemId}`, {});
      // Check if response has content before trying to parse JSON (avoid 204 No Content errors)
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return { success: true };
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/smart-capture/lists', selectedSmartCaptureList?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/smart-capture/lists'] });
      toast({ title: "Success", description: "Item deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete item", variant: "destructive" });
    }
  });

  const updateSmartCaptureListMutation = useMutation({
    mutationFn: async (data: { listId: number; updateData: Partial<InsertSmartCaptureList> }) => {
      const response = await apiRequest('PUT', `/api/smart-capture/lists/${data.listId}`, data.updateData);
      // Check if response has content before trying to parse JSON (avoid 204 No Content errors)
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return { success: true };
      }
      return response.json();
    },
    onSuccess: (updatedList) => {
      queryClient.invalidateQueries({ queryKey: ['/api/smart-capture/lists'] });
      
      // Update selectedSmartCaptureList if it's currently selected to prevent stale UI data
      if (selectedSmartCaptureList?.id === updatedList?.id) {
        setSelectedSmartCaptureList(updatedList);
      }
      
      setIsEditListDialogOpen(false);
      setEditingList(null);
      toast({ title: "Success", description: "Smart Capture list updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update Smart Capture list", variant: "destructive" });
    }
  });

  const deleteSmartCaptureListMutation = useMutation({
    mutationFn: async (listId: number) => {
      const response = await apiRequest('DELETE', `/api/smart-capture/lists/${listId}`, {});
      // Check if response has content before trying to parse JSON (avoid 204 No Content errors)
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return { success: true };
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/smart-capture/lists'] });
      setIsDeleteListDialogOpen(false);
      setEditingList(null);
      // If we deleted the selected list, clear it
      if (selectedSmartCaptureList?.id === editingList?.id) {
        setSelectedSmartCaptureList(null);
        setActiveTab("lists");
      }
      toast({ title: "Success", description: "Smart Capture list deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete Smart Capture list", variant: "destructive" });
    }
  });

  // Smart Capture forms using shared schemas with explicit typing
  const smartCaptureListForm = useForm({
    resolver: zodResolver(insertSmartCaptureListSchema),
    defaultValues: {
      name: "",
      description: "",
      status: "draft" as const
    }
  });

  const smartCaptureItemForm = useForm({
    resolver: zodResolver(insertSmartCaptureItemSchema),
    defaultValues: {
      partNumber: "",
      vehicleNumber: "",
      inventoryNumber: "",
      masterPrice: "0",
      location: "",
      quantity: 1,
      description: "",
      notes: ""
    }
  });

  const editSmartCaptureItemForm = useForm({
    resolver: zodResolver(insertSmartCaptureItemSchema),
    defaultValues: {
      partNumber: "",
      vehicleNumber: "",
      inventoryNumber: "",
      masterPrice: "0",
      location: "",
      quantity: 1,
      description: "",
      notes: ""
    }
  });

  const editSmartCaptureListForm = useForm({
    resolver: zodResolver(insertSmartCaptureListSchema),
    defaultValues: {
      name: "",
      description: "",
      status: "draft" as "draft" | "active" | "archived",
      projectId: undefined
    }
  });

  // Master item form for creating master inventory items
  const masterItemForm = useForm({
    resolver: zodResolver(insertSmartCaptureItemSchema),
    defaultValues: {
      partNumber: "",
      vehicleNumber: "",
      inventoryNumber: "",
      masterPrice: "0",
      location: "",
      address: "",
      city: "",
      state: "",
      quantity: 1,
      description: "",
      notes: ""
    }
  });

  // Smart Capture form handlers with explicit typing
  const onSmartCaptureListSubmit = (data: any) => {
    createSmartCaptureListMutation.mutate(data as InsertSmartCaptureList);
  };

  const onSmartCaptureItemSubmit = (data: any) => {
    if (!selectedSmartCaptureList?.id) {
      toast({ title: "Error", description: "Please select a Smart Capture list first", variant: "destructive" });
      return;
    }
    const formattedData = {
      ...data,
      listId: selectedSmartCaptureList.id
    };
    createSmartCaptureItemMutation.mutate(formattedData);
  };

  const onEditSmartCaptureItemSubmit = (data: any) => {
    if (!editingItem?.id) return;
    updateSmartCaptureItemMutation.mutate({
      itemId: editingItem.id,
      updateData: data as InsertSmartCaptureItem
    });
  };

  // Submit handler for master item creation
  const onMasterItemSubmit = (data: any) => {
    createMasterItemMutation.mutate(data as InsertSmartCaptureItem);
  };

  const handleEditItem = (item: SmartCaptureItem) => {
    setEditingItem(item);
    editSmartCaptureItemForm.reset({
      partNumber: item.partNumber || "",
      vehicleNumber: item.vehicleNumber || "",
      inventoryNumber: item.inventoryNumber || "",
      masterPrice: item.masterPrice?.toString() || "0",
      location: item.location || "",
      quantity: item.quantity || 1,
      description: item.description || "",
      notes: item.notes || ""
    });
    setIsEditItemDialogOpen(true);
  };

  const handleDeleteItem = (itemId: number) => {
    if (confirm("Are you sure you want to delete this item?")) {
      deleteSmartCaptureItemMutation.mutate(itemId);
    }
  };

  const onEditSmartCaptureListSubmit = (data: any) => {
    if (!editingList?.id) return;
    updateSmartCaptureListMutation.mutate({
      listId: editingList.id,
      updateData: data as InsertSmartCaptureList
    });
  };

  const handleEditList = (list: SmartCaptureList) => {
    setEditingList(list);
    editSmartCaptureListForm.reset({
      name: list.name || "",
      description: list.description || "",
      status: (list.status || "draft") as "draft" | "active" | "archived",
      projectId: list.projectId || undefined
    });
    setIsEditListDialogOpen(true);
  };

  const handleDeleteList = (list: SmartCaptureList) => {
    setEditingList(list);
    setIsDeleteListDialogOpen(true);
  };

  const confirmDeleteList = () => {
    if (editingList?.id) {
      deleteSmartCaptureListMutation.mutate(editingList.id);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="smart-capture-page">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Smart Capture</h1>
          <p className="text-muted-foreground">Create and manage inventory lists with part numbers, vehicle numbers, and pricing</p>
        </div>
        <div className="flex items-center gap-4">
          {isAdminOrManager && (
            <div className="flex items-center gap-2">
              <Label htmlFor="show-pricing" className="text-sm">Show Pricing</Label>
              <Switch
                id="show-pricing"
                checked={showSmartCapturePricing}
                onCheckedChange={setShowSmartCapturePricing}
                data-testid="toggle-show-pricing"
              />
            </div>
          )}
          <Dialog open={isCreateListDialogOpen} onOpenChange={setIsCreateListDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-list">
              <Plus className="h-4 w-4 mr-2" />
              Create New List
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Smart Capture List</DialogTitle>
            </DialogHeader>
            <Form {...smartCaptureListForm}>
              <form onSubmit={smartCaptureListForm.handleSubmit(onSmartCaptureListSubmit)} className="space-y-4">
                <FormField
                  control={smartCaptureListForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>List Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Vehicle Inventory Q1 2025" {...field} data-testid="input-list-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={smartCaptureListForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="List description..." {...field} data-testid="input-list-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={smartCaptureListForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} data-testid="select-list-status">
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateListDialogOpen(false)}
                    disabled={createSmartCaptureListMutation.isPending}
                    data-testid="button-cancel-list"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createSmartCaptureListMutation.isPending}
                    data-testid="button-submit-list"
                  >
                    {createSmartCaptureListMutation.isPending ? "Creating..." : "Create List"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="lists" data-testid="tab-lists">Smart Capture Jobs</TabsTrigger>
          <TabsTrigger value="items" data-testid="tab-items" disabled={!selectedSmartCaptureList}>
            Items
            {selectedSmartCaptureList && (
              <Badge variant="secondary" className="ml-2">
                {Array.isArray(smartCaptureItems) ? smartCaptureItems.length : 0}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="master-inventory" data-testid="tab-master-inventory">
            Master Inventory
          </TabsTrigger>
          <TabsTrigger value="invoice" data-testid="tab-invoice" disabled={!selectedSmartCaptureList?.projectId}>
            Draft Invoice
            {selectedSmartCaptureList?.projectId && (
              <Badge variant="outline" className="ml-2">
                Preview
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lists" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Smart Capture Jobs in Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job Number</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {smartCaptureLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">Loading...</TableCell>
                      </TableRow>
                    ) : smartCaptureError ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-red-600">
                          Error loading lists: {smartCaptureError.message}
                        </TableCell>
                      </TableRow>
                    ) : Array.isArray(smartCaptureLists) && smartCaptureLists.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">
                          No Smart Capture lists found. Click "Create New List" to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      Array.isArray(smartCaptureLists) && smartCaptureLists.map((list: SmartCaptureList) => (
                        <TableRow key={list.id} data-testid={`list-row-${list.id}`}>
                          <TableCell className="font-medium">{list.name}</TableCell>
                          <TableCell>{list.description || "-"}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={list.status === 'active' ? 'default' : list.status === 'draft' ? 'secondary' : 'outline'}
                            >
                              {list.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(list.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedSmartCaptureList(list);
                                  setActiveTab("items");
                                }}
                                data-testid={`button-manage-items-${list.id}`}
                              >
                                <Package className="h-3 w-3 mr-1" />
                                Manage Items
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditList(list)}
                                data-testid={`button-edit-list-${list.id}`}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteList(list)}
                                className="text-red-600 hover:text-red-700"
                                data-testid={`button-delete-list-${list.id}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="items" className="space-y-4">
          {selectedSmartCaptureList && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Items in "{selectedSmartCaptureList.name}"</CardTitle>
                  <p className="text-sm text-muted-foreground">{selectedSmartCaptureList.description}</p>
                </div>
                <div className="flex gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" data-testid="button-export-items">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                        <ChevronDown className="h-4 w-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={exportToCSV} data-testid="export-csv">
                        Export as CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={exportToExcel} data-testid="export-excel">
                        Export as Excel
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={exportToPDF} data-testid="export-pdf">
                        Export as PDF
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
                    <DialogTrigger asChild>
                      <Button data-testid="button-add-item">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Item
                      </Button>
                    </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add Item to Smart Capture List</DialogTitle>
                    </DialogHeader>
                    <Form {...smartCaptureItemForm}>
                      <form onSubmit={smartCaptureItemForm.handleSubmit(onSmartCaptureItemSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={smartCaptureItemForm.control}
                            name="partNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Part Number</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="e.g., ABC-123" 
                                    {...field} 
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      field.onChange(value);
                                      
                                      // Search for matching master items after user stops typing
                                      clearTimeout(window.smartCaptureSearchTimeout);
                                      window.smartCaptureSearchTimeout = setTimeout(() => {
                                        if (value.trim()) {
                                          searchMasterItems(value, 'partNumber');
                                        }
                                      }, 500);
                                    }}
                                    data-testid="input-part-number" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={smartCaptureItemForm.control}
                            name="vehicleNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Vehicle Number</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="e.g., VH-001" 
                                    {...field} 
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      field.onChange(value);
                                      
                                      // Search for matching master items after user stops typing
                                      clearTimeout(window.smartCaptureSearchTimeout);
                                      window.smartCaptureSearchTimeout = setTimeout(() => {
                                        if (value.trim()) {
                                          searchMasterItems(value, 'vehicleNumber');
                                        }
                                      }, 500);
                                    }}
                                    data-testid="input-vehicle-number" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={smartCaptureItemForm.control}
                            name="inventoryNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Inventory Number</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="e.g., INV-456" 
                                    {...field} 
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      field.onChange(value);
                                      
                                      // Search for matching master items after user stops typing
                                      clearTimeout(window.smartCaptureSearchTimeout);
                                      window.smartCaptureSearchTimeout = setTimeout(() => {
                                        if (value.trim()) {
                                          searchMasterItems(value, 'inventoryNumber');
                                        }
                                      }, 500);
                                    }}
                                    data-testid="input-inventory-number" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={smartCaptureItemForm.control}
                            name="quantity"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Quantity *</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="1"
                                    step="1"
                                    {...field} 
                                    onChange={e => field.onChange(Number(e.target.value) || 1)}
                                    data-testid="input-quantity"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Master Item Match Display */}
                        {matchedMasterItem && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                              <span className="text-sm font-medium text-green-800">Master Item Found</span>
                            </div>
                            <p className="text-sm text-green-700">
                              <strong>{matchedMasterItem.name || matchedMasterItem.vehicleNumber || matchedMasterItem.partNumber || matchedMasterItem.inventoryNumber}</strong>
                            </p>
                            <p className="text-sm text-green-600">
                              Auto-populated price: <strong>${matchedMasterItem.price}</strong>
                            </p>
                          </div>
                        )}

                        {/* Validation Message for Required Fields */}
                        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                          <div className="flex items-start space-x-2">
                            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-blue-700 dark:text-blue-300">
                              <p className="font-medium">Required Fields</p>
                              <p>At least one of Part Number, Vehicle Number, or Inventory Number must be provided, along with Location and Master Price.</p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={smartCaptureItemForm.control}
                            name="masterPrice"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Master Price *</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="0" 
                                    step="0.01" 
                                    placeholder="0.00" 
                                    {...field} 
                                    data-testid="input-master-price" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={smartCaptureItemForm.control}
                            name="location"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Location *</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., Warehouse A - Shelf 3" {...field} data-testid="input-location" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={smartCaptureItemForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Input placeholder="Brief description of the item..." {...field} data-testid="input-description" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={smartCaptureItemForm.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Notes</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Additional notes..." {...field} data-testid="input-notes" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={smartCaptureItemForm.control}
                          name="image"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Item Image</FormLabel>
                              <FormControl>
                                <div className="space-y-4">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const formData = new FormData();
                                        formData.append('file', file);
                                        
                                        try {
                                          const response = await fetch('/api/files/upload', {
                                            method: 'POST',
                                            headers: {
                                              'Authorization': `Bearer ${import.meta.env.VITE_AUTH_TOKEN || localStorage.getItem('authToken')}`,
                                            },
                                            body: formData,
                                          });
                                          
                                          if (response.ok) {
                                            const data = await response.json();
                                            field.onChange(data.url || data.filePath);
                                          } else {
                                            console.error('Upload failed');
                                          }
                                        } catch (error) {
                                          console.error('Upload error:', error);
                                        }
                                      }
                                    }}
                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                    data-testid="input-image"
                                  />
                                  {field.value && (
                                    <div className="mt-2">
                                      <img 
                                        src={field.value} 
                                        alt="Item preview" 
                                        className="w-32 h-32 object-cover rounded-lg border"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => field.onChange('')}
                                        className="mt-1 text-sm text-red-600 hover:text-red-800"
                                      >
                                        Remove image
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex justify-end space-x-2 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsAddItemDialogOpen(false)}
                            disabled={createSmartCaptureItemMutation.isPending}
                            data-testid="button-cancel-item"
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="submit" 
                            disabled={createSmartCaptureItemMutation.isPending}
                            data-testid="button-submit-item"
                          >
                            {createSmartCaptureItemMutation.isPending ? "Adding..." : "Add Item"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Image</TableHead>
                        <TableHead>Part #</TableHead>
                        <TableHead>Vehicle #</TableHead>
                        <TableHead>Inventory #</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead>Quantity</TableHead>
                        {(isAdminOrManager || showSmartCapturePricing) && (
                          <TableHead>Master Price</TableHead>
                        )}
                        <TableHead>Location</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itemsLoading ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center">Loading items...</TableCell>
                        </TableRow>
                      ) : itemsError ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center text-red-600">
                            Error loading items: {itemsError.message}
                          </TableCell>
                        </TableRow>
                      ) : Array.isArray(smartCaptureItems) && smartCaptureItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center">
                            No items in this list. Click "Add Item" to get started.
                          </TableCell>
                        </TableRow>
                      ) : (
                        Array.isArray(smartCaptureItems) && smartCaptureItems.map((item: SmartCaptureItem) => (
                          <TableRow key={item.id} data-testid={`item-row-${item.id}`}>
                            <TableCell>
                              {item.image ? (
                                <img 
                                  src={item.image} 
                                  alt="Item image" 
                                  className="w-12 h-12 object-cover rounded border cursor-pointer"
                                  onClick={() => window.open(item.image, '_blank')}
                                  data-testid={`item-image-${item.id}`}
                                />
                              ) : (
                                <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center text-gray-400 text-xs">
                                  No image
                                </div>
                              )}
                            </TableCell>
                            <TableCell>{item.partNumber || "-"}</TableCell>
                            <TableCell>{item.vehicleNumber || "-"}</TableCell>
                            <TableCell>{item.inventoryNumber || "-"}</TableCell>
                            <TableCell>{item.notes || "-"}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            {(isAdminOrManager || showSmartCapturePricing) && (
                              <TableCell>${parseFloat(item.masterPrice?.toString() || "0").toFixed(2)}</TableCell>
                            )}
                            <TableCell>{item.location}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditItem(item)}
                                  data-testid={`edit-item-${item.id}`}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="text-red-600 hover:text-red-700"
                                  data-testid={`delete-item-${item.id}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="master-inventory" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Locations Management */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Location Management</CardTitle>
                  <p className="text-sm text-muted-foreground">Create and manage storage locations</p>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button data-testid="button-add-location">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Location
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Location</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="location-name">Location Name *</Label>
                        <Input 
                          id="location-name" 
                          placeholder="e.g., Warehouse A - Shelf 1" 
                          data-testid="input-location-name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="location-description">Description</Label>
                        <Textarea 
                          id="location-description" 
                          placeholder="Additional details about this location..."
                          data-testid="input-location-description"
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" data-testid="button-cancel-location">Cancel</Button>
                        <Button data-testid="button-submit-location">Add Location</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Location Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="text-center" colSpan={3}>
                          No locations created yet. Click "Add Location" to get started.
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Master Inventory Items */}
            <Card>
              <CardHeader>
                <div className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Master Inventory</CardTitle>
                    <p className="text-sm text-muted-foreground">Manage inventory items and master pricing</p>
                  </div>
                  <Dialog open={isAddMasterItemDialogOpen} onOpenChange={setIsAddMasterItemDialogOpen}>
                    <DialogTrigger asChild>
                      <Button data-testid="button-add-master-item">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Master Item
                      </Button>
                    </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add Master Inventory Item</DialogTitle>
                    </DialogHeader>
                    <Form {...masterItemForm}>
                      <form onSubmit={masterItemForm.handleSubmit(onMasterItemSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={masterItemForm.control}
                            name="partNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Part Number</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., ABC-123" {...field} data-testid="input-master-part-number" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={masterItemForm.control}
                            name="vehicleNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Vehicle Number</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., VH-001" {...field} data-testid="input-master-vehicle-number" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={masterItemForm.control}
                            name="inventoryNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Inventory Number</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., INV-456" {...field} data-testid="input-master-inventory-number" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={masterItemForm.control}
                            name="masterPrice"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Master Price *</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="0" 
                                    step="0.01" 
                                    placeholder="0.00" 
                                    {...field} 
                                    data-testid="input-master-price-field"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <FormField
                          control={masterItemForm.control}
                          name="location"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Default Location *</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input 
                                    placeholder="e.g., Warehouse A - Shelf 1" 
                                    {...field} 
                                    onChange={(e) => {
                                      field.onChange(e);
                                      handleLocationSearch(e.target.value);
                                    }}
                                    data-testid="select-master-location" 
                                  />
                                  {showLocationSuggestions && locationSuggestions.length > 0 && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                      {locationSuggestions.map((location, index) => (
                                        <div
                                          key={index}
                                          className="p-2 hover:bg-gray-100 cursor-pointer"
                                          onClick={() => applyLocationSuggestion(location)}
                                        >
                                          <div className="font-medium">{location.name}</div>
                                          <div className="text-sm text-gray-600">
                                            {location.address}, {location.city}, {location.state}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {/* Address Fields */}
                        <div className="grid grid-cols-1 gap-4">
                          <FormField
                            control={masterItemForm.control}
                            name="address"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Customer Address</FormLabel>
                                <FormControl>
                                  <Select
                                    value={field.value || ""}
                                    onValueChange={(value) => {
                                      const selectedLocation = customerLocations.find(
                                        (loc: any) => loc.address === value
                                      );
                                      if (selectedLocation) {
                                        field.onChange(value);
                                        masterItemForm.setValue('city', selectedLocation.city || '');
                                        masterItemForm.setValue('state', selectedLocation.state || '');
                                      }
                                    }}
                                  >
                                    <SelectTrigger data-testid="select-master-address">
                                      <SelectValue placeholder="Select a customer address" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {customerLocations.length > 0 ? (
                                        customerLocations.map((location: any, index: number) => (
                                          <SelectItem key={index} value={location.address}>
                                            <div className="flex flex-col">
                                              <span className="font-medium">{location.name}</span>
                                              <span className="text-sm text-muted-foreground">
                                                {location.address}, {location.city}, {location.state}
                                              </span>
                                            </div>
                                          </SelectItem>
                                        ))
                                      ) : (
                                        <SelectItem value="no-addresses" disabled>
                                          No customer addresses available
                                        </SelectItem>
                                      )}
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={masterItemForm.control}
                            name="city"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>City</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., Dallas" {...field} data-testid="input-master-city" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={masterItemForm.control}
                            name="state"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>State</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., TX" {...field} data-testid="input-master-state" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <FormField
                          control={masterItemForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Input placeholder="Brief description of the item..." {...field} data-testid="input-master-description" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={masterItemForm.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Notes</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Additional notes..." 
                                  {...field} 
                                  data-testid="input-master-notes"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="flex justify-end space-x-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setIsAddMasterItemDialogOpen(false)}
                            data-testid="button-cancel-master-item"
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="submit" 
                            disabled={createMasterItemMutation.isPending}
                            data-testid="button-submit-master-item"
                          >
                            {createMasterItemMutation.isPending ? "Adding..." : "Add Master Item"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
                </div>
                
                {/* Search Input */}
                <div className="mt-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search master inventory..."
                      value={masterInventorySearch}
                      onChange={(e) => setMasterInventorySearch(e.target.value)}
                      className="pl-9"
                      data-testid="input-master-inventory-search"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Part #</TableHead>
                        <TableHead>Vehicle #</TableHead>
                        <TableHead>Inventory #</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {masterItemsLoading ? (
                        <TableRow>
                          <TableCell className="text-center" colSpan={6}>
                            Loading master inventory items...
                          </TableCell>
                        </TableRow>
                      ) : filteredMasterItems.length > 0 ? (
                        filteredMasterItems.map((item: SmartCaptureItem) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.partNumber || '-'}</TableCell>
                            <TableCell>{item.vehicleNumber || '-'}</TableCell>
                            <TableCell>{item.inventoryNumber || '-'}</TableCell>
                            <TableCell>$
                              {isAdminOrManager || showSmartCapturePricing
                                ? parseFloat(item.masterPrice?.toString() || '0').toFixed(2)
                                : 'Hidden'
                              }
                            </TableCell>
                            <TableCell>{item.location || '-'}</TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditItem(item)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteItem(item.id)}
                                >
                                  Delete
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell className="text-center" colSpan={6}>
                            No master items created yet. Click "Add Master Item" to get started.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="invoice" className="space-y-4">
          {selectedSmartCaptureList?.projectId && (
            <DraftInvoicePreview projectId={selectedSmartCaptureList.projectId} />
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Smart Capture Item Dialog */}
      <Dialog open={isEditItemDialogOpen} onOpenChange={setIsEditItemDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Smart Capture Item</DialogTitle>
          </DialogHeader>
          <Form {...editSmartCaptureItemForm}>
            <form onSubmit={editSmartCaptureItemForm.handleSubmit(onEditSmartCaptureItemSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editSmartCaptureItemForm.control}
                  name="partNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Part Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., ABC-123" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editSmartCaptureItemForm.control}
                  name="vehicleNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicle Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., VH-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editSmartCaptureItemForm.control}
                  name="inventoryNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Inventory Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., INV-456" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editSmartCaptureItemForm.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editSmartCaptureItemForm.control}
                  name="masterPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Master Price</FormLabel>
                      <FormControl>
                        <Input placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editSmartCaptureItemForm.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Warehouse A" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editSmartCaptureItemForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Brief description of the item..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editSmartCaptureItemForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Additional notes about this item..." 
                        className="resize-none" 
                        rows={3}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditItemDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateSmartCaptureItemMutation.isPending}
                >
                  {updateSmartCaptureItemMutation.isPending ? "Updating..." : "Update Item"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Smart Capture List Dialog */}
      <Dialog open={isEditListDialogOpen} onOpenChange={setIsEditListDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Smart Capture List</DialogTitle>
          </DialogHeader>
          <Form {...editSmartCaptureListForm}>
            <form onSubmit={editSmartCaptureListForm.handleSubmit(onEditSmartCaptureListSubmit)} className="space-y-4">
              <FormField
                control={editSmartCaptureListForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>List Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Project 123 Items" {...field} data-testid="input-edit-list-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editSmartCaptureListForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Brief description of this list..." {...field} data-testid="input-edit-list-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editSmartCaptureListForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange} data-testid="select-edit-list-status">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editSmartCaptureListForm.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Linked Project (Optional)</FormLabel>
                    <FormControl>
                      <Select 
                        value={field.value ? field.value.toString() : "null"} 
                        onValueChange={(value) => field.onChange(value && value !== "null" ? parseInt(value) : undefined)}
                        data-testid="select-edit-list-project"
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a project (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="null">No Project</SelectItem>
                          {(() => {
                            // Create a list that includes active projects and the currently assigned project if it's not active
                            const currentProjectId = editingList?.projectId;
                            const currentProject = currentProjectId ? allProjects.find(p => p.id === currentProjectId) : null;
                            const projectsToShow = [...projects];
                            
                            // If the currently assigned project is not active, add it to the list
                            if (currentProject && currentProject.status !== 'active' && !projectsToShow.find(p => p.id === currentProject.id)) {
                              projectsToShow.push(currentProject);
                            }
                            
                            return projectsToShow.map((project: any) => (
                              <SelectItem key={project.id} value={project.id.toString()}>
                                {project.name}{project.status !== 'active' ? ` (${project.status})` : ''}
                              </SelectItem>
                            ));
                          })()}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground mt-1">
                      Link to a project to enable Smart Capture automated invoicing
                    </p>
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditListDialogOpen(false)}
                  disabled={updateSmartCaptureListMutation.isPending}
                  data-testid="button-cancel-edit-list"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateSmartCaptureListMutation.isPending}
                  data-testid="button-submit-edit-list"
                >
                  {updateSmartCaptureListMutation.isPending ? "Updating..." : "Update List"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Smart Capture List Confirmation Dialog */}
      <Dialog open={isDeleteListDialogOpen} onOpenChange={setIsDeleteListDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Smart Capture List</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-foreground">
                  Are you sure you want to delete the list "{editingList?.name}"?
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  This action cannot be undone. All items in this list will also be deleted.
                </p>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDeleteListDialogOpen(false)}
                disabled={deleteSmartCaptureListMutation.isPending}
                data-testid="button-cancel-delete-list"
              >
                Cancel
              </Button>
              <Button 
                onClick={confirmDeleteList}
                variant="destructive"
                disabled={deleteSmartCaptureListMutation.isPending}
                data-testid="button-confirm-delete-list"
              >
                {deleteSmartCaptureListMutation.isPending ? "Deleting..." : "Delete List"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}