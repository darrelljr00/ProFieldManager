import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface SimpleVehicleMapProps {
  locations: any[];
  selectedVehicleId?: string;
  focusVehicleId?: string | null;
  className?: string;
}

// Custom vehicle icon with motion status color and type-specific design
const createVehicleIcon = (isMoving: boolean, vehicleType: string = 'truck') => {
  const color = isMoving ? '#22c55e' : '#ef4444'; // Green for moving, red for stopped
  
  // Different SVG paths for different vehicle types
  const getTruckSvg = () => `
    <svg style="width: 36px; height: 36px; color: white;" fill="currentColor" viewBox="0 0 24 24">
      <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
    </svg>`;
  
  const getCarSvg = () => `
    <svg style="width: 36px; height: 36px; color: white;" fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
    </svg>`;
  
  const getVanSvg = () => `
    <svg style="width: 36px; height: 36px; color: white;" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17 5H3c-1.1 0-2 .89-2 2v9h2c0 1.65 1.34 3 3 3s3-1.35 3-3h5.5c0 1.65 1.34 3 3 3s3-1.35 3-3H23v-5l-6-6zM6 17.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM15 7l4 4h-4V7zm2.5 10.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
    </svg>`;
  
  const getEquipmentSvg = () => `
    <svg style="width: 36px; height: 36px; color: white;" fill="currentColor" viewBox="0 0 24 24">
      <path d="M20 6h-3V4c0-1.11-.89-2-2-2H9c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5 0H9V4h6v2z"/>
    </svg>`;
  
  // Select appropriate SVG based on vehicle type
  let vehicleSvg;
  switch (vehicleType.toLowerCase()) {
    case 'car':
    case 'sedan':
      vehicleSvg = getCarSvg();
      break;
    case 'van':
      vehicleSvg = getVanSvg();
      break;
    case 'equipment':
    case 'trailer':
      vehicleSvg = getEquipmentSvg();
      break;
    case 'truck':
    default:
      vehicleSvg = getTruckSvg();
      break;
  }
  
  return L.divIcon({
    html: `<div style="background-color: ${color}; border: 3px solid white; border-radius: 8px; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.4);">
      ${vehicleSvg}
    </div>`,
    className: '',
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
};

export function SimpleVehicleMap({ locations, selectedVehicleId, focusVehicleId, className = "" }: SimpleVehicleMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const labelsLayerRef = useRef<L.TileLayer | null>(null); // For hybrid satellite view
  const pathLinesRef = useRef<Map<string, L.Polyline>>(new Map());
  const pathHistoryRef = useRef<Map<string, [number, number][]>>(new Map());
  const isFocusedRef = useRef<boolean>(false);

  // Fetch GPS settings for map layer preference
  const { data: gpsSettings } = useQuery<any>({
    queryKey: ['/api/gps-settings'],
    refetchInterval: 5000, // Refetch every 5 seconds to pick up changes
  });

  // Fetch vehicles to get vehicle type information
  const { data: vehicles = [] } = useQuery<any[]>({
    queryKey: ['/api/vehicles'],
    refetchInterval: 5000,
  });

  const mapLayer = gpsSettings?.mapDefaultLayer || 'dark';

  // Get tile layer URL and config based on preference
  const getTileLayerConfig = (layer: string) => {
    switch (layer) {
      case 'light':
        return {
          url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
          attribution: '© OpenStreetMap contributors © CARTO',
          subdomains: 'abcd',
          maxZoom: 22,
          isHybrid: false
        };
      case 'medium':
        return {
          url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
          attribution: '© OpenStreetMap contributors © CARTO',
          subdomains: 'abcd',
          maxZoom: 22,
          isHybrid: false
        };
      case 'satellite':
        return {
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          attribution: 'Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
          subdomains: '',
          maxZoom: 22,
          isHybrid: false
        };
      case 'hybrid':
        return {
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          attribution: 'Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community | © OpenStreetMap contributors © CARTO',
          subdomains: '',
          maxZoom: 22,
          isHybrid: true,
          labelsUrl: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png',
          labelsSubdomains: 'abcd'
        };
      case 'dark':
      default:
        return {
          url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
          attribution: '© OpenStreetMap contributors © CARTO',
          subdomains: 'abcd',
          maxZoom: 22,
          isHybrid: false
        };
    }
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [32.7767, -96.7970], // Dallas, TX default
      zoom: 13,
      zoomControl: true,
      maxZoom: 22,
    });

    // Add initial tile layer
    const layerConfig = getTileLayerConfig(mapLayer);
    const tileLayer = L.tileLayer(layerConfig.url, {
      attribution: layerConfig.attribution,
      subdomains: layerConfig.subdomains,
      maxZoom: layerConfig.maxZoom,
    }).addTo(map);

    mapRef.current = map;
    tileLayerRef.current = tileLayer;

    // Add labels layer if hybrid mode
    if (layerConfig.isHybrid && layerConfig.labelsUrl) {
      const labelsLayer = L.tileLayer(layerConfig.labelsUrl, {
        subdomains: layerConfig.labelsSubdomains || 'abcd',
        maxZoom: layerConfig.maxZoom,
      }).addTo(map);
      labelsLayerRef.current = labelsLayer;
    }

    return () => {
      // Clean up path lines
      pathLinesRef.current.forEach(line => map.removeLayer(line));
      pathLinesRef.current.clear();
      pathHistoryRef.current.clear();
      
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      labelsLayerRef.current = null;
    };
  }, []);

  // Update tile layer when map layer preference changes
  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current) return;

    const map = mapRef.current;
    const currentLayer = tileLayerRef.current;

    // Remove old tile layer
    map.removeLayer(currentLayer);

    // Remove old labels layer if exists
    if (labelsLayerRef.current) {
      map.removeLayer(labelsLayerRef.current);
      labelsLayerRef.current = null;
    }

    // Add new tile layer
    const layerConfig = getTileLayerConfig(mapLayer);
    const newTileLayer = L.tileLayer(layerConfig.url, {
      attribution: layerConfig.attribution,
      subdomains: layerConfig.subdomains,
      maxZoom: layerConfig.maxZoom,
    }).addTo(map);

    tileLayerRef.current = newTileLayer;

    // Add labels layer if hybrid mode
    if (layerConfig.isHybrid && layerConfig.labelsUrl) {
      const labelsLayer = L.tileLayer(layerConfig.labelsUrl, {
        subdomains: layerConfig.labelsSubdomains || 'abcd',
        maxZoom: layerConfig.maxZoom,
      }).addTo(map);
      labelsLayerRef.current = labelsLayer;
    }
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
        
        // Find vehicle to get type information
        const vehicle = vehicles.find(v => v.id.toString() === vehicleId);
        const vehicleType = vehicle?.vehicleType || 'truck';
        
        const marker = L.marker([lat, lng], {
          icon: createVehicleIcon(isMoving, vehicleType)
        }).addTo(map);

        const displayName = location.displayName || `Vehicle ${vehicleId}`;
        const statusColor = isMoving ? '#22c55e' : '#ef4444';
        const statusText = isMoving ? 'In Motion' : 'Stopped';
        
        // Create popup with initial content (address will load asynchronously)
        const popupContent = `
          <div style="color: black; min-width: 250px;">
            <strong style="font-size: 14px;">${displayName}</strong>
            <span style="background-color: ${statusColor}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px; margin-left: 8px;">${statusText}</span><br/>
            ${location.deviceId ? `<span style="color: #666; font-size: 11px;">Device: ${location.deviceId}</span><br/>` : ''}
            <div style="margin-top: 8px;">
              <div id="address-${vehicleId}" style="margin-bottom: 8px; color: #666; font-size: 12px;">
                📍 <span style="font-style: italic;">Loading address...</span>
              </div>
              <span style="color: #333;">Speed:</span> <strong>${Math.round(speed)} mph</strong><br/>
              <span style="color: #333;">Heading:</span> ${location.heading || 0}°<br/>
              <span style="color: #333;">Last Update:</span> ${location.timestamp ? new Date(location.timestamp).toLocaleTimeString() : 'N/A'}
            </div>
          </div>
        `;
        
        marker.bindPopup(popupContent);
        
        // When popup opens, fetch the address
        marker.on('popupopen', async () => {
          const addressElement = document.getElementById(`address-${vehicleId}`);
          if (addressElement) {
            try {
              // Use Nominatim for reverse geocoding
              const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
                {
                  headers: {
                    'User-Agent': 'ProFieldManager/1.0'
                  }
                }
              );
              
              if (response.ok) {
                const data = await response.json();
                const address = data.display_name || 'Address not found';
                addressElement.innerHTML = `📍 <strong>${address}</strong>`;
              } else {
                addressElement.innerHTML = `📍 <span style="color: #999;">Address unavailable</span>`;
              }
            } catch (error) {
              console.error('Error fetching address:', error);
              addressElement.innerHTML = `📍 <span style="color: #999;">Address unavailable</span>`;
            }
          }
        });

        markers.set(vehicleId, marker);
        bounds.push(L.latLngBounds([lat, lng], [lat, lng]));
      }
    });

    // Fit map to show all markers on first load (only if not manually focused on a vehicle)
    if (bounds.length > 0 && pathHistory.size === locations.length && !isFocusedRef.current) {
      const group = L.featureGroup(Array.from(markers.values()));
      map.fitBounds(group.getBounds(), { padding: [50, 50] });
    }
  }, [locations, vehicles]);

  // Focus on specific vehicle when focusVehicleId changes
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    const markers = markersRef.current;

    if (!focusVehicleId) {
      // Reset focus state when no vehicle is selected
      isFocusedRef.current = false;
      return;
    }

    const marker = markers.get(focusVehicleId);

    if (marker) {
      isFocusedRef.current = true;
      const latLng = marker.getLatLng();
      map.setView(latLng, 18, { animate: true, duration: 1 });
      marker.openPopup();
    }
  }, [focusVehicleId]);

  // Keep focused vehicle centered when locations update
  useEffect(() => {
    if (!mapRef.current || !focusVehicleId || !isFocusedRef.current) return;

    const map = mapRef.current;
    const markers = markersRef.current;
    const marker = markers.get(focusVehicleId);

    if (marker) {
      const latLng = marker.getLatLng();
      // Update view without animation to follow vehicle smoothly
      map.setView(latLng, 18, { animate: false });
    }
  }, [locations, focusVehicleId]);

  return (
    <div ref={mapContainerRef} className={`w-full h-full min-h-[400px] ${className}`} />
  );
}
