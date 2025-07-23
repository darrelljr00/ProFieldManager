import { useState, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Plus, 
  CheckSquare, 
  Square, 
  FileText, 
  Camera, 
  Trash2, 
  Edit,
  AlertCircle,
  Clock,
  User,
  Calendar
} from "lucide-react";

interface Task {
  id: number;
  projectId: number;
  title: string;
  description?: string;
  type: 'checkbox' | 'text' | 'number' | 'image';
  isRequired: boolean;
  isCompleted: boolean;
  completedAt?: string;
  completedBy?: number;
  completedByUser?: {
    username: string;
    firstName?: string;
    lastName?: string;
  };
  textValue?: string;
  numberValue?: number;
  imagePath?: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: number;
  assignedToUser?: {
    username: string;
    firstName?: string;
    lastName?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface Project {
  id: number;
  name: string;
  status: string;
  description?: string;
}

export default function JobTasks() {
  const [match, params] = useRoute("/jobs/:id/tasks");
  const projectId = match ? params?.id : null;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedImageTaskId, setSelectedImageTaskId] = useState<number | null>(null);

  // Fetch project details
  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['/api/projects', projectId],
    enabled: !!projectId,
  });

  // Fetch tasks for this project
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['/api/projects', projectId, 'tasks'],
    enabled: !!projectId,
    staleTime: 0, // Always fetch fresh data
    cacheTime: 0, // Don't cache to prevent stale data issues
  });

  // Fetch users for assignment
  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: (taskData: any) => apiRequest('POST', `/api/projects/${projectId}/tasks`, taskData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'tasks'] });
      setCreateDialogOpen(false);
      toast({
        title: "Task Created",
        description: "Task has been added to the job successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      });
    },
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, updates }: { taskId: number; updates: any }) => 
      apiRequest('PUT', `/api/projects/${projectId}/tasks/${taskId}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'tasks'] });
      setEditingTask(null);
      toast({
        title: "Task Updated",
        description: "Task has been updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: number) => apiRequest('DELETE', `/api/projects/${projectId}/tasks/${taskId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'tasks'] });
      // Also clear the general project cache to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({
        title: "Task Deleted",
        description: "Task has been removed from the job",
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Task not found or already deleted";
      toast({
        title: "Cannot Delete Task",
        description: errorMessage,
        variant: "destructive",
      });
      // Refresh task list to show current state
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'tasks'] });
    },
  });

  // Toggle task completion
  const handleToggleTask = (task: Task) => {
    if (task.type === 'checkbox') {
      updateTaskMutation.mutate({
        taskId: task.id,
        updates: {
          isCompleted: !task.isCompleted,
          completedAt: !task.isCompleted ? new Date().toISOString() : null,
        }
      });
    }
  };

  // Handle text/number input updates
  const handleValueUpdate = (task: Task, value: string | number) => {
    const updates: any = {};
    if (task.type === 'text') {
      updates.textValue = value;
    } else if (task.type === 'number') {
      updates.numberValue = parseFloat(value as string);
    }
    
    // Mark as completed if value is provided and task is required
    if (task.isRequired && value) {
      updates.isCompleted = true;
      updates.completedAt = new Date().toISOString();
    }

    updateTaskMutation.mutate({ taskId: task.id, updates });
  };

  // Handle image upload
  const handleImageUpload = async (taskId: number, file: File) => {
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await apiRequest('POST', `/api/tasks/${taskId}/image`, formData);
      
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'tasks'] });
      toast({
        title: "Image Uploaded",
        description: "Task image has been uploaded successfully",
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Create task form handler
  const handleCreateTask = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const taskData = {
      title: formData.get("title"),
      description: formData.get("description"),
      type: formData.get("type"),
      isRequired: formData.get("isRequired") === "true",
      priority: formData.get("priority") || "medium",
      assignedTo: formData.get("assignedTo") ? parseInt(formData.get("assignedTo") as string) : null,
      dueDate: formData.get("dueDate") ? new Date(formData.get("dueDate") as string) : null,
    };

    createTaskMutation.mutate(taskData);
  };

  // Calculate completion stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task: Task) => task.isCompleted).length;
  const requiredTasks = tasks.filter((task: Task) => task.isRequired);
  const completedRequiredTasks = requiredTasks.filter((task: Task) => task.isCompleted);
  const canCompleteJob = requiredTasks.length === 0 || completedRequiredTasks.length === requiredTasks.length;

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: "bg-green-100 text-green-800",
      medium: "bg-yellow-100 text-yellow-800", 
      high: "bg-orange-100 text-orange-800",
      urgent: "bg-red-100 text-red-800"
    };
    return colors[priority as keyof typeof colors] || colors.medium;
  };

  if (projectLoading || tasksLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/jobs/${projectId}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Job
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Job Tasks</h1>
          <p className="text-gray-600">{project?.name}</p>
        </div>
      </div>

      {/* Progress Overview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Task Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{completedTasks}/{totalTasks}</div>
              <div className="text-sm text-gray-600">Total Tasks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{completedRequiredTasks.length}/{requiredTasks.length}</div>
              <div className="text-sm text-gray-600">Required Tasks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{Math.round((completedTasks / totalTasks) * 100) || 0}%</div>
              <div className="text-sm text-gray-600">Completion Rate</div>
            </div>
            <div className="text-center">
              <Badge variant={canCompleteJob ? "default" : "destructive"} className="text-sm">
                {canCompleteJob ? "Job Ready" : "Incomplete"}
              </Badge>
            </div>
          </div>
          
          {!canCompleteJob && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-800">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Complete all required tasks before marking job as finished
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tasks List */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Task List</h2>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Task Title *</Label>
                  <Input id="title" name="title" placeholder="Enter task title" required />
                </div>
                <div>
                  <Label htmlFor="type">Task Type *</Label>
                  <Select name="type" defaultValue="checkbox" required>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="checkbox">Checkbox (Complete/Incomplete)</SelectItem>
                      <SelectItem value="text">Text Input</SelectItem>
                      <SelectItem value="number">Number Input</SelectItem>
                      <SelectItem value="image">Image Upload</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" placeholder="Task description or instructions" rows={3} />
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
                  <Label htmlFor="assignedTo">Assign To</Label>
                  <Select name="assignedTo">
                    <SelectTrigger>
                      <SelectValue placeholder="Select user (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user: any) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.firstName && user.lastName 
                            ? `${user.firstName} ${user.lastName}` 
                            : user.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input id="dueDate" name="dueDate" type="date" />
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <Switch name="isRequired" id="isRequired" />
                  <Label htmlFor="isRequired">Required for job completion</Label>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createTaskMutation.isPending}>
                  {createTaskMutation.isPending ? "Creating..." : "Create Task"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {tasks.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks yet</h3>
            <p className="text-gray-600 mb-4">Add tasks to track progress and requirements for this job</p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Task
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tasks.map((task: Task) => (
            <Card key={task.id} className={`transition-all ${task.isCompleted ? 'bg-green-50 border-green-200' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {task.type === 'checkbox' && (
                        <button
                          onClick={() => handleToggleTask(task)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {task.isCompleted ? (
                            <CheckSquare className="h-5 w-5" />
                          ) : (
                            <Square className="h-5 w-5" />
                          )}
                        </button>
                      )}
                      <div className="flex-1">
                        <h4 className={`font-medium ${task.isCompleted ? 'line-through text-gray-500' : ''}`}>
                          {task.title}
                          {task.isRequired && <span className="text-red-500 ml-1">*</span>}
                        </h4>
                        {task.description && (
                          <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                        )}
                      </div>
                    </div>

                    {/* Task Input Fields */}
                    {task.type === 'text' && (
                      <div className="mt-3">
                        <Input
                          placeholder="Enter text value..."
                          value={task.textValue || ''}
                          onChange={(e) => handleValueUpdate(task, e.target.value)}
                          className="max-w-md"
                        />
                      </div>
                    )}

                    {task.type === 'number' && (
                      <div className="mt-3">
                        <Input
                          type="number"
                          placeholder="Enter number value..."
                          value={task.numberValue || ''}
                          onChange={(e) => handleValueUpdate(task, e.target.value)}
                          className="max-w-md"
                        />
                      </div>
                    )}

                    {task.type === 'image' && (
                      <div className="mt-3">
                        {task.imagePath ? (
                          <div className="flex items-center gap-2">
                            <img
                              src={task.imagePath}
                              alt="Task image"
                              className="w-20 h-20 object-cover rounded border"
                            />
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedImageTaskId(task.id);
                                fileInputRef.current?.click();
                              }}
                            >
                              <Camera className="h-4 w-4 mr-2" />
                              Replace Image
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedImageTaskId(task.id);
                              fileInputRef.current?.click();
                            }}
                          >
                            <Camera className="h-4 w-4 mr-2" />
                            Upload Image
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Task Meta Information */}
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                      <Badge className={getPriorityColor(task.priority)}>
                        {task.priority}
                      </Badge>
                      
                      {task.assignedToUser && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {task.assignedToUser.firstName && task.assignedToUser.lastName
                            ? `${task.assignedToUser.firstName} ${task.assignedToUser.lastName}`
                            : task.assignedToUser.username}
                        </div>
                      )}
                      
                      {task.dueDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                        </div>
                      )}
                      
                      {task.completedAt && (
                        <div className="flex items-center gap-1 text-green-600">
                          <Clock className="h-3 w-3" />
                          Completed: {new Date(task.completedAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingTask(task)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteTaskMutation.mutate(task.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Hidden file input for image uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && selectedImageTaskId) {
            handleImageUpload(selectedImageTaskId, file);
            setSelectedImageTaskId(null);
          }
        }}
      />

      {/* Job Completion Action */}
      {canCompleteJob && project?.status !== 'completed' && (
        <Card className="mt-6 border-green-200 bg-green-50">
          <CardContent className="p-4 text-center">
            <h3 className="font-medium text-green-800 mb-2">Ready to Complete Job</h3>
            <p className="text-sm text-green-600 mb-4">All required tasks have been completed</p>
            <Button asChild className="bg-green-600 hover:bg-green-700">
              <Link href={`/jobs/${projectId}`}>
                Return to Job Details
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}