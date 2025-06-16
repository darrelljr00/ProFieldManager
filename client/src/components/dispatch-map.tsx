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
    trafficDelay?: number;
    trafficCondition?: 'normal' | 'light' | 'moderate' | 'heavy' | 'unknown';
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

  // Geocode a single address
  const geocodeAddress = async (address: string): Promise<{lat: number, lng: number} | null> => {
    if (!window.google?.maps) return null;
    
    const geocoder = new window.google.maps.Geocoder();
    
    try {
      const result = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
        geocoder.geocode({ address }, (results, status) => {
          if (status === 'OK' && results) {
            resolve(results);
          } else {
            reject(new Error(`Geocoding failed: ${status}`));
          }
        });
      });

      if (result[0]) {
        return {
          lat: result[0].geometry.location.lat(),
          lng: result[0].geometry.location.lng()
        };
      }
    } catch (err) {
      console.warn(`Failed to geocode address: ${address}`, err);
    }
    
    return null;
  };

  // Initialize Google Maps with traffic layer
  const initializeMap = async () => {
    if (!mapRef.current || !window.google?.maps || jobs.length === 0) {
      setIsLoading(false);
      return;
    }

    try {
      // Create map with traffic layer enabled
      const map = new window.google.maps.Map(mapRef.current, {
        zoom: 12,
        center: { lat: 32.7767, lng: -96.7970 }, // Dallas default
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }]
          }
        ]
      });

      // Enable traffic layer for real-time traffic data
      const trafficLayer = new window.google.maps.TrafficLayer();
      trafficLayer.setMap(map);

      // Geocode job addresses and add markers
      const bounds = new window.google.maps.LatLngBounds();
      const geocodedJobs = [];
      
      for (let i = 0; i < jobs.length; i++) {
        const job = jobs[i];
        let position = null;
        
        // Try to geocode the actual address
        if (job.address) {
          position = await geocodeAddress(job.address);
        }
        
        // Fallback to demo locations if geocoding fails
        if (!position) {
          position = { 
            lat: 32.7767 + (Math.random() - 0.5) * 0.1, 
            lng: -96.7970 + (Math.random() - 0.5) * 0.1 
          };
        }
        
        geocodedJobs.push({ ...job, ...position });
        
        // Create custom marker with priority color
        const marker = new window.google.maps.Marker({
          position: position,
          map: map,
          title: job.projectName,
          label: {
            text: (i + 1).toString(),
            color: 'white',
            fontSize: '12px',
            fontWeight: 'bold'
          },
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 15,
            fillColor: getPriorityColor(job.priority),
            fillOpacity: 0.8,
            strokeColor: '#fff',
            strokeWeight: 2
          }
        });

        bounds.extend(position);

        // Enhanced info window with traffic considerations
        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="padding: 12px; min-width: 220px; font-family: system-ui;">
              <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold; color: #1f2937;">${job.projectName}</h3>
              <div style="margin: 0 0 8px 0; padding: 8px; background: #f3f4f6; border-radius: 6px;">
                <p style="margin: 0 0 4px 0; font-size: 13px; color: #4b5563;"><strong>📍 Address:</strong></p>
                <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280;">${job.address}</p>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px;">
                  <div><strong>🕒 Time:</strong> ${job.scheduledTime}</div>
                  <div><strong>⏱️ Duration:</strong> ${job.estimatedDuration}min</div>
                  <div><strong>👤 Assigned:</strong> ${job.assignedTo || 'Unassigned'}</div>
                  <div><strong>🚦 Traffic:</strong> <span style="color: #059669;">Live data</span></div>
                </div>
              </div>
              <div style="text-align: center;">
                <span style="background: ${getPriorityColor(job.priority)}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 11px; text-transform: uppercase; font-weight: 600;">${job.priority} priority</span>
              </div>
            </div>
          `
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });
      }

      // Draw optimized route with traffic-aware directions
      if (optimization && startLocation && geocodedJobs.length > 0) {
        await drawTrafficAwareRoute(map, geocodedJobs, optimization, startLocation);
      }

      if (geocodedJobs.length > 1) {
        map.fitBounds(bounds);
      } else if (geocodedJobs.length === 1) {
        map.setCenter(geocodedJobs[0]);
        map.setZoom(15);
      }

      setIsLoading(false);
    } catch (err) {
      console.error('Error initializing map:', err);
      setError('Failed to load map with traffic data');
      setIsLoading(false);
    }
  };

  // Draw route with real-time traffic considerations
  const drawTrafficAwareRoute = async (map: any, geocodedJobs: any[], routeOptimization: RouteOptimization, start: string) => {
    if (!window.google?.maps) return;

    try {
      const directionsService = new window.google.maps.DirectionsService();
      const directionsRenderer = new window.google.maps.DirectionsRenderer({
        suppressMarkers: true, // Use our custom markers
        polylineOptions: {
          strokeColor: '#2563eb',
          strokeWeight: 4,
          strokeOpacity: 0.8
        }
      });

      directionsRenderer.setMap(map);

      // Create waypoints from optimized order
      const orderedJobs = routeOptimization.optimizedOrder.map(index => geocodedJobs[index]);
      const waypoints = orderedJobs.slice(1, -1).map(job => ({
        location: new window.google.maps.LatLng(job.lat, job.lng),
        stopover: true
      }));

      const origin = start;
      const destination = orderedJobs[orderedJobs.length - 1] 
        ? new window.google.maps.LatLng(orderedJobs[orderedJobs.length - 1].lat, orderedJobs[orderedJobs.length - 1].lng)
        : start;

      // Request directions with traffic model for real-time data
      directionsService.route({
        origin: origin,
        destination: destination,
        waypoints: waypoints,
        optimizeWaypoints: false, // We already have the optimized order
        travelMode: window.google.maps.TravelMode.DRIVING,
        drivingOptions: {
          departureTime: new Date(), // Use current time for real-time traffic
          trafficModel: window.google.maps.TrafficModel.BEST_GUESS
        },
        avoidHighways: false,
        avoidTolls: false
      }, (result: any, status: any) => {
        if (status === 'OK' && result) {
          directionsRenderer.setDirections(result);
          
          // Update route summary with traffic-adjusted times
          const route = result.routes[0];
          if (route) {
            const totalDuration = route.legs.reduce((sum: number, leg: any) => sum + leg.duration_in_traffic?.value || leg.duration.value, 0);
            const totalDistance = route.legs.reduce((sum: number, leg: any) => sum + leg.distance.value, 0);
            
            console.log('Traffic-aware route calculated:', {
              totalDuration: Math.round(totalDuration / 60),
              totalDistance: Math.round(totalDistance / 1000),
              trafficDelay: route.legs.some((leg: any) => leg.duration_in_traffic?.value > leg.duration.value)
            });
          }
        } else {
          console.warn('Traffic-aware directions request failed:', status);
        }
      });
    } catch (err) {
      console.warn('Failed to draw traffic-aware route:', err);
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