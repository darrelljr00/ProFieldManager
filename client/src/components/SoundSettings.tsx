import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Volume2, MessageSquare, Smartphone, Play, Vibrate } from 'lucide-react';
import { useSoundNotifications, SOUND_OPTIONS, type SoundSettings } from '@/hooks/useSoundNotifications';
import { vibrate, isVibrationSupported } from '@/lib/vibration';

interface VibrationSettings {
  enabled: boolean;
  notificationPattern: string;
  successPattern: string;
  warningPattern: string;
  errorPattern: string;
  arrivalPattern: string;
  alertPattern: string;
}

export default function SoundSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { soundSettings, setSoundSettings, testSound } = useSoundNotifications();
  const [localSettings, setLocalSettings] = useState<SoundSettings>(soundSettings);

  // Fetch vibration settings
  const { data: vibrationSettings = {
    enabled: true,
    notificationPattern: 'notification',
    successPattern: 'success',
    warningPattern: 'warning',
    errorPattern: 'error',
    arrivalPattern: 'arrival',
    alertPattern: 'alert'
  } } = useQuery<VibrationSettings>({
    queryKey: ['/api/settings/vibration'],
  });

  const [localVibrationSettings, setLocalVibrationSettings] = useState<VibrationSettings>(vibrationSettings);

  useEffect(() => {
    setLocalSettings(soundSettings);
  }, [soundSettings]);

  useEffect(() => {
    setLocalVibrationSettings(vibrationSettings);
  }, [vibrationSettings]);

  const updateSoundSettingsMutation = useMutation({
    mutationFn: (settings: Partial<SoundSettings>) => 
      apiRequest('PUT', '/api/settings/sounds', settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings/sounds'] });
      setSoundSettings(localSettings);
      toast({
        title: "Sound Settings Updated",
        description: "Your notification sound preferences have been saved."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update sound settings",
        variant: "destructive"
      });
    }
  });

  const updateVibrationSettingsMutation = useMutation({
    mutationFn: (settings: Partial<VibrationSettings>) => 
      apiRequest('PUT', '/api/settings/vibration', settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings/vibration'] });
      toast({
        title: "Vibration Settings Updated",
        description: "Your vibration preferences have been saved."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update vibration settings",
        variant: "destructive"
      });
    }
  });

  const handleSettingChange = <K extends keyof SoundSettings>(
    key: K,
    value: SoundSettings[K]
  ) => {
    const updatedSettings = { ...localSettings, [key]: value };
    setLocalSettings(updatedSettings);
  };

  const handleSave = () => {
    updateSoundSettingsMutation.mutate(localSettings);
  };

  const handleTestSound = (soundType: string) => {
    if (localSettings.enabled) {
      testSound(soundType);
    } else {
      toast({
        title: "Sound Disabled",
        description: "Enable sound notifications to test sounds",
        variant: "destructive"
      });
    }
  };

  const handleTestVibration = (type: 'tap' | 'success' | 'warning' | 'error' | 'notification' | 'arrival' | 'alert') => {
    if (localVibrationSettings.enabled && isVibrationSupported()) {
      vibrate(type);
      toast({
        title: "Vibration Test",
        description: `Testing ${type} vibration pattern`,
      });
    } else if (!isVibrationSupported()) {
      toast({
        title: "Not Supported",
        description: "Vibration is not supported on this device",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Vibration Disabled",
        description: "Enable vibration to test patterns",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Volume2 className="h-5 w-5 mr-2" />
            Sound Notifications
          </CardTitle>
          <CardDescription>
            Configure sound notifications for different types of messages and events
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable Sounds */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Enable Sound Notifications</Label>
              <div className="text-sm text-muted-foreground">
                Turn on/off all sound notifications
              </div>
            </div>
            <Switch
              checked={localSettings.enabled}
              onCheckedChange={(checked) => handleSettingChange('enabled', checked)}
            />
          </div>

          {/* Volume Control */}
          <div className="space-y-2">
            <Label className="text-base">Volume</Label>
            <div className="px-3">
              <Slider
                value={[localSettings.volume * 100]}
                onValueChange={([value]) => handleSettingChange('volume', value / 100)}
                max={100}
                min={0}
                step={5}
                className="w-full"
                disabled={!localSettings.enabled}
              />
            </div>
            <div className="text-sm text-muted-foreground text-center">
              {Math.round(localSettings.volume * 100)}%
            </div>
          </div>

          {/* Team Message Sound */}
          <div className="space-y-3">
            <Label className="text-base flex items-center">
              <MessageSquare className="h-4 w-4 mr-2" />
              Team Message Sound
            </Label>
            <div className="flex items-center space-x-2">
              <Select
                value={localSettings.teamMessageSound}
                onValueChange={(value) => handleSettingChange('teamMessageSound', value)}
                disabled={!localSettings.enabled}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a sound" />
                </SelectTrigger>
                <SelectContent>
                  {SOUND_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTestSound(localSettings.teamMessageSound)}
                disabled={!localSettings.enabled}
              >
                <Play className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              Sound played when you receive new team messages
            </div>
          </div>

          {/* Text Message Sound */}
          <div className="space-y-3">
            <Label className="text-base flex items-center">
              <Smartphone className="h-4 w-4 mr-2" />
              Text Message Sound
            </Label>
            <div className="flex items-center space-x-2">
              <Select
                value={localSettings.textMessageSound}
                onValueChange={(value) => handleSettingChange('textMessageSound', value)}
                disabled={!localSettings.enabled}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a sound" />
                </SelectTrigger>
                <SelectContent>
                  {SOUND_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTestSound(localSettings.textMessageSound)}
                disabled={!localSettings.enabled}
              >
                <Play className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              Sound played when you receive new SMS text messages
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button 
              onClick={handleSave}
              disabled={updateSoundSettingsMutation.isPending}
            >
              {updateSoundSettingsMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sound Preview Card */}
      <Card>
        <CardHeader>
          <CardTitle>Sound Preview</CardTitle>
          <CardDescription>
            Test different notification sounds to find your preference
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {SOUND_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant="outline"
                size="sm"
                onClick={() => handleTestSound(option.value)}
                disabled={!localSettings.enabled}
                className="flex items-center justify-center"
              >
                <Play className="h-3 w-3 mr-1" />
                {option.label}
              </Button>
            ))}
          </div>
          {!localSettings.enabled && (
            <div className="text-sm text-muted-foreground mt-3 text-center">
              Enable sound notifications above to test sounds
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vibration Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Vibrate className="h-5 w-5 mr-2" />
            Vibration Settings
          </CardTitle>
          <CardDescription>
            Configure vibration feedback for different types of events
            {!isVibrationSupported() && (
              <span className="block text-orange-500 mt-1">
                ⚠️ Vibration is not supported on this device
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable Vibration */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Enable Vibration</Label>
              <div className="text-sm text-muted-foreground">
                Turn on/off vibration feedback for all events
              </div>
            </div>
            <Switch
              checked={localVibrationSettings.enabled}
              onCheckedChange={(checked) => {
                const updatedSettings = { ...localVibrationSettings, enabled: checked };
                setLocalVibrationSettings(updatedSettings);
                updateVibrationSettingsMutation.mutate(updatedSettings);
              }}
              disabled={!isVibrationSupported()}
              data-testid="switch-vibration-enabled"
            />
          </div>

          {/* Vibration Pattern Tests */}
          <div className="space-y-3">
            <Label className="text-base">Test Vibration Patterns</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTestVibration('tap')}
                disabled={!localVibrationSettings.enabled || !isVibrationSupported()}
                data-testid="button-test-vibration-tap"
              >
                Tap
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTestVibration('success')}
                disabled={!localVibrationSettings.enabled || !isVibrationSupported()}
                className="text-green-600"
                data-testid="button-test-vibration-success"
              >
                Success
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTestVibration('warning')}
                disabled={!localVibrationSettings.enabled || !isVibrationSupported()}
                className="text-yellow-600"
                data-testid="button-test-vibration-warning"
              >
                Warning
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTestVibration('error')}
                disabled={!localVibrationSettings.enabled || !isVibrationSupported()}
                className="text-red-600"
                data-testid="button-test-vibration-error"
              >
                Error
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTestVibration('notification')}
                disabled={!localVibrationSettings.enabled || !isVibrationSupported()}
                className="text-blue-600"
                data-testid="button-test-vibration-notification"
              >
                Notification
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTestVibration('arrival')}
                disabled={!localVibrationSettings.enabled || !isVibrationSupported()}
                className="text-purple-600"
                data-testid="button-test-vibration-arrival"
              >
                GPS Arrival
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTestVibration('alert')}
                disabled={!localVibrationSettings.enabled || !isVibrationSupported()}
                className="text-orange-600"
                data-testid="button-test-vibration-alert"
              >
                Alert
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              {localVibrationSettings.enabled && isVibrationSupported() 
                ? "Click any button to test the vibration pattern"
                : !isVibrationSupported()
                ? "Vibration is not supported on this browser/device"
                : "Enable vibration above to test patterns"}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}