import { useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar, ChevronLeft, ChevronRight, Plus, Edit, Trash2, PlayCircle, DollarSign, MapPin, Eye, Navigation } from "lucide-react";
import type { CalendarJob, InsertCalendarJob, Customer, Lead } from "@shared/schema";
import { WeatherWidget } from "@/components/weather-widget";
import { DirectionsButton } from "@/components/google-maps";

export default function CalendarPage() {
  const [selectedJob, setSelectedJob] = useState<CalendarJob | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'1month' | '3months' | '1week' | '2weeks'>('1month');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: jobs = [], isLoading } = useQuery<CalendarJob[]>({
    queryKey: ["/api/calendar-jobs"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: leads = [] } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<InsertCalendarJob>) => 
      apiRequest("POST", "/api/calendar-jobs", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar-jobs"] });
      setIsDialogOpen(false);
      setSelectedJob(null);
      toast({
        title: "Success",
        description: "Job scheduled successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to schedule job",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertCalendarJob> }) =>
      apiRequest("PUT", `/api/calendar-jobs/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar-jobs"] });
      setIsDialogOpen(false);
      setSelectedJob(null);
      toast({
        title: "Success",
        description: "Job updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update job",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest("DELETE", `/api/calendar-jobs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar-jobs"] });
      toast({
        title: "Success",
        description: "Job deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete job",
        variant: "destructive",
      });
    },
  });

  const convertMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("POST", `/api/calendar-jobs/${id}/convert-to-job`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setIsConvertDialogOpen(false);
      setSelectedJob(null);
      toast({
        title: "Success",
        description: "Calendar event converted to job successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to convert calendar event to job",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const customerIdValue = formData.get('customerId') as string;
    const leadIdValue = formData.get('leadId') as string;
    
    const jobData: any = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      location: formData.get('location') as string,
      startDate: formData.get('startDate') as string,
      endDate: formData.get('endDate') as string,
      estimatedValue: formData.get('estimatedValue') ? parseFloat(formData.get('estimatedValue') as string) : undefined,
      customerId: customerIdValue && customerIdValue !== 'none' ? parseInt(customerIdValue) : undefined,
      leadId: leadIdValue && leadIdValue !== 'none' ? parseInt(leadIdValue) : undefined,
      status: formData.get('status') as string || 'scheduled',
      priority: formData.get('priority') as string || 'medium',
      notes: formData.get('notes') as string,
      // Image timestamp settings
      enableImageTimestamp: formData.get("enableImageTimestamp") === "true",
      timestampFormat: formData.get("timestampFormat") || "MM/dd/yyyy hh:mm a",
      includeGpsCoords: formData.get("includeGpsCoords") === "true",
      timestampPosition: formData.get("timestampPosition") || "bottom-right",
    };

    if (selectedJob) {
      updateMutation.mutate({ id: selectedJob.id, data: jobData });
    } else {
      createMutation.mutate(jobData);
    }
  };

  const handleConvertToProject = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedJob) return;

    const formData = new FormData(e.currentTarget);
    const projectData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
    };

    convertMutation.mutate({ id: selectedJob.id, data: projectData });
  };

  const openDialog = (job?: CalendarJob) => {
    setSelectedJob(job || null);
    setIsDialogOpen(true);
  };

  const openConvertDialog = (job: CalendarJob) => {
    setSelectedJob(job);
    setIsConvertDialogOpen(true);
  };

  const handleView = (job: CalendarJob) => {
    setSelectedJob(job);
    setIsViewDialogOpen(true);
  };

  const getStatusColor = (status?: string) => {
    switch (status || 'scheduled') {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'converted':
        return 'bg-purple-100 text-purple-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const current = new Date(startDate);
    
    while (current <= lastDay || days.length < 42) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  const getJobsForDate = (date: Date) => {
    return jobs.filter(job => {
      const jobDate = new Date(job.startDate);
      return jobDate.toDateString() === date.toDateString();
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
  };

  const getViewTitle = () => {
    const formatOptions: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };
    
    switch (viewMode) {
      case '1week':
        const weekStart = new Date(currentDate);
        weekStart.setDate(currentDate.getDate() - currentDate.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      
      case '2weeks':
        const twoWeekStart = new Date(currentDate);
        twoWeekStart.setDate(currentDate.getDate() - currentDate.getDay());
        const twoWeekEnd = new Date(twoWeekStart);
        twoWeekEnd.setDate(twoWeekStart.getDate() + 13);
        return `${twoWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${twoWeekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      
      case '1month':
        return currentDate.toLocaleDateString('en-US', formatOptions);
      
      case '3months':
        const threeMonthStart = new Date(currentDate);
        threeMonthStart.setMonth(currentDate.getMonth() - 1);
        const threeMonthEnd = new Date(currentDate);
        threeMonthEnd.setMonth(currentDate.getMonth() + 1);
        return `${threeMonthStart.toLocaleDateString('en-US', { month: 'short' })} - ${threeMonthEnd.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
      
      default:
        return currentDate.toLocaleDateString('en-US', formatOptions);
    }
  };

  const navigateView = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      const factor = direction === 'next' ? 1 : -1;
      
      switch (viewMode) {
        case '1week':
          newDate.setDate(prev.getDate() + (7 * factor));
          break;
        case '2weeks':
          newDate.setDate(prev.getDate() + (14 * factor));
          break;
        case '1month':
          newDate.setMonth(prev.getMonth() + factor);
          break;
        case '3months':
          newDate.setMonth(prev.getMonth() + (3 * factor));
          break;
        default:
          newDate.setMonth(prev.getMonth() + factor);
      }
      
      return newDate;
    });
  };

  const getDaysForView = () => {
    switch (viewMode) {
      case '1week':
        return getDaysInWeek(currentDate);
      case '2weeks':
        return getDaysInTwoWeeks(currentDate);
      case '1month':
        return getDaysInMonth(currentDate);
      case '3months':
        return getDaysInThreeMonths(currentDate);
      default:
        return getDaysInMonth(currentDate);
    }
  };

  const getDaysInWeek = (date: Date) => {
    const days = [];
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    
    return days;
  };

  const getDaysInTwoWeeks = (date: Date) => {
    const days = [];
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    
    for (let i = 0; i < 14; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    
    return days;
  };

  const getDaysInThreeMonths = (date: Date) => {
    const days = [];
    const startMonth = new Date(date);
    startMonth.setMonth(date.getMonth() - 1);
    startMonth.setDate(1);
    
    const endMonth = new Date(date);
    endMonth.setMonth(date.getMonth() + 2, 0);
    
    const startDate = new Date(startMonth);
    startDate.setDate(startDate.getDate() - startMonth.getDay());
    
    const current = new Date(startDate);
    while (current <= endMonth || days.length % 7 !== 0) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  const getGridLayout = () => {
    switch (viewMode) {
      case '1week':
        return 'grid-cols-7'; // 7 days in a week
      case '2weeks':
        return 'grid-cols-7'; // Still 7 columns, but 2 rows
      case '1month':
        return 'grid-cols-7'; // Standard month view
      case '3months':
        return 'grid-cols-7'; // 7 columns for 3 months
      default:
        return 'grid-cols-7';
    }
  };

  const getIsCurrentPeriod = (day: Date) => {
    switch (viewMode) {
      case '1week':
      case '2weeks':
        // For week views, show all days as current
        return true;
      case '1month':
        return day.getMonth() === currentDate.getMonth();
      case '3months':
        const currentMonth = currentDate.getMonth();
        const dayMonth = day.getMonth();
        // Show days within the 3-month range
        return Math.abs(dayMonth - currentMonth) <= 1;
      default:
        return day.getMonth() === currentDate.getMonth();
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="h-96 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  const days = getDaysForView();

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Job Calendar</h1>
          <p className="text-muted-foreground">Schedule jobs and convert them to active projects</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Schedule Job
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedJob ? "Edit Job" : "Schedule New Job"}</DialogTitle>
              <DialogDescription>
                {selectedJob ? "Update job details" : "Enter the details for the new job"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Job Title *</Label>
                  <Input
                    id="title"
                    name="title"
                    required
                    defaultValue={selectedJob?.title}
                    placeholder="Job title"
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    name="location"
                    defaultValue={selectedJob?.location || ""}
                    placeholder="Job location"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={selectedJob?.description || ""}
                  placeholder="Job description"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    name="startDate"
                    type="datetime-local"
                    required
                    defaultValue={selectedJob?.startDate ? new Date(selectedJob.startDate).toISOString().slice(0, 16) : ""}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input
                    id="endDate"
                    name="endDate"
                    type="datetime-local"
                    required
                    defaultValue={selectedJob?.endDate ? new Date(selectedJob.endDate).toISOString().slice(0, 16) : ""}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerId">Customer</Label>
                  <Select name="customerId" defaultValue={selectedJob?.customerId?.toString() || "none"}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No customer</SelectItem>
                      {customers.map(customer => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="leadId">Lead</Label>
                  <Select name="leadId" defaultValue={selectedJob?.leadId?.toString() || "none"}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select lead" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No lead</SelectItem>
                      {leads.map(lead => (
                        <SelectItem key={lead.id} value={lead.id.toString()}>
                          {lead.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="estimatedValue">Estimated Value</Label>
                  <Input
                    id="estimatedValue"
                    name="estimatedValue"
                    type="number"
                    step="0.01"
                    defaultValue={selectedJob?.estimatedValue || ""}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select name="status" defaultValue={selectedJob?.status || "scheduled"}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select name="priority" defaultValue={selectedJob?.priority || "medium"}>
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
                        id="calendarTimestampEnabled"
                        name="enableImageTimestamp"
                        value="true"
                        className="w-4 h-4"
                      />
                      <Label htmlFor="calendarTimestampEnabled" className="text-sm">
                        Yes, add timestamp
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="calendarTimestampDisabled"
                        name="enableImageTimestamp"
                        value="false"
                        defaultChecked
                        className="w-4 h-4"
                      />
                      <Label htmlFor="calendarTimestampDisabled" className="text-sm">
                        No timestamp
                      </Label>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="calendarTimestampFormat" className="text-sm">Timestamp Format</Label>
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
                    <Label htmlFor="calendarTimestampPosition" className="text-sm">Position</Label>
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
                        id="calendarGpsEnabled"
                        name="includeGpsCoords"
                        value="true"
                        className="w-4 h-4"
                      />
                      <Label htmlFor="calendarGpsEnabled" className="text-sm">
                        Include GPS
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="calendarGpsDisabled"
                        name="includeGpsCoords"
                        value="false"
                        defaultChecked
                        className="w-4 h-4"
                      />
                      <Label htmlFor="calendarGpsDisabled" className="text-sm">
                        No GPS
                      </Label>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  defaultValue={selectedJob?.notes || ""}
                  placeholder="Additional notes"
                  rows={3}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {selectedJob ? "Update Job" : "Schedule Job"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Calendar Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {getViewTitle()}
            </CardTitle>
            <div className="flex items-center gap-4">
              {/* View Selection */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">View:</span>
                <Select value={viewMode} onValueChange={(value) => setViewMode(value as typeof viewMode)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1week">1 Week</SelectItem>
                    <SelectItem value="2weeks">2 Weeks</SelectItem>
                    <SelectItem value="1month">1 Month</SelectItem>
                    <SelectItem value="3months">3 Months</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => navigateView('prev')}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                  Today
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigateView('next')}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-2 text-center font-medium text-sm text-muted-foreground">
                {day}
              </div>
            ))}
          </div>
          
          <div className={`grid gap-1 ${getGridLayout()}`}>
            {days.map((day, index) => {
              const dayJobs = getJobsForDate(day);
              const isCurrentMonth = getIsCurrentPeriod(day);
              const isToday = day.toDateString() === new Date().toDateString();
              
              return (
                <div
                  key={index}
                  className={`min-h-[120px] p-2 border rounded-lg ${
                    isCurrentMonth ? 'bg-background' : 'bg-muted/30'
                  } ${isToday ? 'ring-2 ring-primary' : ''}`}
                >
                  <div className={`text-sm font-medium mb-1 ${
                    isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {day.getDate()}
                  </div>
                  
                  <div className="space-y-1">
                    {dayJobs.map(job => (
                      <div
                        key={job.id}
                        className="text-xs p-1 rounded cursor-pointer hover:bg-muted/50"
                        onClick={() => handleView(job)}
                      >
                        <div className="font-medium truncate">{job.title}</div>
                        <div className="flex items-center gap-1">
                          <Badge className={`text-xs ${getStatusColor(job.status)}`}>
                            {job.status.replace('_', ' ')}
                          </Badge>
                          {job.estimatedValue && (
                            <span className="text-muted-foreground flex items-center">
                              <DollarSign className="h-3 w-3" />
                              {parseFloat(job.estimatedValue).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Jobs List */}
      <Card>
        <CardHeader>
          <CardTitle>Scheduled Jobs</CardTitle>
          <CardDescription>All upcoming and ongoing jobs</CardDescription>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No jobs scheduled</p>
              <Button onClick={() => openDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Schedule your first job
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <div key={job.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{job.title}</h3>
                        <Badge className={getStatusColor(job.status)}>
                          {job.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                        <div>
                          <strong>Start:</strong> {new Date(job.startDate).toLocaleString()}
                        </div>
                        <div>
                          <strong>End:</strong> {new Date(job.endDate).toLocaleString()}
                        </div>
                        {job.location && (
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {job.location}
                            </div>
                            <DirectionsButton
                              address={job.location}
                              variant="outline"
                              size="sm"
                              className="h-6 text-xs"
                            />
                          </div>
                        )}
                        {job.estimatedValue && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            ${parseFloat(job.estimatedValue).toLocaleString()}
                          </div>
                        )}
                      </div>
                      
                      {job.location && (
                        <div className="mt-3">
                          <WeatherWidget 
                            calendarJobId={job.id} 
                            location={job.location}
                            compact={true}
                          />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      {/* Primary Action Row */}
                      {job.status === 'scheduled' && (
                        <div className="flex gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => openConvertDialog(job)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <PlayCircle className="h-3 w-3 mr-1" />
                            Convert to Project
                          </Button>
                          {job.location && (
                            <DirectionsButton 
                              address={job.location}
                              className="text-xs"
                            />
                          )}
                        </div>
                      )}
                      
                      {/* Secondary Actions Row */}
                      <div className="flex gap-2">
                        {job.status !== 'scheduled' && job.location && (
                          <DirectionsButton 
                            address={job.location}
                            className="text-xs"
                          />
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleView(job)}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDialog(job)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteMutation.mutate(job.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Convert to Project Dialog */}
      <Dialog open={isConvertDialogOpen} onOpenChange={setIsConvertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert Calendar Event to Job</DialogTitle>
            <DialogDescription>
              Convert "{selectedJob?.title}" into an active job
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleConvertToProject} className="space-y-4">
            <div>
              <Label htmlFor="name">Job Name</Label>
              <Input
                id="name"
                name="name"
                required
                defaultValue={selectedJob?.title}
                placeholder="Job name"
              />
            </div>
            <div>
              <Label htmlFor="description">Job Description</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={selectedJob?.description || ""}
                placeholder="Job description"
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsConvertDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={convertMutation.isPending}>
                Convert to Job
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Job Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Job Details</DialogTitle>
            <DialogDescription>
              View complete job information
            </DialogDescription>
          </DialogHeader>
          {selectedJob && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Job Title</Label>
                  <p className="text-base font-medium">{selectedJob.title}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Status</Label>
                  <div className="mt-1">
                    <Badge className={getStatusColor(selectedJob.status)}>
                      {selectedJob.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedJob.description && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Description</Label>
                  <p className="text-sm text-gray-700 mt-1">{selectedJob.description}</p>
                </div>
              )}

              {/* Job Location & Directions */}
              {selectedJob.location && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-sm font-medium text-gray-500">Job Location</Label>
                    <DirectionsButton
                      address={selectedJob.location}
                      variant="default"
                      size="sm"
                    />
                  </div>
                  <div className="flex items-start gap-2 mb-3">
                    <MapPin className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm leading-relaxed">
                      <div className="font-medium">{selectedJob.location}</div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <WeatherWidget 
                      calendarJobId={selectedJob.id} 
                      location={selectedJob.location}
                    />
                  </div>
                </div>
              )}

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Start Date & Time</Label>
                  <p className="text-sm">{new Date(selectedJob.startDate).toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">End Date & Time</Label>
                  <p className="text-sm">{new Date(selectedJob.endDate).toLocaleString()}</p>
                </div>
              </div>

              {/* Value & Priority */}
              <div className="grid grid-cols-2 gap-4">
                {selectedJob.estimatedValue && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Estimated Value</Label>
                    <div className="flex items-center gap-1 mt-1">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="text-base font-medium text-green-600">
                        {parseFloat(selectedJob.estimatedValue).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
                <div>
                  <Label className="text-sm font-medium text-gray-500">Priority</Label>
                  <div className="mt-1">
                    <Badge variant={selectedJob.priority === 'high' ? 'destructive' : selectedJob.priority === 'medium' ? 'default' : 'outline'}>
                      {selectedJob.priority}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedJob.notes && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Notes</Label>
                  <p className="text-sm text-gray-700 mt-1">{selectedJob.notes}</p>
                </div>
              )}

              {/* Customer & Lead Info */}
              {(selectedJob.customerId || selectedJob.leadId) && (
                <div className="grid grid-cols-2 gap-4">
                  {selectedJob.customerId && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Customer</Label>
                      <p className="text-sm">Customer ID: {selectedJob.customerId}</p>
                    </div>
                  )}
                  {selectedJob.leadId && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Lead</Label>
                      <p className="text-sm">Lead ID: {selectedJob.leadId}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Conversion Status & Images */}
              {selectedJob.convertedToProjectId ? (
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Project Conversion</Label>
                    <p className="text-sm text-green-600">Converted to Project ID: {selectedJob.convertedToProjectId}</p>
                  </div>
                  
                  {/* Project Images */}
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Project Images</Label>
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-sm text-blue-700">
                        📁 This job has been converted to a project. To view images and files, go to the <strong>Jobs</strong> page and view the project details.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Images & Files</Label>
                  <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                    <p className="text-sm text-amber-700">
                      📷 To add images and files, convert this job to a project first. Calendar jobs don't support file attachments.
                    </p>
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                <div>
                  <Label className="text-xs font-medium text-gray-400">Created</Label>
                  <p>{new Date(selectedJob.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-400">Updated</Label>
                  <p>{new Date(selectedJob.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setIsViewDialogOpen(false);
              if (selectedJob) openDialog(selectedJob);
            }}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Job
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}