import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { buildApiUrl, getAuthHeaders } from "@/lib/api-config";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  MapPin, 
  Repeat, 
  CloudRain,
  Sun,
  Cloud 
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

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'1month' | '3months' | '1week' | '2weeks'>('1month');

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
  const { data: jobs, isLoading } = useQuery<CalendarJob[]>({
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
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
    refetchOnWindowFocus: true,
    staleTime: 0, // Always refetch to get latest data
  });

  // Fetch weather for jobs
  const jobsWithWeather = useQuery<{[key: string]: JobWeather}>({
    queryKey: ['/api/weather/jobs', jobs?.map(j => j.originalId).filter(Boolean)],
    queryFn: async () => {
      if (!jobs?.length) return {};
      
      const weatherData: {[key: string]: JobWeather} = {};
      
      // Fetch weather for each job that has an originalId
      await Promise.all(
        jobs
          .filter(job => job.originalId)
          .map(async (job) => {
            try {
              const response = await fetch(`/api/weather/jobs/${job.originalId}`);
              if (response.ok) {
                const data = await response.json();
                // Use start date weather if available
                if (data.weather?.startDate) {
                  weatherData[job.id] = {
                    temp_f: data.weather.startDate.temp_f,
                    condition: data.weather.startDate.condition,
                    chance_of_rain: data.weather.startDate.chance_of_rain
                  };
                }
              }
            } catch (error) {
              console.warn(`Failed to fetch weather for job ${job.id}:`, error);
            }
          })
      );
      
      return weatherData;
    },
    enabled: !!jobs?.length
  });

  // Group jobs by date
  const getJobsForDate = (date: Date) => {
    if (!jobs) return [];
    
    const dateStr = date.toISOString().split('T')[0];
    return jobs.filter(job => {
      const jobStart = job.startDate;
      const jobEnd = job.endDate;
      
      // Check if the job occurs on this date
      return jobStart <= dateStr && jobEnd >= dateStr;
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground">View your calendar</p>
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
              
              return (
                <div
                  key={index}
                  className={`min-h-[120px] p-2 border rounded-lg ${
                    isCurrentMonth ? 'bg-background' : 'bg-muted/30'
                  } ${isToday ? 'ring-2 ring-primary' : ''}`}
                >
                  <div className={`text-sm font-medium mb-2 ${
                    isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {day.getDate()}
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
                            className={`p-2 rounded-md border text-xs ${
                              priorityColors[job.priority as keyof typeof priorityColors] || 
                              priorityColors.medium
                            }`}
                            data-testid={`calendar-job-${job.id}`}
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
                                    {weather.condition.text.toLowerCase().includes('rain') ? (
                                      <CloudRain className="h-3 w-3" />
                                    ) : weather.condition.text.toLowerCase().includes('cloud') ? (
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
    </div>
  );
}