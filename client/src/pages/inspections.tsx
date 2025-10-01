import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  CheckCircle, XCircle, Clock, AlertTriangle, 
  Camera, Send, Plus, Trash2, Edit3, Upload, X, Eye, 
  GripVertical, Save
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { VehicleManagement } from "@/components/vehicle-management";

interface InspectionItem {
  id: number;
  name: string;
  category: string;
  description?: string;
  isRequired: boolean;
  itemType?: 'regular' | 'gas_card_check_in' | 'gas_card_check_out';
}

interface InspectionRecord {
  id: number;
  type: string;
  status: string;
  submittedAt?: string;
  templateName: string;
  technicianName: string;
  vehicleInfo?: any;
  images?: string[];
}

interface InspectionResponse {
  id: number;
  recordId: number;
  itemId: number;
  response: string;
  notes?: string;
  photos?: string[];
  createdAt: string;
  itemName: string;
  itemCategory: string;
  itemDescription?: string;
  isRequired: boolean;
  gasCardId?: number;
  gasCardName?: string;
}

interface DetailedInspectionRecord extends InspectionRecord {
  responses: InspectionResponse[];
  photos?: string[];
  signature?: string;
  reviewNotes?: string;
  reviewedBy?: number;
  reviewedAt?: string;
}

interface InspectionFormResponse {
  itemId: number;
  response: 'pass' | 'fail' | 'na' | 'needs_attention' | 'checked_in' | 'checked_out';
  notes?: string;
  photos?: string[];
  gasCardId?: number;
}

const defaultInspectionItems = {
  'pre-trip': [
    { category: 'Vehicle Safety', name: 'Mirrors', description: 'Check all mirrors for proper adjustment and cleanliness', isRequired: true },
    { category: 'Vehicle Safety', name: 'Tires', description: 'Inspect tire pressure and tread depth', isRequired: true },
    { category: 'Vehicle Safety', name: 'Lights', description: 'Test all lights including headlights, brake lights, and turn signals', isRequired: true },
    { category: 'Vehicle Safety', name: 'Horn', description: 'Test horn functionality', isRequired: true },
    { category: 'Engine', name: 'Oil Level', description: 'Check engine oil level and condition', isRequired: true },
    { category: 'Engine', name: 'Coolant Level', description: 'Check coolant level in reservoir', isRequired: true },
    { category: 'Engine', name: 'Brake Fluid', description: 'Check brake fluid level', isRequired: true },
    { category: 'Equipment', name: 'Chemicals', description: 'Verify chemical levels and equipment condition', isRequired: false },
    { category: 'Equipment', name: 'Hoses', description: 'Inspect hoses for damage or leaks', isRequired: false },
    { category: 'Equipment', name: 'Pump', description: 'Test pump operation', isRequired: false }
  ],
  'post-trip': [
    { category: 'Equipment', name: 'Chemical Storage', description: 'Secure all chemicals properly', isRequired: true },
    { category: 'Equipment', name: 'Equipment Cleaning', description: 'Clean and store all equipment', isRequired: true },
    { category: 'Equipment', name: 'Hose Storage', description: 'Properly coil and store hoses', isRequired: true },
    { category: 'Vehicle', name: 'Fuel Level', description: 'Record fuel level at end of shift', isRequired: true },
    { category: 'Vehicle', name: 'Mileage', description: 'Record ending mileage', isRequired: true },
    { category: 'Vehicle', name: 'Vehicle Cleaning', description: 'Clean vehicle interior and exterior', isRequired: false },
    { category: 'Safety', name: 'Incident Report', description: 'Report any incidents or issues', isRequired: false },
    { category: 'Safety', name: 'Equipment Damage', description: 'Report any equipment damage', isRequired: false }
  ]
};

// Sortable Item Component for drag-and-drop
interface SortableItemProps {
  item: InspectionItem;
  editingItemId: number | null;
  setEditingItemId: (id: number | null) => void;
  updateInspectionItem: (id: number, updates: Partial<InspectionItem>) => void;
  deleteInspectionItem: (id: number) => void;
}

function SortableItem({ 
  item, 
  editingItemId, 
  setEditingItemId, 
  updateInspectionItem, 
  deleteInspectionItem 
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "border rounded-lg p-4",
        isDragging && "shadow-lg"
      )}
    >
      <div className="flex items-start justify-between">
        <div 
          {...attributes} 
          {...listeners} 
          className="cursor-grab active:cursor-grabbing mr-3 mt-1"
          data-testid={`drag-handle-${item.id}`}
        >
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>
        <div className="flex-1">
          {editingItemId === item.id ? (
            // Edit mode
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  value={item.name}
                  onChange={(e) => updateInspectionItem(item.id, { name: e.target.value })}
                  placeholder="Item name"
                />
                <Input
                  value={item.category}
                  onChange={(e) => updateInspectionItem(item.id, { category: e.target.value })}
                  placeholder="Category"
                />
              </div>
              <Textarea
                value={item.description || ''}
                onChange={(e) => updateInspectionItem(item.id, { description: e.target.value })}
                placeholder="Description"
                rows={2}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={item.isRequired}
                    onCheckedChange={(checked) => updateInspectionItem(item.id, { isRequired: !!checked })}
                  />
                  <Label>Required item</Label>
                </div>
                <div>
                  <Label>Item Type</Label>
                  <Select
                    value={item.itemType || 'regular'}
                    onValueChange={(value) => updateInspectionItem(item.id, { itemType: value as 'regular' | 'gas_card_check_in' | 'gas_card_check_out' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select item type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="regular">Regular Inspection Item</SelectItem>
                      <SelectItem value="gas_card_check_out">Gas Card Check-Out</SelectItem>
                      <SelectItem value="gas_card_check_in">Gas Card Check-In</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ) : (
            // View mode
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-medium">{item.name}</h4>
                {item.isRequired && (
                  <Badge variant="destructive" className="text-xs">Required</Badge>
                )}
                <Badge variant="outline" className="text-xs">{item.category}</Badge>
                {item.itemType === 'gas_card_check_out' && (
                  <Badge variant="default" className="text-xs bg-blue-500">Gas Card Check-Out</Badge>
                )}
                {item.itemType === 'gas_card_check_in' && (
                  <Badge variant="default" className="text-xs bg-green-500">Gas Card Check-In</Badge>
                )}
              </div>
              {item.description && (
                <p className="text-sm text-gray-600 mt-1">{item.description}</p>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2 ml-4">
          {editingItemId === item.id ? (
            <Button
              size="sm"
              onClick={() => setEditingItemId(null)}
              variant="outline"
            >
              Done
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditingItemId(item.id)}
              >
                <Edit3 className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => deleteInspectionItem(item.id)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Inspections() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const preTripFileInputRef = useRef<HTMLInputElement>(null);
  const postTripFileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState('pre-trip');
  const [currentInspection, setCurrentInspection] = useState<InspectionFormResponse[]>([]);
  const [vehicleInfo, setVehicleInfo] = useState({
    vehicleNumber: '',
    licensePlate: '',
    mileage: '',
    fuelLevel: ''
  });
  const [technicianName, setTechnicianName] = useState('');
  const [notes, setNotes] = useState('');
  const [customItems, setCustomItems] = useState<InspectionItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [submittedInspections, setSubmittedInspections] = useState<InspectionRecord[]>([]);
  const [inspectionImages, setInspectionImages] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [selectedInspectionId, setSelectedInspectionId] = useState<number | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  
  // Inspection Settings State
  const [editingTemplateType, setEditingTemplateType] = useState<'pre-trip' | 'post-trip'>('pre-trip');
  const [customInspectionItems, setCustomInspectionItems] = useState<{[key: string]: InspectionItem[]}>({
    'pre-trip': [],
    'post-trip': []
  });
  const [newInspectionItem, setNewInspectionItem] = useState({
    name: '',
    category: '',
    description: '',
    isRequired: false,
    itemType: 'regular' as 'regular' | 'gas_card_check_in' | 'gas_card_check_out'
  });
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // Fetch available gas cards
  const { data: gasCards = [] } = useQuery({
    queryKey: ['/api/gas-cards'],
    enabled: !!user
  });
  
  
  // Auto-populate technician name when user is logged in
  useEffect(() => {
    if (user) {
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username;
      setTechnicianName(fullName);
    }
  }, [user]);

  // Initialize custom inspection items from default templates
  useEffect(() => {
    if (customInspectionItems['pre-trip'].length === 0) {
      setCustomInspectionItems({
        'pre-trip': defaultInspectionItems['pre-trip'].map((item, index) => ({ ...item, id: index + 1 })),
        'post-trip': defaultInspectionItems['post-trip'].map((item, index) => ({ ...item, id: index + 100 }))
      });
    }
  }, []);

  // Helper functions for inspection settings
  const addNewInspectionItem = () => {
    if (!newInspectionItem.name.trim() || !newInspectionItem.category.trim()) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    // Generate a safe ID within PostgreSQL integer range (max 2147483647)
    const existingIds = customInspectionItems[editingTemplateType].map(item => item.id);
    const newId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
    
    const newItem: InspectionItem = {
      id: newId,
      name: newInspectionItem.name.trim(),
      category: newInspectionItem.category.trim(),
      description: newInspectionItem.description.trim(),
      isRequired: newInspectionItem.isRequired,
      itemType: newInspectionItem.itemType
    };

    setCustomInspectionItems(prev => ({
      ...prev,
      [editingTemplateType]: [...prev[editingTemplateType], newItem]
    }));

    // Reset form but preserve itemType so user can add multiple items of same type
    setNewInspectionItem(prev => ({
      name: '',
      category: '',
      description: '',
      isRequired: false,
      itemType: prev.itemType // Keep the selected item type
    }));

    toast({ title: "Inspection item added successfully" });
  };

  const deleteInspectionItem = (itemId: number) => {
    setCustomInspectionItems(prev => ({
      ...prev,
      [editingTemplateType]: prev[editingTemplateType].filter(item => item.id !== itemId)
    }));
    toast({ title: "Inspection item deleted successfully" });
  };

  const updateInspectionItem = (itemId: number, updates: Partial<InspectionItem>) => {
    setCustomInspectionItems(prev => ({
      ...prev,
      [editingTemplateType]: prev[editingTemplateType].map(item => 
        item.id === itemId ? { ...item, ...updates } : item
      )
    }));
    toast({ title: "Inspection item updated successfully" });
  };

  const resetTemplateToDefaults = () => {
    setCustomInspectionItems(prev => ({
      ...prev,
      [editingTemplateType]: defaultInspectionItems[editingTemplateType].map((item, index) => ({ 
        ...item, 
        id: index + (editingTemplateType === 'pre-trip' ? 1 : 100) 
      }))
    }));
    setHasUnsavedChanges(true);
    toast({ title: `${editingTemplateType} template reset to defaults` });
  };

  // Drag and drop handler
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const items = customInspectionItems[editingTemplateType];
      const oldIndex = items.findIndex(item => item.id === active.id);
      const newIndex = items.findIndex(item => item.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedItems = arrayMove(items, oldIndex, newIndex);
        setCustomInspectionItems(prev => ({
          ...prev,
          [editingTemplateType]: reorderedItems
        }));
        setHasUnsavedChanges(true);
        toast({ title: "Items reordered successfully" });
      }
    }
  };

  // Save inspection settings
  const saveInspectionSettings = async () => {
    if (!hasUnsavedChanges) {
      toast({ title: "No changes to save", variant: "default" });
      return;
    }

    setIsSaving(true);
    try {
      const currentItems = customInspectionItems[editingTemplateType];
      
      // Save each item to the database
      for (const item of currentItems) {
        // Check if item exists in database (has a real DB id from fetched items)
        const isExistingItem = inspectionItems?.some(dbItem => dbItem.id === item.id);
        
        if (isExistingItem) {
          // Update existing item
          await apiRequest('PUT', `/api/inspections/items/${item.id}`, {
            name: item.name,
            description: item.description,
            category: item.category,
            isRequired: item.isRequired,
            itemType: item.itemType
          });
        } else {
          // Create new item
          await apiRequest('POST', '/api/inspections/items', {
            name: item.name,
            description: item.description,
            category: item.category,
            isRequired: item.isRequired,
            type: editingTemplateType,
            itemType: item.itemType
          });
        }
      }
      
      // Refresh the inspection items from database
      queryClient.invalidateQueries({ queryKey: ['/api/inspections/items'] });
      
      setHasUnsavedChanges(false);
      toast({ title: "Inspection settings saved successfully", variant: "default" });
    } catch (error) {
      console.error('Failed to save inspection settings:', error);
      toast({ title: "Failed to save inspection settings", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Update existing functions to mark changes
  const addNewInspectionItemWithChange = () => {
    addNewInspectionItem();
    setHasUnsavedChanges(true);
  };

  const deleteInspectionItemWithChange = (itemId: number) => {
    deleteInspectionItem(itemId);
    setHasUnsavedChanges(true);
  };

  const updateInspectionItemWithChange = (itemId: number, updates: Partial<InspectionItem>) => {
    updateInspectionItem(itemId, updates);
    setHasUnsavedChanges(true);
  };
  
  // Removed duplicate defaultInspectionItems - using the global one defined at the top

  const sampleInspectionRecords: InspectionRecord[] = [
    { id: 1, type: "pre-trip", status: "completed", submittedAt: "2025-06-29T08:30:00Z", templateName: "Standard Pre-Trip", technicianName: "John Smith", vehicleInfo: { licensePlate: "ABC-123", mileage: "45,230" } },
    { id: 2, type: "post-trip", status: "completed", submittedAt: "2025-06-28T17:45:00Z", templateName: "Standard Post-Trip", technicianName: "Mike Johnson", vehicleInfo: { licensePlate: "ABC-123", mileage: "45,180" } }
  ];

  // Fetch inspection items from API
  const { data: inspectionItems, isLoading: itemsLoading, error: itemsError } = useQuery({
    queryKey: ["/api/inspections/items", activeTab],
    queryFn: async () => {
      console.log('Fetching inspection items for type:', activeTab);
      const response = await apiRequest('GET', `/api/inspections/items?type=${activeTab}`);
      const result = await response.json();
      console.log('Fetched inspection items:', result);
      return result;
    },
    enabled: !!activeTab,
  });
  
  // Fetch inspection records from the database
  const { data: inspectionRecords = [], isLoading: recordsLoading } = useQuery<InspectionRecord[]>({
    queryKey: ["/api/inspections/records"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/inspections/records');
      const result = await response.json();
      return result;
    },
  });
  
  const allInspectionRecords = [...submittedInspections, ...inspectionRecords];

  // Fetch detailed inspection record when selected
  const { data: detailedInspection, isLoading: detailLoading } = useQuery<DetailedInspectionRecord>({
    queryKey: ["/api/inspections/records", selectedInspectionId],
    enabled: !!selectedInspectionId && isDetailDialogOpen,
  });

  // Submit inspection handler
  const handleSubmitInspection = async () => {
    if (currentInspection.length === 0) {
      toast({ title: "Please complete at least one inspection item", variant: "destructive" });
      return;
    }

    // Check that all required items are completed
    const requiredItems = inspectionItems?.filter(item => item.isRequired) || [];
    const completedRequiredItems = requiredItems.filter(item => 
      currentInspection.some(response => response.itemId === item.id)
    );
    
    if (completedRequiredItems.length < requiredItems.length) {
      const missingCount = requiredItems.length - completedRequiredItems.length;
      toast({ 
        title: "Please complete all required items", 
        description: `${missingCount} required item${missingCount > 1 ? 's' : ''} still need to be completed`,
        variant: "destructive" 
      });
      return;
    }

    if (!user) {
      toast({ title: "You must be logged in to submit an inspection", variant: "destructive" });
      return;
    }

    if (!disclaimerAccepted) {
      toast({ title: "You must accept the disclaimer to submit the inspection", variant: "destructive" });
      return;
    }

    // Validate mandatory vehicle information fields
    if (!vehicleInfo.vehicleNumber.trim()) {
      toast({ title: "Vehicle Number is required", variant: "destructive" });
      return;
    }

    if (!vehicleInfo.mileage.trim()) {
      const mileageLabel = activeTab === 'pre-trip' ? 'Starting Mileage' : 'Ending Mileage';
      toast({ title: `${mileageLabel} is required`, variant: "destructive" });
      return;
    }

    if (!vehicleInfo.fuelLevel.trim()) {
      toast({ title: "Fuel Level is required", variant: "destructive" });
      return;
    }

    setUploading(true);
    
    try {
      let uploadedImagePaths: string[] = [];

      // Upload images if any
      if (inspectionImages.length > 0) {
        const formData = new FormData();
        inspectionImages.forEach((file, index) => {
          formData.append(`inspectionImages`, file);
        });

        const uploadResponse = await apiRequest('POST', '/api/upload-inspection-images', formData);
        const uploadResult = await uploadResponse.json();

        uploadedImagePaths = uploadResult.filePaths || [];
      }

      // Submit inspection to backend
      const submissionData = {
        type: activeTab,
        vehicleInfo: {
          vehicleNumber: vehicleInfo.vehicleNumber,
          licensePlate: vehicleInfo.licensePlate,
          mileage: vehicleInfo.mileage,
          fuelLevel: vehicleInfo.fuelLevel
        },
        responses: currentInspection.map(response => ({
          itemId: response.itemId,
          response: response.response,
          note: response.notes || '',
          photos: uploadedImagePaths,
          gasCardId: response.gasCardId || null
        })),
        notes: notes,
        location: null // Can be enhanced with GPS data later
      };

      const response = await apiRequest('POST', '/api/inspections/submit', submissionData);
      const record = await response.json();

      // Create display record for local state
      const newInspectionRecord: InspectionRecord = {
        id: record.id,
        type: activeTab,
        status: record.status || "completed",
        submittedAt: record.submittedAt || new Date().toISOString(),
        templateName: activeTab === 'pre-trip' ? 'Pre-Trip Inspection' : 'Post-Trip Inspection',
        technicianName: technicianName,
        vehicleInfo: {
          vehicleNumber: vehicleInfo.vehicleNumber,
          licensePlate: vehicleInfo.licensePlate,
          mileage: vehicleInfo.mileage,
          fuelLevel: vehicleInfo.fuelLevel
        },
        images: uploadedImagePaths
      };

      // Add to submitted inspections
      setSubmittedInspections(prev => [newInspectionRecord, ...prev]);

      // Show success message and reset form
      toast({ title: `Inspection submitted successfully by ${newInspectionRecord.technicianName}` });
      
      // Invalidate the inspection records query to refetch from database
      queryClient.invalidateQueries({ queryKey: ["/api/inspections/records"] });
      
      setCurrentInspection([]);
      setVehicleInfo({ vehicleNumber: '', licensePlate: '', mileage: '', fuelLevel: '' });
      setNotes('');
      setInspectionImages([]);
      setDisclaimerAccepted(false);
    } catch (error: any) {
      console.error('Error submitting inspection:', error);
      
      // Try to extract specific error message from apiRequest error
      let errorMessage = "Failed to submit inspection";
      if (error?.message) {
        try {
          // apiRequest throws errors in format "400: {"message":"Vehicle Number is required"}"
          const errorParts = error.message.split(': ');
          if (errorParts.length > 1) {
            const jsonPart = errorParts.slice(1).join(': '); // Rejoin in case there are colons in the JSON
            const errorData = JSON.parse(jsonPart);
            errorMessage = errorData.message || errorMessage;
          }
        } catch (parseError) {
          // If we can't parse the response, use the raw error message or default
          errorMessage = error.message || errorMessage;
        }
      }
      
      toast({ title: errorMessage, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  // Combine fetched items and custom items
  const allItems = [...(inspectionItems || []), ...customItems];
  
  // Show loading state if items are still loading
  if (itemsLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Clock className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-gray-600">Loading inspection items...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if items failed to load
  if (itemsError) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-red-500" />
            <p className="text-gray-600">Failed to load inspection items</p>
            <p className="text-sm text-gray-400 mt-2">{itemsError.message}</p>
          </div>
        </div>
      </div>
    );
  }

  // Image upload handlers
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('handleImageUpload called', event);
    const files = event.target.files;
    console.log('Files selected:', files);
    
    if (files) {
      const newImages = Array.from(files).filter(file => 
        file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024 // 10MB limit
      );
      
      console.log('Filtered images:', newImages);
      
      if (newImages.length !== files.length) {
        toast({ title: "Some files were skipped (only images under 10MB allowed)", variant: "destructive" });
      }
      
      setInspectionImages(prev => [...prev, ...newImages]);
      
      // Reset the input value so the same file can be selected again if needed
      event.target.value = '';
    }
  };

  // Photo upload click handlers for each tab
  const handlePreTripPhotoUpload = () => {
    console.log('=== PRE-TRIP PHOTO UPLOAD CLICKED ===');
    console.log('preTripFileInputRef.current:', preTripFileInputRef.current);
    
    if (preTripFileInputRef.current) {
      console.log('Triggering pre-trip file input click');
      try {
        preTripFileInputRef.current.click();
        console.log('Pre-trip file input click triggered successfully');
      } catch (error) {
        console.error('Error clicking pre-trip file input:', error);
      }
    } else {
      console.error('preTripFileInputRef.current is null');
    }
  };

  const handlePostTripPhotoUpload = () => {
    console.log('=== POST-TRIP PHOTO UPLOAD CLICKED ===');
    console.log('postTripFileInputRef.current:', postTripFileInputRef.current);
    
    if (postTripFileInputRef.current) {
      console.log('Triggering post-trip file input click');
      try {
        postTripFileInputRef.current.click();
        console.log('Post-trip file input click triggered successfully');
      } catch (error) {
        console.error('Error clicking post-trip file input:', error);
      }
    } else {
      console.error('postTripFileInputRef.current is null');
    }
  };

  const removeImage = (index: number) => {
    setInspectionImages(prev => prev.filter((_, i) => i !== index));
  };

  // Handle viewing inspection details
  const handleViewInspection = (inspectionId: number) => {
    setSelectedInspectionId(inspectionId);
    setIsDetailDialogOpen(true);
  };

  // Get status badge for inspection
  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Completed</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-500 text-white">Pending</Badge>;
      case 'requires_attention':
        return <Badge variant="destructive">Needs Attention</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Get response badge for individual inspection items
  const getResponseBadge = (response: string) => {
    switch (response?.toLowerCase()) {
      case 'pass':
        return <Badge variant="default" className="bg-green-500">Pass</Badge>;
      case 'fail':
        return <Badge variant="destructive">Fail</Badge>;
      case 'na':
        return <Badge variant="secondary">N/A</Badge>;
      case 'needs_attention':
        return <Badge variant="default" className="bg-yellow-500">Attention</Badge>;
      default:
        return <Badge variant="outline">{response}</Badge>;
    }
  };

  const updateInspectionResponse = (itemId: number, response: InspectionFormResponse['response'], notes?: string) => {
    setCurrentInspection(prev => {
      const existing = prev.find(r => r.itemId === itemId);
      if (existing) {
        return prev.map(r => r.itemId === itemId ? { ...r, response, notes: notes || '' } : r);
      }
      return [...prev, { itemId, response, notes: notes || '' }];
    });
  };

  const getResponseForItem = (itemId: number) => {
    return currentInspection.find(r => r.itemId === itemId);
  };

  const addCustomItem = () => {
    if (!newItemName.trim() || !newItemCategory.trim()) {
      toast({ title: "Please enter both item name and category", variant: "destructive" });
      return;
    }

    const newItem: InspectionItem = {
      id: Date.now(), // Simple ID generation
      name: newItemName,
      category: newItemCategory,
      isRequired: false
    };

    setCustomItems(prev => [...prev, newItem]);
    setNewItemName('');
    setNewItemCategory('');
    toast({ title: "Custom item added successfully" });
  };

  const submitInspection = () => {
    const requiredItems = inspectionItems.filter(item => item.isRequired);
    const completedRequired = requiredItems.filter(item => 
      currentInspection.some(r => r.itemId === item.id)
    );

    if (completedRequired.length < requiredItems.length) {
      toast({ 
        title: "Please complete all required items", 
        description: `${completedRequired.length}/${requiredItems.length} required items completed`,
        variant: "destructive" 
      });
      return;
    }

    // Submit logic here
    toast({ title: "Inspection submitted successfully!" });
  };

  const handleResponseChange = (itemId: number, response: InspectionFormResponse['response']) => {
    updateInspectionResponse(itemId, response);
  };

  const handleNotesChange = (itemId: number, notes: string) => {
    const existing = getResponseForItem(itemId);
    if (existing) {
      updateInspectionResponse(itemId, existing.response, notes);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Vehicle Inspections</h1>
          <p className="text-gray-600">Complete your pre-trip and post-trip vehicle inspections</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={cn("grid w-full", (user?.role === 'admin' || user?.role === 'manager') ? "grid-cols-5" : "grid-cols-4")}>
            <TabsTrigger value="pre-trip">Pre-Trip Inspection</TabsTrigger>
            <TabsTrigger value="post-trip">Post-Trip Inspection</TabsTrigger>
            <TabsTrigger value="vehicle-maintenance">Vehicle Maintenance</TabsTrigger>
            <TabsTrigger value="history">Inspection History</TabsTrigger>
            {(user?.role === 'admin' || user?.role === 'manager') && (
              <TabsTrigger value="settings">Inspection Settings</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="pre-trip" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Pre-Trip Inspection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Vehicle Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="technicianName">Technician Name</Label>
                    <Input
                      id="technicianName"
                      value={technicianName}
                      placeholder="Technician name"
                      className="bg-gray-100 text-gray-700"
                      readOnly
                    />
                  </div>
                  <div>
                    <Label htmlFor="vehicleNumber" className="flex items-center gap-1">
                      Vehicle Number <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="vehicleNumber"
                      value={vehicleInfo.vehicleNumber}
                      onChange={(e) => setVehicleInfo(prev => ({ ...prev, vehicleNumber: e.target.value }))}
                      placeholder="Enter vehicle number"
                      className={cn(
                        "border-2",
                        !vehicleInfo.vehicleNumber.trim() ? "border-red-300 focus:border-red-500" : "border-gray-300"
                      )}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="licensePlate">License Plate</Label>
                    <Input
                      id="licensePlate"
                      value={vehicleInfo.licensePlate}
                      onChange={(e) => setVehicleInfo(prev => ({ ...prev, licensePlate: e.target.value }))}
                      placeholder="Enter license plate"
                    />
                  </div>
                  <div>
                    <Label htmlFor="startMileage" className="flex items-center gap-1">
                      Starting Mileage <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="startMileage"
                      type="number"
                      value={vehicleInfo.mileage}
                      onChange={(e) => setVehicleInfo(prev => ({ ...prev, mileage: e.target.value }))}
                      placeholder="Enter starting mileage"
                      className={cn(
                        "border-2",
                        !vehicleInfo.mileage.trim() ? "border-red-300 focus:border-red-500" : "border-gray-300"
                      )}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="startFuelLevel" className="flex items-center gap-1">
                      Fuel Level <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="startFuelLevel"
                      value={vehicleInfo.fuelLevel}
                      onChange={(e) => setVehicleInfo(prev => ({ ...prev, fuelLevel: e.target.value }))}
                      placeholder="e.g., Full, 3/4 tank"
                      className={cn(
                        "border-2",
                        !vehicleInfo.fuelLevel.trim() ? "border-red-300 focus:border-red-500" : "border-gray-300"
                      )}
                      required
                    />
                  </div>
                </div>

                <Separator />

                {/* Inspection Items */}
                <div className="space-y-4">
                  {(inspectionItems || []).map((item) => (
                    <div key={item.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{item.name}</h4>
                            {item.isRequired && (
                              <Badge variant="destructive" className="text-xs">Required</Badge>
                            )}
                            <Badge variant="outline" className="text-xs">{item.category}</Badge>
                          </div>
                          {item.description && (
                            <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                          )}
                        </div>
                        {/* Gas Card Check-Out Selector */}
                        {item.itemType === 'gas_card_check_out' ? (
                          <div className="w-64">
                            <Select
                              value={getResponseForItem(item.id)?.gasCardId?.toString() || ''}
                              onValueChange={(value) => {
                                const gasCardId = parseInt(value);
                                const existingResponse = getResponseForItem(item.id);
                                if (existingResponse) {
                                  setCurrentInspection(prev => prev.map(r => 
                                    r.itemId === item.id 
                                      ? { ...r, gasCardId, response: 'checked_out' } 
                                      : r
                                  ));
                                } else {
                                  setCurrentInspection(prev => [...prev, {
                                    itemId: item.id,
                                    response: 'checked_out',
                                    gasCardId
                                  }]);
                                }
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select gas card to check out" />
                              </SelectTrigger>
                              <SelectContent>
                                {(gasCards as any[]).map((card: any) => (
                                  <SelectItem key={card.id} value={card.id.toString()}>
                                    {card.cardName} ({card.cardNumber})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            {['pass', 'fail', 'na', 'needs_attention'].map((status) => (
                              <Button
                                key={status}
                                variant={getResponseForItem(item.id)?.response === status ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleResponseChange(item.id, status as any)}
                                className={cn(
                                  "px-3 py-1 text-xs",
                                  status === 'pass' && getResponseForItem(item.id)?.response === status && "bg-green-500 hover:bg-green-600",
                                  status === 'fail' && getResponseForItem(item.id)?.response === status && "bg-red-500 hover:bg-red-600",
                                  status === 'na' && getResponseForItem(item.id)?.response === status && "bg-gray-500 hover:bg-gray-600",
                                  status === 'needs_attention' && getResponseForItem(item.id)?.response === status && "bg-yellow-500 hover:bg-yellow-600"
                                )}
                              >
                                {status === 'pass' && 'Pass'}
                                {status === 'fail' && 'Fail'}
                                {status === 'na' && 'N/A'}
                                {status === 'needs_attention' && 'Attention'}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {getResponseForItem(item.id) && (
                        <div className="mt-3 space-y-2">
                          <Textarea
                            placeholder="Add notes for this item..."
                            value={getResponseForItem(item.id)?.notes || ''}
                            onChange={(e) => handleNotesChange(item.id, e.target.value)}
                            className="text-sm"
                            rows={2}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* General Notes */}
                <div>
                  <Label htmlFor="notes">General Notes</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any additional notes about the inspection"
                    className="min-h-[100px]"
                  />
                </div>

                {/* Image Upload Section */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    PRE-TRIP Inspection Photos
                  </Label>
                  
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <div className="text-center">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handlePreTripPhotoUpload}
                        className="mb-2 bg-blue-500 hover:bg-blue-600 text-white"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        PRE-TRIP Add Photos
                      </Button>
                      <p className="text-sm text-gray-500">
                        Upload images of inspection items (Max 10MB each)
                      </p>
                    </div>
                    
                    <input
                      ref={preTripFileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>

                  {/* Display selected images */}
                  {inspectionImages.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {inspectionImages.map((file, index) => (
                        <div key={index} className="relative">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Inspection ${index + 1}`}
                            className="w-full h-24 object-cover rounded border"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full"
                            onClick={() => removeImage(index)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                          <p className="text-xs text-gray-600 mt-1 truncate">
                            {file.name}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Disclaimer */}
                <div className="border border-amber-200 bg-amber-50 p-4 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="disclaimer-pre-trip"
                      checked={disclaimerAccepted}
                      onChange={(e) => setDisclaimerAccepted(e.target.checked)}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="disclaimer-pre-trip" className="text-sm text-gray-700 leading-5">
                      <strong>Disclaimer:</strong> By completing this form, I confirm that I have completed the necessary inspection. I understand that my name, date, time, and this submission is being saved and sent to my manager for review. Not answering this submission completely or falsely can result in disciplinary actions including termination.
                    </label>
                  </div>
                </div>

                <Button 
                  onClick={handleSubmitInspection}
                  className="w-full"
                  size="lg"
                  disabled={!disclaimerAccepted || uploading}
                >
                  {uploading ? 'Submitting...' : 'Submit Pre-Trip Inspection'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="post-trip" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Post-Trip Inspection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Vehicle Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="technicianNamePost">Technician Name</Label>
                    <Input
                      id="technicianNamePost"
                      value={technicianName}
                      placeholder="Technician name"
                      className="bg-gray-100 text-gray-700"
                      readOnly
                    />
                  </div>
                  <div>
                    <Label htmlFor="vehicleNumberPost" className="flex items-center gap-1">
                      Vehicle Number <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="vehicleNumberPost"
                      value={vehicleInfo.vehicleNumber}
                      onChange={(e) => setVehicleInfo(prev => ({ ...prev, vehicleNumber: e.target.value }))}
                      placeholder="Enter vehicle number"
                      className={cn(
                        "border-2",
                        !vehicleInfo.vehicleNumber.trim() ? "border-red-300 focus:border-red-500" : "border-gray-300"
                      )}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="licensePlatePost">License Plate</Label>
                    <Input
                      id="licensePlatePost"
                      value={vehicleInfo.licensePlate}
                      onChange={(e) => setVehicleInfo(prev => ({ ...prev, licensePlate: e.target.value }))}
                      placeholder="Enter license plate"
                    />
                  </div>
                  <div>
                    <Label htmlFor="endMileage" className="flex items-center gap-1">
                      Ending Mileage <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="endMileage"
                      type="number"
                      value={vehicleInfo.mileage}
                      onChange={(e) => setVehicleInfo(prev => ({ ...prev, mileage: e.target.value }))}
                      placeholder="Enter ending mileage"
                      className={cn(
                        "border-2",
                        !vehicleInfo.mileage.trim() ? "border-red-300 focus:border-red-500" : "border-gray-300"
                      )}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="endFuelLevel" className="flex items-center gap-1">
                      Fuel Level <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="endFuelLevel"
                      value={vehicleInfo.fuelLevel}
                      onChange={(e) => setVehicleInfo(prev => ({ ...prev, fuelLevel: e.target.value }))}
                      placeholder="e.g., 1/4 tank"
                      className={cn(
                        "border-2",
                        !vehicleInfo.fuelLevel.trim() ? "border-red-300 focus:border-red-500" : "border-gray-300"
                      )}
                      required
                    />
                  </div>
                </div>

                <Separator />

                {/* Inspection Items */}
                <div className="space-y-4">
                  {(inspectionItems || []).map((item) => (
                    <div key={item.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{item.name}</h4>
                            {item.isRequired && (
                              <Badge variant="destructive" className="text-xs">Required</Badge>
                            )}
                            <Badge variant="outline" className="text-xs">{item.category}</Badge>
                          </div>
                          {item.description && (
                            <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                          )}
                        </div>
                        {/* Gas Card Check-In Selector */}
                        {item.itemType === 'gas_card_check_in' ? (
                          <div className="w-64">
                            <Select
                              value={getResponseForItem(item.id)?.gasCardId?.toString() || ''}
                              onValueChange={(value) => {
                                const gasCardId = parseInt(value);
                                const existingResponse = getResponseForItem(item.id);
                                if (existingResponse) {
                                  setCurrentInspection(prev => prev.map(r => 
                                    r.itemId === item.id 
                                      ? { ...r, gasCardId, response: 'checked_in' } 
                                      : r
                                  ));
                                } else {
                                  setCurrentInspection(prev => [...prev, {
                                    itemId: item.id,
                                    response: 'checked_in',
                                    gasCardId
                                  }]);
                                }
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select gas card to check in" />
                              </SelectTrigger>
                              <SelectContent>
                                {(gasCards as any[]).map((card: any) => (
                                  <SelectItem key={card.id} value={card.id.toString()}>
                                    {card.cardName} ({card.cardNumber})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            {['pass', 'fail', 'na', 'needs_attention'].map((status) => (
                              <Button
                                key={status}
                                variant={getResponseForItem(item.id)?.response === status ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleResponseChange(item.id, status as any)}
                                className={cn(
                                  "px-3 py-1 text-xs",
                                  status === 'pass' && getResponseForItem(item.id)?.response === status && "bg-green-500 hover:bg-green-600",
                                  status === 'fail' && getResponseForItem(item.id)?.response === status && "bg-red-500 hover:bg-red-600",
                                  status === 'na' && getResponseForItem(item.id)?.response === status && "bg-gray-500 hover:bg-gray-600",
                                  status === 'needs_attention' && getResponseForItem(item.id)?.response === status && "bg-yellow-500 hover:bg-yellow-600"
                                )}
                              >
                                {status === 'pass' && 'Pass'}
                                {status === 'fail' && 'Fail'}
                                {status === 'na' && 'N/A'}
                                {status === 'needs_attention' && 'Attention'}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {getResponseForItem(item.id) && (
                        <div className="mt-3 space-y-2">
                          <Textarea
                            placeholder="Add notes for this item..."
                            value={getResponseForItem(item.id)?.notes || ''}
                            onChange={(e) => handleNotesChange(item.id, e.target.value)}
                            className="text-sm"
                            rows={2}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* General Notes */}
                <div>
                  <Label htmlFor="notesPost">General Notes</Label>
                  <Textarea
                    id="notesPost"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any additional notes about the inspection"
                    className="min-h-[100px]"
                  />
                </div>

                {/* Image Upload Section */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    POST-TRIP Inspection Photos
                  </Label>
                  
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <div className="text-center">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handlePostTripPhotoUpload}
                        className="mb-2 bg-orange-500 hover:bg-orange-600 text-white"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        POST-TRIP Add Photos
                      </Button>
                      <p className="text-sm text-gray-500">
                        Upload images of inspection items (Max 10MB each)
                      </p>
                    </div>
                    
                    <input
                      ref={postTripFileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>

                  {/* Display selected images */}
                  {inspectionImages.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {inspectionImages.map((file, index) => (
                        <div key={index} className="relative">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Inspection ${index + 1}`}
                            className="w-full h-24 object-cover rounded border"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full"
                            onClick={() => removeImage(index)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                          <p className="text-xs text-gray-600 mt-1 truncate">
                            {file.name}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Disclaimer */}
                <div className="border border-amber-200 bg-amber-50 p-4 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="disclaimer-post-trip"
                      checked={disclaimerAccepted}
                      onChange={(e) => setDisclaimerAccepted(e.target.checked)}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="disclaimer-post-trip" className="text-sm text-gray-700 leading-5">
                      <strong>Disclaimer:</strong> By completing this form, I confirm that I have completed the necessary inspection. I understand that my name, date, time, and this submission is being saved and sent to my manager for review. Not answering this submission completely or falsely can result in disciplinary actions including termination.
                    </label>
                  </div>
                </div>

                <Button 
                  onClick={handleSubmitInspection}
                  className="w-full"
                  size="lg"
                  disabled={!disclaimerAccepted || uploading}
                >
                  {uploading ? 'Submitting...' : 'Submit Post-Trip Inspection'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vehicle-maintenance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Vehicle Maintenance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <VehicleManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Inspection History</CardTitle>
              </CardHeader>
              <CardContent>
                {allInspectionRecords?.length > 0 ? (
                  <div className="space-y-4">
                    {allInspectionRecords.map((record: InspectionRecord) => (
                      <div 
                        key={record.id} 
                        className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => handleViewInspection(record.id)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-medium">{record.templateName}</h4>
                            <p className="text-sm text-gray-600">
                              {record.submittedAt ? new Date(record.submittedAt).toLocaleDateString() : 'Not submitted'}
                            </p>
                            <p className="text-sm text-gray-600">By: {record.technicianName}</p>
                            {record.vehicleInfo && (
                              <p className="text-sm text-gray-600">
                                Vehicle: {record.vehicleInfo.licensePlate} - {record.vehicleInfo.mileage} miles
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(record.status)}
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No inspection records found.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inspection Settings Tab - Only visible to Admins and Managers */}
          {(user?.role === 'admin' || user?.role === 'manager') && (
            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Edit3 className="w-5 h-5" />
                    Inspection Settings
                  </CardTitle>
                  <p className="text-gray-600">Customize pre-trip and post-trip inspection templates</p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Template Type Selector */}
                  <div className="flex gap-4">
                    <Button
                      variant={editingTemplateType === 'pre-trip' ? 'default' : 'outline'}
                      onClick={() => setEditingTemplateType('pre-trip')}
                      className="flex-1"
                    >
                      Pre-Trip Template
                    </Button>
                    <Button
                      variant={editingTemplateType === 'post-trip' ? 'default' : 'outline'}
                      onClick={() => setEditingTemplateType('post-trip')}
                      className="flex-1"
                    >
                      Post-Trip Template
                    </Button>
                  </div>

                  {/* Add New Item Form */}
                  <Card className="border-2 border-dashed border-gray-300">
                    <CardHeader>
                      <CardTitle className="text-lg">Add New Inspection Item</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="itemName">Item Name <span className="text-red-500">*</span></Label>
                          <Input
                            id="itemName"
                            value={newInspectionItem.name}
                            onChange={(e) => setNewInspectionItem(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="e.g., Left Mirror"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="itemCategory">Category <span className="text-red-500">*</span></Label>
                          <Input
                            id="itemCategory"
                            value={newInspectionItem.category}
                            onChange={(e) => setNewInspectionItem(prev => ({ ...prev, category: e.target.value }))}
                            placeholder="e.g., Vehicle Safety"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="itemDescription">Description</Label>
                        <Textarea
                          id="itemDescription"
                          value={newInspectionItem.description}
                          onChange={(e) => setNewInspectionItem(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Detailed description of what to check"
                          rows={2}
                        />
                      </div>
                      <div>
                        <Label htmlFor="itemType">Item Type</Label>
                        <Select
                          value={newInspectionItem.itemType}
                          onValueChange={(value: 'regular' | 'gas_card_check_in' | 'gas_card_check_out') => 
                            setNewInspectionItem(prev => ({ ...prev, itemType: value }))
                          }
                        >
                          <SelectTrigger id="itemType">
                            <SelectValue placeholder="Select item type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="regular">Regular Inspection Item</SelectItem>
                            {editingTemplateType === 'pre-trip' && (
                              <SelectItem value="gas_card_check_out">Gas Card Check-Out</SelectItem>
                            )}
                            {editingTemplateType === 'post-trip' && (
                              <SelectItem value="gas_card_check_in">Gas Card Check-In</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        {newInspectionItem.itemType === 'gas_card_check_out' && (
                          <p className="text-sm text-gray-600 mt-1">Technician will check out a gas card during pre-trip inspection</p>
                        )}
                        {newInspectionItem.itemType === 'gas_card_check_in' && (
                          <p className="text-sm text-gray-600 mt-1">Technician will check in a gas card during post-trip inspection</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="itemRequired"
                          checked={newInspectionItem.isRequired}
                          onCheckedChange={(checked) => setNewInspectionItem(prev => ({ ...prev, isRequired: !!checked }))}
                        />
                        <Label htmlFor="itemRequired">This item is required</Label>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={addNewInspectionItemWithChange} className="flex-1">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Item
                        </Button>
                        <Button variant="outline" onClick={resetTemplateToDefaults}>
                          Reset to Defaults
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Current Template Items */}
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        {editingTemplateType === 'pre-trip' ? 'Pre-Trip' : 'Post-Trip'} Inspection Items
                      </CardTitle>
                      <p className="text-sm text-gray-600">
                        {customInspectionItems[editingTemplateType]?.length || 0} items configured
                      </p>
                    </CardHeader>
                    <CardContent>
                      {customInspectionItems[editingTemplateType]?.length > 0 ? (
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={handleDragEnd}
                        >
                          <SortableContext
                            items={customInspectionItems[editingTemplateType].map(item => item.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="space-y-3">
                              {customInspectionItems[editingTemplateType].map((item) => (
                                <SortableItem
                                  key={item.id}
                                  item={item}
                                  editingItemId={editingItemId}
                                  setEditingItemId={setEditingItemId}
                                  updateInspectionItem={updateInspectionItemWithChange}
                                  deleteInspectionItem={deleteInspectionItemWithChange}
                                />
                              ))}
                            </div>
                          </SortableContext>
                        </DndContext>
                      ) : (
                        <div className="text-center py-8">
                          <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-gray-400" />
                          <p className="text-gray-500">No inspection items configured yet.</p>
                          <p className="text-sm text-gray-400 mt-1">Add your first item above to get started.</p>
                        </div>
                      )}
                      
                      {/* Save Button */}
                      {customInspectionItems[editingTemplateType]?.length > 0 && (
                        <div className="mt-6 pt-4 border-t">
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-600">
                              {hasUnsavedChanges ? (
                                <span className="text-orange-600 font-medium">
                                  You have unsaved changes
                                </span>
                              ) : (
                                <span className="text-green-600">
                                  All changes saved
                                </span>
                              )}
                            </div>
                            <Button 
                              onClick={saveInspectionSettings}
                              disabled={!hasUnsavedChanges || isSaving}
                              className="min-w-[120px]"
                              data-testid="save-inspection-settings"
                            >
                              {isSaving ? (
                                <>
                                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <Save className="w-4 h-4 mr-2" />
                                  Save Settings
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        {/* Detailed Inspection View Dialog */}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Inspection Details</DialogTitle>
            </DialogHeader>
            
            {detailLoading ? (
              <div className="flex items-center justify-center p-8">
                <Clock className="h-8 w-8 animate-spin mr-2" />
                <span>Loading inspection details...</span>
              </div>
            ) : detailedInspection ? (
              <div className="space-y-6">
                {/* Header Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-semibold text-lg">{detailedInspection.templateName}</h3>
                    <p className="text-sm text-gray-600">Type: {detailedInspection.type}</p>
                    <p className="text-sm text-gray-600">
                      Submitted: {detailedInspection.submittedAt 
                        ? new Date(detailedInspection.submittedAt).toLocaleString() 
                        : 'Not submitted'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Technician: {detailedInspection.technicianName}</p>
                    {getStatusBadge(detailedInspection.status)}
                    {detailedInspection.vehicleInfo && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-600">
                          Vehicle: {detailedInspection.vehicleInfo.vehicleNumber || 'N/A'}
                        </p>
                        <p className="text-sm text-gray-600">
                          License: {detailedInspection.vehicleInfo.licensePlate || 'N/A'}
                        </p>
                        <p className="text-sm text-gray-600">
                          Mileage: {detailedInspection.vehicleInfo.mileage || 'N/A'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Inspection Responses */}
                {detailedInspection.responses && detailedInspection.responses.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-4">Inspection Items</h4>
                    <div className="space-y-3">
                      {detailedInspection.responses.map((response: InspectionResponse) => (
                        <div key={response.id} className="border rounded-lg p-3">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h5 className="font-medium">{response.itemName}</h5>
                              <p className="text-sm text-gray-600">{response.itemDescription}</p>
                              <Badge variant="outline" className="text-xs mt-1">
                                {response.itemCategory}
                              </Badge>
                            </div>
                            <div className="text-right">
                              {getResponseBadge(response.response)}
                              {response.isRequired && (
                                <Badge variant="destructive" className="text-xs ml-2">Required</Badge>
                              )}
                            </div>
                          </div>
                          {(response.response === 'checked_out' || response.response === 'checked_in') && response.gasCardName && (
                            <div className="mt-2 p-2 bg-blue-50 rounded">
                              <p className="text-sm font-medium">Gas Card:</p>
                              <p className="text-sm text-gray-700">{response.gasCardName}</p>
                            </div>
                          )}
                          {response.notes && (
                            <div className="mt-2">
                              <p className="text-sm font-medium">Notes:</p>
                              <p className="text-sm text-gray-700">{response.notes}</p>
                            </div>
                          )}
                          {response.photos && response.photos.length > 0 && (
                            <div className="mt-2">
                              <p className="text-sm font-medium mb-2">Photos:</p>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {response.photos.map((photo: string, index: number) => (
                                  <img
                                    key={index}
                                    src={`/${photo}`}
                                    alt={`Inspection photo ${index + 1}`}
                                    className="w-full h-20 object-cover rounded border"
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* General Photos */}
                {detailedInspection.photos && detailedInspection.photos.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-4">General Photos</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {detailedInspection.photos.map((photo: string, index: number) => (
                        <img
                          key={index}
                          src={`/${photo}`}
                          alt={`General inspection photo ${index + 1}`}
                          className="w-full h-24 object-cover rounded border"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Review Information */}
                {detailedInspection.reviewedBy && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold mb-2">Review Information</h4>
                    <p className="text-sm text-gray-600">
                      Reviewed: {detailedInspection.reviewedAt 
                        ? new Date(detailedInspection.reviewedAt).toLocaleString() 
                        : 'Not reviewed'}
                    </p>
                    {detailedInspection.reviewNotes && (
                      <div className="mt-2">
                        <p className="text-sm font-medium">Review Notes:</p>
                        <p className="text-sm text-gray-700">{detailedInspection.reviewNotes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center p-8">
                <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-red-500" />
                <p className="text-gray-600">Failed to load inspection details</p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}