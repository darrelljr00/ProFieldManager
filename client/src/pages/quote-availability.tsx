import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle, Calendar as CalendarIcon, Clock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SelectedTime {
  date: string;
  times: string[];
}

const AVAILABLE_TIME_SLOTS = [
  "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM",
  "4:00 PM", "5:00 PM", "6:00 PM"
];

export default function QuoteAvailabilityPage() {
  const [match, params] = useRoute("/quote-availability/:token");
  const [quoteData, setQuoteData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [timeSelections, setTimeSelections] = useState<Record<string, string[]>>({});
  const { toast } = useToast();
  
  const token = params?.token;

  useEffect(() => {
    if (!token) {
      setError("Invalid availability link");
      setLoading(false);
      return;
    }

    fetchQuoteData();
  }, [token]);

  const fetchQuoteData = async () => {
    try {
      const response = await fetch(`/api/quotes/availability/${token}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error("Failed to load quote information");
      }

      const data = await response.json();
      setQuoteData(data);
    } catch (err: any) {
      setError(err.message || "Failed to load quote information");
    } finally {
      setLoading(false);
    }
  };

  const formatDateKey = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    const dateKey = formatDateKey(date);
    const isSelected = selectedDates.some(d => formatDateKey(d) === dateKey);
    
    if (isSelected) {
      // Remove date
      setSelectedDates(selectedDates.filter(d => formatDateKey(d) !== dateKey));
      const newTimeSelections = { ...timeSelections };
      delete newTimeSelections[dateKey];
      setTimeSelections(newTimeSelections);
    } else {
      // Add date
      setSelectedDates([...selectedDates, date]);
      setTimeSelections({ ...timeSelections, [dateKey]: [] });
    }
  };

  const handleTimeToggle = (date: string, time: string) => {
    const currentTimes = timeSelections[date] || [];
    const newTimes = currentTimes.includes(time)
      ? currentTimes.filter(t => t !== time)
      : [...currentTimes, time];
    
    setTimeSelections({ ...timeSelections, [date]: newTimes });
  };

  const handleSubmit = async () => {
    // Validation
    if (selectedDates.length === 0) {
      toast({
        title: "No dates selected",
        description: "Please select at least one date.",
        variant: "destructive",
      });
      return;
    }

    const hasTimesSelected = Object.values(timeSelections).some(times => times.length > 0);
    if (!hasTimesSelected) {
      toast({
        title: "No times selected",
        description: "Please select at least one time slot for your chosen dates.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const selectedData = selectedDates.map(date => {
        const dateKey = formatDateKey(date);
        return {
          date: dateKey,
          times: timeSelections[dateKey] || [],
        };
      }).filter(item => item.times.length > 0);

      const response = await fetch(`/api/quotes/availability/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedDates: selectedData }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit availability");
      }

      setSuccess(true);
      toast({
        title: "Success!",
        description: "Your availability has been submitted successfully.",
      });
    } catch (err: any) {
      setError(err.message || "Failed to submit availability");
      toast({
        title: "Error",
        description: err.message || "Failed to submit availability",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (error && !quoteData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-green-600">Availability Submitted!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Thank you for providing your availability! We've sent a confirmation to your email and notified our team.
            </p>
            <p className="text-sm text-muted-foreground">
              {quoteData?.organization?.name || 'The company'} will review your availability and contact you shortly to schedule a time that works best.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <CalendarIcon className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Select Your Availability</h1>
          </div>
          <p className="text-muted-foreground">
            Choose the dates and times that work best for you regarding Quote #{quoteData?.quoteNumber}
          </p>
        </div>

        {/* Quote Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Quote Information</CardTitle>
            <CardDescription>
              From: {quoteData?.organization?.name || `${quoteData?.user?.firstName || ''} ${quoteData?.user?.lastName || ''}`.trim() || quoteData?.user?.email}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Quote Number</p>
                <p className="text-lg font-semibold">{quoteData?.quoteNumber}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                <p className="text-lg font-semibold">${parseFloat(quoteData?.total || 0).toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Step 1: Select Dates</CardTitle>
            <CardDescription>Click on the calendar to select dates you're available</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Calendar
              mode="multiple"
              selected={selectedDates}
              onDayClick={handleDateSelect}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        {/* Time Selection */}
        {selectedDates.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Step 2: Select Available Times</CardTitle>
              <CardDescription>Choose your available time slots for each selected date</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {selectedDates.sort((a, b) => a.getTime() - b.getTime()).map((date) => {
                const dateKey = formatDateKey(date);
                const formattedDate = date.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                });

                return (
                  <div key={dateKey} className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <CalendarIcon className="h-5 w-5 text-blue-600" />
                      <h3 className="font-semibold">{formattedDate}</h3>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {AVAILABLE_TIME_SLOTS.map((time) => (
                        <div key={time} className="flex items-center space-x-2">
                          <Checkbox
                            id={`${dateKey}-${time}`}
                            checked={(timeSelections[dateKey] || []).includes(time)}
                            onCheckedChange={() => handleTimeToggle(dateKey, time)}
                          />
                          <label
                            htmlFor={`${dateKey}-${time}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {time}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Submit Button */}
        {selectedDates.length > 0 && (
          <div className="text-center">
            <Button
              size="lg"
              onClick={handleSubmit}
              disabled={submitting}
              className="min-w-[200px]"
              data-testid="button-submit-availability"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4 mr-2" />
                  Submit Availability
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
