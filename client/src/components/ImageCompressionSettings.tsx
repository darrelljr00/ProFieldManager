import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface CompressionSettings {
  quality: number;
  maxWidth: number;
  maxHeight: number;
  enabled: boolean;
  preserveOriginal: boolean;
  retainFilename: boolean;
}

export function ImageCompressionSettings() {
  const [settings, setSettings] = useState<CompressionSettings>({
    quality: 80,
    maxWidth: 1920,
    maxHeight: 1080,
    enabled: true,
    preserveOriginal: false,
    retainFilename: false
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current compression settings
  const { data: compressionSettings, isLoading } = useQuery({
    queryKey: ['/api/settings/image-compression']
  });

  // Update settings when data is fetched
  useEffect(() => {
    if (compressionSettings) {
      setSettings(compressionSettings as CompressionSettings);
    }
  }, [compressionSettings]);

  // Mutation to update settings
  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: Partial<CompressionSettings>) => {
      return await apiRequest('/api/settings/image-compression', 'PUT', newSettings);
    },
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "Image compression settings have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings/image-compression'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update compression settings.",
        variant: "destructive",
      });
    }
  });

  const handleSave = () => {
    updateSettingsMutation.mutate(settings);
  };

  const handleQualityChange = (value: number[]) => {
    setSettings(prev => ({ ...prev, quality: value[0] }));
  };

  const handleInputChange = (field: keyof CompressionSettings, value: string | number | boolean) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Image Compression Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground">Loading settings...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Image Compression Settings</CardTitle>
        <CardDescription>
          Configure how inspection images are compressed when uploaded. Lower quality reduces file size but may affect image clarity.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Compression */}
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="compression-enabled">Enable Image Compression</Label>
            <p className="text-sm text-muted-foreground">
              Automatically compress uploaded inspection images
            </p>
          </div>
          <Switch
            id="compression-enabled"
            checked={settings.enabled}
            onCheckedChange={(checked) => handleInputChange('enabled', checked)}
          />
        </div>

        {settings.enabled && (
          <>
            {/* Quality Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Image Quality</Label>
                <span className="text-sm font-medium">
                  {settings.quality}% {settings.quality === 100 ? '(Lossless PNG)' : '(JPEG)'}
                </span>
              </div>
              <Slider
                value={[settings.quality]}
                onValueChange={handleQualityChange}
                min={10}
                max={100}
                step={5}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                {settings.quality === 100 
                  ? 'Lossless PNG compression preserves original quality without any data loss'
                  : 'Higher quality preserves more detail but increases file size'}
              </p>
              {settings.quality === 100 && (
                <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-700">
                    <strong>💡 Lossless Mode:</strong> Quality set to 100% enables PNG compression 
                    with no quality loss. Perfect for high-quality uploads with many images!
                  </p>
                </div>
              )}
            </div>

            {/* Max Width */}
            <div className="space-y-2">
              <Label htmlFor="max-width">Maximum Width (pixels)</Label>
              <Input
                id="max-width"
                type="number"
                min="100"
                max="4000"
                value={settings.maxWidth}
                onChange={(e) => handleInputChange('maxWidth', parseInt(e.target.value) || 1920)}
                placeholder="1920"
              />
              <p className="text-xs text-muted-foreground">
                Images wider than this will be resized proportionally
              </p>
            </div>

            {/* Max Height */}
            <div className="space-y-2">
              <Label htmlFor="max-height">Maximum Height (pixels)</Label>
              <Input
                id="max-height"
                type="number"
                min="100"
                max="4000"
                value={settings.maxHeight}
                onChange={(e) => handleInputChange('maxHeight', parseInt(e.target.value) || 1080)}
                placeholder="1080"
              />
              <p className="text-xs text-muted-foreground">
                Images taller than this will be resized proportionally
              </p>
            </div>

            {/* Preserve Original Images */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="preserve-original">Preserve Original Images</Label>
                <p className="text-sm text-muted-foreground">
                  Keep original files alongside compressed versions
                </p>
              </div>
              <Switch
                id="preserve-original"
                checked={settings.preserveOriginal}
                onCheckedChange={(checked) => handleInputChange('preserveOriginal', checked)}
              />
            </div>

            {/* Retain Original Filename */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="retain-filename">Retain Original Filename</Label>
                <p className="text-sm text-muted-foreground">
                  Compress images in place, keeping the original filename
                </p>
              </div>
              <Switch
                id="retain-filename"
                checked={settings.retainFilename}
                onCheckedChange={(checked) => handleInputChange('retainFilename', checked)}
              />
            </div>

            {/* Preview Information */}
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Current Settings Summary:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Quality: {settings.quality}% compression {settings.quality === 100 ? '(Lossless)' : ''}</li>
                <li>• Maximum size: {settings.maxWidth} x {settings.maxHeight} pixels</li>
                <li>• Format: {settings.quality === 100 ? 'PNG (Lossless)' : 'JPEG'} (converted from any input format)</li>
                <li>• Original preservation: {settings.preserveOriginal ? 'Enabled' : 'Disabled'}</li>
                <li>• Filename retention: {settings.retainFilename ? 'Enabled' : 'Disabled'}</li>
                <li>• File handling: {
                  settings.retainFilename 
                    ? 'Compress in place with original filename' 
                    : settings.preserveOriginal 
                      ? 'Create compressed copy, keep original'
                      : 'Replace original with compressed version'
                }</li>
              </ul>
            </div>
          </>
        )}

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button 
            onClick={handleSave}
            disabled={updateSettingsMutation.isPending}
          >
            {updateSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}