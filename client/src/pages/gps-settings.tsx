import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Save, Eye, EyeOff } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function GPSSettings() {
  const { toast } = useToast();
  const [showApiKey, setShowApiKey] = useState(false);

  // Fetch GPS settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['/api/gps-settings'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/gps-settings');
        return await response.json();
      } catch (error) {
        // Return defaults if settings don't exist
        return {
          oneStepGpsApiKey: '',
          oneStepGpsEnabled: false,
          locationRefreshInterval: 5,
          tripHistoryDays: 30,
          showSpeed: true,
          showFuelLevel: true,
          showEngineTemp: true,
          mapDefaultZoom: 13,
          mapDefaultLayer: 'dark',
          enableGeofenceAlerts: true,
          enableSpeedAlerts: true,
          speedAlertThreshold: 80
        };
      }
    }
  });

  const [formData, setFormData] = useState(settings || {});

  // Update form data when settings load
  useState(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/gps-settings', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gps-settings'] });
      toast({
        title: "Settings saved",
        description: "GPS settings have been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save GPS settings.",
        variant: "destructive",
      });
    }
  });

  const handleSave = () => {
    saveSettingsMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold dark:text-white mb-2 flex items-center">
            <Settings className="w-6 h-6 mr-2" />
            GPS Tracking Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Configure GPS tracking, integrations, and alerts</p>
        </div>

        <Tabs defaultValue="api" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="api">API Integration</TabsTrigger>
            <TabsTrigger value="tracking">Tracking</TabsTrigger>
            <TabsTrigger value="display">Display</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
          </TabsList>

          {/* API Integration Tab */}
          <TabsContent value="api" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 dark:text-white">One Step GPS Integration</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Connect your One Step GPS account to import device data automatically.
              </p>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="oneStepEnabled" className="text-base">Enable One Step GPS</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Automatically sync device locations</p>
                  </div>
                  <Switch
                    id="oneStepEnabled"
                    checked={formData.oneStepGpsEnabled || false}
                    onCheckedChange={(checked) => setFormData({ ...formData, oneStepGpsEnabled: checked })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiKey">One Step GPS API Key</Label>
                  <div className="relative">
                    <Input
                      id="apiKey"
                      type={showApiKey ? "text" : "password"}
                      value={formData.oneStepGpsApiKey || ''}
                      onChange={(e) => setFormData({ ...formData, oneStepGpsApiKey: e.target.value })}
                      placeholder="Enter your One Step GPS API key"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Get your API key from One Step GPS dashboard → Settings → API Access
                  </p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">How to get your API key:</h4>
                  <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
                    <li>Log in to your One Step GPS account</li>
                    <li>Navigate to Settings → API Access</li>
                    <li>Generate or copy your API key</li>
                    <li>Paste it above and enable the integration</li>
                  </ol>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Tracking Tab */}
          <TabsContent value="tracking" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 dark:text-white">Tracking Settings</h3>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="refreshInterval">Location Refresh Interval</Label>
                  <Select
                    value={formData.locationRefreshInterval?.toString() || '5'}
                    onValueChange={(val) => setFormData({ ...formData, locationRefreshInterval: parseInt(val) })}
                  >
                    <SelectTrigger id="refreshInterval">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 seconds (High frequency)</SelectItem>
                      <SelectItem value="5">5 seconds (Recommended)</SelectItem>
                      <SelectItem value="10">10 seconds (Balanced)</SelectItem>
                      <SelectItem value="30">30 seconds (Low frequency)</SelectItem>
                      <SelectItem value="60">60 seconds (Battery saver)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    How often to refresh vehicle locations on the map
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="historyDays">Trip History Retention</Label>
                  <Select
                    value={formData.tripHistoryDays?.toString() || '30'}
                    onValueChange={(val) => setFormData({ ...formData, tripHistoryDays: parseInt(val) })}
                  >
                    <SelectTrigger id="historyDays">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="30">30 days (Recommended)</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="180">180 days</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    How long to keep historical trip data
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Display Tab */}
          <TabsContent value="display" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 dark:text-white">Display Preferences</h3>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mapLayer">Default Map Layer</Label>
                  <Select
                    value={formData.mapDefaultLayer || 'dark'}
                    onValueChange={(val) => setFormData({ ...formData, mapDefaultLayer: val })}
                  >
                    <SelectTrigger id="mapLayer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dark">Dark Theme</SelectItem>
                      <SelectItem value="light">Light Theme</SelectItem>
                      <SelectItem value="medium">Medium Theme</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mapZoom">Default Map Zoom</Label>
                  <Select
                    value={formData.mapDefaultZoom?.toString() || '13'}
                    onValueChange={(val) => setFormData({ ...formData, mapDefaultZoom: parseInt(val) })}
                  >
                    <SelectTrigger id="mapZoom">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 (City view)</SelectItem>
                      <SelectItem value="11">11</SelectItem>
                      <SelectItem value="12">12</SelectItem>
                      <SelectItem value="13">13 (Recommended)</SelectItem>
                      <SelectItem value="14">14</SelectItem>
                      <SelectItem value="15">15 (Street view)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="border-t pt-4 space-y-3">
                  <h4 className="font-medium dark:text-white">Metric Visibility</h4>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="showSpeed">Show Speed</Label>
                    <Switch
                      id="showSpeed"
                      checked={formData.showSpeed !== false}
                      onCheckedChange={(checked) => setFormData({ ...formData, showSpeed: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="showFuel">Show Fuel Level</Label>
                    <Switch
                      id="showFuel"
                      checked={formData.showFuelLevel !== false}
                      onCheckedChange={(checked) => setFormData({ ...formData, showFuelLevel: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="showTemp">Show Engine Temperature</Label>
                    <Switch
                      id="showTemp"
                      checked={formData.showEngineTemp !== false}
                      onCheckedChange={(checked) => setFormData({ ...formData, showEngineTemp: checked })}
                    />
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 dark:text-white">Alert Settings</h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="geofenceAlerts">Geofence Alerts</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Notify when vehicles enter/exit geofences</p>
                  </div>
                  <Switch
                    id="geofenceAlerts"
                    checked={formData.enableGeofenceAlerts !== false}
                    onCheckedChange={(checked) => setFormData({ ...formData, enableGeofenceAlerts: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="speedAlerts">Speed Alerts</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Notify when vehicles exceed speed limit</p>
                  </div>
                  <Switch
                    id="speedAlerts"
                    checked={formData.enableSpeedAlerts !== false}
                    onCheckedChange={(checked) => setFormData({ ...formData, enableSpeedAlerts: checked })}
                  />
                </div>

                {formData.enableSpeedAlerts !== false && (
                  <div className="space-y-2 ml-6">
                    <Label htmlFor="speedThreshold">Speed Alert Threshold (mph)</Label>
                    <Input
                      id="speedThreshold"
                      type="number"
                      value={formData.speedAlertThreshold || 80}
                      onChange={(e) => setFormData({ ...formData, speedAlertThreshold: parseInt(e.target.value) })}
                      min="0"
                      max="150"
                    />
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="flex justify-end mt-6">
          <Button
            onClick={handleSave}
            disabled={saveSettingsMutation.isPending}
            className="min-w-32"
          >
            {saveSettingsMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
