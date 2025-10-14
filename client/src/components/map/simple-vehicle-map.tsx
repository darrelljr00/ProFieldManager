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

// Custom 3D vehicle icon with motion status color and type-specific design
const createVehicleIcon = (isMoving: boolean, vehicleType: string = 'truck') => {
  const baseColor = isMoving ? '#22c55e' : '#ef4444'; // Green for moving, red for stopped
  const lightColor = isMoving ? '#4ade80' : '#f87171'; // Lighter shade for 3D effect
  const darkColor = isMoving ? '#16a34a' : '#dc2626'; // Darker shade for depth
  
  // Different 3D SVG designs for different vehicle types
  const getTruck3D = () => `
    <svg style="width: 40px; height: 40px; filter: drop-shadow(2px 2px 3px rgba(0,0,0,0.4));" viewBox="0 0 64 64">
      <!-- Truck body with gradient -->
      <defs>
        <linearGradient id="truckGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.9" />
          <stop offset="50%" style="stop-color:#e0e0e0;stop-opacity:0.8" />
          <stop offset="100%" style="stop-color:#b0b0b0;stop-opacity:0.7" />
        </linearGradient>
      </defs>
      <!-- Main cabin -->
      <rect x="8" y="20" width="24" height="20" fill="url(#truckGrad)" stroke="#666" stroke-width="1"/>
      <rect x="10" y="22" width="8" height="8" fill="#87CEEB" opacity="0.7"/>
      <!-- Cargo area -->
      <rect x="32" y="18" width="20" height="22" fill="url(#truckGrad)" stroke="#666" stroke-width="1"/>
      <!-- Wheels with 3D effect -->
      <circle cx="18" cy="42" r="6" fill="#333" stroke="#000" stroke-width="1"/>
      <circle cx="18" cy="42" r="3" fill="#666"/>
      <circle cx="44" cy="42" r="6" fill="#333" stroke="#000" stroke-width="1"/>
      <circle cx="44" cy="42" r="3" fill="#666"/>
      <!-- Highlights -->
      <rect x="9" y="21" width="10" height="3" fill="white" opacity="0.4"/>
      <rect x="33" y="19" width="8" height="3" fill="white" opacity="0.4"/>
    </svg>`;
  
  const getCar3D = () => `
    <svg style="width: 40px; height: 40px; filter: drop-shadow(2px 2px 3px rgba(0,0,0,0.4));" viewBox="0 0 64 64">
      <defs>
        <linearGradient id="carGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.9" />
          <stop offset="50%" style="stop-color:#e0e0e0;stop-opacity:0.8" />
          <stop offset="100%" style="stop-color:#b0b0b0;stop-opacity:0.7" />
        </linearGradient>
      </defs>
      <!-- Car body -->
      <ellipse cx="32" cy="35" rx="26" ry="14" fill="url(#carGrad)" stroke="#666" stroke-width="1"/>
      <!-- Car roof -->
      <path d="M 16 35 Q 20 18 32 18 Q 44 18 48 35 Z" fill="url(#carGrad)" stroke="#666" stroke-width="1"/>
      <!-- Windows -->
      <path d="M 22 28 Q 26 22 32 22 Q 38 22 42 28 Z" fill="#87CEEB" opacity="0.6"/>
      <!-- Wheels with 3D effect -->
      <circle cx="18" cy="42" r="6" fill="#333" stroke="#000" stroke-width="1"/>
      <circle cx="18" cy="42" r="3" fill="#666"/>
      <circle cx="46" cy="42" r="6" fill="#333" stroke="#000" stroke-width="1"/>
      <circle cx="46" cy="42" r="3" fill="#666"/>
      <!-- Highlights -->
      <ellipse cx="32" cy="32" rx="18" ry="3" fill="white" opacity="0.3"/>
    </svg>`;
  
  const getVan3D = () => `
    <svg style="width: 40px; height: 40px; filter: drop-shadow(2px 2px 3px rgba(0,0,0,0.4));" viewBox="0 0 64 64">
      <defs>
        <linearGradient id="vanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.9" />
          <stop offset="50%" style="stop-color:#e0e0e0;stop-opacity:0.8" />
          <stop offset="100%" style="stop-color:#b0b0b0;stop-opacity:0.7" />
        </linearGradient>
      </defs>
      <!-- Van body - taller and boxier -->
      <rect x="10" y="14" width="44" height="28" rx="2" fill="url(#vanGrad)" stroke="#666" stroke-width="1"/>
      <!-- Front cabin -->
      <rect x="10" y="20" width="12" height="12" fill="url(#vanGrad)" stroke="#666" stroke-width="1"/>
      <!-- Windows -->
      <rect x="12" y="22" width="8" height="6" fill="#87CEEB" opacity="0.6"/>
      <rect x="26" y="16" width="10" height="8" fill="#87CEEB" opacity="0.6"/>
      <!-- Wheels with 3D effect -->
      <circle cx="20" cy="44" r="6" fill="#333" stroke="#000" stroke-width="1"/>
      <circle cx="20" cy="44" r="3" fill="#666"/>
      <circle cx="48" cy="44" r="6" fill="#333" stroke="#000" stroke-width="1"/>
      <circle cx="48" cy="44" r="3" fill="#666"/>
      <!-- Highlights -->
      <rect x="12" y="16" width="36" height="3" fill="white" opacity="0.4"/>
    </svg>`;
  
  const getEquipment3D = () => `
    <svg style="width: 40px; height: 40px; filter: drop-shadow(2px 2px 3px rgba(0,0,0,0.4));" viewBox="0 0 64 64">
      <defs>
        <linearGradient id="equipGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#ffd700;stop-opacity:0.9" />
          <stop offset="50%" style="stop-color:#ffa500;stop-opacity:0.8" />
          <stop offset="100%" style="stop-color:#ff8c00;stop-opacity:0.7" />
        </linearGradient>
      </defs>
      <!-- Equipment/Construction vehicle body -->
      <rect x="12" y="20" width="40" height="20" rx="2" fill="url(#equipGrad)" stroke="#b8860b" stroke-width="1"/>
      <!-- Cabin -->
      <rect x="14" y="16" width="14" height="16" fill="url(#equipGrad)" stroke="#b8860b" stroke-width="1"/>
      <!-- Window -->
      <rect x="16" y="18" width="10" height="8" fill="#87CEEB" opacity="0.6"/>
      <!-- Equipment arm/boom -->
      <rect x="42" y="14" width="4" height="12" fill="#666" stroke="#333" stroke-width="1"/>
      <circle cx="44" cy="12" r="3" fill="#888" stroke="#333" stroke-width="1"/>
      <!-- Tracks/wheels -->
      <rect x="16" y="40" width="32" height="6" rx="3" fill="#333" stroke="#000" stroke-width="1"/>
      <circle cx="22" cy="43" r="3" fill="#666"/>
      <circle cx="32" cy="43" r="3" fill="#666"/>
      <circle cx="42" cy="43" r="3" fill="#666"/>
    </svg>`;
  
  // Select appropriate 3D SVG based on vehicle type
  let vehicleSvg;
  switch (vehicleType.toLowerCase()) {
    case 'car':
    case 'sedan':
      vehicleSvg = getCar3D();
      break;
    case 'van':
      vehicleSvg = getVan3D();
      break;
    case 'equipment':
    case 'trailer':
      vehicleSvg = getEquipment3D();
      break;
    case 'truck':
    default:
      vehicleSvg = getTruck3D();
      break;
  }
  
  return L.divIcon({
    html: `<div style="
      background: linear-gradient(135deg, ${lightColor} 0%, ${baseColor} 50%, ${darkColor} 100%);
      border: 3px solid white;
      border-radius: 12px;
      width: 56px;
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 
        0 8px 16px rgba(0,0,0,0.3),
        0 4px 8px rgba(0,0,0,0.2),
        inset 0 -2px 4px rgba(0,0,0,0.2),
        inset 0 2px 4px rgba(255,255,255,0.3);
      transform: perspective(100px) rotateX(5deg);
      transition: all 0.3s ease;
    ">
      ${vehicleSvg}
    </div>`,
    className: '',
    iconSize: [56, 56],
    iconAnchor: [28, 28],
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
  const hasInitialFitRef = useRef<boolean>(false); // Track if we've done initial fit

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

    // Fit map to show all markers ONLY on very first load
    if (bounds.length > 0 && !hasInitialFitRef.current && !isFocusedRef.current) {
      const group = L.featureGroup(Array.from(markers.values()));
      map.fitBounds(group.getBounds(), { padding: [50, 50] });
      hasInitialFitRef.current = true; // Mark that we've done the initial fit
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
