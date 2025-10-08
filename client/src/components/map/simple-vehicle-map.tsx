import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface SimpleVehicleMapProps {
  locations: any[];
  selectedVehicleId?: string;
  className?: string;
}

// Custom vehicle icon with motion status color
const createVehicleIcon = (isMoving: boolean) => {
  const color = isMoving ? '#22c55e' : '#ef4444'; // Green for moving, red for stopped
  return L.divIcon({
    html: `<div style="background-color: ${color}; border: 2px solid white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-center; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
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
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const pathLinesRef = useRef<Map<string, L.Polyline>>(new Map());
  const pathHistoryRef = useRef<Map<string, [number, number][]>>(new Map());

  // Fetch GPS settings for map layer preference
  const { data: gpsSettings } = useQuery<any>({
    queryKey: ['/api/gps-settings'],
    refetchInterval: 5000, // Refetch every 5 seconds to pick up changes
  });

  const mapLayer = gpsSettings?.mapDefaultLayer || 'dark';

  // Get tile layer URL based on preference
  const getTileLayerUrl = (layer: string) => {
    switch (layer) {
      case 'light':
        return 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
      case 'medium':
        return 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
      case 'dark':
      default:
        return 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    }
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [32.7767, -96.7970], // Dallas, TX default
      zoom: 13,
      zoomControl: true,
    });

    // Add initial tile layer
    const tileLayer = L.tileLayer(getTileLayerUrl(mapLayer), {
      attribution: '© OpenStreetMap contributors © CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;
    tileLayerRef.current = tileLayer;

    return () => {
      // Clean up path lines
      pathLinesRef.current.forEach(line => map.removeLayer(line));
      pathLinesRef.current.clear();
      pathHistoryRef.current.clear();
      
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
    };
  }, []);

  // Update tile layer when map layer preference changes
  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current) return;

    const map = mapRef.current;
    const currentLayer = tileLayerRef.current;

    // Remove old tile layer
    map.removeLayer(currentLayer);

    // Add new tile layer
    const newTileLayer = L.tileLayer(getTileLayerUrl(mapLayer), {
      attribution: '© OpenStreetMap contributors © CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    tileLayerRef.current = newTileLayer;
  }, [mapLayer]);

  // Update markers and path lines when locations change
  useEffect(() => {
    if (!mapRef.current || !locations || locations.length === 0) return;

    const map = mapRef.current;
    const markers = markersRef.current;
    const pathLines = pathLinesRef.current;
    const pathHistory = pathHistoryRef.current;

    // Clear old markers
    markers.forEach(marker => map.removeLayer(marker));
    markers.clear();

    // Add new markers and update paths
    const bounds: L.LatLngBounds[] = [];
    const MAX_PATH_POINTS = 100; // Keep last 100 points

    locations.forEach(location => {
      if (location.latitude && location.longitude) {
        const lat = parseFloat(location.latitude);
        const lng = parseFloat(location.longitude);
        const vehicleId = location.vehicleId?.toString() || location.deviceId || 'unknown';
        
        // Update path history for this vehicle
        if (!pathHistory.has(vehicleId)) {
          pathHistory.set(vehicleId, []);
        }
        const history = pathHistory.get(vehicleId)!;
        
        // Add new point if it's different from the last point
        const lastPoint = history[history.length - 1];
        if (!lastPoint || lastPoint[0] !== lat || lastPoint[1] !== lng) {
          history.push([lat, lng]);
          
          // Limit path history to MAX_PATH_POINTS
          if (history.length > MAX_PATH_POINTS) {
            history.shift();
          }
        }

        // Create or update polyline for vehicle path
        if (history.length > 1) {
          if (pathLines.has(vehicleId)) {
            // Update existing polyline
            pathLines.get(vehicleId)!.setLatLngs(history);
          } else {
            // Create new polyline
            const pathLine = L.polyline(history, {
              color: '#3b82f6',
              weight: 3,
              opacity: 0.7,
              smoothFactor: 1
            }).addTo(map);
            pathLines.set(vehicleId, pathLine);
          }
        }
        
        // Determine if vehicle is moving (speed >= 1 mph to avoid GPS drift)
        const speed = parseFloat(location.speed) || 0;
        const isMoving = speed >= 1;
        
        const marker = L.marker([lat, lng], {
          icon: createVehicleIcon(isMoving)
        }).addTo(map);

        const displayName = location.displayName || `Vehicle ${vehicleId}`;
        const statusColor = isMoving ? '#22c55e' : '#ef4444';
        const statusText = isMoving ? 'In Motion' : 'Stopped';
        
        // Add popup with location info
        marker.bindPopup(`
          <div style="color: black; min-width: 200px;">
            <strong style="font-size: 14px;">${displayName}</strong>
            <span style="background-color: ${statusColor}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px; margin-left: 8px;">${statusText}</span><br/>
            ${location.deviceId ? `<span style="color: #666; font-size: 11px;">Device: ${location.deviceId}</span><br/>` : ''}
            <div style="margin-top: 8px;">
              <span style="color: #333;">Speed:</span> <strong>${Math.round(speed)} mph</strong><br/>
              <span style="color: #333;">Heading:</span> ${location.heading || 0}°<br/>
              <span style="color: #333;">Last Update:</span> ${location.timestamp ? new Date(location.timestamp).toLocaleTimeString() : 'N/A'}
            </div>
          </div>
        `);

        markers.set(vehicleId, marker);
        bounds.push(L.latLngBounds([lat, lng], [lat, lng]));
      }
    });

    // Fit map to show all markers on first load
    if (bounds.length > 0 && pathHistory.size === locations.length) {
      const group = L.featureGroup(Array.from(markers.values()));
      map.fitBounds(group.getBounds(), { padding: [50, 50] });
    }
  }, [locations]);

  return (
    <div ref={mapContainerRef} className={`w-full h-full min-h-[400px] ${className}`} />
  );
}
