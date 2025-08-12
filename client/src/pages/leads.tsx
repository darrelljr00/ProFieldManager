import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit, Trash2, Phone, Mail, DollarSign, Calendar, Search, Filter, X, MapPin, BarChart3, TrendingUp, Users, Target } from "lucide-react";
import type { Lead, InsertLead } from "@shared/schema";

// Google Maps heatmap functionality
declare global {
  interface Window {
    google: any;
    initMap?: () => void;
  }
}

interface LatLng {
  lat: number;
  lng: number;
}

function loadGoogleMapsScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps && window.google.maps.visualization) {
      resolve();
      return;
    }

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyCy9lgjvkKV3vS_U1IIcmxJUC8q8yJaASI';
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=visualization`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });
}

async function geocodeAddress(address: string): Promise<LatLng | null> {
  if (!window.google || !window.google.maps) {
    return null;
  }

  return new Promise((resolve) => {
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address }, (results: any[], status: string) => {
      if (status === 'OK' && results && results.length > 0) {
        const location = results[0].geometry.location;
        resolve({
          lat: location.lat(),
          lng: location.lng()
        });
      } else {
        resolve(null);
      }
    });
  });
}

export default function Leads() {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState("leads");
  
  // Analytics state
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [leadLocations, setLeadLocations] = useState<LatLng[]>([]);
  const mapRef = useRef<HTMLDivElement>(null);
  const heatmapRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);

  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  // WebSocket connection for real-time heatmap updates
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    console.log("🔌 Connecting to WebSocket for leads heatmap updates:", wsUrl);
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("✅ WebSocket connected for leads heatmap");
      ws.send(JSON.stringify({ type: 'auth', username: 'leads_heatmap_user' }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log("📨 WebSocket message received:", message);

        // Handle lead-related events for heatmap updates
        if (message.type === 'lead_created' || message.type === 'lead_updated' || message.type === 'lead_deleted') {
          console.log("🗺️ Lead change detected, refreshing leads data for heatmap");
          
          // Invalidate and refetch leads data
          queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
          
          // Show toast notification
          if (message.type === 'lead_created') {
            toast({
              title: "New Lead Added",
              description: `${message.data.lead.name} has been added to the system`,
            });
          } else if (message.type === 'lead_updated') {
            toast({
              title: "Lead Updated",
              description: `Lead information has been updated`,
            });
          } else if (message.type === 'lead_deleted') {
            toast({
              title: "Lead Deleted",
              description: `A lead has been removed from the system`,
            });
          }
        }
      } catch (error) {
        console.error("❌ Error parsing WebSocket message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("❌ WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("🔌 WebSocket disconnected for leads heatmap");
    };

    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [queryClient, toast]);

  // Debug: log the leads data
  console.log("Leads data:", leads);
  if (leads.length > 0) {
    console.log("First lead:", leads[0]);
  }

  // Analytics: Load Google Maps and geocode addresses when switching to analytics tab
  useEffect(() => {
    if (activeTab === "analytics" && leads.length > 0) {
      loadGoogleMapsScript()
        .then(() => {
          setIsMapLoaded(true);
          setMapError(null);
          geocodeLeadAddresses();
        })
        .catch((error) => {
          console.error("Google Maps failed to load:", error);
          setMapError("Google Maps API not available - using address list visualization");
          setIsMapLoaded(false);
          
          // Extract addresses for fallback display
          const addresses = leads.map(item => {
            const lead = item.leads || item;
            return lead.address ? `${lead.address}, ${lead.city}, ${lead.state} ${lead.zipCode}`.trim() : null;
          }).filter(Boolean);
          
          console.log("📍 Lead addresses for visualization:", addresses);
        });
    }
  }, [activeTab, leads]);

  // Auto-refresh heatmap when leads data changes (including from WebSocket updates)
  useEffect(() => {
    if (activeTab === "analytics" && isMapLoaded && leads.length > 0) {
      console.log("🗺️ Refreshing heatmap due to leads data change");
      geocodeLeadAddresses();
    }
  }, [leads, activeTab, isMapLoaded]);

  // Geocode lead addresses
  const geocodeLeadAddresses = async () => {
    const locations: LatLng[] = [];
    
    for (const item of leads) {
      const lead = item.leads || item; // Handle nested structure
      if (lead.address && lead.address.trim()) {
        try {
          const location = await geocodeAddress(lead.address);
          if (location) {
            locations.push(location);
          }
        } catch (error) {
          console.warn(`Failed to geocode address: ${lead.address}`, error);
        }
      }
    }
    
    setLeadLocations(locations);
    
    // Initialize map after geocoding
    if (mapRef.current && locations.length > 0) {
      initializeHeatmap(locations);
    }
  };

  // Initialize Google Maps heatmap
  const initializeHeatmap = (locations: LatLng[]) => {
    if (!window.google || !window.google.maps || !mapRef.current) {
      return;
    }

    // Calculate center point
    const center = locations.length > 0 
      ? {
          lat: locations.reduce((sum, loc) => sum + loc.lat, 0) / locations.length,
          lng: locations.reduce((sum, loc) => sum + loc.lng, 0) / locations.length
        }
      : { lat: 39.8283, lng: -98.5795 }; // Center of US

    // Create map
    const map = new window.google.maps.Map(mapRef.current, {
      zoom: 10,
      center: center,
      mapTypeId: window.google.maps.MapTypeId.ROADMAP,
    });

    mapInstanceRef.current = map;

    // Create heatmap data
    const heatmapData = locations.map(location => 
      new window.google.maps.LatLng(location.lat, location.lng)
    );

    // Create heatmap layer
    const heatmap = new window.google.maps.visualization.HeatmapLayer({
      data: heatmapData,
      map: map,
      radius: 50,
      opacity: 0.8,
      gradient: [
        'rgba(0, 255, 255, 0)',
        'rgba(0, 255, 255, 1)',
        'rgba(0, 191, 255, 1)',
        'rgba(0, 127, 255, 1)',
        'rgba(0, 63, 255, 1)',
        'rgba(0, 0, 255, 1)',
        'rgba(0, 0, 223, 1)',
        'rgba(0, 0, 191, 1)',
        'rgba(0, 0, 159, 1)',
        'rgba(0, 0, 127, 1)',
        'rgba(63, 0, 91, 1)',
        'rgba(127, 0, 63, 1)',
        'rgba(191, 0, 31, 1)',
        'rgba(255, 0, 0, 1)'
      ]
    });

    heatmapRef.current = heatmap;

    // Auto-fit bounds to show all points
    if (locations.length > 1) {
      const bounds = new window.google.maps.LatLngBounds();
      locations.forEach(location => {
        bounds.extend(new window.google.maps.LatLng(location.lat, location.lng));
      });
      map.fitBounds(bounds);
    }
  };

  // Filter leads based on search query and filters
  const filteredLeads = leads.filter((item) => {
    const lead = item.leads || item; // Handle nested structure
    const matchesSearch = searchQuery === "" || 
      lead.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.serviceDescription?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.leadSource?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.notes?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || lead.priority === priorityFilter;
    const matchesGrade = gradeFilter === "all" || lead.grade === gradeFilter;

    return matchesSearch && matchesStatus && matchesPriority && matchesGrade;
  });

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setGradeFilter("all");
    setShowFilters(false);
  };

  // Check if any filters are active
  const hasActiveFilters = searchQuery !== "" || statusFilter !== "all" || priorityFilter !== "all" || gradeFilter !== "all";

  // Get row color based on lead grade
  const getRowColor = (grade: string) => {
    switch (grade) {
      case "hot":
        return "bg-red-50 border-l-4 border-red-500 hover:bg-red-100";
      case "warm":
        return "bg-orange-50 border-l-4 border-orange-500 hover:bg-orange-100";
      case "cold":
        return "bg-blue-50 border-l-4 border-blue-500 hover:bg-blue-100";
      default:
        return "hover:bg-gray-50";
    }
  };

  // Get grade badge styling
  const getGradeBadge = (grade: string) => {
    switch (grade) {
      case "hot":
        return "bg-red-100 text-red-800 border-red-200";
      case "warm":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "cold":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const createMutation = useMutation({
    mutationFn: (data: Partial<InsertLead>) => 
      apiRequest("POST", "/api/leads", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setIsDialogOpen(false);
      setSelectedLead(null);
      toast({
        title: "Success",
        description: "Lead created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create lead",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertLead> }) =>
      apiRequest("PUT", `/api/leads/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setIsDialogOpen(false);
      setSelectedLead(null);
      toast({
        title: "Success",
        description: "Lead updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update lead",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest("DELETE", `/api/leads/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Success",
        description: "Lead deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete lead",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const leadData = {
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      address: formData.get('address') as string,
      city: formData.get('city') as string,
      state: formData.get('state') as string,
      zipCode: formData.get('zipCode') as string,
      serviceDescription: formData.get('serviceDescription') as string,
      leadPrice: formData.get('leadPrice') as string,
      leadSource: formData.get('leadSource') as string,
      status: formData.get('status') as string,
      priority: formData.get('priority') as string,
      notes: formData.get('notes') as string,
      followUpDate: formData.get('followUpDate') as string || null,
      // Follow-up attempts
      followUpAttempt1Date: formData.get('followUpAttempt1Date') as string || null,
      followUpAttempt1Type: formData.get('followUpAttempt1Type') as string || null,
      followUpAttempt1Completed: formData.get('followUpAttempt1Completed') === 'on',
      followUpAttempt2Date: formData.get('followUpAttempt2Date') as string || null,
      followUpAttempt2Type: formData.get('followUpAttempt2Type') as string || null,
      followUpAttempt2Completed: formData.get('followUpAttempt2Completed') === 'on',
      followUpAttempt3Date: formData.get('followUpAttempt3Date') as string || null,
      followUpAttempt3Type: formData.get('followUpAttempt3Type') as string || null,
      followUpAttempt3Completed: formData.get('followUpAttempt3Completed') === 'on',
      followUpAttempt4Date: formData.get('followUpAttempt4Date') as string || null,
      followUpAttempt4Type: formData.get('followUpAttempt4Type') as string || null,
      followUpAttempt4Completed: formData.get('followUpAttempt4Completed') === 'on',
    };

    if (selectedLead) {
      updateMutation.mutate({ id: selectedLead.id, data: leadData });
    } else {
      createMutation.mutate(leadData);
    }
  };

  const openDialog = (lead?: Lead) => {
    setSelectedLead(lead || null);
    setIsDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800';
      case 'contacted':
        return 'bg-yellow-100 text-yellow-800';
      case 'qualified':
        return 'bg-purple-100 text-purple-800';
      case 'proposal_sent':
        return 'bg-orange-100 text-orange-800';
      case 'won':
        return 'bg-green-100 text-green-800';
      case 'lost':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="h-32 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  // Analytics calculations
  const totalLeads = leads.length;
  const leadsWithAddress = leads.filter(item => {
    const lead = item.leads || item;
    return lead.address?.trim();
  }).length;
  const geocodedLeads = leadLocations.length;
  const geocodeRate = leadsWithAddress > 0 ? (geocodedLeads / leadsWithAddress * 100).toFixed(1) : '0';

  // Lead source analytics
  const leadSourceStats = leads.reduce((acc, item) => {
    const lead = item.leads || item;
    const source = lead.leadSource || 'unknown';
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Status analytics  
  const statusStats = leads.reduce((acc, item) => {
    const lead = item.leads || item;
    acc[lead.status] = (acc[lead.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Grade analytics
  const gradeStats = leads.reduce((acc, item) => {
    const lead = item.leads || item;
    const grade = lead.grade || 'cold';
    acc[grade] = (acc[grade] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leads Management</h1>
          <p className="text-muted-foreground">Track and manage your business leads</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedLead ? "Edit Lead" : "Add New Lead"}</DialogTitle>
              <DialogDescription>
                {selectedLead ? "Update lead information" : "Enter the details for the new lead"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    required
                    defaultValue={selectedLead?.name}
                    placeholder="Lead name"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    defaultValue={selectedLead?.phone || ""}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={selectedLead?.email || ""}
                    placeholder="lead@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="leadPrice">Lead Price</Label>
                  <Input
                    id="leadPrice"
                    name="leadPrice"
                    type="number"
                    step="0.01"
                    defaultValue={selectedLead?.leadPrice || ""}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address">Street Address</Label>
                <Input
                  id="address"
                  name="address"
                  defaultValue={selectedLead?.address || ""}
                  placeholder="123 Main St"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    name="city"
                    defaultValue={selectedLead?.city || ""}
                    placeholder="City"
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    name="state"
                    defaultValue={selectedLead?.state || ""}
                    placeholder="State"
                    maxLength={2}
                  />
                </div>
                <div>
                  <Label htmlFor="zipCode">Zip Code</Label>
                  <Input
                    id="zipCode"
                    name="zipCode"
                    defaultValue={selectedLead?.zipCode || ""}
                    placeholder="12345"
                    maxLength={10}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="serviceDescription">Service Description *</Label>
                <Textarea
                  id="serviceDescription"
                  name="serviceDescription"
                  required
                  defaultValue={selectedLead?.serviceDescription}
                  placeholder="Describe the service requested"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="leadSource">Lead Source *</Label>
                  <Select name="leadSource" defaultValue={selectedLead?.leadSource || "website"}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="referral">Referral</SelectItem>
                      <SelectItem value="advertising">Advertising</SelectItem>
                      <SelectItem value="social_media">Social Media</SelectItem>
                      <SelectItem value="cold_call">Cold Call</SelectItem>
                      <SelectItem value="trade_show">Trade Show</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select name="status" defaultValue={selectedLead?.status || "new"}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="qualified">Qualified</SelectItem>
                      <SelectItem value="proposal_sent">Proposal Sent</SelectItem>
                      <SelectItem value="won">Won</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select name="priority" defaultValue={selectedLead?.priority || "medium"}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="grade">Grade</Label>
                  <Select name="grade" defaultValue={selectedLead?.grade || "cold"}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cold">🧊 Cold</SelectItem>
                      <SelectItem value="warm">🟠 Warm</SelectItem>
                      <SelectItem value="hot">🔥 Hot</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="followUpDate">Follow-up Date</Label>
                <Input
                  id="followUpDate"
                  name="followUpDate"
                  type="date"
                  defaultValue={selectedLead?.followUpDate ? new Date(selectedLead.followUpDate).toISOString().split('T')[0] : ""}
                />
              </div>

              {/* Follow-up Attempts Section */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Follow-up Attempts</Label>
                
                {/* Follow-up Attempt 1 */}
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-1 flex items-center justify-center">
                    <input 
                      type="checkbox" 
                      name="followUpAttempt1Completed"
                      defaultChecked={selectedLead?.followUpAttempt1Completed || false}
                      className="rounded"
                    />
                  </div>
                  <div className="col-span-3">
                    <Label htmlFor="followUpAttempt1Type">Method</Label>
                    <select 
                      id="followUpAttempt1Type"
                      name="followUpAttempt1Type"
                      defaultValue={selectedLead?.followUpAttempt1Type || ""}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="">Select method</option>
                      <option value="sms">SMS</option>
                      <option value="email">Email</option>
                      <option value="call">Phone Call</option>
                    </select>
                  </div>
                  <div className="col-span-8">
                    <Label htmlFor="followUpAttempt1Date">Date & Time</Label>
                    <Input
                      id="followUpAttempt1Date"
                      name="followUpAttempt1Date"
                      type="datetime-local"
                      defaultValue={selectedLead?.followUpAttempt1Date ? new Date(selectedLead.followUpAttempt1Date).toISOString().slice(0, 16) : ""}
                    />
                  </div>
                </div>

                {/* Follow-up Attempt 2 */}
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-1 flex items-center justify-center">
                    <input 
                      type="checkbox" 
                      name="followUpAttempt2Completed"
                      defaultChecked={selectedLead?.followUpAttempt2Completed || false}
                      className="rounded"
                    />
                  </div>
                  <div className="col-span-3">
                    <Label htmlFor="followUpAttempt2Type">Method</Label>
                    <select 
                      id="followUpAttempt2Type"
                      name="followUpAttempt2Type"
                      defaultValue={selectedLead?.followUpAttempt2Type || ""}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="">Select method</option>
                      <option value="sms">SMS</option>
                      <option value="email">Email</option>
                      <option value="call">Phone Call</option>
                    </select>
                  </div>
                  <div className="col-span-8">
                    <Label htmlFor="followUpAttempt2Date">Date & Time</Label>
                    <Input
                      id="followUpAttempt2Date"
                      name="followUpAttempt2Date"
                      type="datetime-local"
                      defaultValue={selectedLead?.followUpAttempt2Date ? new Date(selectedLead.followUpAttempt2Date).toISOString().slice(0, 16) : ""}
                    />
                  </div>
                </div>

                {/* Follow-up Attempt 3 */}
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-1 flex items-center justify-center">
                    <input 
                      type="checkbox" 
                      name="followUpAttempt3Completed"
                      defaultChecked={selectedLead?.followUpAttempt3Completed || false}
                      className="rounded"
                    />
                  </div>
                  <div className="col-span-3">
                    <Label htmlFor="followUpAttempt3Type">Method</Label>
                    <select 
                      id="followUpAttempt3Type"
                      name="followUpAttempt3Type"
                      defaultValue={selectedLead?.followUpAttempt3Type || ""}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="">Select method</option>
                      <option value="sms">SMS</option>
                      <option value="email">Email</option>
                      <option value="call">Phone Call</option>
                    </select>
                  </div>
                  <div className="col-span-8">
                    <Label htmlFor="followUpAttempt3Date">Date & Time</Label>
                    <Input
                      id="followUpAttempt3Date"
                      name="followUpAttempt3Date"
                      type="datetime-local"
                      defaultValue={selectedLead?.followUpAttempt3Date ? new Date(selectedLead.followUpAttempt3Date).toISOString().slice(0, 16) : ""}
                    />
                  </div>
                </div>

                {/* Follow-up Attempt 4 */}
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-1 flex items-center justify-center">
                    <input 
                      type="checkbox" 
                      name="followUpAttempt4Completed"
                      defaultChecked={selectedLead?.followUpAttempt4Completed || false}
                      className="rounded"
                    />
                  </div>
                  <div className="col-span-3">
                    <Label htmlFor="followUpAttempt4Type">Method</Label>
                    <select 
                      id="followUpAttempt4Type"
                      name="followUpAttempt4Type"
                      defaultValue={selectedLead?.followUpAttempt4Type || ""}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="">Select method</option>
                      <option value="sms">SMS</option>
                      <option value="email">Email</option>
                      <option value="call">Phone Call</option>
                    </select>
                  </div>
                  <div className="col-span-8">
                    <Label htmlFor="followUpAttempt4Date">Date & Time</Label>
                    <Input
                      id="followUpAttempt4Date"
                      name="followUpAttempt4Date"
                      type="datetime-local"
                      defaultValue={selectedLead?.followUpAttempt4Date ? new Date(selectedLead.followUpAttempt4Date).toISOString().slice(0, 16) : ""}
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  defaultValue={selectedLead?.notes || ""}
                  placeholder="Additional notes about the lead"
                  rows={3}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {selectedLead ? "Update Lead" : "Create Lead"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="leads" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Leads Management
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Leads Management Tab */}
        <TabsContent value="leads" className="space-y-6">
          {/* Search and Filter Section */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search leads by name, phone, email, service, source, or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filter Toggle */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filters
                {hasActiveFilters && (
                  <Badge variant="destructive" className="ml-1 px-1 py-0 text-xs">
                    {[searchQuery !== "", statusFilter !== "all", priorityFilter !== "all", gradeFilter !== "all"].filter(Boolean).length}
                  </Badge>
                )}
              </Button>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  onClick={clearFilters}
                  className="flex items-center gap-2 text-gray-600"
                >
                  <X className="h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="statusFilter">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="qualified">Qualified</SelectItem>
                      <SelectItem value="proposal_sent">Proposal Sent</SelectItem>
                      <SelectItem value="won">Won</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="priorityFilter">Priority</Label>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All priorities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="gradeFilter">Grade</Label>
                  <Select value={gradeFilter} onValueChange={setGradeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All grades" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Grades</SelectItem>
                      <SelectItem value="hot">🔥 Hot</SelectItem>
                      <SelectItem value="warm">🟠 Warm</SelectItem>
                      <SelectItem value="cold">🧊 Cold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <div className="text-sm text-gray-600">
                    Showing {filteredLeads.length} of {leads.length} leads
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Leads</CardTitle>
          <CardDescription>
            Manage all your business leads in one place
          </CardDescription>
        </CardHeader>
        <CardContent>
          {leads.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No leads found</p>
              <Button onClick={() => openDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add your first lead
              </Button>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="text-center py-8">
              <div className="flex flex-col items-center space-y-4">
                <Search className="h-12 w-12 text-gray-400" />
                <p className="text-muted-foreground">No leads match your search criteria</p>
                <Button variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Follow-up</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((item) => {
                  const lead = item.leads || item; // Handle nested structure
                  return (
                  <TableRow key={lead.id} className={getRowColor(lead.grade || "cold")}>
                    <TableCell className="font-medium">{lead.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col space-y-1">
                        {lead.phone && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Phone className="h-3 w-3 mr-1" />
                            {lead.phone}
                          </div>
                        )}
                        {lead.email && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Mail className="h-3 w-3 mr-1" />
                            {lead.email}
                          </div>
                        )}
                        {lead.address && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3 mr-1" />
                            {lead.address}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate" title={lead.serviceDescription}>
                        {lead.serviceDescription}
                      </div>
                    </TableCell>
                    <TableCell>
                      {lead.leadPrice && (
                        <div className="flex items-center">
                          <DollarSign className="h-3 w-3" />
                          {parseFloat(lead.leadPrice).toLocaleString()}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {(lead.leadSource || 'unknown').replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(lead.status)}>
                        {(lead.status || 'unknown').replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPriorityColor(lead.priority)}>
                        {lead.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getGradeBadge(lead.grade || "cold")} border`}>
                        {lead.grade === "hot" ? "🔥 Hot" : lead.grade === "warm" ? "🟠 Warm" : "🧊 Cold"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {lead.followUpDate && (
                        <div className="flex items-center text-sm">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(lead.followUpDate).toLocaleDateString()}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDialog({ ...lead, id: item.id || lead.id })}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteMutation.mutate(item.id || lead.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          {/* Analytics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalLeads}</div>
                <p className="text-xs text-muted-foreground">
                  Active leads in system
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Leads with Address</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{leadsWithAddress}</div>
                <p className="text-xs text-muted-foreground">
                  Can be mapped
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Geocoded Successfully</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{geocodedLeads}</div>
                <p className="text-xs text-muted-foreground">
                  {geocodeRate}% success rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Hot Leads</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{gradeStats.hot || 0}</div>
                <p className="text-xs text-muted-foreground">
                  High-priority prospects
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Analytics Charts and Heatmap */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lead Sources */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Lead Sources</CardTitle>
                <CardDescription>Distribution of lead origins</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(leadSourceStats).map(([source, count]) => (
                    <div key={source} className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">
                        {(source || 'unknown').replace('_', ' ')}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ 
                              width: `${(count / totalLeads) * 100}%` 
                            }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Lead Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Lead Status</CardTitle>
                <CardDescription>Current status distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(statusStats).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">
                        {(status || 'unknown').replace('_', ' ')}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full"
                            style={{ 
                              width: `${(count / totalLeads) * 100}%` 
                            }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Lead Grade */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Lead Grade</CardTitle>
                <CardDescription>Lead temperature distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(gradeStats).map(([grade, count]) => (
                    <div key={grade} className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">
                        {grade === "hot" ? "🔥 Hot" : grade === "warm" ? "🟠 Warm" : "🧊 Cold"}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              grade === "hot" ? "bg-red-600" : 
                              grade === "warm" ? "bg-orange-600" : "bg-blue-600"
                            }`}
                            style={{ 
                              width: `${(count / totalLeads) * 100}%` 
                            }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Heatmap */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Lead Concentration Heatmap</CardTitle>
              <CardDescription>
                Geographic distribution of leads showing high-concentration areas in warmer colors
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mapError ? (
                <div className="space-y-4">
                  <div className="text-center text-sm text-muted-foreground mb-4">
                    Google Maps not available - showing address listing
                  </div>
                  <div className="h-[500px] overflow-y-auto border rounded-lg">
                    <div className="p-4 space-y-3">
                      {leads.map((item, index) => {
                        const lead = item.leads || item;
                        if (!lead.address || !lead.address.trim()) return null;
                        
                        const fullAddress = `${lead.address}, ${lead.city}, ${lead.state} ${lead.zipCode}`.trim();
                        const addressParts = fullAddress.split(',').map(part => part.trim()).filter(Boolean);
                        
                        return (
                          <div key={lead.id || index} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border">
                            <MapPin className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-slate-900">{lead.name}</div>
                              <div className="text-sm text-slate-600 mt-1">
                                {addressParts.map((part, i) => (
                                  <span key={i}>
                                    {part}
                                    {i < addressParts.length - 1 && <span className="text-slate-400">, </span>}
                                  </span>
                                ))}
                              </div>
                              <div className="flex items-center gap-4 mt-2 text-xs">
                                <span className={`px-2 py-1 rounded-full text-white ${
                                  lead.grade === 'hot' ? 'bg-red-500' :
                                  lead.grade === 'warm' ? 'bg-orange-400' :
                                  'bg-blue-400'
                                }`}>
                                  {lead.grade || 'cold'}
                                </span>
                                <span className="text-slate-500">{lead.leadSource || 'unknown'}</span>
                                {lead.leadPrice && (
                                  <span className="text-green-600 font-medium">${parseFloat(lead.leadPrice).toLocaleString()}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      }).filter(Boolean)}
                    </div>
                  </div>
                  <div className="text-center text-sm text-muted-foreground">
                    Showing {leadsWithAddress} leads with addresses • Real-time updates active
                  </div>
                </div>
              ) : !isMapLoaded ? (
                <div className="h-[500px] flex items-center justify-center bg-muted rounded-lg">
                  <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                    <h3 className="text-lg font-medium">Loading map...</h3>
                    <p className="text-muted-foreground">Initializing Google Maps and geocoding addresses</p>
                  </div>
                </div>
              ) : leadsWithAddress === 0 ? (
                <div className="h-[500px] flex items-center justify-center bg-muted rounded-lg">
                  <div className="text-center">
                    <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No Address Data</h3>
                    <p className="text-muted-foreground">Add addresses to leads to see heatmap visualization</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Showing {geocodedLeads} of {leadsWithAddress} leads with valid addresses</span>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-blue-500 rounded"></div>
                        <span>Low concentration</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-red-500 rounded"></div>
                        <span>High concentration</span>
                      </div>
                    </div>
                  </div>
                  <div 
                    ref={mapRef}
                    className="h-[500px] w-full rounded-lg border"
                    style={{ minHeight: '500px' }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}