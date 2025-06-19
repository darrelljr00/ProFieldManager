import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Plus, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Calendar, 
  User, 
  Filter,
  Search,
  Edit,
  Trash2,
  PlayCircle,
  PauseCircle,
  MoreHorizontal,
  Star,
  MessageSquare,
  FileText,
  Smartphone
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import type { Task, User as UserType } from "@shared/schema";
import { MobileCamera } from "@/components/mobile-camera";

interface TaskWithDetails extends Task {
  assignedTo?: UserType;
  assignedBy?: UserType;
  project?: { id: number; name: string };
}

export default function MyTasks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("assigned-to-me");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithDetails | null>(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileCamera, setShowMobileCamera] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Fetch tasks assigned to current user
  const { data: assignedTasks = [], isLoading: assignedLoading } = useQuery<TaskWithDetails[]>({
    queryKey: ["/api/tasks/assigned-to-me"],
    enabled: !!user?.id,
  });

  // Fetch tasks created by current user
  const { data: createdTasks = [], isLoading: createdLoading } = useQuery<TaskWithDetails[]>({
    queryKey: ["/api/tasks/created-by-me"],
    enabled: !!user?.id,
  });

  // Fetch all users for task assignment
  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  // Fetch projects for task assignment
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["/api/projects"],
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/tasks", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setShowCreateDialog(false);
      toast({
        title: "Task Created",
        description: "Task has been successfully created and assigned",
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiRequest(`/api/tasks/${id}`, "PATCH", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Task Updated",
        description: "Task has been successfully updated",
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/tasks/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setShowTaskDetail(false);
      setSelectedTask(null);
      toast({
        title: "Task Deleted",
        description: "Task has been successfully deleted",
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
      status: "todo",
      assignedToId: formData.get("assignedToId") ? parseInt(formData.get("assignedToId") as string) : null,
      projectId: formData.get("projectId") ? parseInt(formData.get("projectId") as string) : null,
      dueDate: formData.get("dueDate") ? new Date(formData.get("dueDate") as string) : null,
      estimatedHours: formData.get("estimatedHours") ? parseFloat(formData.get("estimatedHours") as string) : null,
    };
    createTaskMutation.mutate(data);
  };

  const handleUpdateTaskStatus = (taskId: number, status: string) => {
    updateTaskMutation.mutate({
      id: taskId,
      data: { status }
    });
  };

  const handleStartTask = (taskId: number) => {
    updateTaskMutation.mutate({
      id: taskId,
      data: { 
        status: "in-progress",
        startedAt: new Date()
      }
    });
  };

  const handleCompleteTask = (taskId: number) => {
    updateTaskMutation.mutate({
      id: taskId,
      data: { 
        status: "completed",
        completedAt: new Date()
      }
    });
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

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <AlertTriangle className="h-3 w-3" />;
      case "high":
        return <Star className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const filterTasks = (tasks: TaskWithDetails[]) => {
    return tasks.filter(task => {
      const matchesSearch = searchQuery === "" || 
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || task.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
      
      return matchesSearch && matchesStatus && matchesPriority;
    });
  };

  const TaskCard = ({ task }: { task: TaskWithDetails }) => (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => {
        setSelectedTask(task);
        setShowTaskDetail(true);
      }}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-base md:text-lg mb-2 line-clamp-1">
              {task.title}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge variant={getStatusColor(task.status)} className="text-xs">
                {task.status.replace("-", " ")}
              </Badge>
              <Badge variant={getPriorityColor(task.priority)} className="flex items-center gap-1 text-xs">
                {getPriorityIcon(task.priority)}
                {task.priority}
              </Badge>
              {task.project && (
                <Badge variant="outline" className="text-xs">
                  {task.project.name}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {task.description && (
            <p className="text-sm text-gray-600 line-clamp-2">{task.description}</p>
          )}
          
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 text-xs text-gray-500">
            <div className="flex items-center gap-4">
              {task.assignedTo && activeTab === "created-by-me" && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>{task.assignedTo.firstName} {task.assignedTo.lastName}</span>
                </div>
              )}
              {task.assignedBy && activeTab === "assigned-to-me" && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>By: {task.assignedBy.firstName} {task.assignedBy.lastName}</span>
                </div>
              )}
              {task.dueDate && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>Due: {format(new Date(task.dueDate), "MMM d")}</span>
                </div>
              )}
            </div>
            
            <div className="flex gap-1">
              {task.status === "todo" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartTask(task.id);
                  }}
                  className="h-7 text-xs"
                >
                  <PlayCircle className="h-3 w-3 mr-1" />
                  Start
                </Button>
              )}
              {task.status === "in-progress" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCompleteTask(task.id);
                  }}
                  className="h-7 text-xs"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Complete
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">My Tasks</h1>
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
          <Button onClick={() => setShowCreateDialog(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="review">Review</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Task Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="assigned-to-me">Assigned to Me</TabsTrigger>
          <TabsTrigger value="created-by-me">Created by Me</TabsTrigger>
        </TabsList>

        <TabsContent value="assigned-to-me" className="space-y-4">
          {assignedLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filterTasks(assignedTasks).map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
          
          {!assignedLoading && filterTasks(assignedTasks).length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks assigned</h3>
                <p className="text-gray-600">You don't have any tasks assigned to you yet.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="created-by-me" className="space-y-4">
          {createdLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filterTasks(createdTasks).map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
          
          {!createdLoading && filterTasks(createdTasks).length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks created</h3>
                <p className="text-gray-600">You haven't created any tasks yet.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Task Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTask} className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input id="title" name="title" required />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" rows={3} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="assignedToId">Assign To</Label>
                <Select name="assignedToId">
                  <SelectTrigger>
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.firstName} {user.lastName} ({user.username})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="projectId">Project (Optional)</Label>
                <Select name="projectId">
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  name="dueDate"
                  type="date"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="estimatedHours">Estimated Hours</Label>
              <Input
                id="estimatedHours"
                name="estimatedHours"
                type="number"
                step="0.5"
                min="0"
                placeholder="0"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createTaskMutation.isPending}>
                {createTaskMutation.isPending ? "Creating..." : "Create Task"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Task Detail Dialog */}
      <Dialog open={showTaskDetail} onOpenChange={setShowTaskDetail}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              {selectedTask?.title}
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    if (selectedTask) {
                      deleteTaskMutation.mutate(selectedTask.id);
                    }
                  }}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {selectedTask && (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                <Badge variant={getStatusColor(selectedTask.status)}>
                  {selectedTask.status.replace("-", " ")}
                </Badge>
                <Badge variant={getPriorityColor(selectedTask.priority)} className="flex items-center gap-1">
                  {getPriorityIcon(selectedTask.priority)}
                  {selectedTask.priority}
                </Badge>
                {selectedTask.project && (
                  <Badge variant="outline">
                    {selectedTask.project.name}
                  </Badge>
                )}
              </div>

              {selectedTask.description && (
                <div>
                  <Label className="text-sm font-medium">Description</Label>
                  <p className="text-sm text-gray-600 mt-1">{selectedTask.description}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedTask.assignedTo && (
                  <div>
                    <Label className="text-sm font-medium">Assigned To</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {selectedTask.assignedTo.firstName?.[0]}{selectedTask.assignedTo.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">
                        {selectedTask.assignedTo.firstName} {selectedTask.assignedTo.lastName}
                      </span>
                    </div>
                  </div>
                )}

                {selectedTask.assignedBy && (
                  <div>
                    <Label className="text-sm font-medium">Created By</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {selectedTask.assignedBy.firstName?.[0]}{selectedTask.assignedBy.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">
                        {selectedTask.assignedBy.firstName} {selectedTask.assignedBy.lastName}
                      </span>
                    </div>
                  </div>
                )}

                {selectedTask.dueDate && (
                  <div>
                    <Label className="text-sm font-medium">Due Date</Label>
                    <p className="text-sm text-gray-600 mt-1">
                      {format(new Date(selectedTask.dueDate), "MMMM d, yyyy")}
                    </p>
                  </div>
                )}

                {selectedTask.estimatedHours && (
                  <div>
                    <Label className="text-sm font-medium">Estimated Hours</Label>
                    <p className="text-sm text-gray-600 mt-1">{selectedTask.estimatedHours} hours</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                {selectedTask.status === "todo" && (
                  <Button onClick={() => handleStartTask(selectedTask.id)}>
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Start Task
                  </Button>
                )}
                {selectedTask.status === "in-progress" && (
                  <Button onClick={() => handleCompleteTask(selectedTask.id)}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark Complete
                  </Button>
                )}
                {selectedTask.status === "completed" && (
                  <Button 
                    variant="outline"
                    onClick={() => handleUpdateTaskStatus(selectedTask.id, "in-progress")}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Reopen Task
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Mobile Camera Dialog */}
      <MobileCamera
        isOpen={showMobileCamera}
        onClose={() => setShowMobileCamera(false)}
        onPhotoTaken={(file) => {
          console.log('Photo taken for task:', file);
          toast({
            title: "Photo Captured",
            description: "Photo saved for task documentation",
          });
          queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        }}
        title="Take Photo for Task"
      />
    </div>
  );
}