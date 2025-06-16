import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Loader2 } from "lucide-react";

interface JobLocation {
  id: number;
  projectId: number;
  projectName: string;
  address: string;
  lat: number;
  lng: number;
  scheduledTime: string;
  estimatedDuration: number;
  assignedTo?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'scheduled' | 'in-progress' | 'completed';
}

interface RouteOptimization {
  optimizedOrder: number[];
  totalDistance: number;
  totalDuration: number;
  routeLegs: {
    from: JobLocation;
    to: JobLocation;
    distance: number;
    duration: number;
    directions: string;
  }[];
}

interface DispatchMapProps {
  jobs: JobLocation[];
  optimization?: RouteOptimization | null;
  startLocation?: string;
}

declare global {
  interface Window {
    google: any;
  }
}

export function DispatchMap({ jobs, optimization, startLocation }: DispatchMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: '#3b82f6',      // blue
      medium: '#f59e0b',   // yellow
      high: '#f97316',     // orange
      urgent: '#ef4444',   // red
    };
    return colors[priority as keyof typeof colors] || colors.medium;
  };

  // Initialize Google Maps
  const initializeMap = () => {
    if (!mapRef.current || !window.google?.maps || jobs.length === 0) {
      setIsLoading(false);
      return;
    }

    try {
      // Create map centered on the first job
      const map = new window.google.maps.Map(mapRef.current, {
        zoom: 12,
        center: { lat: 32.7767, lng: -96.7970 }, // Dallas default
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
      });

      // Add markers for each job
      const bounds = new window.google.maps.LatLngBounds();
      
      jobs.forEach((job, index) => {
        // Use a default location for demonstration
        const position = { 
          lat: 32.7767 + (Math.random() - 0.5) * 0.1, 
          lng: -96.7970 + (Math.random() - 0.5) * 0.1 
        };
        
        const marker = new window.google.maps.Marker({
          position: position,
          map: map,
          title: job.projectName,
          label: (index + 1).toString(),
        });

        bounds.extend(position);

        // Add info window
        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="padding: 8px; min-width: 200px;">
              <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold;">${job.projectName}</h3>
              <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">${job.address}</p>
              <p style="margin: 0 0 4px 0; font-size: 12px;"><strong>Time:</strong> ${job.scheduledTime}</p>
              <p style="margin: 0 0 4px 0; font-size: 12px;"><strong>Duration:</strong> ${job.estimatedDuration} min</p>
              <p style="margin: 0 0 4px 0; font-size: 12px;"><strong>Assigned:</strong> ${job.assignedTo || 'Unassigned'}</p>
              <span style="background: ${getPriorityColor(job.priority)}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; text-transform: uppercase;">${job.priority}</span>
            </div>
          `
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });
      });

      if (jobs.length > 1) {
        map.fitBounds(bounds);
      }

      setIsLoading(false);
    } catch (err) {
      console.error('Error initializing map:', err);
      setError('Failed to load map');
      setIsLoading(false);
    }
  };

  // Load Google Maps API
  useEffect(() => {
    const loadGoogleMaps = () => {
      if (window.google?.maps) {
        initializeMap();
        return;
      }

      // For now, just show a message that Google Maps needs to be configured
      setError('Google Maps integration requires API key configuration');
      setIsLoading(false);
    };

    if (jobs.length > 0) {
      loadGoogleMaps();
    } else {
      setIsLoading(false);
    }
  }, [jobs, optimization, startLocation]);

  if (jobs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Route Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-gray-500">
            <div className="text-center">
              <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No scheduled jobs to display</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Route Map
          {optimization && (
            <Badge variant="secondary" className="ml-auto">
              <Navigation className="h-3 w-3 mr-1" />
              Optimized Route
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-600">Loading map...</p>
            </div>
          </div>
        )}
        
        {error && (
          <div className="flex items-center justify-center h-64 text-orange-600 bg-orange-50 rounded-lg">
            <div className="text-center p-4">
              <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="font-medium">Map View Available</p>
              <p className="text-sm mt-1">Configure Google Maps API key to display interactive map with job locations and optimized routes</p>
            </div>
          </div>
        )}

        <div 
          ref={mapRef} 
          className={`w-full h-64 rounded-lg bg-gray-100 ${isLoading || error ? 'hidden' : ''}`}
        />

        {!isLoading && !error && (
          <div className="mt-4 space-y-2">
            <h4 className="font-medium text-sm">Map Legend:</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span>Low Priority</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span>Medium Priority</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span>High Priority</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>Urgent Priority</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}