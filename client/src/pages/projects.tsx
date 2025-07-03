import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Calendar, Users, CheckCircle, Clock, AlertCircle, Folder, Settings, MapPin, Route, Star, Smartphone, Eye, Image, FileText, CheckSquare, Upload, Camera, DollarSign, Download, Trash2, Archive, User as UserIcon } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import type { Project, Customer, User } from "@shared/schema";
import { DirectionsButton } from "@/components/google-maps";
import { DispatchRouting } from "@/components/dispatch-routing";
import { WeatherWidget } from "@/components/weather-widget";
import { MobileCamera } from "@/components/mobile-camera";
import { MediaGallery } from "@/components/media-gallery";

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

  const { data: users = [] } = useQuery({
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
                      {users.map((user) => (
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
                    <div className="flex items-center text-gray-500">
                      <Clock className="h-4 w-4 mr-1" />
                      {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'Unknown'}
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check if device is mobile
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  const { data: jobs = [], isLoading } = useQuery<ProjectWithDetails[]>({
    queryKey: ["/api/projects"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
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



  const createJobMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/projects", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setCreateDialogOpen(false);
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
    mutationFn: (jobId: number) => apiRequest(`/api/calendar-jobs/${jobId}/convert-to-job`, "POST", {}),
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
      budget: formData.get("budget") ? parseFloat(formData.get("budget") as string) : null,
      address: formData.get("address"),
      city: formData.get("city"),
      state: formData.get("state"),
      zipCode: formData.get("zipCode"),
      country: "US",
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !selectedProject) return;

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('description', `Uploaded file: ${file.name}`);

      try {
        await apiRequest('POST', `/api/projects/${selectedProject.id}/files`, formData);
        toast({
          title: "File uploaded successfully",
          description: `${file.name} has been uploaded to the job.`,
        });
        
        // Refresh files list
        queryClient.invalidateQueries({ queryKey: ['/api/projects', selectedProject.id, 'files'] });
      } catch (error) {
        toast({
          title: "Upload failed",
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
      await apiRequest('POST', `/api/projects/${selectedProject.id}/assign`, {
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
      setShowUserAssignment(false);
    } catch (error) {
      toast({
        title: "Assignment failed",
        description: "Failed to assign user to project. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveUserFromProject = async (userId: number) => {
    if (!selectedProject) return;

    try {
      await apiRequest('DELETE', `/api/projects/${selectedProject.id}/assign/${userId}`);
      
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

  const categorizeJobs = () => {
    const upcoming = jobs.filter(job => 
      job.status === 'planning' || 
      (job.status === 'active' && job.startDate && new Date(job.startDate) > new Date())
    );
    
    const inProgress = jobs.filter(job => 
      job.status === 'active' && 
      (!job.startDate || new Date(job.startDate) <= new Date()) &&
      job.progress < 100
    );
    
    const completed = jobs.filter(job => 
      job.status === 'completed' || 
      job.status === 'delivered' || 
      job.progress === 100
    );

    return { upcoming, inProgress, completed };
  };

  const { upcoming, inProgress, completed } = categorizeJobs();

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
                  <p className="text-sm text-gray-600 line-clamp-2">{project.description}</p>
                )}
                
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
                      {project.address && (
                        <DirectionsButton address={`${project.address}, ${project.city}, ${project.state} ${project.zipCode}`} />
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

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Jobs</h1>
          <p className="text-gray-600 mt-1">Manage your jobs, tasks, and team collaboration</p>
        </div>
        <div className="flex gap-2">
          {isMobile && (
            <Button 
              onClick={() => setShowMobileCamera(true)}
              className="bg-green-600 hover:bg-green-700"
              size="sm"
            >
              <Smartphone className="mr-2 h-4 w-4" />
              Take Photo
            </Button>
          )}
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Job
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Job</DialogTitle>
              <DialogDescription>
                Create a new job to organize tasks, files, and team collaboration.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateJob} className="space-y-4">
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
                  <Select name="customerId">
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

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Job description"
                  rows={3}
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
                <Label htmlFor="budget">Budget</Label>
                <Input
                  id="budget"
                  name="budget"
                  type="number"
                  step="0.01"
                  min="0"
                  max="99999999.99"
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="address">Job Address</Label>
                <Input
                  id="address"
                  name="address"
                  placeholder="Street address"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    name="city"
                    placeholder="City"
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    name="state"
                    placeholder="State"
                  />
                </div>
                <div>
                  <Label htmlFor="zipCode">ZIP Code</Label>
                  <Input
                    id="zipCode"
                    name="zipCode"
                    placeholder="ZIP Code"
                  />
                </div>
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

          <TabsContent value="completed">
            {renderJobGrid(completed, "No completed jobs")}
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
        onPhotoTaken={(file) => {
          console.log('Photo taken for job:', file);
          toast({
            title: "Photo Captured",
            description: "Photo saved for job documentation",
          });
          queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
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
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Status</Label>
                  <div className="mt-1">
                    <Badge variant={getStatusColor(selectedProject.status)}>
                      {selectedProject.status}
                    </Badge>
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

              {/* Location & Weather */}
              {(selectedProject.address || selectedProject.city) && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Location</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">
                      {selectedProject.address}
                      {selectedProject.city && `, ${selectedProject.city}`}
                      {selectedProject.state && `, ${selectedProject.state}`}
                      {selectedProject.zipCode && ` ${selectedProject.zipCode}`}
                    </span>
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

              {/* Project Details */}
              <div className="grid grid-cols-2 gap-4">
                {selectedProject.budget && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Budget</Label>
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
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setShowUserAssignment(true)}
                    >
                      <Users className="h-3 w-3 mr-1" />
                      Assign
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selectedProject.users && selectedProject.users.length > 0 ? (
                      selectedProject.users.map(({ user }) => (
                        <div key={user.id} className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs">
                            {user.firstName} {user.lastName}
                            <span className="ml-1 text-xs text-gray-400">({user.role})</span>
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-4 w-4 p-0"
                            onClick={() => handleRemoveUserFromProject(user.id)}
                          >
                            ×
                          </Button>
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

              {/* File Gallery with Full Annotation Support */}
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
                  </div>
                </div>
                
                {/* Use MediaGallery Component for Full Functionality */}
                <div className="max-h-96 overflow-y-auto">
                  <MediaGallery 
                    files={projectFiles.map((file: any) => ({
                      id: file.id,
                      fileName: file.fileName,
                      originalName: file.originalName,
                      filePath: file.filePath,
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

              {/* Project Files & Images */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium text-gray-500">Files & Images</Label>
                  <div className="flex gap-1">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => document.getElementById('file-upload')?.click()}
                    >
                      <Upload className="h-3 w-3 mr-1" />
                      Upload
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setShowPhotoCapture(true)}
                    >
                      <Camera className="h-3 w-3 mr-1" />
                      Photo
                    </Button>
                  </div>
                </div>
                <input
                  id="file-upload"
                  type="file"
                  hidden
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.txt"
                  onChange={handleFileUpload}
                />
                <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                  {projectFiles.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {projectFiles.map((file: any) => (
                        <div key={file.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer">
                          {file.mimeType?.startsWith('image/') ? (
                            <div className="relative">
                              <img 
                                src={`/api/project-files/${file.id}/download`}
                                alt={file.originalName}
                                className="w-8 h-8 object-cover rounded"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  target.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                              <Image className="h-4 w-4 text-blue-500 hidden" />
                            </div>
                          ) : (
                            <FileText className="h-4 w-4 text-gray-400" />
                          )}
                          <div className="flex-1 min-w-0">
                            <span className="text-sm truncate block">{file.originalName}</span>
                            <span className="text-xs text-gray-400">{(file.fileSize / 1024).toFixed(1)}KB</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                      <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No files uploaded yet</p>
                      <p className="text-xs text-gray-400">Click Upload or Photo to add files</p>
                    </div>
                  )}
                </div>
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Team Members</DialogTitle>
            <DialogDescription>
              Add team members to {selectedProject?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {allUsers
              .filter(user => !selectedProject?.users?.some(({ user: projectUser }) => projectUser.id === user.id))
              .map(user => (
              <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{user.firstName} {user.lastName}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                  <p className="text-xs text-gray-400">{user.role}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAssignUserToProject(user.id, "member")}
                  >
                    Member
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleAssignUserToProject(user.id, "manager")}
                  >
                    Manager
                  </Button>
                </div>
              </div>
            ))}
            {allUsers.filter(user => !selectedProject?.users?.some(({ user: projectUser }) => projectUser.id === user.id)).length === 0 && (
              <p className="text-center text-gray-500 py-4">All users are already assigned to this project</p>
            )}
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setShowUserAssignment(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>


      </div>
    </div>
  );
}