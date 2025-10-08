import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  Bluetooth, 
  MapPin, 
  Navigation, 
  Gauge, 
  Zap, 
  Thermometer,
  Activity,
  Clock,
  AlertCircle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface OBDData {
  speed: number;
  rpm: number;
  fuelLevel: number;
  engineTemp: number;
  voltage: number;
  latitude: number;
  longitude: number;
  timestamp: string;
}

interface Vehicle {
  id: number;
  name: string;
  vin?: string;
}

export default function GPSTrackingOBD() {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [obdData, setObdData] = useState<OBDData | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [deviceId, setDeviceId] = useState('');

  // Fetch vehicles for selection
  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ['/api/vehicles']
  });

  // Simulate OBD device connection
  const connectToOBD = async () => {
    setIsConnecting(true);
    
    try {
      // In a real implementation, this would use Web Bluetooth API
      // For now, we'll simulate the connection
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setIsConnected(true);
      toast({
        title: "OBD Device Connected",
        description: `Successfully connected to device ${deviceId || 'OBD-001'}`,
      });

      // Start simulating data updates
      startDataSimulation();
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Unable to connect to OBD device. Please check the device ID and try again.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectFromOBD = () => {
    setIsConnected(false);
    setObdData(null);
    toast({
      title: "Disconnected",
      description: "OBD device has been disconnected",
    });
  };

  // Simulate real-time OBD data
  const startDataSimulation = () => {
    const interval = setInterval(() => {
      if (!isConnected) {
        clearInterval(interval);
        return;
      }

      setObdData({
        speed: Math.floor(Math.random() * 80) + 20,
        rpm: Math.floor(Math.random() * 3000) + 1000,
        fuelLevel: Math.floor(Math.random() * 100),
        engineTemp: Math.floor(Math.random() * 30) + 180,
        voltage: (Math.random() * 2 + 12).toFixed(1) as any,
        latitude: 32.7767 + (Math.random() - 0.5) * 0.01,
        longitude: -96.7970 + (Math.random() - 0.5) * 0.01,
        timestamp: new Date().toISOString(),
      });
    }, 2000);

    return () => clearInterval(interval);
  };

  useEffect(() => {
    if (isConnected) {
      const cleanup = startDataSimulation();
      return cleanup;
    }
  }, [isConnected]);

  return (
    <div className="flex-1 p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">GPS Tracking - OBD Device</h1>
        <p className="text-gray-600 mt-2">Connect to OBD devices to track real-time vehicle data and location</p>
      </div>

      {/* Connection Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bluetooth className="h-5 w-5" />
                OBD Device Connection
              </CardTitle>
              <CardDescription>
                Connect to your vehicle's OBD-II port via Bluetooth
              </CardDescription>
            </div>
            <Badge variant={isConnected ? "default" : "secondary"} className="h-8">
              {isConnected ? (
                <><CheckCircle className="h-4 w-4 mr-1" /> Connected</>
              ) : (
                <><AlertCircle className="h-4 w-4 mr-1" /> Disconnected</>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="vehicle-select">Select Vehicle</Label>
              <select
                id="vehicle-select"
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
                value={selectedVehicleId || ''}
                onChange={(e) => setSelectedVehicleId(Number(e.target.value))}
                disabled={isConnected}
              >
                <option value="">Select a vehicle...</option>
                {vehicles?.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.name} {vehicle.vin ? `(${vehicle.vin})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="device-id">OBD Device ID</Label>
              <Input
                id="device-id"
                placeholder="e.g., OBD-001 or Bluetooth MAC"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                disabled={isConnected}
                data-testid="input-obd-device-id"
              />
            </div>
          </div>

          <div className="flex gap-2">
            {!isConnected ? (
              <Button 
                onClick={connectToOBD}
                disabled={isConnecting}
                data-testid="button-connect-obd"
              >
                {isConnecting ? (
                  <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Connecting...</>
                ) : (
                  <><Bluetooth className="h-4 w-4 mr-2" /> Connect to Device</>
                )}
              </Button>
            ) : (
              <Button 
                variant="destructive"
                onClick={disconnectFromOBD}
                data-testid="button-disconnect-obd"
              >
                Disconnect
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Real-time Data Display */}
      {isConnected && obdData && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Speed */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-blue-500" />
                  Speed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{obdData.speed} <span className="text-lg text-gray-500">mph</span></div>
              </CardContent>
            </Card>

            {/* RPM */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4 text-purple-500" />
                  Engine RPM
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{obdData.rpm.toLocaleString()}</div>
              </CardContent>
            </Card>

            {/* Fuel Level */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  Fuel Level
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{obdData.fuelLevel}%</div>
              </CardContent>
            </Card>

            {/* Engine Temperature */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Thermometer className="h-4 w-4 text-red-500" />
                  Engine Temp
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{obdData.engineTemp}°F</div>
              </CardContent>
            </Card>

            {/* Battery Voltage */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4 text-green-500" />
                  Battery
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{obdData.voltage} <span className="text-lg text-gray-500">V</span></div>
              </CardContent>
            </Card>

            {/* Last Update */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  Last Update
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium">
                  {new Date(obdData.timestamp).toLocaleTimeString()}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* GPS Location */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                GPS Location
              </CardTitle>
              <CardDescription>Real-time vehicle position</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Latitude</Label>
                  <div className="text-2xl font-bold mt-1">{obdData.latitude.toFixed(6)}</div>
                </div>
                <div>
                  <Label>Longitude</Label>
                  <div className="text-2xl font-bold mt-1">{obdData.longitude.toFixed(6)}</div>
                </div>
              </div>
              <div className="mt-4">
                <Button variant="outline" className="w-full" asChild>
                  <a 
                    href={`https://www.google.com/maps?q=${obdData.latitude},${obdData.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Navigation className="h-4 w-4 mr-2" />
                    View on Google Maps
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Instructions when not connected */}
      {!isConnected && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">How to Connect</CardTitle>
          </CardHeader>
          <CardContent className="text-blue-800 space-y-2">
            <ol className="list-decimal list-inside space-y-2">
              <li>Select the vehicle you want to track from the dropdown</li>
              <li>Enter your OBD-II device ID or Bluetooth address</li>
              <li>Make sure your OBD-II device is plugged into the vehicle's OBD port</li>
              <li>Ensure Bluetooth is enabled on your device</li>
              <li>Click "Connect to Device" to establish the connection</li>
            </ol>
            <p className="text-sm mt-4 pt-4 border-t border-blue-200">
              <strong>Note:</strong> This feature requires a compatible OBD-II Bluetooth adapter. 
              Real-time data includes speed, RPM, fuel level, engine temperature, battery voltage, and GPS coordinates.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
