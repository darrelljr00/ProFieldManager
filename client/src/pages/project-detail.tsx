import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { buildApiUrl } from "@/lib/api-config";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Plus, 
  Calendar, 
  Users, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  FileText, 
  Upload, 
  Download,
  Play,
  Pause,
  Edit,
  Trash2,
  MessageSquare,
  ArrowLeft,
  Mail,
  Phone,
  Building,
  UserPlus,
  UserMinus,
  MapPin,
  Smartphone,
  FileSignature,
  Camera,
  User as UserIcon
} from "lucide-react";
import { Link } from "wouter";
import type { Project, Customer, User, Task, ProjectFile, TimeEntry, SmartCaptureItem } from "@shared/schema";
import { DirectionsButton } from "@/components/google-maps";
import { MediaGallery } from "@/components/media-gallery";
import { DocuSignSignatureDialog } from "@/components/docusign-signature-dialog";
import { MobileCamera } from "@/components/mobile-camera";
import DigitalSignature from "@/components/DigitalSignature";
import TaskGroupSelector from "@/components/TaskGroupSelector";
import { useAuth } from "@/hooks/useAuth";

interface ProjectWithDetails extends Project {
  users: { user: User; role: string }[];
  customer?: Customer;
}

export default function ProjectDetail() {
  const [match, params] = useRoute("/jobs/:id");
  
  if (!match || !params) {
    return <div>Project not found</div>;
  }
  
  const projectId = Number(params.id);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskGroupSelectorOpen, setTaskGroupSelectorOpen] = useState(false);
  const [fileDialogOpen, setFileDialogOpen] = useState(false);
  const [timeDialogOpen, setTimeDialogOpen] = useState(false);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileCamera, setShowMobileCamera] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Clear ALL cache completely on component mount to ensure fresh data
  useEffect(() => {
    if (projectId) {
      // Clear ALL possible cache variations aggressively
      queryClient.clear(); // Nuclear option - clear all cache
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'tasks'] });
      queryClient.removeQueries({ queryKey: ['/api/projects', projectId, 'tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.removeQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      // Force immediate refetch
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['/api/projects', projectId, 'tasks'] });
      }, 100);
    }
  }, [projectId, queryClient]);

  // Check if device is mobile
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  const { data: project, isLoading: projectLoading } = useQuery<ProjectWithDetails>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/projects", projectId, "tasks"],
    enabled: !!projectId,
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache to prevent stale data issues (v5 syntax)
    refetchOnMount: true,
  });



  const { data: files = [] } = useQuery<ProjectFile[]>({
    queryKey: ["/api/projects", projectId, "files"],
    enabled: !!projectId,
    select: (data) => {
      console.log('🗂️ PROJECT FILES API RESPONSE:', data);
      
      // Debug July 26 files specifically
      const july26Files = data?.filter((file: any) => 
        ['missing images.JPG', 'failed to load.JPG', '7519099369553255047.jpg'].includes(file.originalName)
      ) || [];
      
      console.log('🔍 JULY 26 FILES FROM API:', july26Files);
      july26Files.forEach((file: any) => {
        console.log('📋 File Debug:', {
          id: file.id,
          originalName: file.originalName,
          fileName: file.fileName,
          filePath: file.filePath,
          cloudinaryUrl: file.cloudinaryUrl,
          fileType: file.fileType,
          mimeType: file.mimeType,
          uploadedBy: file.uploadedBy
        });
      });
      
      return data;
    }
  });

  const { data: timeEntries = [] } = useQuery<TimeEntry[]>({
    queryKey: ["/api/projects", projectId, "time"],
    enabled: !!projectId,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: smartCaptureItems = [] } = useQuery<SmartCaptureItem[]>({
    queryKey: [`/api/projects/${projectId}/smart-capture`],
    enabled: !!projectId,
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/projects/${projectId}/tasks`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "tasks"] });
      setTaskDialogOpen(false);
      toast({
        title: "Success",
        description: "Task created successfully",
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, data }: { taskId: number; data: any }) => 
      apiRequest("PUT", `/api/tasks/${taskId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "tasks"] });
      toast({
        title: "Success",
        description: "Task updated successfully",
      });
    },
  });

  const uploadFileMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const file = formData.get('file') as File;
      console.log('📤 Starting file upload:', {
        projectId,
        fileName: file?.name,
        fileSize: file?.size,
        fileType: file?.type
      });
      
      try {
        // CRITICAL: Use apiRequest for proper custom domain routing and authentication
        console.log('🚨 CUSTOM DOMAIN UPLOAD ATTEMPT:', {
          projectId,
          domain: window.location.hostname,
          isCustomDomain: window.location.hostname === 'profieldmanager.com',
          hasToken: !!localStorage.getItem('auth_token'),
          tokenLength: localStorage.getItem('auth_token')?.length || 0,
          fileName: file?.name,
          fileSize: file?.size,
          timestamp: new Date().toISOString()
        });

        // Use apiRequest instead of direct fetch for proper routing
        const response = await apiRequest('POST', `/api/projects/${projectId}/files`, formData);
        
        console.log('✅ Upload successful via apiRequest:', response);
        return response;
      } catch (error) {
        console.error('❌ Upload error:', error);
        if (error instanceof Error) {
          throw error;
        }
        throw new Error('Unknown upload error occurred');
      }
    },
    onSuccess: (result) => {
      console.log('✅ Upload success callback triggered with result:', result);
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "files"] });
      setFileDialogOpen(false);
      toast({
        title: "Upload Successful",
        description: result.message || `${result.originalName || result.fileName || 'File'} uploaded successfully to ${result.isCloudStored ? 'cloud storage' : 'local storage'}`,
      });
    },
    onError: (error: Error) => {
      console.error('❌ CUSTOM DOMAIN: Upload error callback triggered:', error.message);
      console.error('❌ Error context:', {
        domain: window.location.hostname,
        hasToken: !!localStorage.getItem('auth_token'),
        errorType: error.name,
        errorMessage: error.message,
        isCustomDomain: window.location.hostname === 'profieldmanager.com'
      });
      
      // Enhanced error messaging for custom domain issues
      let errorDescription = error.message || "Failed to upload file. Please try again.";
      
      if (error.message.includes('Authentication')) {
        errorDescription = "Authentication error. Please refresh the page and try again.";
      } else if (error.message.includes('Cloudinary')) {
        errorDescription = "Cloud storage error. Please try again or contact support.";
      }
      
      toast({
        title: "Upload Failed",
        description: errorDescription,
        variant: "destructive",
      });
    },
  });

  const createTimeEntryMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/projects/${projectId}/time`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "time"] });
      setTimeDialogOpen(false);
      toast({
        title: "Success",
        description: "Time entry created successfully",
      });
    },
  });

  const addTeamMemberMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/projects/${projectId}/users`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      setTeamDialogOpen(false);
      toast({
        title: "Success",
        description: "Team member added successfully",
      });
    },
  });

  const createSmartCaptureItemMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/projects/${projectId}/smart-capture`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/smart-capture`] });
      toast({
        title: "Success",
        description: "Smart Capture item added successfully",
      });
    },
  });

  const removeTeamMemberMutation = useMutation({
    mutationFn: (userId: number) => apiRequest("DELETE", `/api/projects/${projectId}/users/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({
        title: "Success",
        description: "Team member removed successfully",
      });
    },
  });

  const updateContactMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", `/api/projects/${projectId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      setContactDialogOpen(false);
      toast({
        title: "Success",
        description: "Contact information updated successfully",
      });
    },
  });

  const completeJobMutation = useMutation({
    mutationFn: () => apiRequest("PUT", `/api/projects/${projectId}`, { status: 'completed' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Job Completed!",
        description: "The job has been marked as completed successfully",
      });
    },
    onError: (error: Error) => {
      console.error("Job completion error:", error);
      toast({
        title: "Failed to Complete Job", 
        description: `Error: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleCreateTask = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get("title"),
      description: formData.get("description"),
      priority: formData.get("priority") || "medium",
      status: formData.get("status") || "todo",
      assignedToId: formData.get("assignedToId") ? parseInt(formData.get("assignedToId") as string) : null,
      dueDate: formData.get("dueDate") ? new Date(formData.get("dueDate") as string) : null,
      estimatedHours: formData.get("estimatedHours") ? parseFloat(formData.get("estimatedHours") as string) : null,
    };
    createTaskMutation.mutate(data);
  };

  const handleFileUpload = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    uploadFileMutation.mutate(formData);
  };

  const handleCreateTimeEntry = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      description: formData.get("description"),
      hours: parseFloat(formData.get("hours") as string),
      date: new Date(formData.get("date") as string),
      taskId: formData.get("taskId") ? parseInt(formData.get("taskId") as string) : null,
      billable: formData.get("billable") === "on",
    };
    createTimeEntryMutation.mutate(data);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      todo: "outline",
      "in-progress": "default",
      review: "secondary",
      completed: "secondary",
    };
    return colors[status] || "outline";
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      low: "outline",
      medium: "default",
      high: "secondary",
      urgent: "destructive",
    };
    return colors[priority] || "outline";
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case "image":
        return "🖼️";
      case "video":
        return "🎥";
      case "document":
        return "📄";
      default:
        return "📎";
    }
  };

  if (projectLoading || !project) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Project not found</h3>
            <p className="text-gray-600 mb-4">The project you're looking for doesn't exist or you don't have access to it.</p>
            <Button asChild>
              <Link href="/projects">Back to Projects</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
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
          <Button variant="ghost" size="sm" asChild>
            <Link href="/projects">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </Link>
          </Button>
        </div>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{project.name}</h1>
            <div className="flex items-center space-x-4 mb-2">
              <Badge variant={getStatusColor(project.status)}>{project.status}</Badge>
              <Badge variant={getPriorityColor(project.priority)}>{project.priority}</Badge>
              {project.customer && (
                <span className="text-gray-600">Client: {project.customer.name}</span>
              )}
            </div>
            {project.description && (
              <p className="text-gray-600 max-w-2xl">{project.description}</p>
            )}
            
            {/* Project Address and Directions */}
            {(project.address || project.city) && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <MapPin className="h-4 w-4 text-gray-500 mr-2" />
                      <span className="text-sm font-medium text-gray-700">Project Location</span>
                    </div>
                    {project.address && (
                      <p className="text-sm text-gray-600 mb-1">{project.address}</p>
                    )}
                    {(project.city || project.state || project.zipCode) && (
                      <p className="text-sm text-gray-600">
                        {[project.city, project.state, project.zipCode].filter(Boolean).join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="ml-4">
                    <DirectionsButton
                      address={project.address}
                      city={project.city}
                      state={project.state}
                      zipCode={project.zipCode}
                      className="whitespace-nowrap"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="text-right">
            <div className="mb-2">
              <span className="text-sm text-gray-600">Progress</span>
              <div className="flex items-center space-x-2 mt-1">
                <Progress value={project.progress || 0} className="w-32" />
                <span className="text-sm font-medium">{project.progress || 0}%</span>
              </div>
            </div>
            {project.deadline && (
              <div className="text-sm text-gray-600 mb-3">
                <Calendar className="h-4 w-4 inline mr-1" />
                Due: {new Date(project.deadline).toLocaleDateString()}
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="flex gap-2">
              {project.status !== 'completed' && (
                <Button 
                  onClick={() => completeJobMutation.mutate()}
                  disabled={completeJobMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  size="sm"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {completeJobMutation.isPending ? "Completing..." : "Mark Job Complete"}
                </Button>
              )}
            </div>
            
            {project.status === 'completed' && (
              <Badge className="bg-green-100 text-green-800 border-green-200">
                <CheckCircle className="h-3 w-3 mr-1" />
                Job Completed
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Smart Capture Button - prominently positioned */}
      <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-6 mb-6 shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-purple-900 mb-2">Smart Capture</h3>
            <p className="text-sm text-purple-700">Capture items being cleaned, repaired, or installed at this job site</p>
          </div>
          <Button 
            onClick={() => {
              const partNumber = prompt("Enter part number for Smart Capture:");
              if (partNumber && partNumber.trim()) {
                const location = prompt("Enter location (required):", "Job Site");
                if (location && location.trim()) {
                  const priceStr = prompt("Enter price (optional):", "0.00");
                  const price = priceStr && !isNaN(Number(priceStr)) ? priceStr : "0.00";
                  
                  createSmartCaptureItemMutation.mutate({
                    partNumber: partNumber.trim(),
                    location: location.trim(),
                    masterPrice: price,
                    quantity: 1,
                    notes: ""
                  });
                }
              }
            }}
            disabled={createSmartCaptureItemMutation.isPending}
            className="bg-purple-600 hover:bg-purple-700 text-white text-lg px-6 py-3"
            size="lg"
            data-testid="button-smart-capture"
          >
            <Camera className="h-6 w-6 mr-3" />
            Start Smart Capture
          </Button>
        </div>
      </div>

      <Tabs defaultValue="tasks" className="space-y-4">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="team">Team Members</TabsTrigger>
            <TabsTrigger value="contact">Contact Info</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="smart-capture">Smart Capture</TabsTrigger>
            <TabsTrigger value="time">Time Tracking</TabsTrigger>
          </TabsList>
          
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href={`/jobs/${projectId}/tasks`}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Manage Tasks
              </Link>
            </Button>
            <Button 
              onClick={() => setSignatureDialogOpen(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <FileSignature className="h-4 w-4 mr-2" />
              Digital Signature
            </Button>
          </div>
        </div>

        <TabsContent value="tasks" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Tasks</h2>
            <div className="flex gap-2">
              <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Task
                  </Button>
                </DialogTrigger>
                <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Task</DialogTitle>
                  <DialogDescription>
                    Add a new task to this project.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateTask} className="space-y-4">
                  <div>
                    <Label htmlFor="title">Task Title *</Label>
                    <Input id="title" name="title" required />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" name="description" rows={3} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
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
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select name="status" defaultValue="todo">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todo">To Do</SelectItem>
                          <SelectItem value="in-progress">In Progress</SelectItem>
                          <SelectItem value="review">Review</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="assignedToId">Assign To</Label>
                      <Select name="assignedToId">
                        <SelectTrigger>
                          <SelectValue placeholder="Select user" />
                        </SelectTrigger>
                        <SelectContent>
                          {(project.users || []).map(({ user }) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.firstName} {user.lastName} ({user.username})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="estimatedHours">Estimated Hours</Label>
                      <Input id="estimatedHours" name="estimatedHours" type="number" step="0.5" />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input id="dueDate" name="dueDate" type="date" />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setTaskDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createTaskMutation.isPending}>
                      {createTaskMutation.isPending ? "Creating..." : "Create Task"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
              </Dialog>
              <Button 
                variant="outline"
                onClick={() => setTaskGroupSelectorOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Grouped Tasks
              </Button>
            </div>
          </div>

          <div className="grid gap-4">
            {tasksLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-500">Loading tasks...</p>
              </div>
            ) : tasks.length > 0 ? (
              tasks.map((task) => (
                <Card key={task.id}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base">{task.title}</CardTitle>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant={getStatusColor(task.status)}>{task.status}</Badge>
                          <Badge variant={getPriorityColor(task.priority)}>{task.priority}</Badge>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {task.description && (
                    <CardContent>
                      <p className="text-gray-600 text-sm">{task.description}</p>
                      {task.dueDate && (
                        <div className="flex items-center text-sm text-gray-500 mt-2">
                          <Calendar className="h-4 w-4 mr-1" />
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))
            ) : (
              <Card className="border-2 border-dashed border-gray-300">
                <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks yet</h3>
                  <p className="text-gray-500 mb-4">Get started by creating your first task for this project.</p>
                  <Button onClick={() => setTaskDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Task
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="files" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Project Files</h2>
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowMobileCamera(true)}
                className="photo-button-green"
              >
                <Smartphone className="h-4 w-4 mr-2" />
                Take Photo
              </Button>
              <Dialog open={fileDialogOpen} onOpenChange={setFileDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="photo-button-green">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload File
                  </Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload File</DialogTitle>
                  <DialogDescription>
                    Upload images, videos, documents or other files to this project.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleFileUpload} className="space-y-4">
                  <div>
                    <Label htmlFor="file">File *</Label>
                    <Input id="file" name="file" type="file" required accept="image/*,video/*,.pdf,.doc,.docx" />
                  </div>
                  
                  <div>
                    <Label htmlFor="taskId">Related Task (Optional)</Label>
                    <select name="taskId" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                      <option value="">Select a task</option>
                      {tasks.map((task) => (
                        <option key={task.id} value={task.id.toString()}>
                          {task.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" name="description" rows={3} />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setFileDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={uploadFileMutation.isPending}>
                      {uploadFileMutation.isPending ? "Uploading..." : "Upload"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            </div>
          </div>

          <MediaGallery 
            files={files.map(file => ({
              id: file.id,
              fileName: file.fileName,
              originalName: file.originalName,
              filePath: file.filePath,
              cloudinaryUrl: (file as any).cloudinaryUrl || (file as any).cloudinary_url, // Support both field names
              fileSize: file.fileSize,
              fileType: file.mimeType?.startsWith('image/') ? 'image' : (file.mimeType?.startsWith('video/') ? 'video' : 'document'),
              mimeType: file.mimeType,
              description: file.description,
              createdAt: file.createdAt,
              annotations: file.annotations ? JSON.parse(file.annotations) : [],
              annotatedImageUrl: file.annotatedImageUrl,
              signatureStatus: file.signatureStatus,
              docusignEnvelopeId: file.docusignEnvelopeId,
              signatureUrl: file.signatureUrl,
              uploadedBy: file.uploadedBy
            }))} 
            projectId={Number(projectId)} 
          />
        </TabsContent>

        <TabsContent value="smart-capture" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Smart Capture Items</h2>
            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  const partNumber = prompt("Enter part number:");
                  if (partNumber) {
                    createSmartCaptureItemMutation.mutate({
                      partNumber: partNumber,
                      location: "Job Site",
                      masterPrice: "0.00",
                      quantity: 1,
                      notes: ""
                    });
                  }
                }}
                disabled={createSmartCaptureItemMutation.isPending}
                data-testid="button-add-smart-capture-item"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </div>

          {smartCaptureItems.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No Smart Capture items for this job yet. Add items that technicians are cleaning, repairing, or installing at this job site.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {smartCaptureItems.map((item) => (
                <Card key={item.id} data-testid={`card-smart-capture-item-${item.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {item.partNumber || item.vehicleNumber || item.inventoryNumber || `Item #${item.id}`}
                      </CardTitle>
                      <Badge variant="default" className="text-xs">
                        Qty: {item.quantity}
                      </Badge>
                    </div>
                    <CardDescription>
                      Location: {item.location} | Price: ${item.masterPrice}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Camera className="h-4 w-4" />
                        <span>Smart Capture Item</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>Added {new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4" />
                        <span>Submitted by: {item.submittedBy || 'System'}</span>
                      </div>
                      {item.notes && (
                        <div className="text-sm">
                          <strong>Notes:</strong> {item.notes}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Team Members</h2>
            <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Team Member</DialogTitle>
                  <DialogDescription>
                    Assign a user to this project with a specific role.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const userId = formData.get("userId") as string;
                  const role = formData.get("role") as string;
                  if (userId && role) {
                    addTeamMemberMutation.mutate({ userId: parseInt(userId), role });
                  }
                }} className="space-y-4">
                  <div>
                    <Label htmlFor="userId">Select User *</Label>
                    <Select name="userId" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a user" />
                      </SelectTrigger>
                      <SelectContent>
                        {users
                          .filter(user => !(project.users || []).some(pu => pu.user.id === user.id))
                          .map((user) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.firstName} {user.lastName} ({user.username})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="role">Role *</Label>
                    <Select name="role" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lead">Project Lead</SelectItem>
                        <SelectItem value="developer">Developer</SelectItem>
                        <SelectItem value="designer">Designer</SelectItem>
                        <SelectItem value="qa">Quality Assurance</SelectItem>
                        <SelectItem value="collaborator">Collaborator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setTeamDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={addTeamMemberMutation.isPending}>
                      {addTeamMemberMutation.isPending ? "Adding..." : "Add Member"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(project.users || []).map(({ user, role }) => (
              <Card key={user.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <Avatar>
                        <AvatarFallback>
                          {user.firstName?.[0]}{user.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-medium">{user.firstName} {user.lastName}</h4>
                        <p className="text-sm text-gray-600">@{user.username}</p>
                        <Badge variant="outline" className="mt-1">
                          {role}
                        </Badge>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => removeTeamMemberMutation.mutate(user.id)}
                      disabled={removeTeamMemberMutation.isPending}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </div>
                  {user.email && (
                    <div className="mt-3 text-sm text-gray-600">
                      <Mail className="h-3 w-3 inline mr-1" />
                      {user.email}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {(!project.users || project.users.length === 0) && (
              <div className="col-span-full text-center py-8 text-gray-500">
                No team members assigned yet. Add someone to get started!
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="contact" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Contact Information</h2>
            <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Contact Info
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Update Contact Information</DialogTitle>
                  <DialogDescription>
                    Manage project contact details and client information.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const contactName = formData.get("contactName") as string;
                  const contactEmail = formData.get("contactEmail") as string;
                  const contactPhone = formData.get("contactPhone") as string;
                  const contactCompany = formData.get("contactCompany") as string;
                  const address = formData.get("address") as string;
                  const city = formData.get("city") as string;
                  const state = formData.get("state") as string;
                  const zipCode = formData.get("zipCode") as string;
                  
                  updateContactMutation.mutate({
                    contactName: contactName || null,
                    contactEmail: contactEmail || null,
                    contactPhone: contactPhone || null,
                    contactCompany: contactCompany || null,
                    address: address || null,
                    city: city || null,
                    state: state || null,
                    zipCode: zipCode || null,
                  });
                }} className="space-y-4">
                  <div>
                    <Label htmlFor="contactName">Contact Name</Label>
                    <Input 
                      id="contactName" 
                      name="contactName" 
                      defaultValue={project.contactName || ''} 
                      placeholder="John Doe"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="contactEmail">Contact Email</Label>
                    <Input 
                      id="contactEmail" 
                      name="contactEmail" 
                      type="email"
                      defaultValue={project.contactEmail || ''} 
                      placeholder="john@example.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="contactPhone">Contact Phone</Label>
                    <Input 
                      id="contactPhone" 
                      name="contactPhone" 
                      type="tel"
                      defaultValue={project.contactPhone || ''} 
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  <div>
                    <Label htmlFor="contactCompany">Company/Organization</Label>
                    <Input 
                      id="contactCompany" 
                      name="contactCompany" 
                      defaultValue={project.contactCompany || ''} 
                      placeholder="Acme Corporation"
                    />
                  </div>

                  <div>
                    <Label htmlFor="address">Project Address</Label>
                    <Input 
                      id="address" 
                      name="address" 
                      defaultValue={project.address || ''} 
                      placeholder="123 Main Street"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input 
                        id="city" 
                        name="city" 
                        defaultValue={project.city || ''} 
                        placeholder="City"
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State</Label>
                      <Input 
                        id="state" 
                        name="state" 
                        defaultValue={project.state || ''} 
                        placeholder="State"
                      />
                    </div>
                    <div>
                      <Label htmlFor="zipCode">ZIP Code</Label>
                      <Input 
                        id="zipCode" 
                        name="zipCode" 
                        defaultValue={project.zipCode || ''} 
                        placeholder="12345"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setContactDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={updateContactMutation.isPending}>
                      {updateContactMutation.isPending ? "Updating..." : "Update Contact"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building className="h-5 w-5 mr-2" />
                  Project Contact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {project.contactName ? (
                  <div>
                    <Label className="text-sm text-gray-600">Name</Label>
                    <p className="font-medium">{project.contactName}</p>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No contact name set</p>
                )}
                
                {project.contactEmail && (
                  <div>
                    <Label className="text-sm text-gray-600">Email</Label>
                    <p className="font-medium flex items-center">
                      <Mail className="h-4 w-4 mr-2" />
                      {project.contactEmail}
                    </p>
                  </div>
                )}
                
                {project.contactPhone && (
                  <div>
                    <Label className="text-sm text-gray-600">Phone</Label>
                    <p className="font-medium flex items-center">
                      <Phone className="h-4 w-4 mr-2" />
                      {project.contactPhone}
                    </p>
                  </div>
                )}
                
                {project.contactCompany && (
                  <div>
                    <Label className="text-sm text-gray-600">Company</Label>
                    <p className="font-medium flex items-center">
                      <Building className="h-4 w-4 mr-2" />
                      {project.contactCompany}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Project Location
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(project.address || project.city) ? (
                  <>
                    {project.address && (
                      <div>
                        <Label className="text-sm text-gray-600">Address</Label>
                        <p className="font-medium">{project.address}</p>
                      </div>
                    )}
                    
                    {(project.city || project.state || project.zipCode) && (
                      <div>
                        <Label className="text-sm text-gray-600">City, State ZIP</Label>
                        <p className="font-medium">
                          {[project.city, project.state, project.zipCode].filter(Boolean).join(", ")}
                        </p>
                      </div>
                    )}
                    
                    <div className="pt-2">
                      <DirectionsButton
                        address={project.address}
                        city={project.city}
                        state={project.state}
                        zipCode={project.zipCode}
                        className="w-full"
                      />
                    </div>
                  </>
                ) : (
                  <p className="text-gray-500 text-sm">No address information available</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Client Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {project.customer ? (
                  <>
                    <div>
                      <Label className="text-sm text-gray-600">Client Name</Label>
                      <p className="font-medium">{project.customer.name}</p>
                    </div>
                    {project.customer.email && (
                      <div>
                        <Label className="text-sm text-gray-600">Client Email</Label>
                        <p className="font-medium flex items-center">
                          <Mail className="h-4 w-4 mr-2" />
                          {project.customer.email}
                        </p>
                      </div>
                    )}
                    {project.customer.phone && (
                      <div>
                        <Label className="text-sm text-gray-600">Client Phone</Label>
                        <p className="font-medium flex items-center">
                          <Phone className="h-4 w-4 mr-2" />
                          {project.customer.phone}
                        </p>
                      </div>
                    )}
                    {project.customer.address && (
                      <div>
                        <Label className="text-sm text-gray-600">Address</Label>
                        <p className="font-medium">{project.customer.address}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-gray-500 text-sm">No client assigned to this project</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="time" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Time Tracking</h2>
            <Dialog open={timeDialogOpen} onOpenChange={setTimeDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Log Time
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Log Time Entry</DialogTitle>
                  <DialogDescription>
                    Record time spent on this project or a specific task.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateTimeEntry} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="hours">Hours *</Label>
                      <Input id="hours" name="hours" type="number" step="0.25" required />
                    </div>
                    <div>
                      <Label htmlFor="date">Date *</Label>
                      <Input id="date" name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="taskId">Task (Optional)</Label>
                    <Select name="taskId">
                      <SelectTrigger>
                        <SelectValue placeholder="Select task" />
                      </SelectTrigger>
                      <SelectContent>
                        {tasks.map((task) => (
                          <SelectItem key={task.id} value={task.id.toString()}>
                            {task.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" name="description" rows={3} placeholder="What did you work on?" />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="billable" name="billable" className="rounded" defaultChecked />
                    <Label htmlFor="billable">Billable</Label>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setTimeDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createTimeEntryMutation.isPending}>
                      {createTimeEntryMutation.isPending ? "Logging..." : "Log Time"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Time Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {timeEntries.map((entry) => (
                  <div key={entry.id} className="flex justify-between items-center py-2 border-b last:border-b-0">
                    <div>
                      <div className="font-medium">{entry.hours} hours</div>
                      <div className="text-sm text-gray-600">
                        {new Date(entry.date).toLocaleDateString()}
                        {entry.description && ` - ${entry.description}`}
                      </div>
                    </div>
                    <div className="text-right">
                      {entry.billable && (
                        <Badge variant="outline" className="text-xs">Billable</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Team Members</h2>
            <Button>
              <Users className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          </div>

          <div className="grid gap-4">
            {(project.users || []).map(({ user, role }) => (
              <Card key={user.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarFallback>
                          {user.firstName?.[0]}{user.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-medium">{user.firstName} {user.lastName}</h4>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                    </div>
                    <Badge variant="outline">{role}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Mobile Camera Dialog */}
      <MobileCamera
        isOpen={showMobileCamera}
        onClose={() => setShowMobileCamera(false)}
        onPhotoTaken={(file) => {
          console.log('📸 Photo taken for project:', projectId, file);
          console.log('📋 File details:', {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified
          });
          
          // Create FormData to upload the photo
          const formData = new FormData();
          formData.append('file', file);
          formData.append('description', 'Photo taken with mobile camera');
          
          console.log('📤 Uploading photo immediately (GPS optional)...');
          
          // First, try to upload immediately without waiting for GPS
          uploadFileMutation.mutate(formData);
          
          // Optionally try to get GPS in the background for future uploads
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                console.log('📍 GPS coordinates obtained for future use:', position.coords.latitude, position.coords.longitude);
              },
              (error) => {
                console.warn('📍 GPS not available:', error);
              },
              { enableHighAccuracy: true, timeout: 2000, maximumAge: 60000 }
            );
          }
        }}
        title="Take Photo for Project"
      />
      
      {/* Digital Signature Dialog */}
      <DigitalSignature
        projectId={projectId}
        open={signatureDialogOpen}
        onOpenChange={setSignatureDialogOpen}
      />
      
      {/* Task Group Selector Dialog */}
      <TaskGroupSelector
        open={taskGroupSelectorOpen}
        onOpenChange={setTaskGroupSelectorOpen}
        projectId={projectId}
        onTasksAdded={() => {
          queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'tasks'] });
        }}
      />
    </div>
  );
}