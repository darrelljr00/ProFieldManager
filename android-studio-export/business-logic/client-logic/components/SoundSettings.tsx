import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Volume2, MessageSquare, Smartphone, Play } from 'lucide-react';
import { useSoundNotifications, SOUND_OPTIONS, type SoundSettings } from '@/hooks/useSoundNotifications';

export default function SoundSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { soundSettings, setSoundSettings, testSound } = useSoundNotifications();
  const [localSettings, setLocalSettings] = useState<SoundSettings>(soundSettings);

  useEffect(() => {
    setLocalSettings(soundSettings);
  }, [soundSettings]);

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
    </div>
  );
}