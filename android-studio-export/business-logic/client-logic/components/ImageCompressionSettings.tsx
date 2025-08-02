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
    quality: 75,
    maxWidth: 1600,
    maxHeight: 900,
    enabled: true,
    preserveOriginal: true,
    retainFilename: true
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
      return await apiRequest('PUT', '/api/settings/image-compression', newSettings);
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
        <CardTitle>Enhanced Image Compression Settings</CardTitle>
        <CardDescription>
          Advanced compression system that automatically targets under 1MB file sizes while preserving originals in separate "uncompressed" folders. Maintains original filenames and provides real-time sync with the frontend.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Compression */}
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="compression-enabled">Enable Image Compression</Label>
            <p className="text-sm text-muted-foreground">
              Enhanced compression targets under 1MB with original backup storage
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

            {/* Enhanced Features Information */}
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-green-800 mb-2">✅ Enhanced Compression Features Active:</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Automatic under 1MB targeting with multi-pass compression</li>
                <li>• Original files automatically saved in "uncompressed" folders</li>
                <li>• Original filenames always preserved</li>
                <li>• Real-time frontend sync and live updates</li>
                <li>• Comprehensive failure messaging and error handling</li>
                <li>• Progressive quality reduction until size target is met</li>
              </ul>
            </div>

            {/* Preview Information */}
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Current Settings Summary:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Quality: {settings.quality}% starting compression (auto-adjusted for 1MB target)</li>
                <li>• Maximum size: {settings.maxWidth} x {settings.maxHeight} pixels</li>
                <li>• Format: Always JPEG for optimal compression efficiency</li>
                <li>• Backup storage: Originals saved in separate "uncompressed" folder</li>
                <li>• Filename handling: Original names always retained</li>
                <li>• Compression method: Multi-pass progressive JPEG with mozjpeg optimization</li>
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