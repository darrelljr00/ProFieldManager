import { useState } from "react";
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
  Camera, Send, Plus, Trash2, Edit3 
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

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
  vehicleInfo?: any;
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
    { id: 1, type: "pre-trip", status: "completed", submittedAt: "2025-06-29T08:30:00Z", templateName: "Standard Pre-Trip", vehicleInfo: { licensePlate: "ABC-123", mileage: "45,230" } },
    { id: 2, type: "post-trip", status: "completed", submittedAt: "2025-06-28T17:45:00Z", templateName: "Standard Post-Trip", vehicleInfo: { licensePlate: "ABC-123", mileage: "45,180" } }
  ];

  // Use default data for now
  const inspectionItems = defaultInspectionItems;
  const inspectionRecords = sampleInspectionRecords;

  // Submit inspection handler
  const handleSubmitInspection = () => {
    if (currentInspection.length === 0) {
      toast({ title: "Please complete at least one inspection item", variant: "destructive" });
      return;
    }

    // Simulate successful submission
    toast({ title: "Inspection submitted successfully" });
    setCurrentInspection([]);
    setVehicleInfo({ licensePlate: '', mileage: '', fuelLevel: '' });
    setNotes('');
  };

  const allItems = [
    ...(defaultInspectionItems[activeTab as keyof typeof defaultInspectionItems] || []),
    ...customItems.filter(item => item.category.toLowerCase().includes(activeTab))
  ];

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

    const newItem = {
      name: newItemName,
      category: newItemCategory,
      type: activeTab,
      isRequired: false
    };

    addCustomItemMutation.mutate(newItem);
  };

  const submitInspection = () => {
    const requiredItems = allItems.filter(item => item.isRequired);
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

    const inspectionData = {
      type: activeTab,
      vehicleInfo,
      responses: currentInspection,
      notes,
      location: null // GPS location would be added here
    };

    submitInspectionMutation.mutate(inspectionData);
  };

  const sendToManager = (recordId: number) => {
    apiRequest(`/api/inspections/${recordId}/send-to-manager`, { method: 'POST' })
      .then(() => {
        toast({ title: "Inspection sent to manager successfully" });
      })
      .catch(() => {
        toast({ title: "Failed to send inspection", variant: "destructive" });
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
                  <Button onClick={addCustomItem} disabled={addCustomItemMutation.isPending}>
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

              {/* Submit Button */}
              <Button 
                onClick={submitInspection}
                disabled={submitInspectionMutation.isPending}
                className="w-full"
                size="lg"
              >
                Submit Pre-Trip Inspection
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

              {/* Post-trip inspection items would go here with similar structure */}
              <div className="text-center py-8 text-gray-500">
                Post-trip inspection items will be loaded here
              </div>

              <Button 
                onClick={submitInspection}
                disabled={submitInspectionMutation.isPending}
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
              {recordsLoading ? (
                <div className="text-center py-8">Loading inspection records...</div>
              ) : inspectionRecords?.length > 0 ? (
                <div className="space-y-4">
                  {inspectionRecords.map((record: InspectionRecord) => (
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