import { useState, useEffect } from "react";
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

export function GoogleMapsDialog({ address, city, state, zipCode, isOpen, onClose }: GoogleMapsProps) {
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
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  className?: string;
}

export function DirectionsButton({ address, city, state, zipCode, className }: DirectionsButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Don't show button if no address is provided
  if (!address && !city) {
    return null;
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsDialogOpen(true)}
        className={className}
      >
        <Navigation className="h-4 w-4 mr-2" />
        Directions
      </Button>
      
      <GoogleMapsDialog
        address={address || ""}
        city={city}
        state={state}
        zipCode={zipCode}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </>
  );
}