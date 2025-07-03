import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Cloud, 
  Sun, 
  CloudRain, 
  CloudSnow, 
  Wind, 
  Droplets, 
  Thermometer, 
  Eye,
  Gauge,
  MapPin,
  Calendar,
  Clock,
  Sunrise,
  Sunset,
  CloudDrizzle,
  Zap,
  CloudLightning
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface WeatherData {
  location: {
    name: string;
    region: string;
    country: string;
    lat: number;
    lon: number;
    tz_id: string;
    localtime: string;
  };
  current: {
    last_updated: string;
    temp_c: number;
    temp_f: number;
    is_day: number;
    condition: {
      text: string;
      icon: string;
      code: number;
    };
    wind_mph: number;
    wind_kph: number;
    wind_degree: number;
    wind_dir: string;
    pressure_mb: number;
    pressure_in: number;
    precip_mm: number;
    precip_in: number;
    humidity: number;
    cloud: number;
    feelslike_c: number;
    feelslike_f: number;
    vis_km: number;
    vis_miles: number;
    uv: number;
    gust_mph: number;
    gust_kph: number;
  };
  forecast: {
    forecastday: Array<{
      date: string;
      date_epoch: number;
      day: {
        maxtemp_c: number;
        maxtemp_f: number;
        mintemp_c: number;
        mintemp_f: number;
        avgtemp_c: number;
        avgtemp_f: number;
        maxwind_mph: number;
        maxwind_kph: number;
        totalprecip_mm: number;
        totalprecip_in: number;
        totalsnow_cm: number;
        avgvis_km: number;
        avgvis_miles: number;
        avghumidity: number;
        daily_will_it_rain: number;
        daily_chance_of_rain: number;
        daily_will_it_snow: number;
        daily_chance_of_snow: number;
        condition: {
          text: string;
          icon: string;
          code: number;
        };
        uv: number;
      };
      astro: {
        sunrise: string;
        sunset: string;
        moonrise: string;
        moonset: string;
        moon_phase: string;
        moon_illumination: string;
      };
      hour: Array<{
        time_epoch: number;
        time: string;
        temp_c: number;
        temp_f: number;
        is_day: number;
        condition: {
          text: string;
          icon: string;
          code: number;
        };
        wind_mph: number;
        wind_kph: number;
        wind_degree: number;
        wind_dir: string;
        pressure_mb: number;
        pressure_in: number;
        precip_mm: number;
        precip_in: number;
        humidity: number;
        cloud: number;
        feelslike_c: number;
        feelslike_f: number;
        windchill_c: number;
        windchill_f: number;
        heatindex_c: number;
        heatindex_f: number;
        dewpoint_c: number;
        dewpoint_f: number;
        will_it_rain: number;
        chance_of_rain: number;
        will_it_snow: number;
        chance_of_snow: number;
        vis_km: number;
        vis_miles: number;
        gust_mph: number;
        gust_kph: number;
        uv: number;
      }>;
    }>;
  };
}

const getWeatherIcon = (conditionCode: number, isDay: number = 1) => {
  // Sunny/Clear
  if (conditionCode === 1000) {
    return isDay ? <Sun className="h-8 w-8 text-yellow-500" /> : <Cloud className="h-8 w-8 text-gray-400" />;
  }
  // Partly cloudy
  if ([1003, 1006].includes(conditionCode)) {
    return <Cloud className="h-8 w-8 text-gray-500" />;
  }
  // Cloudy/Overcast
  if ([1009, 1030, 1135, 1147].includes(conditionCode)) {
    return <Cloud className="h-8 w-8 text-gray-600" />;
  }
  // Rain
  if ([1063, 1150, 1153, 1168, 1171, 1180, 1183, 1186, 1189, 1192, 1195, 1198, 1201, 1240, 1243, 1246].includes(conditionCode)) {
    return <CloudRain className="h-8 w-8 text-blue-500" />;
  }
  // Drizzle
  if ([1072, 1150, 1153].includes(conditionCode)) {
    return <CloudDrizzle className="h-8 w-8 text-blue-400" />;
  }
  // Snow
  if ([1066, 1069, 1114, 1117, 1204, 1207, 1210, 1213, 1216, 1219, 1222, 1225, 1237, 1249, 1252, 1255, 1258, 1261, 1264].includes(conditionCode)) {
    return <CloudSnow className="h-8 w-8 text-blue-200" />;
  }
  // Thunderstorm
  if ([1087, 1273, 1276, 1279, 1282].includes(conditionCode)) {
    return <CloudLightning className="h-8 w-8 text-purple-500" />;
  }
  
  return <Cloud className="h-8 w-8 text-gray-500" />;
};

const formatTime = (timeStr: string) => {
  const date = new Date(timeStr);
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });
};

export default function Weather() {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Fetch weather data
  const { data: weatherData, isLoading, error } = useQuery<WeatherData>({
    queryKey: ['/api/weather/forecast'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/weather/forecast');
      return response.json();
    },
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
  });

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Cloud className="h-8 w-8" />
            Weather Forecast
          </h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !weatherData) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Cloud className="h-8 w-8" />
            Weather Forecast
          </h1>
        </div>
        
        <Card>
          <CardContent className="p-8 text-center">
            <Cloud className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Weather data unavailable</h3>
            <p className="text-gray-600 mb-4">
              Please configure your weather settings with a valid API key and location.
            </p>
            <Badge variant="outline">
              Check Settings → Weather for configuration
            </Badge>
          </CardContent>
        </Card>
      </div>
    );
  }

  const current = weatherData.current;
  const forecast = weatherData.forecast.forecastday;
  const location = weatherData.location;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Cloud className="h-8 w-8" />
          Weather Forecast
        </h1>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="h-4 w-4" />
          Updated: {formatTime(current.last_updated)}
        </div>
      </div>

      {/* Current Weather */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950 dark:to-indigo-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {location.name}, {location.region}
          </CardTitle>
          <CardDescription>
            Current conditions as of {formatTime(current.last_updated)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Main Temperature */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-4">
                {getWeatherIcon(current.condition.code, current.is_day)}
                <div>
                  <div className="text-4xl font-bold">
                    {Math.round(current.temp_f)}°F
                  </div>
                  <div className="text-lg text-gray-600">
                    {current.condition.text}
                  </div>
                  <div className="text-sm text-gray-500">
                    Feels like {Math.round(current.feelslike_f)}°F
                  </div>
                </div>
              </div>
            </div>

            {/* Weather Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Wind className="h-4 w-4 text-gray-500" />
                <span className="text-sm">
                  {Math.round(current.wind_mph)} mph {current.wind_dir}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-blue-500" />
                <span className="text-sm">{current.humidity}% humidity</span>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-gray-500" />
                <span className="text-sm">{Math.round(current.vis_miles)} mi visibility</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-gray-500" />
                <span className="text-sm">{current.pressure_in}" pressure</span>
              </div>
              <div className="flex items-center gap-2">
                <Sun className="h-4 w-4 text-yellow-500" />
                <span className="text-sm">UV Index: {current.uv}</span>
              </div>
              <div className="flex items-center gap-2">
                <Cloud className="h-4 w-4 text-gray-500" />
                <span className="text-sm">{current.cloud}% cloud cover</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5-Day Forecast */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          5-Day Forecast
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {forecast.slice(0, 5).map((day, index) => (
            <Card key={day.date} className={index === 0 ? "ring-2 ring-blue-500" : ""}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  {index === 0 ? "Today" : formatDate(day.date)}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-center space-y-3">
                  {getWeatherIcon(day.day.condition.code)}
                  <div>
                    <div className="text-lg font-semibold">
                      {Math.round(day.day.maxtemp_f)}°
                    </div>
                    <div className="text-sm text-gray-600">
                      {Math.round(day.day.mintemp_f)}°
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 text-center">
                    {day.day.condition.text}
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Droplets className="h-3 w-3" />
                        Rain
                      </span>
                      <span>{day.day.daily_chance_of_rain}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Wind className="h-3 w-3" />
                        Wind
                      </span>
                      <span>{Math.round(day.day.maxwind_mph)} mph</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Droplets className="h-3 w-3" />
                        Humidity
                      </span>
                      <span>{day.day.avghumidity}%</span>
                    </div>
                  </div>

                  {index === 0 && (
                    <>
                      <Separator />
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Sunrise className="h-3 w-3 text-orange-500" />
                            Sunrise
                          </span>
                          <span>{day.astro.sunrise}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Sunset className="h-3 w-3 text-orange-600" />
                            Sunset
                          </span>
                          <span>{day.astro.sunset}</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Hourly Forecast for Today */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Today's Hourly Forecast
        </h2>
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-4 overflow-x-auto pb-2">
              {forecast[0]?.hour
                .filter((hour) => {
                  const hourTime = new Date(hour.time);
                  return hourTime >= currentTime;
                })
                .slice(0, 12)
                .map((hour) => (
                  <div key={hour.time} className="flex-shrink-0 text-center space-y-2 min-w-[80px]">
                    <div className="text-xs font-medium">
                      {formatTime(hour.time)}
                    </div>
                    <div className="flex justify-center">
                      {getWeatherIcon(hour.condition.code, hour.is_day)}
                    </div>
                    <div className="text-sm font-semibold">
                      {Math.round(hour.temp_f)}°
                    </div>
                    <div className="text-xs text-gray-500">
                      {hour.chance_of_rain}%
                    </div>
                    <div className="text-xs text-gray-400">
                      {Math.round(hour.wind_mph)}mph
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}