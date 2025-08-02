import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Cloud, CloudRain, Sun, CloudSnow, Thermometer, Droplets } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface WeatherData {
  condition: string;
  temperature: number;
  rainChance: number;
  isRainy: boolean;
  precipitationMm: number;
}

interface WeatherWidgetProps {
  jobId?: number;
  calendarJobId?: number;
  location?: string;
  compact?: boolean;
  className?: string;
}

const getWeatherIcon = (condition: string, isRainy: boolean) => {
  const conditionLower = condition.toLowerCase();
  
  if (isRainy || conditionLower.includes('rain') || conditionLower.includes('drizzle')) {
    return <CloudRain className="h-4 w-4 text-blue-500" />;
  }
  
  if (conditionLower.includes('snow') || conditionLower.includes('sleet')) {
    return <CloudSnow className="h-4 w-4 text-blue-300" />;
  }
  
  if (conditionLower.includes('cloud') || conditionLower.includes('overcast')) {
    return <Cloud className="h-4 w-4 text-gray-500" />;
  }
  
  return <Sun className="h-4 w-4 text-yellow-500" />;
};

const getRainBadgeVariant = (rainChance: number) => {
  if (rainChance >= 70) return 'destructive';
  if (rainChance >= 40) return 'default';
  if (rainChance >= 20) return 'secondary';
  return 'outline';
};

export function WeatherWidget({ jobId, calendarJobId, location, compact = false, className = '' }: WeatherWidgetProps) {
  const [weatherData, setWeatherData] = useState<{
    startDate?: WeatherData;
    endDate?: WeatherData;
    location?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      if (!jobId && !calendarJobId && !location) return;
      
      setLoading(true);
      setError(null);
      
      try {
        let response;
        
        if (jobId) {
          response = await apiRequest('GET', `/api/weather/jobs/${jobId}`);
        } else if (calendarJobId) {
          response = await apiRequest('GET', `/api/weather/calendar-job/${calendarJobId}`);
        } else if (location) {
          response = await apiRequest('GET', `/api/weather/current/${encodeURIComponent(location)}`);
        }
        
        const data = await response.json();
        
        if (data.weather) {
          setWeatherData(data.weather);
        } else if (data.summary) {
          setWeatherData({ startDate: data.summary });
        }
      } catch (err: any) {
        console.error('Weather fetch error:', err);
        setError('Unable to load weather data');
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [jobId, calendarJobId, location]);

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
        <span className="text-sm text-gray-500">Loading weather...</span>
      </div>
    );
  }

  if (error || !weatherData) {
    return null; // Silently fail for weather data
  }

  const { startDate, endDate } = weatherData;
  const primaryWeather = startDate || endDate;

  if (!primaryWeather) return null;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <div className={`flex items-center gap-1 ${className}`}>
              {getWeatherIcon(primaryWeather.condition, primaryWeather.isRainy)}
              {primaryWeather.rainChance > 0 && (
                <Badge variant={getRainBadgeVariant(primaryWeather.rainChance)} className="text-xs">
                  {primaryWeather.rainChance}%
                </Badge>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-medium">{primaryWeather.condition}</p>
              <div className="flex items-center gap-2 text-sm">
                <Thermometer className="h-3 w-3" />
                {Math.round(primaryWeather.temperature)}°C
              </div>
              {primaryWeather.rainChance > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Droplets className="h-3 w-3" />
                  {primaryWeather.rainChance}% chance of rain
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Card className={`${className}`}>
      <CardContent className="p-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getWeatherIcon(primaryWeather.condition, primaryWeather.isRainy)}
              <span className="text-sm font-medium">{primaryWeather.condition}</span>
            </div>
            <span className="text-sm text-gray-600">{Math.round(primaryWeather.temperature)}°C</span>
          </div>
          
          {primaryWeather.rainChance > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Rain chance</span>
              <Badge variant={getRainBadgeVariant(primaryWeather.rainChance)}>
                {primaryWeather.rainChance}%
              </Badge>
            </div>
          )}
          
          {primaryWeather.isRainy && primaryWeather.precipitationMm > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Precipitation</span>
              <span className="text-sm font-medium">{primaryWeather.precipitationMm}mm</span>
            </div>
          )}
          
          {endDate && endDate !== startDate && (
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getWeatherIcon(endDate.condition, endDate.isRainy)}
                  <span className="text-xs text-gray-600">End date</span>
                </div>
                {endDate.rainChance > 0 && (
                  <Badge variant={getRainBadgeVariant(endDate.rainChance)} className="text-xs">
                    {endDate.rainChance}%
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}