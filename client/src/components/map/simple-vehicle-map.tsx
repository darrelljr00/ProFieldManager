import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface SimpleVehicleMapProps {
  locations: any[];
  selectedVehicleId?: string;
  className?: string;
}

// Custom vehicle icon
const createVehicleIcon = () => {
  return L.divIcon({
    html: `<div style="background-color: #3b82f6; border: 2px solid white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-center;">
      <svg style="width: 14px; height: 14px; color: white;" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
      </svg>
    </div>`,
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

export function SimpleVehicleMap({ locations, selectedVehicleId, className = "" }: SimpleVehicleMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [32.7767, -96.7970], // Dallas, TX default
      zoom: 13,
      zoomControl: true,
    });

    // Add dark tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap contributors © CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers when locations change
  useEffect(() => {
    if (!mapRef.current || !locations || locations.length === 0) return;

    const map = mapRef.current;
    const markers = markersRef.current;

    // Clear old markers
    markers.forEach(marker => map.removeLayer(marker));
    markers.clear();

    // Add new markers
    const bounds: L.LatLngBounds[] = [];

    locations.forEach(location => {
      if (location.latitude && location.longitude) {
        const lat = parseFloat(location.latitude);
        const lng = parseFloat(location.longitude);
        
        const marker = L.marker([lat, lng], {
          icon: createVehicleIcon()
        }).addTo(map);

        const vehicleId = location.vehicleId?.toString() || 'unknown';
        
        // Add popup with location info
        marker.bindPopup(`
          <div style="color: black;">
            <strong>Vehicle ${vehicleId}</strong><br/>
            Speed: ${location.speed ? Math.round(parseFloat(location.speed)) : 0} mph<br/>
            Time: ${location.timestamp ? new Date(location.timestamp).toLocaleTimeString() : 'N/A'}
          </div>
        `);

        markers.set(vehicleId, marker);
        bounds.push(L.latLngBounds([lat, lng], [lat, lng]));
      }
    });

    // Fit map to show all markers
    if (bounds.length > 0) {
      const group = L.featureGroup(Array.from(markers.values()));
      map.fitBounds(group.getBounds(), { padding: [50, 50] });
    }
  }, [locations]);

  return (
    <div ref={mapContainerRef} className={`w-full h-full ${className}`} />
  );
}
