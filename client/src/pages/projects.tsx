import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { buildApiUrl, getAuthHeaders } from "@/lib/api-config";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Calendar, Users, CheckCircle, Clock, AlertCircle, Folder, Settings, MapPin, Route, Star, Smartphone, Eye, Image, FileText, CheckSquare, Upload, Camera, DollarSign, Download, Trash2, Archive, User as UserIcon, Search, Filter, X, XCircle, Play, Zap, Wrench } from "lucide-react";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import type { Project, Customer, User } from "@shared/schema";
import { DirectionsButton } from "@/components/google-maps";
import { DispatchRouting } from "@/components/dispatch-routing";
import { WeatherWidget } from "@/components/weather-widget";
import { MobileCamera } from "@/components/mobile-camera";
import { MediaGallery } from "@/components/media-gallery";
import JobSignatureCapture from "@/components/JobSignatureCapture";

// Utility function to get project file URL
function getProjectFileUrl(file: any): string {
  // Use the static file handler endpoint
  return `/${file.filePath}`;
}

// Onsite Timer Component
function OnsiteTimer({ project }: { project: any }) {
  const [elapsed, setElapsed] = useState<string>("");
  
  useEffect(() => {
    const calculateElapsed = () => {
      if (!project.startDate) return "";
      
      const start = new Date(project.startDate);
      const end = project.endDate ? new Date(project.endDate) : new Date();
      const diff = end.getTime() - start.getTime();
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
      } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
      } else {
        return `${seconds}s`;
      }
    };
    
    setElapsed(calculateElapsed());
    
    // Update every second only for active jobs
    if (project.startDate && !project.endDate) {
      const interval = setInterval(() => {
        setElapsed(calculateElapsed());
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [project.startDate, project.endDate]);
  
  if (!project.startDate) return null;
  
  const isActive = project.startDate && !project.endDate;
  
  return (
    <div className={`flex items-center space-x-2 text-sm px-3 py-2 rounded-md ${
      isActive 
        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' 
        : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
    }`}>
      <Clock className="h-4 w-4" />
      <span className="font-medium">
        {isActive ? 'Onsite: ' : 'Total: '}{elapsed}
      </span>
    </div>
  );
}

// Historical Jobs Component
function HistoricalJobs() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [historicalJobImages, setHistoricalJobImages] = useState<File[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  // Filter for historical jobs (completed status and marked as historical)
  const historicalJobs = projects.filter(project => project.status === 'completed');

  const createHistoricalJobMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/projects/historical", data);
    },
    onSuccess: async (project: any) => {
      // Upload images if any were selected
      if (historicalJobImages.length > 0) {
        try {
          const formData = new FormData();
          historicalJobImages.forEach((file) => {
            formData.append('images', file);
          });

          await fetch(`/api/projects/historical/${project.id}/images`, {
            method: 'POST',
            body: formData,
          });

          toast({
            title: "Historical job created",
            description: `Historical job created with ${historicalJobImages.length} image(s)`,
          });
        } catch (error) {
          toast({
            title: "Historical job created",
            description: "Job created but image upload failed",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Historical job created",
          description: "Historical job has been successfully added",
        });
      }
      
      setCreateDialogOpen(false);
      setHistoricalJobImages([]);
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create historical job",
        variant: "destructive",
      });
    },
  });

  const handleCreateHistoricalJob = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Convert FormData to object
    const data: any = {};
    formData.forEach((value, key) => {
      data[key] = value;
    });
    
    // Set status to completed for historical jobs
    data.status = 'completed';
    
    createHistoricalJobMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Historical Jobs</h2>
          <p className="text-gray-600">Add jobs that were completed in the past</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Historical Job
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Historical Job</DialogTitle>
              <DialogDescription>
                Create a record for a job that was already completed
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateHistoricalJob} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="historical-name">Job Name *</Label>
                  <Input
                    id="historical-name"
                    name="name"
                    required
                    placeholder="Job name"
                  />
                </div>
                <div>
                  <Label htmlFor="historical-customer">Customer *</Label>
                  <Select name="customerId" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id?.toString() || ""}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="historical-description">Description</Label>
                <Textarea
                  id="historical-description"
                  name="description"
                  placeholder="Describe the work that was completed"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="historical-start-date">Start Date</Label>
                  <Input
                    id="historical-start-date"
                    name="startDate"
                    type="date"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="historical-end-date">End Date</Label>
                  <Input
                    id="historical-end-date"
                    name="endDate"
                    type="date"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="historical-value">Job Value ($)</Label>
                  <Input
                    id="historical-value"
                    name="estimatedValue"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="historical-assigned">Assigned To</Label>
                  <Select name="assignedToId">
                    <SelectTrigger>
                      <SelectValue placeholder="Select team member" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user: any) => (
                        <SelectItem key={user.id} value={user.id?.toString() || ""}>
                          {user.firstName} {user.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="historical-priority">Priority</Label>
                  <Select name="priority" defaultValue="medium">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="historical-address">Address</Label>
                  <Input
                    id="historical-address"
                    name="address"
                    placeholder="Street address"
                  />
                </div>
                <div>
                  <Label htmlFor="historical-city">City</Label>
                  <Input
                    id="historical-city"
                    name="city"
                    placeholder="City"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="historical-state">State</Label>
                  <Input
                    id="historical-state"
                    name="state"
                    placeholder="State"
                  />
                </div>
                <div>
                  <Label htmlFor="historical-zip">ZIP Code</Label>
                  <Input
                    id="historical-zip"
                    name="zipCode"
                    placeholder="ZIP code"
                  />
                </div>
              </div>

              {/* Image Upload Section */}
              <div>
                <Label htmlFor="historical-job-images">Upload Job Images (Optional)</Label>
                <input
                  id="historical-job-images"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => setHistoricalJobImages(Array.from(e.target.files || []))}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 mt-2"
                />
                {historicalJobImages.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">Selected {historicalJobImages.length} image(s):</p>
                    <ul className="text-xs text-gray-500 mt-1 space-y-1">
                      {historicalJobImages.map((file, index) => (
                        <li key={index} className="flex items-center">
                          <Camera className="h-3 w-3 mr-1" />
                          {file.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createHistoricalJobMutation.isPending}>
                  {createHistoricalJobMutation.isPending ? "Creating..." : "Create Historical Job"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {historicalJobs.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Archive className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No historical jobs yet</h3>
            <p className="text-gray-600 mb-4">
              Add records of jobs that were completed in the past to maintain a complete job history
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Historical Job
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {historicalJobs.map((project) => (
            <Card key={project.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-1">
                      <Link href={`/jobs/${project.id}`} className="hover:text-primary">
                        {project.name}
                      </Link>
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">Historical</Badge>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Archive className="h-3 w-3" />
                        Completed
                      </Badge>
                    </div>
                  </div>
                  <Link href={`/jobs/${project.id}/settings`}>
                    <Button variant="ghost" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {project.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {project.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {project.startDate ? new Date(project.startDate).toLocaleDateString() : 'No date'}
                    </div>
                    {(project as any).estimatedValue && (
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-1" />
                        ${Number((project as any).estimatedValue).toLocaleString()}
                      </div>
                    )}
                  </div>

                  {(project.address || project.city || project.state) && (
                    <div className="flex items-start text-sm text-gray-500">
                      <MapPin className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2">
                        {[project.address, project.city, project.state].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-gray-500">
                      <UserIcon className="h-4 w-4 mr-1" />
                      {Array.isArray(users) ? users.find((u: any) => u.id === project.userId)?.username || 'Unknown' : 'Unknown'}
                    </div>
                    <div className="flex items-center gap-2">
                      {(project.address || project.city) && (
                        <DirectionsButton 
                          address={project.address}
                          city={project.city}
                          state={project.state}
                          zipCode={project.zipCode}
                        />
                      )}
                      <div className="flex items-center text-gray-500">
                        <Clock className="h-4 w-4 mr-1" />
                        {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'Unknown'}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

interface ProjectWithDetails extends Project {
  users: { user: User }[];
  taskCount: number;
  completedTasks: number;
  customer?: Customer;
}

interface CalendarJobWithDetails {
  id: number;
  title: string;
  description?: string;
  customerId?: number;
  assignedToId: number;
  startTime: Date;
  endTime: Date;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  status: string;
  priority: string;
  estimatedValue?: string;
  customer?: Customer;
  assignedTo?: User;
  location?: string;
}

export default function Jobs() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectWithDetails | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileCamera, setShowMobileCamera] = useState(false);
  const [showUserAssignment, setShowUserAssignment] = useState(false);
  const [location] = useLocation();
  const [quoteConversionData, setQuoteConversionData] = useState<any>(null);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [bulkAssignmentRole, setBulkAssignmentRole] = useState<string>("member");
  const [includeWaivers, setIncludeWaivers] = useState(false);
  const [selectedWaivers, setSelectedWaivers] = useState<number[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [estimatedTotalTime, setEstimatedTotalTime] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State for Smart Capture feature
  const [enableSmartCapture, setEnableSmartCapture] = useState(false);
  const [createSmartCaptureDialogOpen, setCreateSmartCaptureDialogOpen] = useState(false);
  const [editSmartCaptureDialogOpen, setEditSmartCaptureDialogOpen] = useState(false);
  const [editingSmartCaptureItem, setEditingSmartCaptureItem] = useState<any>(null);
  
  // Recurring job state variables
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<string>("");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [recurringStartTime, setRecurringStartTime] = useState("09:00");
  const [estimatedDuration, setEstimatedDuration] = useState(1);
  const [defaultTechnicians, setDefaultTechnicians] = useState<number[]>([]);
  const [seriesEndType, setSeriesEndType] = useState<'none' | 'date' | 'count'>('none');
  const [seriesEndDate, setSeriesEndDate] = useState("");
  const [maxOccurrences, setMaxOccurrences] = useState(10);

  // Recurring job handler functions
  const handleDayToggle = (day: string, checked: boolean) => {
    if (checked) {
      setSelectedDays(prev => [...prev, day]);
    } else {
      setSelectedDays(prev => prev.filter(d => d !== day));
    }
  };

  const handleTechnicianToggle = (techId: number, checked: boolean) => {
    if (checked) {
      setDefaultTechnicians(prev => [...prev, techId]);
    } else {
      setDefaultTechnicians(prev => prev.filter(id => id !== techId));
    }
  };
  
  const [smartCaptureFormData, setSmartCaptureFormData] = useState({
    partNumber: '',
    vehicleNumber: '',
    inventoryNumber: '',
    location: 'Job Site',
    masterPrice: '',
    quantity: 1,
    notes: '',
    matchedMasterItem: null as any
  });
  const [masterSearchResults, setMasterSearchResults] = useState<any[]>([]);
  const [isSearchingMaster, setIsSearchingMaster] = useState(false);
  const [calculatedBudget, setCalculatedBudget] = useState<string>("");
  
  // OCR-related state
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<any>(null);
  
  // Smart Capture pricing visibility setting
  const [showSmartCapturePricing, setShowSmartCapturePricing] = useState(true);
  
  // Search and filter states for completed jobs
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Check if user is admin or manager (must be after useAuth)
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';

  // Check if device is mobile
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Check for quote-to-job conversion data
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    
    if (action === 'create') {
      const conversionDataStr = sessionStorage.getItem('quoteToJobConversion');
      if (conversionDataStr) {
        try {
          const conversionData = JSON.parse(conversionDataStr);
          setQuoteConversionData(conversionData);
          setCreateDialogOpen(true);
          // Clear the sessionStorage after reading
          sessionStorage.removeItem('quoteToJobConversion');
        } catch (error) {
          console.error('Error parsing quote conversion data:', error);
        }
      }
    }
  }, [location]);

  const { data: jobs = [], isLoading } = useQuery<ProjectWithDetails[]>({
    queryKey: ["/api/projects"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/users/assignment"],
  });

  const { data: services = [] } = useQuery<any[]>({
    queryKey: ["/api/services"],
  });

  // Fetch project files when viewing details
  const { data: projectFiles = [] } = useQuery({
    queryKey: ["/api/projects", selectedProject?.id, "files"],
    queryFn: () => selectedProject ? apiRequest("GET", `/api/projects/${selectedProject.id}/files`).then(res => res.json()) : [],
    enabled: !!selectedProject,
  });

  // Fetch project tasks when viewing details  
  const { data: projectTasks = [] } = useQuery({
    queryKey: ["/api/projects", selectedProject?.id, "tasks"],
    queryFn: () => selectedProject ? apiRequest("GET", `/api/projects/${selectedProject.id}/tasks`).then(res => res.json()) : [],
    enabled: !!selectedProject,
  });

  // Fetch smart capture data when viewing details
  const { data: smartCaptureData = [] } = useQuery({
    queryKey: ["/api/projects", selectedProject?.id, "smart-capture"],
    queryFn: () => selectedProject ? apiRequest("GET", `/api/projects/${selectedProject.id}/smart-capture`).then(res => res.json()) : [],
    enabled: !!selectedProject,
  });

  // Fetch waiver documents from file manager
  const { data: waiverDocuments = [] } = useQuery({
    queryKey: ["/api/files", "waivers"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/files");
      const files = await response.json();
      // Filter for document files that could be waivers (PDF, DOC, DOCX, TXT)
      return files.filter((file: any) => 
        file.fileType === 'document' || 
        file.mimeType.includes('pdf') || 
        file.mimeType.includes('doc') || 
        file.mimeType.includes('text') ||
        file.originalName.toLowerCase().includes('waiver')
      );
    },
  });


  const createJobMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/projects", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setCreateDialogOpen(false);
      setQuoteConversionData(null);
      toast({
        title: "Success",
        description: "Job created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create job",
        variant: "destructive",
      });
    },
  });

  const convertJobToProjectMutation = useMutation({
    mutationFn: (jobId: number) => apiRequest("POST", `/api/calendar-jobs/${jobId}/convert-to-job`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/calendar-jobs"] });
      toast({
        title: "Success",
        description: "Calendar job converted to job successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to convert calendar job to job",
        variant: "destructive",
      });
    },
  });

  const startJobMutation = useMutation({
    mutationFn: (projectId: number) => apiRequest("POST", `/api/projects/${projectId}/start-job`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Job Started",
        description: "Job has been started and time tracking is active",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to start job",
        variant: "destructive",
      });
    },
  });

  const markCompleteMutation = useMutation({
    mutationFn: (projectId: number) => apiRequest("PUT", `/api/projects/${projectId}`, { 
      status: "completed",
      endDate: new Date()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setViewDialogOpen(false);
      toast({
        title: "Job Completed",
        description: "Job has been marked as completed successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to mark job as complete",
        variant: "destructive",
      });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (projectId: number) => apiRequest("DELETE", `/api/projects/${projectId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects/deleted"] });
      setViewDialogOpen(false);
      toast({
        title: "Job Deleted",
        description: "Job has been moved to deleted folder",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete job",
        variant: "destructive",
      });
    },
  });

  const cancelProjectMutation = useMutation({
    mutationFn: (projectId: number) => apiRequest("PUT", `/api/projects/${projectId}/cancel`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects/cancelled"] });
      setViewDialogOpen(false);
      toast({
        title: "Job Cancelled",
        description: "Job has been cancelled successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to cancel job",
        variant: "destructive",
      });
    },
  });

  // Function to search master items for automatic linking
  const searchMasterItems = async (searchValue: string, searchType: 'partNumber' | 'vehicleNumber' | 'inventoryNumber') => {
    if (!searchValue.trim()) {
      setMasterSearchResults([]);
      return;
    }

    try {
      setIsSearchingMaster(true);
      
      // Build authenticated URL with proper headers
      const url = buildApiUrl(`/api/smart-capture/search?${searchType}=${encodeURIComponent(searchValue.trim())}`);
      const headers = getAuthHeaders();
      
      const response = await fetch(url, {
        headers,
        credentials: 'include'
      });
      
      if (response.ok) {
        const results = await response.json();
        setMasterSearchResults(results);
        
        // If exactly one match found, auto-populate the price
        if (results.length === 1) {
          const masterItem = results[0];
          setSmartCaptureFormData(prev => ({
            ...prev,
            masterPrice: masterItem.masterPrice || '0.00',
            matchedMasterItem: masterItem
          }));
          
          toast({
            title: "Master Item Found",
            description: `Auto-linked to "${masterItem.name}" - $${masterItem.masterPrice}`,
          });
        }
      }
    } catch (error) {
      console.error('Failed to search master items:', error);
    } finally {
      setIsSearchingMaster(false);
    }
  };

  // OCR camera capture handler
  const handleCameraCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingOCR(true);

      // Create preview URL for the captured image
      const previewUrl = URL.createObjectURL(file);
      setCapturedImage(previewUrl);

      // Create FormData for the OCR API
      const formData = new FormData();
      formData.append('image', file);

      // Call the OCR API using authenticated request
      const response = await fetch('/api/smart-capture/ocr', {
        method: 'POST',
        body: formData,
        credentials: 'include', // Include cookies for authentication
      });

      if (!response.ok) {
        throw new Error('OCR processing failed');
      }

      const result = await response.json();
      
      if (result.success) {
        setOcrResult(result.ocrResult);
        toast({
          title: "Text extracted successfully",
          description: `Found: ${result.ocrResult.extractedText}`,
        });
      } else {
        throw new Error(result.message || 'OCR failed');
      }

    } catch (error: any) {
      console.error('OCR Error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to process image",
        variant: "destructive",
      });
    } finally {
      setIsProcessingOCR(false);
    }
  };

  // Apply OCR result to form fields
  const applyOCRResult = () => {
    if (!ocrResult) return;

    const { extractedText, detectedType } = ocrResult;

    // Auto-populate the appropriate field based on detected type
    setSmartCaptureFormData(prev => {
      const updates: any = {};

      switch (detectedType) {
        case 'partNumber':
          updates.partNumber = extractedText;
          break;
        case 'vehicleNumber':
          updates.vehicleNumber = extractedText;
          break;
        case 'inventoryNumber':
          updates.inventoryNumber = extractedText;
          break;
        default:
          // If type is unclear, populate part number as default
          updates.partNumber = extractedText;
          break;
      }

      return { ...prev, ...updates };
    });

    // Trigger master item search for the extracted text
    if (extractedText.trim()) {
      const searchType = detectedType === 'vehicleNumber' ? 'vehicleNumber' :
                        detectedType === 'inventoryNumber' ? 'inventoryNumber' : 'partNumber';
      searchMasterItems(extractedText, searchType);
    }

    toast({
      title: "Applied to form",
      description: `${extractedText} has been added to the ${detectedType?.replace(/([A-Z])/g, ' $1').toLowerCase() || 'part number'} field`,
    });
  };

  // Smart Capture mutations
  const createSmartCaptureItemMutation = useMutation({
    mutationFn: (data: any) => {
      if (!selectedProject?.id) throw new Error("No project selected");
      
      // Add master item linking information if available
      const payloadData = {
        ...data,
        masterItemId: data.matchedMasterItem?.id || null,
        masterPriceSnapshot: data.masterPrice || '0.00'
      };
      
      return apiRequest("POST", `/api/projects/${selectedProject.id}/smart-capture`, payloadData);
    },
    onSuccess: () => {
      // Invalidate smart capture data to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/projects", selectedProject?.id, "smart-capture"] });
      
      // Reset form and close dialog
      setSmartCaptureFormData({
        partNumber: '',
        vehicleNumber: '',
        inventoryNumber: '',
        location: 'Job Site',
        masterPrice: '',
        quantity: 1,
        notes: '',
        matchedMasterItem: null
      });
      setMasterSearchResults([]);
      setCreateSmartCaptureDialogOpen(false);
      
      toast({
        title: "Smart Capture Item Created",
        description: "Item has been captured successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create smart capture item",
        variant: "destructive",
      });
    },
  });

  const updateSmartCaptureItemMutation = useMutation({
    mutationFn: ({ itemId, data }: { itemId: number; data: any }) => {
      if (!selectedProject?.id) throw new Error("No project selected");
      return apiRequest("PUT", `/api/projects/${selectedProject.id}/smart-capture/${itemId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", selectedProject?.id, "smart-capture"] });
      toast({
        title: "Smart Capture Item Updated",
        description: "Item has been updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update smart capture item",
        variant: "destructive",
      });
    },
  });

  const deleteSmartCaptureItemMutation = useMutation({
    mutationFn: (itemId: number) => {
      if (!selectedProject?.id) throw new Error("No project selected");
      return apiRequest("DELETE", `/api/projects/${selectedProject.id}/smart-capture/${itemId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", selectedProject?.id, "smart-capture"] });
      toast({
        title: "Smart Capture Item Deleted",
        description: "Item has been deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete smart capture item",
        variant: "destructive",
      });
    },
  });

  
  // Auto-calculate budget when services are selected
  useEffect(() => {
    if (selectedServiceIds.length > 0 && services.length > 0) {
      const total = services
        .filter((s: any) => selectedServiceIds.includes(s.id))
        .reduce(
          (sum: number, s: any) =>
            sum + parseFloat(s.price) + parseFloat(s.materialsCost || 0),
          0
        );
      setCalculatedBudget(total.toFixed(2));
    } else {
      setCalculatedBudget("");
    }
  }, [selectedServiceIds, services]);

  // Calculate total estimated time from selected services
  useEffect(() => {
    if (selectedServiceIds.length > 0 && services.length > 0) {
      const totalTime = services
        .filter((s: any) => selectedServiceIds.includes(s.id))
        .reduce(
          (sum: number, s: any) =>
            sum + Number(s.estimatedCompletionTime || 0),
          0
        );
      setEstimatedTotalTime(totalTime);
    } else {
      setEstimatedTotalTime(0);
    }
  }, [selectedServiceIds, services]);

  const handleCreateJob = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name"),
      description: formData.get("description"),
      status: formData.get("status") || "active",
      priority: formData.get("priority") || "medium",
      customerId: formData.get("customerId") ? parseInt(formData.get("customerId") as string) : null,
      startDate: formData.get("startDate") ? new Date(formData.get("startDate") as string) : null,
      deadline: formData.get("deadline") ? new Date(formData.get("deadline") as string) : null,
      budget: formData.get("budget") ? parseFloat(formData.get("budget") as string) : (quoteConversionData?.budget ? parseFloat(quoteConversionData.budget) : null),
      leadId: quoteConversionData?.leadId || null, // Track lead if converted from lead->quote->job
      quoteId: quoteConversionData?.quoteId || null, // Track quote if converted from quote->job
      address: formData.get("address"),
      city: formData.get("city"),
      state: formData.get("state"),
      zipCode: formData.get("zipCode"),
      country: "US",
      // Image timestamp settings
      enableImageTimestamp: formData.get("enableImageTimestamp") === "true",
      timestampFormat: formData.get("timestampFormat") || "MM/dd/yyyy hh:mm a",
      includeGpsCoords: formData.get("includeGpsCoords") === "true",
      timestampPosition: formData.get("timestampPosition") || "bottom-right",
      // Waiver settings
      includeWaivers,
      selectedWaivers: includeWaivers ? selectedWaivers : [],
      // Job sharing settings
      shareWithTeam: formData.get("shareWithTeam") === "true",
      // Smart Capture settings
      enableSmartCapture,
      // Recurring job settings
      isRecurring,
      recurrencePattern: isRecurring ? recurrencePattern : null,
      selectedDays: isRecurring && recurrencePattern === 'weekly' ? selectedDays : [],
      dayOfMonth: isRecurring && recurrencePattern === 'monthly' ? dayOfMonth : null,
      recurringStartTime: isRecurring ? recurringStartTime : null,
      estimatedDuration: isRecurring ? estimatedDuration : null,
      defaultTechnicians: isRecurring ? defaultTechnicians : [],
      seriesEndType: isRecurring ? seriesEndType : null,
      seriesEndDate: isRecurring && seriesEndType === 'date' ? seriesEndDate : null,
      maxOccurrences: isRecurring && seriesEndType === 'count' ? maxOccurrences : null,
      // Services
      services: selectedServiceIds.map(id => {
        const service = services.find((s: any) => s.id === id);
        return {
          serviceId: id,
          priceSnapshot: service?.price,
          materialsCostSnapshot: service?.materialsCost || "0",
          estimatedTimeSnapshot: service?.estimatedCompletionTime || 0,
          quantity: 1,
        };
      }),
    };
  createJobMutation.mutate(data);
  };

  const handleViewProject = (project: ProjectWithDetails) => {
    setSelectedProject(project);
    setViewDialogOpen(true);
    
    // Fetch project files and tasks
    if (project.id) {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', project.id, 'files'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', project.id, 'tasks'] });
    }
  };

  const handleMarkComplete = (projectId: number) => {
    if (projectId) {
      markCompleteMutation.mutate(projectId);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !selectedProject) return;

    console.log('📁 Projects page file upload starting:', {
      fileCount: files.length,
      projectId: selectedProject.id,
      projectName: selectedProject.name
    });

    for (const file of Array.from(files)) {
      console.log('📤 Uploading file:', {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('description', `Uploaded file: ${file.name}`);

      try {
        console.log('🚀 About to make API request for file:', file.name);
        
        // CRITICAL: Direct fetch with Authorization header for custom domain
        const token = localStorage.getItem('auth_token');
        const headers: HeadersInit = {};
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
          console.log('🔐 PROJECTS PAGE: Adding Authorization header for upload');
        }
        
        console.log('🚨 PROJECTS UPLOAD DEBUG:', {
          projectId: selectedProject.id,
          domain: window.location.hostname,
          hasToken: !!token,
          fileName: file.name
        });

        const response = await fetch(`/api/projects/${selectedProject.id}/files`, {
          method: 'POST',
          body: formData,
          credentials: 'include',
          headers,
        });
        
        console.log('✅ File upload successful:', file.name);
        console.log('✅ Response details:', response.status, response.statusText);
        
        // Parse the response to get the actual result
        const result = await response.json();
        console.log('✅ Upload result:', result);
        
        toast({
          title: "File uploaded successfully",
          description: `${file.name} has been uploaded to the job.`,
        });
        
        // Refresh files list
        queryClient.invalidateQueries({ queryKey: ['/api/projects', selectedProject.id, 'files'] });
      } catch (error) {
        console.error('❌ CRITICAL: Projects page upload error for file:', file.name);
        console.error('❌ Full error object:', error);
        console.error('❌ Error message:', error instanceof Error ? error.message : String(error));
        console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        console.error('❌ FormData contents before upload:', Array.from(formData.entries()));
        
        toast({
          title: "Upload Failed",
          description: `Failed to upload ${file.name}. Please try again.`,
          variant: "destructive",
        });
      }
    }

    // Reset the input
    event.target.value = '';
  };

  const handleAssignUserToProject = async (userId: number, role: string = "member") => {
    if (!selectedProject) return;

    try {
      await apiRequest('POST', `/api/projects/${selectedProject.id}/users`, {
        userId,
        role,
      });
      
      toast({
        title: "User assigned successfully",
        description: "Team member has been added to the project.",
      });

      // Refresh project data
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', selectedProject.id] });
    } catch (error) {
      toast({
        title: "Assignment failed",
        description: "Failed to assign user to project. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleBulkAssignUsers = async (userIds: number[], role: string = "member") => {
    if (!selectedProject || userIds.length === 0) return;

    try {
      const response = await apiRequest('POST', `/api/projects/${selectedProject.id}/assign`, {
        userIds,
        role,
      });
      
      toast({
        title: "Users assigned successfully",
        description: `${(response as any).assignmentsCount || userIds.length} team members have been added to the project.`,
      });

      // Refresh project data
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', selectedProject.id] });
      setSelectedUsers([]);
      setShowUserAssignment(false);
    } catch (error) {
      toast({
        title: "Assignment failed",
        description: "Failed to assign users to project. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveUserFromProject = async (userId: number) => {
    if (!selectedProject) return;

    try {
      await apiRequest('DELETE', `/api/projects/${selectedProject.id}/users/${userId}`);
      
      toast({
        title: "User removed successfully",
        description: "Team member has been removed from the project.",
      });

      // Refresh project data
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', selectedProject.id] });
    } catch (error) {
      toast({
        title: "Removal failed",
        description: "Failed to remove user from project. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUserSelection = (userId: number, checked: boolean) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (!selectedProject) return;
    
    const availableUsers = allUsers.filter(user => 
      !selectedProject.users?.some(({ user: projectUser }) => projectUser.id === user.id)
    );
    
    if (checked) {
      setSelectedUsers(availableUsers.map(user => user.id));
    } else {
      setSelectedUsers([]);
    }
  };

  // Waiver selection handlers
  const handleWaiverSelection = (waiverId: number, checked: boolean) => {
    if (checked) {
      setSelectedWaivers(prev => [...prev, waiverId]);
    } else {
      setSelectedWaivers(prev => prev.filter(id => id !== waiverId));
    }
  };

  const handleSelectAllWaivers = (checked: boolean) => {
    if (checked) {
      setSelectedWaivers(waiverDocuments.map((waiver: any) => waiver.id));
    } else {
      setSelectedWaivers([]);
    }
  };





  const getStatusColor = (status: string): "default" | "destructive" | "outline" | "secondary" => {
    const colors: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      active: "default",
      completed: "secondary",
      "on-hold": "outline",
      cancelled: "destructive",
    };
    return colors[status] || "outline";
  };

  const getPriorityColor = (priority: string): "default" | "destructive" | "outline" | "secondary" => {
    const colors: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      low: "outline",
      medium: "default",
      high: "secondary",
      urgent: "destructive",
    };
    return colors[priority] || "outline";
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <AlertCircle className="h-4 w-4" />;
      case "high":
        return <Clock className="h-4 w-4" />;
      default:
        return <CheckCircle className="h-4 w-4" />;
    }
  };

  // Filter jobs for regular users to only show assigned jobs
  const filteredJobs = useMemo(() => {
    console.log('🔍 JOB FILTERING DEBUG:', {
      isAdminOrManager,
      currentUserId: user?.id,
      currentUserRole: user?.role,
      totalJobs: jobs.length,
      jobsWithUsers: jobs.map(j => ({
        id: j.id,
        name: j.name,
        usersCount: j.users?.length || 0,
        users: j.users?.map((u: any) => ({
          userId: u.user?.id || u.userId,
          userName: u.user?.firstName || u.user?.username
        }))
      }))
    });

    if (isAdminOrManager) {
      console.log('✅ Admin/Manager - showing all jobs');
      return jobs;
    }

    const filtered = jobs.filter(job => {
      const hasAssignment = job.users?.some((userRel: any) => {
        const assignedUserId = userRel.user?.id || userRel.userId;
        const matches = assignedUserId === user?.id;
        console.log('🔎 Checking job:', job.name, { assignedUserId, currentUserId: user?.id, matches });
        return matches;
      });
      return hasAssignment;
    });

    console.log('🎯 Filtered jobs for regular user:', {
      filteredCount: filtered.length,
      filteredJobs: filtered.map(j => j.name)
    });

    return filtered;
  }, [jobs, user?.id, isAdminOrManager, user?.role]);

  // Filter completed jobs based on search criteria
  const filterCompletedJobs = (jobs: ProjectWithDetails[]) => {
    return jobs.filter(job => {
      const matchesSearch = !searchQuery || 
        job.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (job.description && job.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesDate = !dateFilter || 
        (job.endDate && new Date(job.endDate).toISOString().split('T')[0] === dateFilter);
      
      const matchesCity = !cityFilter || 
        (job.city && job.city.toLowerCase().includes(cityFilter.toLowerCase()));
      
      const matchesState = !stateFilter || 
        (job.state && job.state.toLowerCase().includes(stateFilter.toLowerCase()));

      return matchesSearch && matchesDate && matchesCity && matchesState;
    });
  };

  const categorizeJobs = () => {
    const upcoming = filteredJobs.filter(job => 
      job.status === 'planning' || 
      (job.status === 'active' && job.startDate && new Date(job.startDate) > new Date())
    );
    
    const inProgress = filteredJobs.filter(job => 
      job.status === 'active' && 
      (!job.startDate || new Date(job.startDate) <= new Date()) &&
      job.progress < 100
    );
    
    const allCompleted = filteredJobs.filter(job => 
      job.status === 'completed' || 
      job.status === 'delivered' || 
      job.progress === 100
    );

    // Apply search filters to completed jobs
    const completed = filterCompletedJobs(allCompleted);

    return { upcoming, inProgress, completed, allCompleted };
  };

  const { upcoming, inProgress, completed, allCompleted } = categorizeJobs();

  const renderJobGrid = (jobList: ProjectWithDetails[], emptyMessage: string) => {
    if (jobList.length === 0) {
      return (
        <Card>
          <CardContent className="text-center py-12">
            <Folder className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">{emptyMessage}</h3>
            <p className="text-gray-600 mb-4">Jobs will appear here based on their status and timeline</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {jobList.map((project) => (
          <Card key={project.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg mb-1">
                    <Link href={`/jobs/${project.id}`} className="hover:text-primary">
                      {project.name}
                    </Link>
                    {project.jobNumber && (
                      <div className="text-sm text-muted-foreground font-normal mt-1">
                        Job #{project.jobNumber}
                      </div>
                    )}
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getStatusColor(project.status)}>
                      {project.status}
                    </Badge>
                    <Badge variant={getPriorityColor(project.priority)} className="flex items-center gap-1">
                      {getPriorityIcon(project.priority)}
                      {project.priority}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      cancelProjectMutation.mutate(project.id);
                    }}
                    className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                    title="Cancel Job"
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      deleteProjectMutation.mutate(project.id);
                    }}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    title="Delete Job"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Link href={`/jobs/${project.id}/settings`}>
                    <Button variant="ghost" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {project.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">{project.description}</p>
                )}
                
                {/* Onsite Timer */}
                <OnsiteTimer project={project} />
                
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4" />
                    <span>{project.users.length} member{project.users.length !== 1 ? 's' : ''}</span>
                  </div>
                  {project.budget && (
                    <div className="text-green-600 font-medium">
                      ${parseFloat(project.budget).toLocaleString()}
                    </div>
                  )}
                </div>

                {project.taskCount > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Tasks Progress</span>
                      <span>{project.completedTasks}/{project.taskCount}</span>
                    </div>
                    <Progress value={(project.completedTasks / project.taskCount) * 100} className="h-2" />
                  </div>
                )}

                {project.customer && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Badge variant="outline" className="text-xs">
                      {project.customer.name}
                    </Badge>
                  </div>
                )}

                {(project.address || project.city) && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1 text-sm text-gray-500">
                        <MapPin className="h-4 w-4" />
                        <span>
                          {project.address && `${project.address}, `}
                          {project.city} {project.state}
                        </span>
                      </div>
                      {(project.address || project.city) && (
                        <DirectionsButton 
                          address={project.address}
                          city={project.city}
                          state={project.state}
                          zipCode={project.zipCode}
                        />
                      )}
                    </div>
                    <WeatherWidget 
                      jobId={project.id} 
                      location={`${project.city}${project.state ? `, ${project.state}` : ''}`}
                      compact={true}
                    />
                  </div>
                )}

                {project.deadline && (
                  <div className="flex items-center space-x-2 text-sm">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">
                      Due: {new Date(project.deadline).toLocaleDateString()}
                    </span>
                  </div>
                )}

                <div className="flex space-x-2 pt-4">
                  <Button 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleViewProject(project)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/jobs/${project.id}/tasks`}>
                      <CheckSquare className="h-4 w-4 mr-2" />
                      Tasks
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }



  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Get subtitle text based on user role
  const getSubtitleText = () => {
    if (isAdminOrManager) {
      return "Manage your jobs, tasks, and team collaboration";
    }
    const today = new Date().toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
    return `Jobs I'm assigned (${today})`;
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Jobs</h1>
          <p className="text-gray-600 mt-1">{getSubtitleText()}</p>
          <div className="flex gap-2 mt-3">
            <Link href="/jobs/deleted">
              <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                <Trash2 className="h-4 w-4 mr-2" />
                Deleted Jobs
              </Button>
            </Link>
            <Link href="/jobs/cancelled">
              <Button variant="outline" size="sm" className="text-orange-600 hover:text-orange-700 hover:bg-orange-50">
                <XCircle className="h-4 w-4 mr-2" />
                Cancelled Jobs
              </Button>
            </Link>
          </div>
        </div>
        <div className="flex gap-2">
          {isMobile && (
            <Button 
              onClick={() => {
                if (filteredJobs?.length === 0) {
                  toast({
                    title: "No Jobs Available",
                    description: "Create a job first before taking photos",
                    variant: "destructive"
                  });
                  return;
                }
                // Show project selection first, then camera
                if (filteredJobs?.length === 1) {
                  setSelectedProject(filteredJobs[0]);
                  setShowMobileCamera(true);
                } else {
                  toast({
                    title: "Select a Job",
                    description: "Open a job first to add photos to it",
                  });
                }
              }}
              className="photo-button-green"
              size="sm"
            >
              <Smartphone className="mr-2 h-4 w-4" />
              Take Photo
            </Button>
          )}
          <Dialog open={createDialogOpen} onOpenChange={(open) => {
            setCreateDialogOpen(open);
            if (!open) {
              setQuoteConversionData(null);
            }
          }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Job
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Job</DialogTitle>
              <DialogDescription>
                Create a new job to organize tasks, files, and team collaboration.
              </DialogDescription>
            </DialogHeader>
            <form id="job-create-form" onSubmit={handleCreateJob} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Job Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Enter job name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="customerId">Customer</Label>
                  <Select 
                    name="customerId" 
                    defaultValue={quoteConversionData?.customerId?.toString() || undefined}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Service Selection */}
              <div className="space-y-2">
                <Label>Services (Optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between"
                      type="button"
                    >
                      <Wrench className="mr-2 h-4 w-4" />
                      {selectedServiceIds.length > 0
                        ? `${selectedServiceIds.length} service(s) selected`
                        : "Select services"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0">
                    <Command>
                      <CommandInput placeholder="Search services..." />
                      <CommandEmpty>No services found.</CommandEmpty>
                      <CommandList>
                        <CommandGroup>
                          {services.map((service: any) => (
                            <CommandItem
                              key={service.id}
                              onSelect={() => {
                                setSelectedServiceIds((prev) =>
                                  prev.includes(service.id)
                                    ? prev.filter((id) => id !== service.id)
                                    : [...prev, service.id]
                                );
                              }}
                            >
                              <Checkbox
                                checked={selectedServiceIds.includes(service.id)}
                                className="mr-2"
                              />
                              <div className="flex-1">
                                <div className="font-medium">{service.name}</div>
                                {user && (user.role === 'admin' || user.role === 'manager') && (
                                  <div className="text-sm text-muted-foreground">
                                    ${parseFloat(service.price).toFixed(2)}
                                    {service.materialsCost && parseFloat(service.materialsCost) > 0 && (
                                      <span className="ml-1">+ ${parseFloat(service.materialsCost).toFixed(2)} materials</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {/* Service Summary */}
                {selectedServiceIds.length > 0 && (
                  <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Selected Services:</h4>
                        {services
                          .filter((s: any) => selectedServiceIds.includes(s.id))
                          .map((service: any) => (
                            <div key={service.id} className="flex justify-between text-sm">
                              <span>{service.name}</span>
                              {user && (user.role === 'admin' || user.role === 'manager') && (
                                <span className="font-medium">
                                  ${(
                                    parseFloat(service.price) +
                                    parseFloat(service.materialsCost || 0)
                                  ).toFixed(2)}
                                </span>
                              )}
                            </div>
                          ))}
                        {user && (user.role === 'admin' || user.role === 'manager') && (
                          <div className="border-t pt-2 flex justify-between font-medium">
                            <span>Total:</span>
                            <span>
                              ${services
                                .filter((s: any) => selectedServiceIds.includes(s.id))
                                .reduce(
                                  (sum: number, s: any) =>
                                    sum + parseFloat(s.price) + parseFloat(s.materialsCost || 0),
                                  0
                                )
                                .toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div>
                <Label htmlFor="address">Job Address</Label>
                <Input
                  id="address"
                  name="address"
                  placeholder="Street address"
                  data-testid="input-address"
                  defaultValue={quoteConversionData?.customerAddress || undefined}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    name="city"
                    placeholder="City"
                    data-testid="input-city"
                    defaultValue={quoteConversionData?.customerCity || undefined}
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    name="state"
                    placeholder="State"
                    data-testid="input-state"
                    defaultValue={quoteConversionData?.customerState || undefined}
                  />
                </div>
                <div>
                  <Label htmlFor="zipCode">ZIP Code</Label>
                  <Input
                    id="zipCode"
                    name="zipCode"
                    placeholder="ZIP Code"
                    data-testid="input-zip-code"
                    defaultValue={quoteConversionData?.customerZipCode || undefined}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Job description"
                  rows={3}
                  defaultValue={quoteConversionData?.description || undefined}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select name="status" defaultValue="active">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="on-hold">On Hold</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select name="priority" defaultValue="medium">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    name="startDate"
                    type="date"
                  />
                </div>
                <div>
                  <Label htmlFor="deadline">Deadline</Label>
                  <Input
                    id="deadline"
                    name="deadline"
                    type="date"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="budget">Job Total Price</Label>
                <Input
                  id="budget"
                  name="budget"
                  type="number"
                  step="0.01"
                  min="0"
                  max="99999999.99"
                  placeholder="0.00"
                  value={calculatedBudget || undefined}
                  onChange={(e) => setCalculatedBudget(e.target.value)}
                  defaultValue={quoteConversionData?.budget || undefined}
                />
                {selectedServiceIds.length > 0 && calculatedBudget && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Auto-calculated from selected services (you can adjust manually)
                  </p>
                )}
                {estimatedTotalTime > 0 && (
                  <div className="mt-2 flex items-center space-x-2 text-sm text-blue-600 dark:text-blue-400" data-testid="text-estimated-time">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">
                      Estimated Time to Complete: {(() => {
                        const hours = Math.floor(estimatedTotalTime);
                        const minutes = Math.round((estimatedTotalTime - hours) * 60);
                        if (hours === 0) {
                          return `${minutes}min`;
                        } else if (minutes === 0) {
                          return `${hours}hr`;
                        } else {
                          return `${hours}hr ${minutes}min`;
                        }
                      })()}
                    </span>
                  </div>
                )}
              </div>

              {/* Image Timestamp Settings */}
              <div className="space-y-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                <h4 className="font-semibold text-sm">Image Timestamp Settings</h4>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Auto-add timestamp to uploaded images</Label>
                  <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="timestampEnabled"
                        name="enableImageTimestamp"
                        value="true"
                        className="w-4 h-4"
                      />
                      <Label htmlFor="timestampEnabled" className="text-sm">
                        Yes, add timestamp
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="timestampDisabled"
                        name="enableImageTimestamp"
                        value="false"
                        defaultChecked
                        className="w-4 h-4"
                      />
                      <Label htmlFor="timestampDisabled" className="text-sm">
                        No timestamp
                      </Label>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="timestampFormat" className="text-sm">Timestamp Format</Label>
                    <Select name="timestampFormat" defaultValue="MM/dd/yyyy hh:mm a">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MM/dd/yyyy hh:mm a">12/31/2024 02:30 PM</SelectItem>
                        <SelectItem value="dd/MM/yyyy HH:mm">31/12/2024 14:30</SelectItem>
                        <SelectItem value="yyyy-MM-dd HH:mm">2024-12-31 14:30</SelectItem>
                        <SelectItem value="MMM dd, yyyy h:mm a">Dec 31, 2024 2:30 PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="timestampPosition" className="text-sm">Position</Label>
                    <Select name="timestampPosition" defaultValue="bottom-right">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bottom-right">Bottom Right</SelectItem>
                        <SelectItem value="bottom-left">Bottom Left</SelectItem>
                        <SelectItem value="top-right">Top Right</SelectItem>
                        <SelectItem value="top-left">Top Left</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Include GPS coordinates (when available)</Label>
                  <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="gpsEnabled"
                        name="includeGpsCoords"
                        value="true"
                        className="w-4 h-4"
                      />
                      <Label htmlFor="gpsEnabled" className="text-sm">
                        Include GPS
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="gpsDisabled"
                        name="includeGpsCoords"
                        value="false"
                        defaultChecked
                        className="w-4 h-4"
                      />
                      <Label htmlFor="gpsDisabled" className="text-sm">
                        No GPS
                      </Label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Waiver Documents Section */}
              <div className="space-y-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                <h4 className="font-semibold text-sm">Waiver Documents</h4>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Attach waiver documents to this job</Label>
                  <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="waiverEnabled"
                        name="includeWaivers"
                        checked={includeWaivers}
                        onChange={() => setIncludeWaivers(true)}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="waiverEnabled" className="text-sm">
                        Yes, attach waivers
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="waiverDisabled"
                        name="includeWaivers"
                        checked={!includeWaivers}
                        onChange={() => setIncludeWaivers(false)}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="waiverDisabled" className="text-sm">
                        No waivers
                      </Label>
                    </div>
                  </div>
                </div>
                
                {includeWaivers && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Select Waiver Documents</Label>
                    {waiverDocuments.length === 0 ? (
                      <div className="text-sm text-gray-500 p-3 border border-dashed rounded-lg text-center">
                        No waiver documents found in file manager. 
                        <Link href="/file-manager" className="text-blue-600 hover:underline ml-1">
                          Upload waiver documents first
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 mb-2">
                          <input
                            type="checkbox"
                            id="selectAllWaivers"
                            checked={selectedWaivers.length === waiverDocuments.length}
                            onChange={(e) => handleSelectAllWaivers(e.target.checked)}
                            className="w-4 h-4"
                          />
                          <Label htmlFor="selectAllWaivers" className="text-sm font-medium">
                            Select All ({waiverDocuments.length} documents)
                          </Label>
                        </div>
                        <div className="max-h-32 overflow-y-auto space-y-2 border rounded-lg p-2">
                          {waiverDocuments.map((waiver: any) => (
                            <div key={waiver.id} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`waiver-${waiver.id}`}
                                checked={selectedWaivers.includes(waiver.id)}
                                onChange={(e) => handleWaiverSelection(waiver.id, e.target.checked)}
                                className="w-4 h-4"
                              />
                              <Label htmlFor={`waiver-${waiver.id}`} className="text-sm flex-1">
                                <span className="font-medium">{waiver.originalName}</span>
                                {waiver.description && (
                                  <span className="text-gray-500 ml-2">- {waiver.description}</span>
                                )}
                              </Label>
                              <span className="text-xs text-gray-400">
                                {waiver.fileType}
                              </span>
                            </div>
                          ))}
                        </div>
                        {selectedWaivers.length > 0 && (
                          <div className="text-sm text-green-600 mt-2">
                            {selectedWaivers.length} waiver document(s) selected
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Smart Capture Settings */}
              <div className="space-y-4 p-4 border rounded-lg bg-green-50 dark:bg-green-900/20">
                <h4 className="font-semibold text-sm text-green-800 dark:text-green-200">Smart Capture</h4>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Enable Smart Capture for this job</Label>
                  <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="smartCaptureEnabled"
                        name="enableSmartCapture"
                        checked={enableSmartCapture}
                        onChange={() => setEnableSmartCapture(true)}
                        className="w-4 h-4"
                        data-testid="radio-smart-capture-enabled"
                      />
                      <Label htmlFor="smartCaptureEnabled" className="text-sm">
                        <span className="font-medium">Yes, enable Smart Capture</span>
                        <span className="text-gray-600 block text-xs">Technicians can type, scan, or photograph items they're cleaning, repairing, or installing</span>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="smartCaptureDisabled"
                        name="enableSmartCapture"
                        checked={!enableSmartCapture}
                        onChange={() => setEnableSmartCapture(false)}
                        className="w-4 h-4"
                        data-testid="radio-smart-capture-disabled"
                      />
                      <Label htmlFor="smartCaptureDisabled" className="text-sm">
                        <span className="font-medium">No Smart Capture</span>
                        <span className="text-gray-600 block text-xs">Standard job without item tracking</span>
                      </Label>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Smart Capture allows real-time tracking of items being worked on at this job site
                  </div>
                </div>
              </div>

              {/* Job Sharing Settings */}
              <div className="space-y-3 p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <h4 className="font-semibold text-sm text-blue-800 dark:text-blue-200">Job Visibility</h4>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Who can see this job?</Label>
                  <div className="flex flex-col space-y-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="shareWithTeam"
                        name="shareWithTeam"
                        value="true"
                        defaultChecked
                        className="w-4 h-4"
                      />
                      <Label htmlFor="shareWithTeam" className="text-sm">
                        <span className="font-medium">Share with entire team</span>
                        <span className="text-gray-600 block text-xs">All team members can see this job</span>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="shareWithAssigned"
                        name="shareWithTeam"
                        value="false"
                        className="w-4 h-4"
                      />
                      <Label htmlFor="shareWithAssigned" className="text-sm">
                        <span className="font-medium">Share with assigned only</span>
                        <span className="text-gray-600 block text-xs">Only assigned team members and admins can see this job</span>
                      </Label>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Note: Admins and job creators can always see all jobs
                  </div>
                </div>
              </div>

              {/* Job Site Address Selection */}
              {/* Recurring Job Section */}
              <div className="space-y-4 p-4 border rounded-lg bg-purple-50 dark:bg-purple-900/20">
                <div className="flex items-center space-x-3">
                  <Switch
                    id="isRecurring"
                    checked={isRecurring}
                    onCheckedChange={setIsRecurring}
                    data-testid="switch-recurring-job"
                  />
                  <Label htmlFor="isRecurring" className="text-sm font-semibold">
                    Recurring Job
                  </Label>
                </div>
                <p className="text-sm text-gray-600">
                  Schedule this job to repeat automatically on selected days and times
                </p>

                {isRecurring && (
                  <div className="space-y-4 pt-4 border-t">
                    {/* Recurrence Pattern */}
                    <div>
                      <Label className="text-sm font-medium">Recurrence Pattern</Label>
                      <Select 
                        value={recurrencePattern} 
                        onValueChange={setRecurrencePattern}
                        data-testid="select-recurrence-pattern"
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select pattern" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Days of Week Selection (for weekly pattern) */}
                    {recurrencePattern === 'weekly' && (
                      <div>
                        <Label className="text-sm font-medium">Days of the Week</Label>
                        <div className="grid grid-cols-4 gap-2 mt-2">
                          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                            <div key={day} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`day-${day.toLowerCase()}`}
                                checked={selectedDays.includes(day.toLowerCase())}
                                onChange={(e) => handleDayToggle(day.toLowerCase(), e.target.checked)}
                                className="w-4 h-4"
                                data-testid={`checkbox-${day.toLowerCase()}`}
                              />
                              <Label htmlFor={`day-${day.toLowerCase()}`} className="text-sm">
                                {day.slice(0, 3)}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Day of Month (for monthly pattern) */}
                    {recurrencePattern === 'monthly' && (
                      <div>
                        <Label htmlFor="dayOfMonth" className="text-sm font-medium">Day of Month</Label>
                        <Input
                          id="dayOfMonth"
                          type="number"
                          min="1"
                          max="31"
                          value={dayOfMonth}
                          onChange={(e) => setDayOfMonth(parseInt(e.target.value) || 1)}
                          className="mt-1"
                          data-testid="input-day-of-month"
                        />
                      </div>
                    )}

                    {/* Time Settings */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="recurringStartTime" className="text-sm font-medium">Start Time</Label>
                        <Input
                          id="recurringStartTime"
                          type="time"
                          value={recurringStartTime}
                          onChange={(e) => setRecurringStartTime(e.target.value)}
                          className="mt-1"
                          data-testid="input-recurring-start-time"
                        />
                      </div>
                      <div>
                        <Label htmlFor="estimatedDuration" className="text-sm font-medium">Duration (hours)</Label>
                        <Input
                          id="estimatedDuration"
                          type="number"
                          min="0.5"
                          max="24"
                          step="0.5"
                          value={estimatedDuration}
                          onChange={(e) => setEstimatedDuration(parseFloat(e.target.value) || 1)}
                          placeholder="2"
                          className="mt-1"
                          data-testid="input-estimated-duration"
                        />
                      </div>
                    </div>

                    {/* Default Technician Assignment */}
                    <div>
                      <Label className="text-sm font-medium">Default Technicians</Label>
                      <p className="text-xs text-gray-500 mb-2">Select default technicians for recurring jobs (can be changed per occurrence)</p>
                      <div className="space-y-2 max-h-32 overflow-y-auto border rounded p-2">
                        {allUsers.map((user) => (
                          <div key={user.id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`tech-${user.id}`}
                              checked={defaultTechnicians.includes(user.id)}
                              onChange={(e) => handleTechnicianToggle(user.id, e.target.checked)}
                              className="w-4 h-4"
                              data-testid={`checkbox-tech-${user.id}`}
                            />
                            <Label htmlFor={`tech-${user.id}`} className="text-sm">
                              {user.firstName} {user.lastName} ({user.role})
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Series End Options */}
                    <div>
                      <Label className="text-sm font-medium">Series Duration</Label>
                      <div className="space-y-3 mt-2">
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="noEndDate"
                            name="seriesEnd"
                            checked={seriesEndType === 'none'}
                            onChange={() => setSeriesEndType('none')}
                            className="w-4 h-4"
                          />
                          <Label htmlFor="noEndDate" className="text-sm">No end date (continues indefinitely)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="endDate"
                            name="seriesEnd"
                            checked={seriesEndType === 'date'}
                            onChange={() => setSeriesEndType('date')}
                            className="w-4 h-4"
                          />
                          <Label htmlFor="endDate" className="text-sm">End on specific date</Label>
                          {seriesEndType === 'date' && (
                            <Input
                              type="date"
                              value={seriesEndDate}
                              onChange={(e) => setSeriesEndDate(e.target.value)}
                              className="ml-2 w-40"
                              data-testid="input-series-end-date"
                            />
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="maxOccurrences"
                            name="seriesEnd"
                            checked={seriesEndType === 'count'}
                            onChange={() => setSeriesEndType('count')}
                            className="w-4 h-4"
                          />
                          <Label htmlFor="maxOccurrences" className="text-sm">End after</Label>
                          {seriesEndType === 'count' && (
                            <>
                              <Input
                                type="number"
                                min="1"
                                value={maxOccurrences}
                                onChange={(e) => setMaxOccurrences(parseInt(e.target.value) || 1)}
                                className="ml-2 w-20"
                                data-testid="input-max-occurrences"
                              />
                              <span className="text-sm">occurrences</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createJobMutation.isPending}>
                  {createJobMutation.isPending ? "Creating..." : "Create Job"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>



      {jobs.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Folder className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs yet</h3>
            <p className="text-gray-600 mb-4">Get started by creating your first job</p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Job
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="in-progress" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="upcoming" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Upcoming ({upcoming.length})
            </TabsTrigger>
            <TabsTrigger value="in-progress" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              In Progress ({inProgress.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Completed ({completed.length})
              {(searchQuery || dateFilter || cityFilter || stateFilter) && completed.length !== allCompleted.length && (
                <Badge variant="secondary" className="text-xs ml-1">
                  filtered
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="historical" className="flex items-center gap-2">
              <Archive className="h-4 w-4" />
              Historical Jobs
            </TabsTrigger>
            <TabsTrigger value="dispatch" className="flex items-center gap-2">
              <Route className="h-4 w-4" />
              Dispatch Routing
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming">
            {renderJobGrid(upcoming, "No upcoming jobs")}
          </TabsContent>

          <TabsContent value="in-progress">
            {renderJobGrid(inProgress, "No jobs in progress")}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {/* Search and Filter Controls for Completed Jobs */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search completed jobs by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                      onClick={() => setSearchQuery("")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-sm">
                    {completed.length} of {allCompleted.length} jobs
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center gap-2"
                  >
                    <Filter className="h-4 w-4" />
                    Filters
                    {(dateFilter || cityFilter || stateFilter) && (
                      <Badge variant="destructive" className="h-5 w-5 p-0 text-xs rounded-full">
                        {[dateFilter, cityFilter, stateFilter].filter(Boolean).length}
                      </Badge>
                    )}
                  </Button>
                </div>
              </div>

              {/* Filter Inputs */}
              {showFilters && (
                <Card className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="date-filter" className="text-sm font-medium">
                        Completion Date
                      </Label>
                      <Input
                        id="date-filter"
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="city-filter" className="text-sm font-medium">
                        City
                      </Label>
                      <Input
                        id="city-filter"
                        placeholder="Filter by city..."
                        value={cityFilter}
                        onChange={(e) => setCityFilter(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="state-filter" className="text-sm font-medium">
                        State
                      </Label>
                      <Input
                        id="state-filter"
                        placeholder="Filter by state..."
                        value={stateFilter}
                        onChange={(e) => setStateFilter(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  {(dateFilter || cityFilter || stateFilter) && (
                    <div className="mt-3 pt-3 border-t flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDateFilter("");
                          setCityFilter("");
                          setStateFilter("");
                        }}
                      >
                        Clear Filters
                      </Button>
                    </div>
                  )}
                </Card>
              )}
            </div>

            {/* Completed Jobs Grid */}
            {renderJobGrid(completed, searchQuery || dateFilter || cityFilter || stateFilter 
              ? "No completed jobs match your search criteria" 
              : "No completed jobs"
            )}
          </TabsContent>

          <TabsContent value="historical">
            <HistoricalJobs />
          </TabsContent>

          <TabsContent value="dispatch">
            <DispatchRouting />
          </TabsContent>
        </Tabs>
      )}

      {/* Mobile Camera Dialog */}
      <MobileCamera
        isOpen={showMobileCamera}
        onClose={() => setShowMobileCamera(false)}
        projectId={selectedProject?.id}
        onPhotoTaken={async (file) => {
          console.log('Photo taken for project:', selectedProject?.id, file);
          
          if (!selectedProject) {
            toast({
              title: "Error",
              description: "No project selected for photo upload",
              variant: "destructive"
            });
            return;
          }

          try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('description', `Camera photo taken on ${new Date().toLocaleDateString()} by ${user?.firstName} ${user?.lastName}`);

            const response = await apiRequest('POST', `/api/projects/${selectedProject.id}/files`, formData);
            
            toast({
              title: "Photo Uploaded",
              description: "Photo saved to project files successfully",
            });
            
            // Refresh project data
            queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
            queryClient.invalidateQueries({ queryKey: ["/api/projects", selectedProject.id, "files"] });
            
          } catch (error) {
            console.error('Error uploading photo:', error);
            toast({
              title: "Upload Failed", 
              description: "Failed to save photo. Please try again.",
              variant: "destructive"
            });
          }
        }}
        title="Take Photo for Job"
      />

      {/* Project Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Job Details</DialogTitle>
            <DialogDescription>
              Complete job information, files, tasks, and team members
            </DialogDescription>
          </DialogHeader>
          {selectedProject && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Job Name</Label>
                  <p className="text-base font-medium">{selectedProject.name}</p>
                  {selectedProject.jobNumber && (
                    <p className="text-sm text-gray-600 mt-1">Job #{selectedProject.jobNumber}</p>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Status</Label>
                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                    <Badge variant={getStatusColor(selectedProject.status)}>
                      {selectedProject.status}
                    </Badge>
                    {(selectedProject as any).autoStartedAt && (
                      <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-300">
                        <Zap className="h-3 w-3 mr-1" />
                        Auto-Started
                      </Badge>
                    )}
                    {(selectedProject as any).autoCompletedAt && (
                      <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-300">
                        <Zap className="h-3 w-3 mr-1" />
                        Auto-Completed
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedProject.description && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Description</Label>
                  <p className="text-sm text-gray-700 mt-1">{selectedProject.description}</p>
                </div>
              )}

              {/* Job Location & Directions */}
              {(selectedProject.address || selectedProject.city) && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-sm font-medium text-gray-500">Job Location</Label>
                    <DirectionsButton
                      address={selectedProject.address}
                      city={selectedProject.city}
                      state={selectedProject.state}
                      zipCode={selectedProject.zipCode}
                      variant="default"
                      size="sm"
                    />
                  </div>
                  <div className="flex items-start gap-2 mb-3">
                    <MapPin className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm leading-relaxed">
                      {selectedProject.address && (
                        <div className="font-medium">{selectedProject.address}</div>
                      )}
                      <div className="text-gray-600">
                        {[selectedProject.city, selectedProject.state, selectedProject.zipCode]
                          .filter(Boolean)
                          .join(', ')
                        }
                      </div>
                    </div>
                  </div>
                  {selectedProject.city && (
                    <div className="mt-3">
                      <WeatherWidget 
                        jobId={selectedProject.id} 
                        location={`${selectedProject.city}${selectedProject.state ? `, ${selectedProject.state}` : ''}`}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Financial Summary for Admin/Manager */}
              {isAdminOrManager && (
                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign className="h-5 w-5 text-amber-600" />
                    <Label className="text-sm font-semibold text-amber-900 dark:text-amber-100">Financial Summary (Admin/Manager Only)</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedProject.budget && (
                      <div>
                        <Label className="text-xs font-medium text-amber-700 dark:text-amber-300">Job Total Price (Budget)</Label>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-lg font-bold text-green-600 dark:text-green-400">
                            ${parseFloat(selectedProject.budget).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}
                    <div>
                      <Label className="text-xs font-medium text-amber-700 dark:text-amber-300">Associated Lead Cost</Label>
                      <div className="flex items-center gap-1 mt-1">
                        {selectedProject.lead?.leadPrice ? (
                          <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                            ${parseFloat(selectedProject.lead.leadPrice).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500 dark:text-gray-400 italic">
                            No lead cost
                          </span>
                        )}
                      </div>
                      {selectedProject.lead && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          From: {selectedProject.lead.name} ({selectedProject.lead.leadSource})
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Project Details */}
              <div className="grid grid-cols-2 gap-4">
                {isAdminOrManager && selectedProject.budget && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Job Total Price</Label>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-base font-medium text-green-600">
                        ${parseFloat(selectedProject.budget).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
                <div>
                  <Label className="text-sm font-medium text-gray-500">Priority</Label>
                  <div className="mt-1">
                    <Badge variant={getPriorityColor(selectedProject.priority)}>
                      {selectedProject.priority}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Customer & Team */}
              <div className="grid grid-cols-2 gap-4">
                {selectedProject.customer && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Customer</Label>
                    <p className="text-sm">{selectedProject.customer.name}</p>
                    {selectedProject.customer.email && (
                      <p className="text-xs text-gray-500">{selectedProject.customer.email}</p>
                    )}
                  </div>
                )}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium text-gray-500">Team Members</Label>
                    {isAdminOrManager && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setShowUserAssignment(true)}
                      >
                        <Users className="h-3 w-3 mr-1" />
                        Assign
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selectedProject.users && selectedProject.users.length > 0 ? (
                      selectedProject.users.map(({ user }) => (
                        <div key={user.id} className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs">
                            {user.firstName} {user.lastName}
                            <span className="ml-1 text-xs text-gray-400">({user.role})</span>
                          </Badge>
                          {isAdminOrManager && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-4 w-4 p-0"
                              onClick={() => handleRemoveUserFromProject(user.id)}
                            >
                              ×
                            </Button>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-400">No team members assigned</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Tasks Progress */}
              {selectedProject.taskCount > 0 && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Tasks Progress</Label>
                  <div className="mt-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Completed Tasks</span>
                      <span>{selectedProject.completedTasks}/{selectedProject.taskCount}</span>
                    </div>
                    <Progress value={(selectedProject.completedTasks / selectedProject.taskCount) * 100} className="h-2" />
                  </div>
                </div>
              )}

              {/* Enhanced Project Files & Media Gallery */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-medium text-gray-500">Project Files & Media</Label>
                  <div className="flex gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.txt,.zip,.rar"
                      className="hidden"
                    />
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-3 w-3 mr-1" />
                      Upload
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setShowMobileCamera(true)}
                    >
                      <Camera className="h-3 w-3 mr-1" />
                      Photo
                    </Button>
                  </div>
                </div>
                
                {/* Smart Capture Button */}
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-semibold text-purple-900 mb-1">Smart Capture</h4>
                      <p className="text-xs text-purple-700">Capture items being cleaned, repaired, or installed at this job site</p>
                    </div>
                    <Button 
                      onClick={() => setCreateSmartCaptureDialogOpen(true)}
                      disabled={createSmartCaptureItemMutation.isPending}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                      size="sm"
                      data-testid="button-smart-capture"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Smart Capture
                    </Button>
                  </div>
                </div>
                
                {/* Smart Capture Data Display */}
                <div className="mb-4">
                  {/* Smart Capture Items */}
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                    <h5 className="text-sm font-semibold text-purple-700 mb-2">Smart Capture Items</h5>
                    {smartCaptureData.length > 0 ? (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {smartCaptureData.map((item: any) => (
                          <div key={item.id} className="bg-white border border-purple-100 rounded p-2">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                {/* Master Inventory Link Indicator */}
                                {item.masterItemId && (
                                  <div className="mb-2 flex items-center gap-1 bg-green-50 border border-green-200 rounded px-2 py-1">
                                    <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                                    <span className="text-xs font-medium text-green-700">Linked to Master Inventory</span>
                                  </div>
                                )}
                                
                                {/* Display all available item identifiers */}
                                {item.vehicleNumber && (
                                  <p className="text-sm font-medium text-purple-900">Vehicle: {item.vehicleNumber}</p>
                                )}
                                {item.partNumber && (
                                  <p className="text-sm font-medium text-purple-900">Part: {item.partNumber}</p>
                                )}
                                {item.inventoryNumber && (
                                  <p className="text-sm font-medium text-purple-900">Inventory: {item.inventoryNumber}</p>
                                )}
                                <p className="text-xs text-gray-600">Location: {item.location}</p>
                                <p className="text-xs text-gray-600">Quantity: {item.quantity}</p>
                                <p className="text-xs text-gray-500">Submitted by: {item.submittedBy || 'Unknown'}</p>
                                <p className="text-xs text-gray-400">
                                  {new Date(item.submissionTime || item.createdAt).toLocaleString()}
                                </p>
                                {item.notes && (
                                  <p className="text-xs text-gray-500 mt-1">{item.notes}</p>
                                )}
                              </div>
                              <div className="text-right">
                                {(isAdminOrManager || showSmartCapturePricing) && (
                                  <p className="text-xs font-medium text-green-600">${item.masterPrice}</p>
                                )}
                                <p className="text-xs text-gray-400">
                                  {new Date(item.createdAt).toLocaleDateString()}
                                </p>
                                <div className="flex gap-1 mt-2 justify-end">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 px-2 text-xs"
                                    onClick={() => {
                                      setEditingSmartCaptureItem(item);
                                      setEditSmartCaptureDialogOpen(true);
                                    }}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
                                    onClick={() => {
                                      if (confirm("Are you sure you want to delete this item?")) {
                                        deleteSmartCaptureItemMutation.mutate(item.id);
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-purple-600">No smart capture items yet</p>
                    )}
                  </div>
                </div>
                
                {/* Enhanced MediaGallery with Full Image Preview Functionality */}
                <div className="max-h-96 overflow-y-auto border rounded-lg">
                  {projectFiles.length > 0 ? (
                    <MediaGallery 
                      files={projectFiles.map((file: any) => ({
                        id: file.id,
                        fileName: file.fileName,
                        originalName: file.originalName,
                        filePath: getProjectFileUrl(file),
                        cloudinaryUrl: file.cloudinaryUrl || (file as any).cloudinary_url, // Support both field names
                        fileSize: file.fileSize,
                        fileType: file.mimeType?.startsWith('image/') ? 'image' : 'document',
                        mimeType: file.mimeType,
                        description: file.description,
                        createdAt: file.createdAt,
                        annotations: file.annotations ? JSON.parse(file.annotations) : [],
                        annotatedImageUrl: file.annotatedImageUrl,
                        signatureStatus: file.signatureStatus,
                        docusignEnvelopeId: file.docusignEnvelopeId,
                        signatureUrl: file.signatureUrl
                      }))} 
                      projectId={selectedProject.id}
                    />
                  ) : (
                    <div className="text-center py-12">
                      <Image className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-sm text-gray-500 mb-2">No files uploaded yet</p>
                      <p className="text-xs text-gray-400 mb-4">Upload files or take photos to get started</p>
                      <div className="flex gap-2 justify-center">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="h-3 w-3 mr-1" />
                          Upload Files
                        </Button>
                        <Button 
                          size="sm" 
                          className="photo-button-green"
                          onClick={() => setShowMobileCamera(true)}
                        >
                          <Camera className="h-3 w-3 mr-1" />
                          Take Photo
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Project Tasks */}
              <div>
                <Label className="text-sm font-medium text-gray-500">Tasks</Label>
                <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                  {projectTasks.length > 0 ? (
                    projectTasks.map((task: any) => (
                      <div key={task.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          <CheckSquare className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{task.title}</span>
                        </div>
                        <Badge variant={task.status === 'completed' ? 'default' : 'outline'} className="text-xs">
                          {task.status}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No tasks assigned to this job yet</p>
                  )}
                </div>
              </div>

              {/* Job Signature Capture */}
              <div>
                <Label className="text-sm font-medium text-gray-500 mb-3 block">Job Signatures</Label>
                <JobSignatureCapture 
                  projectId={selectedProject.id}
                  jobTitle={selectedProject.name}
                  customerName={selectedProject.customer?.name}
                />
              </div>



              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                <div>
                  <Label className="text-xs font-medium text-gray-400">Created</Label>
                  <p>{new Date(selectedProject.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-400">Updated</Label>
                  <p>{new Date(selectedProject.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
            {selectedProject?.status !== 'completed' && (
              <Button 
                onClick={() => selectedProject?.id && startJobMutation.mutate(selectedProject.id)}
                disabled={startJobMutation.isPending || selectedProject?.status === 'in-progress' || !!selectedProject?.startDate}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="button-start-job"
              >
                <Play className="h-4 w-4 mr-2" />
                {startJobMutation.isPending ? "Starting..." : (selectedProject?.status === 'in-progress' || selectedProject?.startDate) ? "Job Started" : "Start Job"}
              </Button>
            )}
            {selectedProject?.status !== 'completed' && (
              <Button 
                onClick={() => handleMarkComplete(selectedProject?.id)}
                disabled={markCompleteMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {markCompleteMutation.isPending ? "Marking Complete..." : "Mark Complete"}
              </Button>
            )}
            <Button asChild>
              <Link href={`/jobs/${selectedProject?.id}/tasks`}>
                <CheckSquare className="h-4 w-4 mr-2" />
                Manage Tasks
              </Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* User Assignment Dialog */}
      <Dialog open={showUserAssignment} onOpenChange={setShowUserAssignment}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign Team Members</DialogTitle>
            <DialogDescription>
              Add team members to {selectedProject?.name}. Select multiple users for bulk assignment.
            </DialogDescription>
          </DialogHeader>
          
          {/* Bulk Assignment Controls */}
          {selectedUsers.length > 0 && (
            <div className="flex items-center gap-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <span className="font-medium">{selectedUsers.length} users selected</span>
              <Select value={bulkAssignmentRole} onValueChange={setBulkAssignmentRole}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                size="sm" 
                onClick={() => handleBulkAssignUsers(selectedUsers, bulkAssignmentRole)}
              >
                Assign All ({selectedUsers.length})
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setSelectedUsers([])}
              >
                Clear
              </Button>
            </div>
          )}

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {/* Select All Option */}
            {allUsers.filter(user => !selectedProject?.users?.some(({ user: projectUser }) => projectUser.id === user.id)).length > 0 && (
              <div className="flex items-center p-3 border rounded-lg bg-gray-50 dark:bg-gray-800">
                <input
                  type="checkbox"
                  checked={selectedUsers.length === allUsers.filter(user => !selectedProject?.users?.some(({ user: projectUser }) => projectUser.id === user.id)).length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="mr-3"
                />
                <div className="flex-1">
                  <p className="font-medium">Select All Available Users</p>
                  <p className="text-sm text-gray-500">Assign all unassigned users to this project</p>
                </div>
              </div>
            )}

            {allUsers
              .filter(user => !selectedProject?.users?.some(({ user: projectUser }) => projectUser.id === user.id))
              .map(user => (
              <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center flex-1">
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.id)}
                    onChange={(e) => handleUserSelection(user.id, e.target.checked)}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{user.firstName} {user.lastName}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                    <p className="text-xs text-gray-400">{user.role}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleAssignUserToProject(user.id, "member")}
                  data-testid={`button-assign-user-${user.id}`}
                >
                  Assign
                </Button>
              </div>
            ))}
            {allUsers.filter(user => !selectedProject?.users?.some(({ user: projectUser }) => projectUser.id === user.id)).length === 0 && (
              <p className="text-center text-gray-500 py-4">All users are already assigned to this project</p>
            )}
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => {
              setShowUserAssignment(false);
              setSelectedUsers([]);
            }}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Smart Capture Item Dialog */}
      <Dialog open={createSmartCaptureDialogOpen} onOpenChange={setCreateSmartCaptureDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Smart Capture</DialogTitle>
            <DialogDescription>
              Add an item to this job's Smart Capture. The system will automatically search and link to your master inventory when you enter part, vehicle, or inventory numbers.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            createSmartCaptureItemMutation.mutate(smartCaptureFormData);
          }} className="space-y-4">
            
            {/* Camera OCR Section */}
            <div className="space-y-3 p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                <Label className="text-sm font-medium">Photo OCR</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Take a photo of a part number, vehicle number, or serial number to automatically extract the text.
              </p>
              
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleCameraCapture}
                  className="hidden"
                  id="camera-input"
                  data-testid="input-camera-capture"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('camera-input')?.click()}
                  disabled={isProcessingOCR}
                  className="flex items-center gap-2"
                  data-testid="button-take-photo"
                >
                  <Camera className="h-4 w-4" />
                  {isProcessingOCR ? 'Processing...' : 'Take Photo'}
                </Button>
                
                {capturedImage && (
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <img 
                        src={capturedImage} 
                        alt="Captured" 
                        className="w-12 h-12 object-cover rounded border"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCapturedImage(null);
                        setOcrResult(null);
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              
              {ocrResult && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-green-800">Text Extracted</span>
                    <span className="text-xs text-green-600">({Math.round(ocrResult.confidence * 100)}% confidence)</span>
                  </div>
                  <p className="text-sm text-green-700">
                    <strong>{ocrResult.extractedText}</strong>
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    Detected as: {ocrResult.detectedType?.replace(/([A-Z])/g, ' $1').toLowerCase()}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={applyOCRResult}
                    className="mt-2 text-green-700 border-green-300 hover:bg-green-100"
                    data-testid="button-apply-ocr"
                  >
                    Apply to Form
                  </Button>
                </div>
              )}
            </div>
            
            {/* Vehicle Number Field */}
            <div>
              <Label htmlFor="vehicleNumber" className="text-sm font-medium">Vehicle Number</Label>
              <Input
                id="vehicleNumber"
                type="text"
                placeholder="Enter vehicle number"
                value={smartCaptureFormData.vehicleNumber}
                onChange={(e) => {
                  const value = e.target.value;
                  setSmartCaptureFormData(prev => ({ ...prev, vehicleNumber: value }));
                  
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
              {isSearchingMaster && <p className="text-xs text-gray-500 mt-1">Searching master items...</p>}
            </div>

            {/* Part Number Field */}
            <div>
              <Label htmlFor="partNumber" className="text-sm font-medium">Part Number</Label>
              <Input
                id="partNumber"
                type="text"
                placeholder="Enter part number"
                value={smartCaptureFormData.partNumber}
                onChange={(e) => {
                  const value = e.target.value;
                  setSmartCaptureFormData(prev => ({ ...prev, partNumber: value }));
                  
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
            </div>

            {/* Inventory Number Field */}
            <div>
              <Label htmlFor="inventoryNumber" className="text-sm font-medium">Inventory Number</Label>
              <Input
                id="inventoryNumber"
                type="text"
                placeholder="Enter inventory number"
                value={smartCaptureFormData.inventoryNumber}
                onChange={(e) => {
                  const value = e.target.value;
                  setSmartCaptureFormData(prev => ({ ...prev, inventoryNumber: value }));
                  
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
            </div>

            {/* Master Item Match Display */}
            {smartCaptureFormData.matchedMasterItem && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-800">✓ Linked to Master Inventory</span>
                </div>
                <p className="text-sm text-green-700 mb-1">
                  <strong>{smartCaptureFormData.matchedMasterItem.name || smartCaptureFormData.matchedMasterItem.partNumber || smartCaptureFormData.matchedMasterItem.vehicleNumber || 'Master Item'}</strong>
                </p>
                <p className="text-sm text-green-600">
                  Price from master: <strong>${smartCaptureFormData.masterPrice}</strong>
                </p>
                <p className="text-xs text-green-600 mt-1">
                  This item will be automatically linked to your master inventory
                </p>
              </div>
            )}

            {/* Location Field */}
            <div>
              <Label htmlFor="location" className="text-sm font-medium">Location</Label>
              <Input
                id="location"
                type="text"
                value={smartCaptureFormData.location}
                onChange={(e) => setSmartCaptureFormData(prev => ({ ...prev, location: e.target.value }))}
                data-testid="input-location"
              />
            </div>

            {/* Quantity Field */}
            <div>
              <Label htmlFor="quantity" className="text-sm font-medium">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={smartCaptureFormData.quantity}
                onChange={(e) => setSmartCaptureFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                data-testid="input-quantity"
              />
            </div>

            {/* Notes Field */}
            <div>
              <Label htmlFor="notes" className="text-sm font-medium">Notes (Optional)</Label>
              <textarea
                id="notes"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                rows={2}
                placeholder="Add any additional notes"
                value={smartCaptureFormData.notes}
                onChange={(e) => setSmartCaptureFormData(prev => ({ ...prev, notes: e.target.value }))}
                data-testid="textarea-notes"
              />
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCreateSmartCaptureDialogOpen(false);
                  setSmartCaptureFormData({
                    partNumber: '',
                    vehicleNumber: '',
                    inventoryNumber: '',
                    location: 'Job Site',
                    masterPrice: '',
                    quantity: 1,
                    notes: '',
                    matchedMasterItem: null
                  });
                  setMasterSearchResults([]);
                }}
                data-testid="button-cancel-smart-capture"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={createSmartCaptureItemMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700"
                data-testid="button-submit-smart-capture"
              >
                {createSmartCaptureItemMutation.isPending ? "Adding..." : "Add Item"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Smart Capture Item Dialog */}
      <Dialog open={editSmartCaptureDialogOpen} onOpenChange={setEditSmartCaptureDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Smart Capture Item</DialogTitle>
            <DialogDescription>
              Update the details of this smart capture item.
            </DialogDescription>
          </DialogHeader>
          {editingSmartCaptureItem && (
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              const data = {
                partNumber: formData.get('partNumber') as string,
                location: formData.get('location') as string,
                masterPrice: formData.get('masterPrice') as string,
                quantity: parseInt(formData.get('quantity') as string),
                notes: formData.get('notes') as string
              };
              updateSmartCaptureItemMutation.mutate({ 
                itemId: editingSmartCaptureItem.id, 
                data 
              });
              setEditSmartCaptureDialogOpen(false);
              setEditingSmartCaptureItem(null);
            }} className="space-y-4">
              <div>
                <Label htmlFor="edit-part-number">Part Number *</Label>
                <Input 
                  id="edit-part-number" 
                  name="partNumber" 
                  defaultValue={editingSmartCaptureItem.partNumber}
                  required 
                />
              </div>
              
              <div>
                <Label htmlFor="edit-location">Location</Label>
                <Input 
                  id="edit-location" 
                  name="location" 
                  defaultValue={editingSmartCaptureItem.location}
                />
              </div>
              
              <div>
                <Label htmlFor="edit-quantity">Quantity</Label>
                <Input 
                  id="edit-quantity" 
                  name="quantity" 
                  type="number"
                  min="1"
                  defaultValue={editingSmartCaptureItem.quantity}
                />
              </div>
              
              <div>
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea 
                  id="edit-notes" 
                  name="notes" 
                  rows={3}
                  defaultValue={editingSmartCaptureItem.notes}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setEditSmartCaptureDialogOpen(false);
                    setEditingSmartCaptureItem(null);
                  }}
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
          )}
        </DialogContent>
      </Dialog>

      </div>
    </div>
  );
}