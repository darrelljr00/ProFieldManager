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
import { 
  CheckCircle, XCircle, Clock, AlertTriangle, 
  Camera, Send, Plus, Trash2, Edit3, Upload, X 
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface InspectionItem {
  id: number;
  name: string;
  category: string;
  description?: string;
  isRequired: boolean;
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
  itemId: number;
  response: 'pass' | 'fail' | 'na' | 'needs_attention';
  notes?: string;
  photos?: string[];
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

export default function Inspections() {
  const { user } = useAuth();
  const preTripFileInputRef = useRef<HTMLInputElement>(null);
  const postTripFileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState('pre-trip');
  const [currentInspection, setCurrentInspection] = useState<InspectionResponse[]>([]);
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
  
  // Auto-populate technician name when user is logged in
  useEffect(() => {
    if (user) {
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username;
      setTechnicianName(fullName);
    }
  }, [user]);
  
  // Default inspection items for demo
  const defaultInspectionItems: InspectionItem[] = [
    { id: 1, name: "Left Mirror", category: "Mirrors", description: "Check left side mirror for cracks and proper adjustment", isRequired: true },
    { id: 2, name: "Right Mirror", category: "Mirrors", description: "Check right side mirror for cracks and proper adjustment", isRequired: true },
    { id: 3, name: "Front Tires", category: "Tires", description: "Check tire pressure and tread depth", isRequired: true },
    { id: 4, name: "Rear Tires", category: "Tires", description: "Check tire pressure and tread depth", isRequired: true },
    { id: 5, name: "Headlights", category: "Lights", description: "Test headlight functionality", isRequired: true },
    { id: 6, name: "Brake Lights", category: "Lights", description: "Test brake light functionality", isRequired: true },
    { id: 7, name: "Turn Signals", category: "Turn Signals", description: "Test left and right turn signals", isRequired: true },
    { id: 8, name: "Chemicals", category: "Equipment", description: "Check chemical levels and equipment", isRequired: false },
    { id: 9, name: "O-Rings", category: "Equipment", description: "Inspect o-rings for damage", isRequired: false },
    { id: 10, name: "Nozzles", category: "Equipment", description: "Check nozzle condition and functionality", isRequired: false }
  ];

  const sampleInspectionRecords: InspectionRecord[] = [
    { id: 1, type: "pre-trip", status: "completed", submittedAt: "2025-06-29T08:30:00Z", templateName: "Standard Pre-Trip", technicianName: "John Smith", vehicleInfo: { licensePlate: "ABC-123", mileage: "45,230" } },
    { id: 2, type: "post-trip", status: "completed", submittedAt: "2025-06-28T17:45:00Z", templateName: "Standard Post-Trip", technicianName: "Mike Johnson", vehicleInfo: { licensePlate: "ABC-123", mileage: "45,180" } }
  ];

  // Fetch inspection items from API
  const { data: inspectionItems, isLoading: itemsLoading, error: itemsError } = useQuery({
    queryKey: ["/api/inspections/items", activeTab],
    queryFn: async () => {
      console.log('Fetching inspection items for type:', activeTab);
      const result = await apiRequest(`/api/inspections/items?type=${activeTab}`);
      console.log('Fetched inspection items:', result);
      return result;
    },
    enabled: !!activeTab,
  });
  
  const allInspectionRecords = [...submittedInspections, ...sampleInspectionRecords];

  // Submit inspection handler
  const handleSubmitInspection = async () => {
    if (currentInspection.length === 0) {
      toast({ title: "Please complete at least one inspection item", variant: "destructive" });
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

    setUploading(true);
    
    try {
      let uploadedImagePaths: string[] = [];

      // Upload images if any
      if (inspectionImages.length > 0) {
        const formData = new FormData();
        inspectionImages.forEach((file, index) => {
          formData.append(`inspectionImages`, file);
        });

        const uploadResponse = await apiRequest('/api/upload-inspection-images', {
          method: 'POST',
          body: formData,
        });

        uploadedImagePaths = uploadResponse.filePaths || [];
      }

      // Submit inspection to backend
      const submissionData = {
        type: activeTab,
        vehicleInfo: {
          licensePlate: vehicleInfo.licensePlate,
          mileage: vehicleInfo.mileage,
          fuelLevel: vehicleInfo.fuelLevel
        },
        responses: currentInspection.map(response => ({
          itemId: response.itemId,
          response: response.response,
          note: response.notes || '',
          photos: uploadedImagePaths
        })),
        notes: notes,
        location: null // Can be enhanced with GPS data later
      };

      const record = await apiRequest('/api/inspections/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

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
      setCurrentInspection([]);
      setVehicleInfo({ vehicleNumber: '', licensePlate: '', mileage: '', fuelLevel: '' });
      setNotes('');
      setInspectionImages([]);
      setDisclaimerAccepted(false);
    } catch (error) {
      console.error('Error submitting inspection:', error);
      toast({ title: "Failed to submit inspection", variant: "destructive" });
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

  const updateInspectionResponse = (itemId: number, response: InspectionResponse['response'], notes?: string) => {
    setCurrentInspection(prev => {
      const existing = prev.find(r => r.itemId === itemId);
      if (existing) {
        return prev.map(r => r.itemId === itemId ? { ...r, response, notes } : r);
      }
      return [...prev, { itemId, response, notes }];
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

  const handleResponseChange = (itemId: number, response: InspectionResponse['response']) => {
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pre-trip">Pre-Trip Inspection</TabsTrigger>
            <TabsTrigger value="post-trip">Post-Trip Inspection</TabsTrigger>
            <TabsTrigger value="history">Inspection History</TabsTrigger>
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
                    <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                    <Input
                      id="vehicleNumber"
                      value={vehicleInfo.vehicleNumber}
                      onChange={(e) => setVehicleInfo(prev => ({ ...prev, vehicleNumber: e.target.value }))}
                      placeholder="Enter vehicle number"
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
                    <Label htmlFor="startMileage">Starting Mileage</Label>
                    <Input
                      id="startMileage"
                      type="number"
                      value={vehicleInfo.mileage}
                      onChange={(e) => setVehicleInfo(prev => ({ ...prev, mileage: e.target.value }))}
                      placeholder="Enter starting mileage"
                    />
                  </div>
                  <div>
                    <Label htmlFor="startFuelLevel">Fuel Level</Label>
                    <Input
                      id="startFuelLevel"
                      value={vehicleInfo.fuelLevel}
                      onChange={(e) => setVehicleInfo(prev => ({ ...prev, fuelLevel: e.target.value }))}
                      placeholder="e.g., Full, 3/4 tank"
                    />
                  </div>
                </div>

                <Separator />

                {/* Inspection Items */}
                <div className="space-y-4">
                  {inspectionItems.map((item) => (
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
                    <Label htmlFor="vehicleNumberPost">Vehicle Number</Label>
                    <Input
                      id="vehicleNumberPost"
                      value={vehicleInfo.vehicleNumber}
                      onChange={(e) => setVehicleInfo(prev => ({ ...prev, vehicleNumber: e.target.value }))}
                      placeholder="Enter vehicle number"
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
                    <Label htmlFor="endMileage">Ending Mileage</Label>
                    <Input
                      id="endMileage"
                      type="number"
                      value={vehicleInfo.mileage}
                      onChange={(e) => setVehicleInfo(prev => ({ ...prev, mileage: e.target.value }))}
                      placeholder="Enter ending mileage"
                    />
                  </div>
                  <div>
                    <Label htmlFor="endFuelLevel">Fuel Level</Label>
                    <Input
                      id="endFuelLevel"
                      value={vehicleInfo.fuelLevel}
                      onChange={(e) => setVehicleInfo(prev => ({ ...prev, fuelLevel: e.target.value }))}
                      placeholder="e.g., 1/4 tank"
                    />
                  </div>
                </div>

                <Separator />

                {/* Inspection Items */}
                <div className="space-y-4">
                  {inspectionItems.map((item) => (
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

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Inspection History</CardTitle>
              </CardHeader>
              <CardContent>
                {allInspectionRecords?.length > 0 ? (
                  <div className="space-y-4">
                    {allInspectionRecords.map((record: InspectionRecord) => (
                      <div key={record.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
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
                          <Badge 
                            variant={record.status === 'completed' ? 'default' : 'secondary'}
                            className="capitalize"
                          >
                            {record.status}
                          </Badge>
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
        </Tabs>
      </div>
    </div>
  );
}