import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
import { Plus, Calendar, Users, CheckCircle, Clock, AlertCircle, Folder, Settings, MapPin, Route } from "lucide-react";
import { Link } from "wouter";
import type { Project, Customer, User } from "@shared/schema";
import { DirectionsButton } from "@/components/google-maps";
import { DispatchRouting } from "@/components/dispatch-routing";

interface ProjectWithDetails extends Project {
  users: { user: User }[];
  taskCount: number;
  completedTasks: number;
  customer?: Customer;
}

export default function Jobs() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: jobs = [], isLoading } = useQuery<ProjectWithDetails[]>({
    queryKey: ["/api/projects"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: calendarJobs = [] } = useQuery<CalendarJobWithDetails[]>({
    queryKey: ["/api/calendar-jobs"],
  });

interface CalendarJobWithDetails {
  id: number;
  userId: number;
  customerId?: number;
  leadId?: number;
  title: string;
  description?: string;
  location?: string;
  startDate: string;
  endDate: string;
  estimatedValue?: string;
  status: string;
  priority: string;
  notes?: string;
  convertedToProjectId?: number;
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
  lead?: any;
}

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

  const getStatusColor = (status: string) => {
    const colors: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      active: "default",
      completed: "secondary",
      "on-hold": "outline",
      cancelled: "destructive",
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
                  <Button asChild size="sm" className="flex-1">
                    <Link href={`/projects/${project.id}`}>
                      View Details
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/projects/${project.id}/tasks`}>
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

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Jobs</h1>
          <p className="text-gray-600 mt-1">Manage your jobs, tasks, and team collaboration</p>
        </div>
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

      {/* Calendar Events Sync Section */}
      {(calendarJobs as CalendarJobWithDetails[]).filter(job => job.status === 'scheduled' && !job.convertedToProjectId).length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Scheduled Calendar Events
            </CardTitle>
            <CardDescription>
              Convert calendar events to jobs for better tracking and management
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(calendarJobs as CalendarJobWithDetails[])
                .filter(job => job.status === 'scheduled' && !job.convertedToProjectId)
                .map((job) => (
                  <Card key={job.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <h4 className="font-semibold">{job.title}</h4>
                        <p className="text-sm text-gray-600">{job.description}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar className="h-4 w-4" />
                          {new Date(job.startDate).toLocaleDateString()} - {new Date(job.endDate).toLocaleDateString()}
                        </div>
                        {job.location && (
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <MapPin className="h-4 w-4" />
                            {job.location}
                          </div>
                        )}
                        {job.estimatedValue && (
                          <div className="text-sm font-medium text-green-600">
                            Estimated Value: ${job.estimatedValue}
                          </div>
                        )}
                        <div className="flex items-center gap-2 pt-2">
                          <Badge variant={job.priority === 'high' ? 'destructive' : job.priority === 'medium' ? 'default' : 'secondary'}>
                            {job.priority}
                          </Badge>
                          {job.customer && (
                            <Badge variant="outline">
                              {job.customer.name}
                            </Badge>
                          )}
                        </div>
                        <Button 
                          size="sm" 
                          className="w-full mt-3"
                          onClick={() => convertJobToProjectMutation.mutate(job.id)}
                          disabled={convertJobToProjectMutation.isPending}
                        >
                          Convert to Job
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

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
          <TabsList className="grid w-full grid-cols-4">
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

          <TabsContent value="dispatch">
            <DispatchRouting />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}