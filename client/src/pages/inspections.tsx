import { useState, useRef } from "react";
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
    { category: 'Vehicle Safety', name: 'Lights', description: 'Test headlights, taillights, and hazard lights', isRequired: true },
    { category: 'Vehicle Safety', name: 'Turn Signals', description: 'Check left and right turn signals', isRequired: true },
    { category: 'Equipment', name: 'Chemicals', description: 'Verify chemical levels and proper storage', isRequired: true },
    { category: 'Equipment', name: 'O-rings', description: 'Inspect o-rings for wear and proper sealing', isRequired: true },
    { category: 'Equipment', name: 'Nozzles', description: 'Check nozzle condition and spray patterns', isRequired: true }
  ],
  'post-trip': [
    { category: 'Equipment', name: 'Chemical Storage', description: 'Secure all chemicals properly', isRequired: true },
    { category: 'Equipment', name: 'Equipment Cleaning', description: 'Clean and store all equipment', isRequired: true },
    { category: 'Vehicle', name: 'Fuel Level', description: 'Record fuel level at end of shift', isRequired: true },
    { category: 'Vehicle', name: 'Mileage', description: 'Record ending mileage', isRequired: true },
    { category: 'Safety', name: 'Incident Report', description: 'Report any incidents or issues', isRequired: false }
  ]
};

export default function Inspections() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState('pre-trip');
  const [currentInspection, setCurrentInspection] = useState<InspectionResponse[]>([]);
  const [vehicleInfo, setVehicleInfo] = useState({
    licensePlate: '',
    mileage: '',
    fuelLevel: ''
  });
  const [notes, setNotes] = useState('');
  const [customItems, setCustomItems] = useState<InspectionItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [submittedInspections, setSubmittedInspections] = useState<InspectionRecord[]>([]);
  const [inspectionImages, setInspectionImages] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  
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

  // Use default data for now
  const inspectionItems = defaultInspectionItems;
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

      // Create new inspection record
      const newInspectionRecord: InspectionRecord = {
        id: Date.now(), // Simple ID generation
        type: activeTab,
        status: "completed",
        submittedAt: new Date().toISOString(),
        templateName: activeTab === 'pre-trip' ? 'Pre-Trip Inspection' : 'Post-Trip Inspection',
        technicianName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
        vehicleInfo: {
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
      setVehicleInfo({ licensePlate: '', mileage: '', fuelLevel: '' });
      setNotes('');
      setInspectionImages([]);
    } catch (error) {
      console.error('Error submitting inspection:', error);
      toast({ title: "Failed to submit inspection", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  // Combine default items and custom items
  const allItems = [...defaultInspectionItems, ...customItems];

  // Image upload handlers
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newImages = Array.from(files).filter(file => 
        file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024 // 10MB limit
      );
      
      if (newImages.length !== files.length) {
        toast({ title: "Some files were skipped (only images under 10MB allowed)", variant: "destructive" });
      }
      
      setInspectionImages(prev => [...prev, ...newImages]);
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
        variant: "destructive" 
      });
      return;
    }

    // Use the working handler instead
    handleSubmitInspection();
  };

  const sendToManager = (recordId: number) => {
    toast({ title: "Inspection sent to manager successfully" });
  };

  // Helper functions for component functionality
  const handleResponseChange = (itemId: number, response: 'pass' | 'fail' | 'na' | 'needs_attention') => {
    setCurrentInspection(prev => {
      const existing = prev.find(r => r.itemId === itemId);
      if (existing) {
        return prev.map(r => r.itemId === itemId ? { ...r, response } : r);
      }
      return [...prev, { itemId, response, notes: '' }];
    });
  };

  const handleNotesChange = (itemId: number, notes: string) => {
    setCurrentInspection(prev => {
      const existing = prev.find(r => r.itemId === itemId);
      if (existing) {
        return prev.map(r => r.itemId === itemId ? { ...r, notes } : r);
      }
      return [...prev, { itemId, response: 'pass', notes }];
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'pending': { color: 'bg-yellow-500', text: 'Pending', icon: Clock },
      'completed': { color: 'bg-green-500', text: 'Completed', icon: CheckCircle },
      'requires_attention': { color: 'bg-red-500', text: 'Needs Attention', icon: AlertTriangle }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.color} text-white`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.text}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Vehicle Inspections</h1>
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    placeholder="Enter mileage"
                  />
                </div>
                <div>
                  <Label htmlFor="fuelLevel">Fuel Level</Label>
                  <Input
                    id="fuelLevel"
                    value={vehicleInfo.fuelLevel}
                    onChange={(e) => setVehicleInfo(prev => ({ ...prev, fuelLevel: e.target.value }))}
                    placeholder="e.g., 3/4 tank"
                  />
                </div>
              </div>

              <Separator />

              {/* Inspection Items */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Inspection Checklist</h3>
                
                {Object.entries(
                  allItems.reduce((acc, item, index) => {
                    const category = item.category;
                    if (!acc[category]) acc[category] = [];
                    acc[category].push({ ...item, id: index });
                    return acc;
                  }, {} as Record<string, any[]>)
                ).map(([category, items]) => (
                  <div key={category} className="space-y-2">
                    <h4 className="font-medium text-sm text-gray-600 uppercase tracking-wide">{category}</h4>
                    {items.map((item) => {
                      const response = getResponseForItem(item.id);
                      return (
                        <div key={item.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <h5 className="font-medium">{item.name}</h5>
                              {item.description && (
                                <p className="text-sm text-gray-600">{item.description}</p>
                              )}
                              {item.isRequired && (
                                <Badge variant="outline" className="text-xs mt-1">Required</Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              variant={response?.response === 'pass' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => updateInspectionResponse(item.id, 'pass')}
                              className="flex items-center gap-1"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Pass
                            </Button>
                            <Button
                              variant={response?.response === 'fail' ? 'destructive' : 'outline'}
                              size="sm"
                              onClick={() => updateInspectionResponse(item.id, 'fail')}
                              className="flex items-center gap-1"
                            >
                              <XCircle className="w-4 h-4" />
                              Fail
                            </Button>
                            <Button
                              variant={response?.response === 'needs_attention' ? 'secondary' : 'outline'}
                              size="sm"
                              onClick={() => updateInspectionResponse(item.id, 'needs_attention')}
                              className="flex items-center gap-1"
                            >
                              <AlertTriangle className="w-4 h-4" />
                              Needs Attention
                            </Button>
                            <Button
                              variant={response?.response === 'na' ? 'outline' : 'outline'}
                              size="sm"
                              onClick={() => updateInspectionResponse(item.id, 'na')}
                            >
                              N/A
                            </Button>
                          </div>

                          {response && (
                            <div className="space-y-2">
                              <Textarea
                                placeholder="Add notes (optional)"
                                value={response.notes || ''}
                                onChange={(e) => updateInspectionResponse(item.id, response.response, e.target.value)}
                                className="min-h-[60px]"
                              />
                              <Button variant="outline" size="sm" className="flex items-center gap-1">
                                <Camera className="w-4 h-4" />
                                Add Photo
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Add Custom Item */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Add Custom Inspection Item</h4>
                <div className="flex gap-2">
                  <Input
                    placeholder="Item name"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                  />
                  <Input
                    placeholder="Category"
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                  />
                  <Button onClick={addCustomItem}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
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
                  Inspection Photos
                </Label>
                
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <div className="text-center">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="mb-2"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Add Photos
                    </Button>
                    <p className="text-sm text-gray-500">
                      Upload images of inspection items (Max 10MB each)
                    </p>
                  </div>
                  
                  <input
                    ref={fileInputRef}
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

              {/* Submit Button */}
              <Button 
                onClick={handleSubmitInspection}
                className="w-full"
                size="lg"
                disabled={uploading}
              >
                {uploading ? "Uploading..." : "Submit Pre-Trip Inspection"}
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
              {/* Similar structure to pre-trip but with post-trip specific items */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

              <Button 
                onClick={handleSubmitInspection}
                className="w-full"
                size="lg"
              >
                Submit Post-Trip Inspection
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
                        </div>
                        <div className="flex gap-2">
                          {getStatusBadge(record.status)}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => sendToManager(record.id)}
                            className="flex items-center gap-1"
                          >
                            <Send className="w-4 h-4" />
                            Send to Manager
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No inspection records found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}