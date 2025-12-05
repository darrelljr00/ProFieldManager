import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, parseISO, addMonths, subMonths } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin, User as UserIcon, Plus, Edit, Trash, Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useDailyFlowReturn } from '@/hooks/useDailyFlowReturn';
import { apiRequest } from '@/lib/queryClient';
import type { User } from '@shared/schema';

interface Schedule {
  id: number;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  startTime: string;
  endTime: string;
  location?: string;
  address?: string;
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  color: string;
  notes?: string;
  clockInTime?: string;
  clockOutTime?: string;
  actualHours?: string;
  createdAt: string;
  userId: number;
  userName?: string;
  userFirstName?: string;
  userLastName?: string;
  createdById: number;
  createdByName?: string;
}

const scheduleFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  location: z.string().optional(),
  address: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  notes: z.string().optional(),
  userId: z.number().min(1, 'User is required'),
});

type ScheduleFormData = z.infer<typeof scheduleFormSchema>;

const priorityColors = {
  low: 'bg-green-100 text-green-800 border-green-300',
  medium: 'bg-blue-100 text-blue-800 border-blue-300',
  high: 'bg-orange-100 text-orange-800 border-orange-300',
  urgent: 'bg-red-100 text-red-800 border-red-300',
};

const statusColors = {
  scheduled: 'bg-gray-100 text-gray-800 border-gray-300',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-300',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
  completed: 'bg-green-100 text-green-800 border-green-300',
};

export default function MySchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isFromDailyFlow, completeAndReturn, isPending: isDailyFlowPending } = useDailyFlowReturn();

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ['/api/auth/me'],
  });

  // Extract user from the response structure
  const user = (currentUser?.user || currentUser) as User | undefined;

  // Fetch users (for managers/admins)
  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
    enabled: user?.role !== 'user',
  }) as { data: User[] };

  console.log('Current user role:', user?.role);
  console.log('Available users for assignment:', users);

  // Fetch schedules
  const month = format(currentDate, 'MM');
  const year = format(currentDate, 'yyyy');
  const { data: schedules = [], isLoading } = useQuery({
    queryKey: [`/api/schedules?month=${month}&year=${year}`],
  }) as { data: Schedule[], isLoading: boolean };

  // Fetch my schedule (simplified view for users)
  const { data: mySchedules = [] } = useQuery({
    queryKey: ['/api/my-schedule'],
    enabled: user?.role === 'user',
  });

  const form = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      title: '',
      description: '',
      startDate: '',
      endDate: '',
      startTime: '',
      endTime: '',
      location: '',
      address: '',
      priority: 'medium',
      notes: '',
      userId: user?.id || 0,
    },
  });

  // Create schedule mutation
  const createScheduleMutation = useMutation({
    mutationFn: async (data: ScheduleFormData) => {
      console.log('🎯 Creating schedule with data:', data);
      const response = await apiRequest('POST', '/api/schedules', data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schedules'] });
      queryClient.invalidateQueries({ queryKey: ['/api/my-schedule'] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: 'Schedule Created',
        description: 'Schedule has been created successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create schedule',
        variant: 'destructive',
      });
    },
  });

  // Update schedule mutation
  const updateScheduleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ScheduleFormData> }) => {
      return apiRequest('PUT', `/api/schedules/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schedules'] });
      queryClient.invalidateQueries({ queryKey: ['/api/my-schedule'] });
      setEditingSchedule(null);
      form.reset();
      toast({
        title: 'Schedule Updated',
        description: 'Schedule has been updated successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update schedule',
        variant: 'destructive',
      });
    },
  });

  // Delete schedule mutation
  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/schedules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schedules'] });
      queryClient.invalidateQueries({ queryKey: ['/api/my-schedule'] });
      toast({
        title: 'Schedule Deleted',
        description: 'Schedule has been deleted successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete schedule',
        variant: 'destructive',
      });
    },
  });

  // Clock in mutation
  const clockInMutation = useMutation({
    mutationFn: async (scheduleId: number) => {
      return apiRequest('POST', `/api/schedules/${scheduleId}/clock-in`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schedules'] });
      queryClient.invalidateQueries({ queryKey: ['/api/my-schedule'] });
      toast({
        title: 'Clocked In',
        description: 'Successfully clocked in to schedule.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to clock in',
        variant: 'destructive',
      });
    },
  });

  // Clock out mutation
  const clockOutMutation = useMutation({
    mutationFn: async (scheduleId: number) => {
      return apiRequest('POST', `/api/schedules/${scheduleId}/clock-out`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schedules'] });
      queryClient.invalidateQueries({ queryKey: ['/api/my-schedule'] });
      toast({
        title: 'Clocked Out',
        description: 'Successfully clocked out of schedule.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to clock out',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: ScheduleFormData) => {
    if (editingSchedule) {
      updateScheduleMutation.mutate({ id: editingSchedule.id, data });
    } else {
      createScheduleMutation.mutate(data);
    }
  };

  const handleEditSchedule = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    form.reset({
      title: schedule.title,
      description: schedule.description || '',
      startDate: schedule.startDate,
      endDate: schedule.endDate || '',
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      location: schedule.location || '',
      address: schedule.address || '',
      priority: schedule.priority,
      notes: schedule.notes || '',
      userId: schedule.userId,
    });
    setIsCreateDialogOpen(true);
  };

  const handleDeleteSchedule = (scheduleId: number) => {
    if (confirm('Are you sure you want to delete this schedule?')) {
      deleteScheduleMutation.mutate(scheduleId);
    }
  };

  const getSchedulesForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const schedulesToUse = user?.role === 'user' ? mySchedules : schedules;
    return schedulesToUse.filter((schedule: Schedule) => schedule.startDate === dateStr);
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const canManageSchedules = user?.role === 'admin' || user?.role === 'manager';
  
  console.log('Can manage schedules check:', {
    currentUserRole: user?.role,
    canManageSchedules,
    currentUser: currentUser,
    extractedUser: user
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading schedules...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {isFromDailyFlow && (
        <Card className="mb-4 border-primary bg-primary/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">Daily Flow: Review Today's Jobs</p>
              <p className="text-sm text-muted-foreground">Review your schedule then click "Done" to continue your daily flow</p>
            </div>
            <Button
              onClick={completeAndReturn}
              disabled={isDailyFlowPending}
              data-testid="button-complete-daily-flow-step"
            >
              {isDailyFlowPending ? "Saving..." : "Done - Return to Daily Flow"}
            </Button>
          </CardContent>
        </Card>
      )}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">
            {user?.role === 'user' ? 'My Schedule' : 'Team Schedules'}
          </h1>
          <p className="text-muted-foreground">
            {user?.role === 'user' 
              ? 'View your assigned schedules and clock in/out'
              : 'Manage and view all organization schedules'
            }
          </p>
          {user?.role !== 'user' && (
            <div className="mt-2">
              <Badge variant="secondary" className="text-xs">
                Viewing all organization schedules as {user?.role}
              </Badge>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex rounded-md border">
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('calendar')}
              className="rounded-r-none"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Calendar
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              List
            </Button>
          </div>
          {canManageSchedules && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingSchedule(null);
                  form.reset();
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Schedule
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingSchedule ? 'Edit Schedule' : 'Create New Schedule'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingSchedule 
                      ? 'Update the schedule details below.'
                      : 'Fill in the details to create a new schedule.'
                    }
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                              <Input placeholder="Schedule title" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="userId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Assign To User</FormLabel>
                            <Select 
                              onValueChange={(value) => field.onChange(parseInt(value))}
                              value={field.value?.toString()}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a user to assign this schedule" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {users && users.length > 0 ? (
                                  users.map((user: any) => (
                                    <SelectItem key={user.id} value={user.id.toString()}>
                                      {user.firstName && user.lastName 
                                        ? `${user.firstName} ${user.lastName} (${user.username})`
                                        : user.username
                                      }
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="" disabled>
                                    No users available
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Schedule description" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="endDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>End Date (Optional)</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="startTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Time</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="endTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>End Time</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Location</FormLabel>
                            <FormControl>
                              <Input placeholder="Location name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="priority"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Priority</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select priority" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="urgent">Urgent</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Input placeholder="Full address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Additional notes" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsCreateDialogOpen(false);
                          setEditingSchedule(null);
                          form.reset();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createScheduleMutation.isPending || updateScheduleMutation.isPending}
                      >
                        {editingSchedule ? 'Update Schedule' : 'Create Schedule'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <div className="space-y-6">
          {/* Calendar Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(new Date())}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="p-2 text-center font-medium text-muted-foreground">
                {day}
              </div>
            ))}
            {monthDays.map((date) => {
              const daySchedules = getSchedulesForDate(date);
              const isToday = isSameDay(date, new Date());
              const isCurrentMonth = isSameMonth(date, currentDate);

              return (
                <div
                  key={date.toISOString()}
                  className={`min-h-[120px] p-2 border rounded-lg ${
                    isCurrentMonth ? 'bg-background' : 'bg-muted/50'
                  } ${isToday ? 'ring-2 ring-primary' : ''}`}
                >
                  <div className={`text-sm font-medium mb-1 ${
                    isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {format(date, 'd')}
                  </div>
                  <div className="space-y-1">
                    {daySchedules.slice(0, 3).map((schedule: Schedule) => (
                      <div
                        key={schedule.id}
                        className={`text-xs p-1 rounded text-white cursor-pointer truncate`}
                        style={{ backgroundColor: schedule.color }}
                        onClick={() => setSelectedDate(date)}
                        title={`${schedule.title} - ${schedule.startTime}-${schedule.endTime}`}
                      >
                        {schedule.title}
                      </div>
                    ))}
                    {daySchedules.length > 3 && (
                      <div className="text-xs text-muted-foreground">
                        +{daySchedules.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Date Details */}
          {selectedDate && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </CardTitle>
                <CardDescription>
                  {getSchedulesForDate(selectedDate).length} schedule(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {getSchedulesForDate(selectedDate).map((schedule: Schedule) => (
                    <ScheduleCard
                      key={schedule.id}
                      schedule={schedule}
                      canManage={canManageSchedules}
                      currentUserId={currentUser?.id}
                      onEdit={handleEditSchedule}
                      onDelete={handleDeleteSchedule}
                      onClockIn={clockInMutation.mutate}
                      onClockOut={clockOutMutation.mutate}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        /* List View */
        <div className="space-y-4">
          {(currentUser?.role === 'user' ? mySchedules : schedules).map((schedule: Schedule) => (
            <ScheduleCard
              key={schedule.id}
              schedule={schedule}
              canManage={canManageSchedules}
              currentUserId={currentUser?.id}
              onEdit={handleEditSchedule}
              onDelete={handleDeleteSchedule}
              onClockIn={clockInMutation.mutate}
              onClockOut={clockOutMutation.mutate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ScheduleCardProps {
  schedule: Schedule;
  canManage: boolean;
  currentUserId: number;
  onEdit: (schedule: Schedule) => void;
  onDelete: (id: number) => void;
  onClockIn: (id: number) => void;
  onClockOut: (id: number) => void;
}

function ScheduleCard({ 
  schedule, 
  canManage, 
  currentUserId, 
  onEdit, 
  onDelete, 
  onClockIn, 
  onClockOut 
}: ScheduleCardProps) {
  const canClockInOut = schedule.userId === currentUserId;
  const isScheduledForToday = isSameDay(parseISO(schedule.startDate), new Date());

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold">{schedule.title}</h3>
              <Badge className={priorityColors[schedule.priority]}>
                {schedule.priority}
              </Badge>
              <Badge className={statusColors[schedule.status]}>
                {schedule.status}
              </Badge>
            </div>

            {schedule.description && (
              <p className="text-sm text-muted-foreground mb-2">
                {schedule.description}
              </p>
            )}

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(parseISO(schedule.startDate), 'MMM d, yyyy')}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {schedule.startTime} - {schedule.endTime}
              </div>
              {schedule.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {schedule.location}
                </div>
              )}
              {schedule.userName && (
                <div className="flex items-center gap-1">
                  <UserIcon className="h-4 w-4" />
                  {schedule.userFirstName} {schedule.userLastName}
                </div>
              )}
            </div>

            {schedule.actualHours && (
              <div className="mt-2 text-sm">
                <span className="font-medium">Hours worked:</span> {schedule.actualHours}
              </div>
            )}

            {schedule.notes && (
              <div className="mt-2 text-sm">
                <span className="font-medium">Notes:</span> {schedule.notes}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Clock in/out buttons for assigned user */}
            {canClockInOut && isScheduledForToday && (
              <div className="flex gap-2">
                {!schedule.clockInTime && (
                  <Button
                    size="sm"
                    onClick={() => onClockIn(schedule.id)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Clock In
                  </Button>
                )}
                {schedule.clockInTime && !schedule.clockOutTime && (
                  <Button
                    size="sm"
                    onClick={() => onClockOut(schedule.id)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Square className="h-4 w-4 mr-1" />
                    Clock Out
                  </Button>
                )}
              </div>
            )}

            {/* Management buttons for managers/admins */}
            {canManage && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEdit(schedule)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDelete(schedule.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}