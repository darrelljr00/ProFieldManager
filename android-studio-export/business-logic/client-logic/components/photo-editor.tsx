import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Slider } from './ui/slider';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';
import { 
  RotateCw, 
  Palette, 
  Type, 
  Download, 
  Upload,
  Grid3X3,
  Image as ImageIcon,
  Layers,
  Sun,
  Contrast,
  Zap
} from 'lucide-react';

interface PhotoEditorProps {
  images: Array<{
    id: number;
    fileName: string;
    filePath: string;
    originalName: string;
  }>;
  onSave: (editedImageData: string, fileName: string) => void;
  onClose: () => void;
}

export function PhotoEditor({ images, onSave, onClose }: PhotoEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentImage, setCurrentImage] = useState<HTMLImageElement | null>(null);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [collageLayout, setCollageLayout] = useState('2x2');
  const [watermarkPosition, setWatermarkPosition] = useState('bottom-right');
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.5);
  const [watermarkText, setWatermarkText] = useState('Your Logo');

  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.width = 800;
      canvasRef.current.height = 600;
    }
  }, []);

  const loadImageToCanvas = (imagePath: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Calculate scaling to fit image in canvas
      const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;
      const x = (canvas.width - scaledWidth) / 2;
      const y = (canvas.height - scaledHeight) / 2;
      
      // Draw image
      ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
      setCurrentImage(img);
    };
    img.src = imagePath;
  };

  const applyFilters = () => {
    const canvas = canvasRef.current;
    if (!canvas || !currentImage) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and redraw image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const scale = Math.min(canvas.width / currentImage.width, canvas.height / currentImage.height);
    const scaledWidth = currentImage.width * scale;
    const scaledHeight = currentImage.height * scale;
    const x = (canvas.width - scaledWidth) / 2;
    const y = (canvas.height - scaledHeight) / 2;
    
    ctx.drawImage(currentImage, x, y, scaledWidth, scaledHeight);

    // Apply filters using CSS filter syntax
    const filterString = `brightness(${100 + brightness * 50}%) contrast(${100 + contrast * 50}%) saturate(${100 + saturation * 50}%)`;
    ctx.filter = filterString;
    
    // Re-draw with filters
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(currentImage, x, y, scaledWidth, scaledHeight);
    ctx.filter = 'none';
  };

  const applyPresetFilter = (filterType: string) => {
    const canvas = canvasRef.current;
    if (!canvas || !currentImage) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const scale = Math.min(canvas.width / currentImage.width, canvas.height / currentImage.height);
    const scaledWidth = currentImage.width * scale;
    const scaledHeight = currentImage.height * scale;
    const x = (canvas.width - scaledWidth) / 2;
    const y = (canvas.height - scaledHeight) / 2;

    let filterString = 'none';
    switch (filterType) {
      case 'grayscale':
        filterString = 'grayscale(100%)';
        break;
      case 'sepia':
        filterString = 'sepia(100%)';
        break;
      case 'vintage':
        filterString = 'sepia(50%) contrast(120%) brightness(110%)';
        break;
    }

    ctx.filter = filterString;
    ctx.drawImage(currentImage, x, y, scaledWidth, scaledHeight);
    ctx.filter = 'none';
  };

  const addWatermark = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.globalAlpha = watermarkOpacity;
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;

    const textWidth = ctx.measureText(watermarkText).width;
    let x, y;

    switch (watermarkPosition) {
      case 'top-left':
        x = 20;
        y = 40;
        break;
      case 'top-right':
        x = canvas.width - textWidth - 20;
        y = 40;
        break;
      case 'bottom-left':
        x = 20;
        y = canvas.height - 20;
        break;
      case 'bottom-right':
        x = canvas.width - textWidth - 20;
        y = canvas.height - 20;
        break;
      case 'center':
        x = (canvas.width - textWidth) / 2;
        y = canvas.height / 2;
        break;
      default:
        x = canvas.width - textWidth - 20;
        y = canvas.height - 20;
    }

    ctx.strokeText(watermarkText, x, y);
    ctx.fillText(watermarkText, x, y);
    ctx.restore();
  };

  const createCollage = () => {
    const canvas = canvasRef.current;
    if (!canvas || selectedImages.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let layout: { cols: number; rows: number };
    switch (collageLayout) {
      case '1x2':
        layout = { cols: 1, rows: 2 };
        break;
      case '2x1':
        layout = { cols: 2, rows: 1 };
        break;
      case '2x2':
        layout = { cols: 2, rows: 2 };
        break;
      case '3x1':
        layout = { cols: 3, rows: 1 };
        break;
      case '3x2':
        layout = { cols: 3, rows: 2 };
        break;
      default:
        layout = { cols: 2, rows: 2 };
    }

    const cellWidth = canvas.width / layout.cols;
    const cellHeight = canvas.height / layout.rows;
    const padding = 5;

    selectedImages.slice(0, layout.cols * layout.rows).forEach((imagePath, index) => {
      const col = index % layout.cols;
      const row = Math.floor(index / layout.cols);

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const cellX = col * cellWidth + padding;
        const cellY = row * cellHeight + padding;
        const availableWidth = cellWidth - 2 * padding;
        const availableHeight = cellHeight - 2 * padding;

        const scale = Math.min(availableWidth / img.width, availableHeight / img.height);
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;
        const imgX = cellX + (availableWidth - scaledWidth) / 2;
        const imgY = cellY + (availableHeight - scaledHeight) / 2;

        ctx.drawImage(img, imgX, imgY, scaledWidth, scaledHeight);
      };
      img.src = imagePath;
    });
  };

  const rotateCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !currentImage) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Create temporary canvas for rotation
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.height;
    tempCanvas.height = canvas.width;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    // Rotate and draw
    tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
    tempCtx.rotate(Math.PI / 2);
    tempCtx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);

    // Copy back to main canvas
    canvas.width = tempCanvas.width;
    canvas.height = tempCanvas.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(tempCanvas, 0, 0);
  };

  const saveImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataURL = canvas.toDataURL('image/png', 1.0);
    const fileName = `edited_image_${Date.now()}.png`;
    onSave(dataURL, fileName);
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataURL = canvas.toDataURL('image/png', 1.0);
    const link = document.createElement('a');
    link.download = `edited_image_${Date.now()}.png`;
    link.href = dataURL;
    link.click();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-7xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex h-[90vh]">
          {/* Left Panel - Tools */}
          <div className="w-80 border-r bg-gray-50 overflow-y-auto">
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Photo Editor</h2>
                <Button variant="outline" size="sm" onClick={onClose}>
                  Close
                </Button>
              </div>

              <Tabs defaultValue="images" className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-4">
                  <TabsTrigger value="images" className="text-xs flex flex-col gap-1">
                    <ImageIcon className="w-4 h-4" />
                    <span>Images</span>
                  </TabsTrigger>
                  <TabsTrigger value="filters" className="text-xs flex flex-col gap-1">
                    <Palette className="w-4 h-4" />
                    <span>Filters</span>
                  </TabsTrigger>
                  <TabsTrigger value="collage" className="text-xs flex flex-col gap-1">
                    <Grid3X3 className="w-4 h-4" />
                    <span>Collage</span>
                  </TabsTrigger>
                  <TabsTrigger value="tools" className="text-xs flex flex-col gap-1">
                    <Layers className="w-4 h-4" />
                    <span>Tools</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="images" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center justify-between">
                        Select Images
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedImages(images.map(img => img.filePath))}
                            disabled={images.length === 0}
                          >
                            All
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedImages([])}
                            disabled={selectedImages.length === 0}
                          >
                            Clear
                          </Button>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {images.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground">
                          No images available
                        </div>
                      ) : (
                        images.map((image) => (
                          <div key={image.id} className="flex items-center space-x-3 p-2 border rounded-lg hover:bg-gray-50">
                            {/* Thumbnail */}
                            <div className="flex-shrink-0">
                              <img
                                src={image.filePath}
                                alt={image.originalName}
                                className="w-12 h-12 object-cover rounded border"
                                loading="lazy"
                              />
                            </div>
                            
                            {/* Selection checkbox */}
                            <div 
                              className={`w-5 h-5 border-2 rounded cursor-pointer flex items-center justify-center ${
                                selectedImages.includes(image.filePath) 
                                  ? 'bg-blue-500 border-blue-500' 
                                  : 'border-gray-300 hover:border-blue-400'
                              }`}
                              onClick={() => {
                                if (selectedImages.includes(image.filePath)) {
                                  setSelectedImages(selectedImages.filter(path => path !== image.filePath));
                                } else {
                                  setSelectedImages([...selectedImages, image.filePath]);
                                }
                              }}
                            >
                              {selectedImages.includes(image.filePath) && (
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                            
                            {/* Image name */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {image.originalName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {image.fileName}
                              </p>
                            </div>
                            
                            {/* Load button */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => loadImageToCanvas(image.filePath)}
                              className="flex-shrink-0"
                            >
                              Load
                            </Button>
                          </div>
                        ))
                      )}
                      
                      {/* Selection status */}
                      {selectedImages.length > 0 && (
                        <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-md">
                          <p className="text-sm text-blue-800">
                            {selectedImages.length} image{selectedImages.length > 1 ? 's' : ''} selected for collage
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="filters" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Adjustments</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label className="flex items-center gap-2">
                          <Sun className="w-4 h-4" />
                          Brightness: {brightness.toFixed(1)}
                        </Label>
                        <Slider
                          value={[brightness]}
                          onValueChange={(value) => {
                            setBrightness(value[0]);
                            setTimeout(applyFilters, 100);
                          }}
                          min={-1}
                          max={1}
                          step={0.1}
                          className="mt-2"
                        />
                      </div>

                      <div>
                        <Label className="flex items-center gap-2">
                          <Contrast className="w-4 h-4" />
                          Contrast: {contrast.toFixed(1)}
                        </Label>
                        <Slider
                          value={[contrast]}
                          onValueChange={(value) => {
                            setContrast(value[0]);
                            setTimeout(applyFilters, 100);
                          }}
                          min={-1}
                          max={1}
                          step={0.1}
                          className="mt-2"
                        />
                      </div>

                      <div>
                        <Label className="flex items-center gap-2">
                          <Zap className="w-4 h-4" />
                          Saturation: {saturation.toFixed(1)}
                        </Label>
                        <Slider
                          value={[saturation]}
                          onValueChange={(value) => {
                            setSaturation(value[0]);
                            setTimeout(applyFilters, 100);
                          }}
                          min={-1}
                          max={1}
                          step={0.1}
                          className="mt-2"
                        />
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <Label>Filter Presets</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Button size="sm" variant="outline" onClick={() => applyPresetFilter('grayscale')}>
                            Grayscale
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => applyPresetFilter('sepia')}>
                            Sepia
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => applyPresetFilter('vintage')}>
                            Vintage
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="collage" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Collage Layout</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Layout</Label>
                        <Select value={collageLayout} onValueChange={setCollageLayout}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1x2">1×2</SelectItem>
                            <SelectItem value="2x1">2×1</SelectItem>
                            <SelectItem value="2x2">2×2</SelectItem>
                            <SelectItem value="3x1">3×1</SelectItem>
                            <SelectItem value="3x2">3×2</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Button 
                        onClick={createCollage} 
                        className="w-full"
                        disabled={selectedImages.length < 2}
                      >
                        Create Collage ({selectedImages.length} images)
                      </Button>

                      <div className="text-xs text-gray-500">
                        {selectedImages.length < 2 
                          ? "Select at least 2 images to create a collage" 
                          : `Ready to create collage with ${selectedImages.length} images`}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Watermark</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Text</Label>
                        <input
                          type="text"
                          value={watermarkText}
                          onChange={(e) => setWatermarkText(e.target.value)}
                          className="w-full p-2 border rounded"
                          placeholder="Enter watermark text"
                        />
                      </div>

                      <div>
                        <Label>Position</Label>
                        <Select value={watermarkPosition} onValueChange={setWatermarkPosition}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="top-left">Top Left</SelectItem>
                            <SelectItem value="top-right">Top Right</SelectItem>
                            <SelectItem value="bottom-left">Bottom Left</SelectItem>
                            <SelectItem value="bottom-right">Bottom Right</SelectItem>
                            <SelectItem value="center">Center</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Opacity: {Math.round(watermarkOpacity * 100)}%</Label>
                        <Slider
                          value={[watermarkOpacity]}
                          onValueChange={(value) => setWatermarkOpacity(value[0])}
                          min={0.1}
                          max={1}
                          step={0.1}
                          className="mt-2"
                        />
                      </div>

                      <Button onClick={addWatermark} className="w-full">
                        Add Watermark
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="tools" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Basic Tools</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Button onClick={rotateCanvas} variant="outline" className="w-full justify-start">
                        <RotateCw className="w-4 h-4 mr-2" />
                        Rotate 90°
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Export</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Button onClick={saveImage} className="w-full">
                        <Upload className="w-4 h-4 mr-2" />
                        Save to Project
                      </Button>
                      <Button onClick={downloadImage} variant="outline" className="w-full">
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Right Panel - Canvas */}
          <div className="flex-1 p-4 bg-gray-100">
            <div className="h-full flex items-center justify-center">
              <canvas 
                ref={canvasRef} 
                className="border border-gray-300 bg-white shadow-lg max-w-full max-h-full" 
                style={{ maxWidth: '100%', maxHeight: '100%' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}