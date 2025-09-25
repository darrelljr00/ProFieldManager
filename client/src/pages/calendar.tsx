import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'1month' | '3months' | '1week' | '2weeks'>('1month');

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
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Info Message */}
      <Card>
        <CardHeader>
          <CardTitle>Calendar Information</CardTitle>
          <CardDescription>Basic calendar view</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              Calendar view for browsing dates
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}