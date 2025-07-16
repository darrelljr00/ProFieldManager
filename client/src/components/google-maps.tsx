import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, X } from "lucide-react";

interface GoogleMapsProps {
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
  isOpen: boolean;
  onClose: () => void;
}

interface GPSMapProps {
  markers: Array<{
    lat: number;
    lng: number;
    title: string;
    info: string;
  }>;
  center?: { lat: number; lng: number };
  zoom?: number;
  className?: string;
}

function GoogleMapsDialog({ address, city, state, zipCode, isOpen, onClose }: GoogleMapsProps) {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Format the full address
  const fullAddress = [address, city, state, zipCode].filter(Boolean).join(", ");

  useEffect(() => {
    if (isOpen && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLocationError(null);
        },
        (error) => {
          setLocationError("Unable to get your location. You can still view the destination.");
        }
      );
    }
  }, [isOpen]);

  const openGoogleMaps = () => {
    const encodedAddress = encodeURIComponent(fullAddress);
    
    if (userLocation) {
      // Open directions from current location to destination
      const directionsUrl = `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${encodedAddress}`;
      window.open(directionsUrl, '_blank');
    } else {
      // Just open the destination location
      const locationUrl = `https://www.google.com/maps/search/${encodedAddress}`;
      window.open(locationUrl, '_blank');
    }
  };

  const openInGoogleMapsApp = () => {
    const encodedAddress = encodeURIComponent(fullAddress);
    
    if (userLocation) {
      // Try to open in Google Maps app with directions
      const appUrl = `https://maps.google.com/?saddr=${userLocation.lat},${userLocation.lng}&daddr=${encodedAddress}`;
      window.location.href = appUrl;
    } else {
      // Open destination in app
      const appUrl = `https://maps.google.com/?q=${encodedAddress}`;
      window.location.href = appUrl;
    }
  };

  if (!fullAddress) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Project Location
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="font-medium text-gray-900">Address:</p>
            <p className="text-gray-600 mt-1">{fullAddress}</p>
          </div>

          {locationError && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 text-sm">{locationError}</p>
            </div>
          )}

          {userLocation && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 text-sm flex items-center gap-2">
                <Navigation className="h-4 w-4" />
                Location access granted - directions available
              </p>
            </div>
          )}

          <div className="space-y-3">
            <Button 
              onClick={openGoogleMaps}
              className="w-full flex items-center justify-center gap-2"
            >
              <MapPin className="h-4 w-4" />
              {userLocation ? "Get Directions" : "View Location"}
            </Button>
            
            <Button 
              onClick={openInGoogleMapsApp}
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
            >
              <Navigation className="h-4 w-4" />
              Open in Google Maps App
            </Button>
          </div>

          <div className="text-xs text-gray-500 text-center">
            {userLocation 
              ? "Directions will open from your current location to the project address"
              : "Allow location access for turn-by-turn directions"
            }
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface DirectionsButtonProps {
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

function DirectionsButton({ address, city, state, zipCode, className, variant = "outline", size = "sm" }: DirectionsButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Don't show button if no address is provided
  if (!address && !city) {
    return null;
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsDialogOpen(true)}
        className={className}
      >
        <Navigation className="h-4 w-4 mr-2" />
        Directions
      </Button>
      
      <GoogleMapsDialog
        address={address || ""}
        city={city || undefined}
        state={state || undefined}
        zipCode={zipCode || undefined}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </>
  );
}

function GPSMap({ markers, center, zoom = 10, className = "w-full h-96" }: GPSMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  useEffect(() => {
    if (!mapRef.current || !window.google) return;

    const mapCenter = center || (markers.length > 0 ? markers[0] : { lat: 0, lng: 0 });
    
    const map = new window.google.maps.Map(mapRef.current, {
      center: mapCenter,
      zoom: zoom,
      styles: [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }]
        }
      ]
    });

    mapInstanceRef.current = map;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add new markers
    markers.forEach(markerData => {
      const marker = new window.google.maps.Marker({
        position: { lat: markerData.lat, lng: markerData.lng },
        map: map,
        title: markerData.title,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#dc2626"/>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(24, 24),
          anchor: new window.google.maps.Point(12, 24)
        }
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 8px;">
            <h3 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600;">${markerData.title}</h3>
            <p style="margin: 0; font-size: 12px; color: #666;">${markerData.info}</p>
            <p style="margin: 4px 0 0 0; font-size: 11px; color: #999;">
              ${markerData.lat.toFixed(6)}, ${markerData.lng.toFixed(6)}
            </p>
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      markersRef.current.push(marker);
    });

    // Fit bounds if multiple markers
    if (markers.length > 1) {
      const bounds = new window.google.maps.LatLngBounds();
      markers.forEach(marker => {
        bounds.extend({ lat: marker.lat, lng: marker.lng });
      });
      map.fitBounds(bounds);
    }

  }, [markers, center, zoom]);

  return <div ref={mapRef} className={className} />;
}

// Load Google Maps script
function loadGoogleMapsScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps) {
      resolve();
      return;
    }

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyCy9lgjvkKV3vS_U1IIcmxJUC8q8yJaASI';
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });
}

function GoogleMapsContainer({ markers, center, zoom, className }: GPSMapProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyCy9lgjvkKV3vS_U1IIcmxJUC8q8yJaASI';
    if (!apiKey) {
      setError('Google Maps API key not configured');
      return;
    }

    loadGoogleMapsScript()
      .then(() => setIsLoaded(true))
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <div className={`${className} bg-muted rounded-lg flex items-center justify-center`}>
        <div className="text-center">
          <MapPin className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={`${className} bg-muted rounded-lg flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading map...</p>
        </div>
      </div>
    );
  }

  return <GPSMap markers={markers} center={center} zoom={zoom} className={className} />;
}

// Default export for the main component
export default GoogleMapsDialog;

// Named exports for individual components
export { GoogleMapsDialog, DirectionsButton, GoogleMapsContainer };