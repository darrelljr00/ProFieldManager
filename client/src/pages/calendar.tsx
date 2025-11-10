import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { buildApiUrl, getAuthHeaders } from "@/lib/api-config";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  MapPin, 
  Repeat, 
  CloudRain,
  Sun,
  Cloud,
  CheckCircle,
  User
} from "lucide-react";

interface CalendarJob {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  address?: string;
  city?: string;
  state?: string;
  status: string;
  priority: string;
  customerId?: number;
  type: 'project' | 'recurring';
  isRecurring: boolean;
  originalId?: number;
  seriesId?: number;
  occurrenceId?: number;
}

interface JobWeather {
  temp_f: number;
  condition: {
    text: string;
    icon: string;
  };
  chance_of_rain?: number;
}

interface AvailabilityRequest {
  id: number;
  quoteId: number;
  customerEmail: string;
  selectedDates: Array<{ date: string; times: string[] }>;
  submittedAt: string;
  quote: {
    id: number;
    quoteNumber: string;
    total: string;
    customerId: number;
  };
  customer: {
    id: number;
    name: string;
    email: string;
    phone: string;
  };
}

export default function CalendarPage() {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'1month' | '3months' | '1week' | '2weeks'>('1month');
  const [selectedJob, setSelectedJob] = useState<CalendarJob | null>(null);

  // Helper functions - must be declared before use
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

  const getWeekDays = (date: Date) => {
    const days = [];
    const startOfWeek = new Date(date);
    const dayOfWeek = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    
    return days;
  };

  const getTwoWeekDays = (date: Date) => {
    const days = [];
    const startOfWeek = new Date(date);
    const dayOfWeek = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);
    
    for (let i = 0; i < 14; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    
    return days;
  };

  const hasPendingAvailabilityRequest = (date: Date): boolean => {
    if (!availabilityRequests || availabilityRequests.length === 0) return false;
    
    const dateStr = date.toISOString().split('T')[0];
    return availabilityRequests.some(request => 
      request.selectedDates.some(slot => slot.date === dateStr)
    );
  };

  const getThreeMonthDays = (date: Date) => {
    const days = [];
    const startMonth = new Date(date.getFullYear(), date.getMonth() - 1, 1);
    
    for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
      const currentMonth = new Date(startMonth.getFullYear(), startMonth.getMonth() + monthOffset, 1);
      const monthDays = getDaysInMonth(currentMonth);
      days.push(...monthDays);
    }
    
    return days;
  };

  // Calculate date range for API call
  const getDateRange = () => {
    const days = (() => {
      switch (viewMode) {
        case '1week':
          return getWeekDays(currentDate);
        case '2weeks':
          return getTwoWeekDays(currentDate);
        case '3months':
          return getThreeMonthDays(currentDate);
        default:
          return getDaysInMonth(currentDate);
      }
    })();
    
    const startDate = days[0]?.toISOString().split('T')[0];
    const endDate = days[days.length - 1]?.toISOString().split('T')[0];
    
    return { startDate, endDate };
  };

  // Fetch calendar jobs - using authenticated request with proper date params
  const { data: jobs, isLoading, error: jobsError } = useQuery<CalendarJob[]>({
    queryKey: ['/api/jobs/calendar', currentDate.toISOString()],
    queryFn: async () => {
      const dateRange = getDateRange();
      const params = new URLSearchParams(dateRange);
      const url = `/api/jobs/calendar?${params}`;
      const fullUrl = buildApiUrl(url);
      const headers = getAuthHeaders();
      
      console.log('🌐 Calendar Query Request:', {
        originalUrl: url,
        fullUrl,
        dateRange,
        hasAuthHeader: !!headers.Authorization
      });
      
      const response = await fetch(fullUrl, {
        headers,
        credentials: "include"
      });
      
      if (!response.ok) {
        console.error('❌ Calendar API Error:', response.status, response.statusText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📅 Calendar jobs fetched:', data?.length || 0, 'jobs');
      return data;
    },
    refetchOnWindowFocus: true,
    staleTime: 0, // Always refetch to get latest data
  });

  // Fetch weather for jobs
  const jobsWithWeather = useQuery<{[key: string]: JobWeather}>({
    queryKey: ['/api/weather/jobs', jobs?.map(j => j.originalId).filter(Boolean)],
    queryFn: async () => {
      if (!jobs?.length) {
        console.log('🌤️ No jobs found, skipping weather fetch');
        return {};
      }
      
      console.log('🌤️ Jobs data:', jobs.map(j => ({ id: j.id, originalId: j.originalId, title: j.title })));
      
      const jobsWithOriginalId = jobs.filter(job => job.originalId);
      console.log('🌤️ Jobs with originalId:', jobsWithOriginalId.length, 'out of', jobs.length);
      
      if (jobsWithOriginalId.length === 0) {
        console.log('🌤️ No jobs have originalId, skipping weather fetch');
        return {};
      }
      
      console.log('🌤️ Fetching weather for', jobsWithOriginalId.length, 'jobs');
      const weatherData: {[key: string]: JobWeather} = {};
      const headers = getAuthHeaders();
      
      // Fetch weather for each job that has an originalId
      await Promise.all(
        jobsWithOriginalId
          .map(async (job) => {
            try {
              const url = `/api/weather/jobs/${job.originalId}`;
              const fullUrl = buildApiUrl(url);
              
              console.log(`🌤️ Fetching weather for job ${job.id} (originalId: ${job.originalId}) at ${url}`);
              
              const response = await fetch(fullUrl, {
                headers,
                credentials: "include"
              });
              
              if (response.ok) {
                const data = await response.json();
                console.log(`🌤️ Weather data for job ${job.id}:`, data);
                // Use start date weather if available
                if (data.weather?.startDate) {
                  weatherData[job.id] = {
                    temp_f: data.weather.startDate.temp_f,
                    condition: data.weather.startDate.condition,
                    chance_of_rain: data.weather.startDate.chance_of_rain
                  };
                  console.log(`✅ Weather stored for job ${job.id}`);
                }
              } else {
                console.warn(`❌ Weather fetch failed for job ${job.id}:`, response.status, response.statusText);
              }
            } catch (error) {
              console.warn(`❌ Failed to fetch weather for job ${job.id}:`, error);
            }
          })
      );
      
      console.log('🌤️ Final weather data:', weatherData);
      return weatherData;
    },
    enabled: !!jobs?.length
  });

  // Fetch pending availability requests
  const { data: availabilityRequests, isLoading: availabilityLoading } = useQuery<AvailabilityRequest[]>({
    queryKey: ['/api/quote-availability/pending'],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Mutation to confirm availability
  const confirmAvailabilityMutation = useMutation({
    mutationFn: async ({ id, selectedDate, selectedTime }: { id: number; selectedDate: string; selectedTime: string }) => {
      const response = await fetch(buildApiUrl(`/api/quote-availability/${id}/confirm`), {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ selectedDate, selectedTime }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to confirm availability');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quote-availability/pending'] });
      // Invalidate all calendar queries regardless of date
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === '/api/jobs/calendar'
      });
      toast({
        title: "Success",
        description: "Availability confirmed and job created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to confirm availability",
        variant: "destructive",
      });
    },
  });

  // Group jobs by date
  const getJobsForDate = (date: Date) => {
    if (!jobs) return [];
    
    const dateStr = date.toISOString().split('T')[0];
    
    return jobs.filter(job => {
      const jobStart = job.startDate;
      const jobEnd = job.endDate || job.startDate; // Use startDate as endDate if null
      
      // Extract just the date part (YYYY-MM-DD) from job dates
      if (jobStart && jobEnd) {
        const jobStartDate = jobStart.split('T')[0]; // Get just YYYY-MM-DD
        const jobEndDate = jobEnd.split('T')[0];
        return jobStartDate <= dateStr && jobEndDate >= dateStr;
      } else if (jobStart) {
        // If only startDate exists, check if it matches this date
        const jobStartDate = jobStart.split('T')[0];
        return jobStartDate === dateStr;
      }
      return false;
    });
  };

  const days = (() => {
    switch (viewMode) {
      case '1week':
        return getWeekDays(currentDate);
      case '2weeks':
        return getTwoWeekDays(currentDate);
      case '3months':
        return getThreeMonthDays(currentDate);
      default:
        return getDaysInMonth(currentDate);
    }
  })();

  const getIsCurrentPeriod = (day: Date) => {
    switch (viewMode) {
      case '1week':
      case '2weeks':
        return true;
      case '3months':
        return Math.abs(day.getMonth() - currentDate.getMonth()) <= 1;
      default:
        return day.getMonth() === currentDate.getMonth();
    }
  };

  const getGridLayout = () => {
    switch (viewMode) {
      case '1week':
        return 'grid-cols-7';
      case '2weeks':
        return 'grid-cols-7';
      case '3months':
        return 'grid-cols-7';
      default:
        return 'grid-cols-7';
    }
  };

  const navigateView = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      switch (viewMode) {
        case '1week':
          newDate.setDate(prev.getDate() + (direction === 'next' ? 7 : -7));
          break;
        case '2weeks':
          newDate.setDate(prev.getDate() + (direction === 'next' ? 14 : -14));
          break;
        case '3months':
          newDate.setMonth(prev.getMonth() + (direction === 'next' ? 3 : -3));
          break;
        default:
          newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      }
      return newDate;
    });
  };

  const getViewTitle = () => {
    const formatOptions: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };
    
    switch (viewMode) {
      case '1week':
        const weekStart = getWeekDays(currentDate)[0];
        const weekEnd = getWeekDays(currentDate)[6];
        return `Week of ${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`;
      case '2weeks':
        const twoWeekStart = getTwoWeekDays(currentDate)[0];
        const twoWeekEnd = getTwoWeekDays(currentDate)[13];
        return `${twoWeekStart.toLocaleDateString()} - ${twoWeekEnd.toLocaleDateString()}`;
      case '3months':
        const startMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        const endMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
        return `${startMonth.toLocaleDateString('en-US', formatOptions)} - ${endMonth.toLocaleDateString('en-US', formatOptions)}`;
      default:
        return currentDate.toLocaleDateString('en-US', formatOptions);
    }
  };

  // Debug logging
  console.log('📅 Calendar component render:', {
    isLoading,
    jobsError: jobsError?.message,
    jobsCount: jobs?.length || 0,
    weatherEnabled: !!jobsWithWeather.data,
    weatherDataCount: Object.keys(jobsWithWeather.data || {}).length
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground">View your calendar</p>
        </div>
        {/* Debug Info */}
        <div className="text-xs text-gray-500">
          {isLoading && <span>Loading jobs...</span>}
          {jobsError && <span className="text-red-500">Error: {jobsError.message}</span>}
          {jobs && <span>{jobs.length} jobs loaded</span>}
        </div>
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
              const isCurrentMonth = getIsCurrentPeriod(day);
              const isToday = day.toDateString() === new Date().toDateString();
              const dayJobs = getJobsForDate(day);
              const hasPendingRequest = hasPendingAvailabilityRequest(day);
              
              // Get weather summary for this day (from jobs with weather data)
              const dayWeatherData = dayJobs
                .map(job => jobsWithWeather.data?.[job.id])
                .filter(Boolean);
              
              const dayWeather = dayWeatherData.length > 0 ? {
                avgTemp: Math.round(dayWeatherData.reduce((sum, w) => sum + w!.temp_f, 0) / dayWeatherData.length),
                conditions: dayWeatherData.map(w => w!.condition.text).filter(Boolean),
                avgRainChance: dayWeatherData.some(w => w!.chance_of_rain !== undefined) 
                  ? Math.round(dayWeatherData.filter(w => w!.chance_of_rain !== undefined).reduce((sum, w) => sum + (w!.chance_of_rain || 0), 0) / dayWeatherData.filter(w => w!.chance_of_rain !== undefined).length)
                  : undefined
              } : null;
              
              return (
                <div
                  key={index}
                  className={`min-h-[120px] p-2 border rounded-lg ${
                    isCurrentMonth ? 'bg-background' : 'bg-muted/30'
                  } ${isToday ? 'ring-2 ring-primary' : ''} ${
                    hasPendingRequest ? 'animate-pulse ring-2 ring-orange-500 bg-orange-50/50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className={`text-sm font-medium ${
                      isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                      {day.getDate()}
                    </div>
                    
                    {/* Day Weather Summary */}
                    {dayWeather && dayJobs.length > 0 && (
                      <div className="flex items-center gap-1 text-xs">
                        {dayWeather.conditions.some(c => c && c.toLowerCase().includes('rain')) ? (
                          <CloudRain className="h-3 w-3 text-blue-600" />
                        ) : dayWeather.conditions.some(c => c && c.toLowerCase().includes('cloud')) ? (
                          <Cloud className="h-3 w-3 text-gray-600" />
                        ) : (
                          <Sun className="h-3 w-3 text-yellow-600" />
                        )}
                        <span className="font-medium">{dayWeather.avgTemp}°F</span>
                        {dayWeather.avgRainChance !== undefined && dayWeather.avgRainChance > 0 && (
                          <span className="text-blue-600">({dayWeather.avgRainChance}%)</span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Jobs for this day */}
                  <div className="space-y-1">
                    {isLoading ? (
                      <Skeleton className="h-6 w-full" />
                    ) : (
                      dayJobs.slice(0, 3).map((job) => {
                        const weather = jobsWithWeather.data?.[job.id];
                        const priorityColors = {
                          low: 'bg-blue-100 text-blue-800 border-blue-200',
                          medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                          high: 'bg-orange-100 text-orange-800 border-orange-200',
                          urgent: 'bg-red-100 text-red-800 border-red-200'
                        };
                        
                        return (
                          <div
                            key={job.id}
                            className={`p-2 rounded-md border text-xs cursor-pointer hover:opacity-80 transition-opacity ${
                              priorityColors[job.priority as keyof typeof priorityColors] || 
                              priorityColors.medium
                            }`}
                            data-testid={`calendar-job-${job.id}`}
                            onClick={() => setSelectedJob(job)}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate" title={job.title}>
                                  {job.title}
                                </p>
                                {job.address && (
                                  <p className="flex items-center gap-1 text-xs opacity-75 mt-1">
                                    <MapPin className="h-3 w-3" />
                                    <span className="truncate">{job.address}</span>
                                  </p>
                                )}
                              </div>
                              
                              {/* Badges and Weather */}
                              <div className="flex flex-col items-end gap-1">
                                {job.isRecurring && (
                                  <Badge variant="secondary" className="text-xs h-4">
                                    <Repeat className="h-2 w-2 mr-1" />
                                    R
                                  </Badge>
                                )}
                                {weather && (
                                  <div className="flex items-center gap-1 text-xs">
                                    {weather.condition?.text?.toLowerCase().includes('rain') ? (
                                      <CloudRain className="h-3 w-3" />
                                    ) : weather.condition?.text?.toLowerCase().includes('cloud') ? (
                                      <Cloud className="h-3 w-3" />
                                    ) : (
                                      <Sun className="h-3 w-3" />
                                    )}
                                    <span>{Math.round(weather.temp_f)}°F</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    
                    {/* Show more indicator */}
                    {dayJobs.length > 3 && (
                      <div className="text-xs text-muted-foreground text-center py-1">
                        +{dayJobs.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Customer Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Customer Requests
          </CardTitle>
          <CardDescription>
            Availability submissions from accepted quotes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {availabilityLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : availabilityRequests && availabilityRequests.length > 0 ? (
            <div className="space-y-4">
              {availabilityRequests.map((request) => (
                <div
                  key={request.id}
                  className="border rounded-lg p-4 space-y-3 hover:bg-accent/50 transition-colors"
                  data-testid={`availability-request-${request.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-lg">{request.customer.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Quote #{request.quote.quoteNumber} • ${parseFloat(request.quote.total).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Submitted {new Date(request.submittedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <Badge variant="secondary">Pending</Badge>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Requested Availability:</p>
                    {request.selectedDates.map((dateSlot, idx) => (
                      <div
                        key={idx}
                        className="bg-muted/50 rounded-md p-3 space-y-2"
                      >
                        <p className="text-sm font-medium">
                          {new Date(dateSlot.date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {dateSlot.times.map((time) => (
                            <Button
                              key={time}
                              size="sm"
                              variant="outline"
                              className="text-xs"
                              disabled={confirmAvailabilityMutation.isPending}
                              onClick={() => {
                                confirmAvailabilityMutation.mutate({
                                  id: request.id,
                                  selectedDate: dateSlot.date,
                                  selectedTime: time,
                                });
                              }}
                              data-testid={`button-confirm-${request.id}-${time}`}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {time}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No pending customer availability requests</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Job Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Job Summary</CardTitle>
          <CardDescription>
            Overview of jobs in the current period
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {jobs?.filter(job => !job.isRecurring).length || 0}
                </div>
                <p className="text-sm text-muted-foreground">Regular Jobs</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {jobs?.filter(job => job.isRecurring).length || 0}
                </div>
                <p className="text-sm text-muted-foreground">Recurring Jobs</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {jobs?.length || 0}
                </div>
                <p className="text-sm text-muted-foreground">Total Jobs</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Job Details Modal */}
      <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Job Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedJob && (
            <div className="space-y-6">
              {/* Job Header */}
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">{selectedJob.title}</h3>
                {selectedJob.description && (
                  <p className="text-muted-foreground">{selectedJob.description}</p>
                )}
                
                <div className="flex items-center gap-4 text-sm">
                  <Badge className={`${
                    selectedJob.priority === 'low' ? 'bg-blue-500' :
                    selectedJob.priority === 'medium' ? 'bg-yellow-500' :
                    selectedJob.priority === 'high' ? 'bg-orange-500' :
                    'bg-red-500'
                  }`}>
                    {selectedJob.priority} Priority
                  </Badge>
                  
                  <Badge variant="outline" className={`${
                    selectedJob.status === 'completed' ? 'text-green-600 border-green-600' :
                    selectedJob.status === 'in_progress' ? 'text-blue-600 border-blue-600' :
                    selectedJob.status === 'scheduled' ? 'text-orange-600 border-orange-600' :
                    'text-gray-600 border-gray-600'
                  }`}>
                    {selectedJob.status.replace('_', ' ')}
                  </Badge>
                  
                  {selectedJob.isRecurring && (
                    <Badge variant="secondary">
                      <Repeat className="h-3 w-3 mr-1" />
                      Recurring
                    </Badge>
                  )}
                </div>
              </div>

              {/* Job Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Date & Time */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Start Date</p>
                      <p className="text-muted-foreground">
                        {new Date(selectedJob.startDate).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  
                  {selectedJob.endDate && selectedJob.endDate !== selectedJob.startDate && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">End Date</p>
                        <p className="text-muted-foreground">
                          {new Date(selectedJob.endDate).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Location */}
                {selectedJob.address && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Location</p>
                        <p className="text-muted-foreground">{selectedJob.address}</p>
                        {(selectedJob.city || selectedJob.state) && (
                          <p className="text-muted-foreground">
                            {[selectedJob.city, selectedJob.state].filter(Boolean).join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Weather Information */}
              {(() => {
                const weather = jobsWithWeather.data?.[selectedJob.id];
                return weather && (
                  <div className="border rounded-lg p-4 bg-muted/30">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      {weather.condition?.text?.toLowerCase().includes('rain') ? (
                        <CloudRain className="h-4 w-4" />
                      ) : weather.condition?.text?.toLowerCase().includes('cloud') ? (
                        <Cloud className="h-4 w-4" />
                      ) : (
                        <Sun className="h-4 w-4" />
                      )}
                      Weather Forecast
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Temperature</p>
                        <p className="font-medium">{Math.round(weather.temp_f)}°F</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Conditions</p>
                        <p className="font-medium">{weather.condition?.text || 'N/A'}</p>
                      </div>
                      {weather.chance_of_rain !== undefined && (
                        <div>
                          <p className="text-muted-foreground">Chance of Rain</p>
                          <p className="font-medium">{weather.chance_of_rain}%</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedJob(null)}
                  data-testid="button-close-job-modal"
                >
                  Close
                </Button>
                <Button 
                  onClick={() => {
                    // Navigate to job tasks page which shows job-specific details
                    const jobId = selectedJob.originalId || selectedJob.id.replace('project-', '');
                    window.open(`/jobs/${jobId}/tasks`, '_blank');
                  }}
                  data-testid="button-view-job-details"
                >
                  View Full Details
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}