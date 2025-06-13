import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Pen, 
  Square, 
  Circle, 
  Type, 
  Trash2, 
  Download, 
  Undo, 
  Redo,
  MousePointer,
  Palette
} from 'lucide-react';

interface Annotation {
  id: string;
  type: 'text' | 'rectangle' | 'circle' | 'arrow' | 'freehand';
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  color: string;
  strokeWidth: number;
  points?: { x: number; y: number }[];
}

interface ImageAnnotationProps {
  imageUrl: string;
  onSave?: (annotations: Annotation[], imageDataUrl: string) => void;
  initialAnnotations?: Annotation[];
}

export function ImageAnnotation({ imageUrl, onSave, initialAnnotations = [] }: ImageAnnotationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>(initialAnnotations);
  const [currentTool, setCurrentTool] = useState<'select' | 'text' | 'rectangle' | 'circle' | 'arrow' | 'freehand'>('select');
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null);
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const [color, setColor] = useState('#ff0000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [textInput, setTextInput] = useState('');
  const [showTextDialog, setShowTextDialog] = useState(false);
  const [textPosition, setTextPosition] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [history, setHistory] = useState<Annotation[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  useEffect(() => {
    if (imageLoaded) {
      redrawCanvas();
    }
  }, [annotations, imageLoaded, selectedAnnotation]);

  const handleImageLoad = () => {
    setImageLoaded(true);
    if (canvasRef.current && imageRef.current) {
      const canvas = canvasRef.current;
      const img = imageRef.current;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      redrawCanvas();
    }
  };

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image
    ctx.drawImage(img, 0, 0);

    // Draw annotations
    annotations.forEach(annotation => {
      drawAnnotation(ctx, annotation, annotation.id === selectedAnnotation);
    });
  };

  const drawAnnotation = (ctx: CanvasRenderingContext2D, annotation: Annotation, isSelected: boolean) => {
    ctx.strokeStyle = annotation.color;
    ctx.lineWidth = annotation.strokeWidth;
    ctx.fillStyle = annotation.color;

    if (isSelected) {
      ctx.strokeStyle = '#0066cc';
      ctx.lineWidth = annotation.strokeWidth + 1;
    }

    switch (annotation.type) {
      case 'rectangle':
        ctx.strokeRect(annotation.x, annotation.y, annotation.width || 0, annotation.height || 0);
        break;
      case 'circle':
        ctx.beginPath();
        const radius = Math.sqrt(Math.pow(annotation.width || 0, 2) + Math.pow(annotation.height || 0, 2)) / 2;
        ctx.arc(annotation.x + (annotation.width || 0) / 2, annotation.y + (annotation.height || 0) / 2, radius, 0, 2 * Math.PI);
        ctx.stroke();
        break;
      case 'text':
        ctx.font = `${annotation.strokeWidth * 8}px Arial`;
        ctx.fillText(annotation.text || '', annotation.x, annotation.y);
        break;
      case 'arrow':
        if (annotation.width && annotation.height) {
          drawArrow(ctx, annotation.x, annotation.y, annotation.x + annotation.width, annotation.y + annotation.height);
        }
        break;
      case 'freehand':
        if (annotation.points && annotation.points.length > 1) {
          ctx.beginPath();
          ctx.moveTo(annotation.points[0].x, annotation.points[0].y);
          annotation.points.forEach(point => {
            ctx.lineTo(point.x, point.y);
          });
          ctx.stroke();
        }
        break;
    }
  };

  const drawArrow = (ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number) => {
    const headLength = 10;
    const angle = Math.atan2(toY - fromY, toX - fromX);

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  };

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoordinates(e);

    if (currentTool === 'select') {
      // Check if clicking on existing annotation
      const clickedAnnotation = annotations.find(annotation => {
        return coords.x >= annotation.x && coords.x <= (annotation.x + (annotation.width || 0)) &&
               coords.y >= annotation.y && coords.y <= (annotation.y + (annotation.height || 0));
      });
      setSelectedAnnotation(clickedAnnotation?.id || null);
      return;
    }

    if (currentTool === 'text') {
      setTextPosition(coords);
      setShowTextDialog(true);
      return;
    }

    setIsDrawing(true);
    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      type: currentTool,
      x: coords.x,
      y: coords.y,
      color,
      strokeWidth,
      points: currentTool === 'freehand' ? [coords] : undefined
    };
    setCurrentAnnotation(newAnnotation);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentAnnotation) return;

    const coords = getCanvasCoordinates(e);

    if (currentTool === 'freehand') {
      setCurrentAnnotation(prev => ({
        ...prev!,
        points: [...(prev!.points || []), coords]
      }));
    } else {
      setCurrentAnnotation(prev => ({
        ...prev!,
        width: coords.x - prev!.x,
        height: coords.y - prev!.y
      }));
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentAnnotation) return;

    setIsDrawing(false);
    addAnnotation(currentAnnotation);
    setCurrentAnnotation(null);
  };

  const addAnnotation = (annotation: Annotation) => {
    const newAnnotations = [...annotations, annotation];
    setAnnotations(newAnnotations);
    addToHistory(newAnnotations);
  };

  const addTextAnnotation = () => {
    if (!textInput.trim()) return;

    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      type: 'text',
      x: textPosition.x,
      y: textPosition.y,
      text: textInput,
      color,
      strokeWidth
    };

    addAnnotation(newAnnotation);
    setTextInput('');
    setShowTextDialog(false);
  };

  const deleteAnnotation = (id: string) => {
    const newAnnotations = annotations.filter(a => a.id !== id);
    setAnnotations(newAnnotations);
    addToHistory(newAnnotations);
    setSelectedAnnotation(null);
  };

  const addToHistory = (newAnnotations: Annotation[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...newAnnotations]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setAnnotations([...history[historyIndex - 1]]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setAnnotations([...history[historyIndex + 1]]);
    }
  };

  const saveAnnotations = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    onSave?.(annotations, dataUrl);
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = 'annotated-image.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <Card>
        <CardHeader>
          <CardTitle>Image Annotation Tools</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              variant={currentTool === 'select' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCurrentTool('select')}
            >
              <MousePointer className="h-4 w-4" />
            </Button>
            <Button
              variant={currentTool === 'text' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCurrentTool('text')}
            >
              <Type className="h-4 w-4" />
            </Button>
            <Button
              variant={currentTool === 'rectangle' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCurrentTool('rectangle')}
            >
              <Square className="h-4 w-4" />
            </Button>
            <Button
              variant={currentTool === 'circle' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCurrentTool('circle')}
            >
              <Circle className="h-4 w-4" />
            </Button>
            <Button
              variant={currentTool === 'freehand' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCurrentTool('freehand')}
            >
              <Pen className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-2 ml-4">
              <Label htmlFor="color">Color:</Label>
              <input
                id="color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-8 h-8 rounded border"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Label htmlFor="strokeWidth">Width:</Label>
              <Select value={strokeWidth.toString()} onValueChange={(value) => setStrokeWidth(parseInt(value))}>
                <SelectTrigger className="w-16">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 ml-4">
              <Button size="sm" variant="outline" onClick={undo} disabled={historyIndex === 0}>
                <Undo className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={redo} disabled={historyIndex === history.length - 1}>
                <Redo className="h-4 w-4" />
              </Button>
            </div>

            {selectedAnnotation && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => deleteAnnotation(selectedAnnotation)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}

            <div className="flex gap-2 ml-auto">
              <Button size="sm" onClick={downloadImage}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              {onSave && (
                <Button size="sm" onClick={saveAnnotations}>
                  Save Annotations
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Canvas Container */}
      <div className="relative border rounded-lg overflow-hidden bg-gray-100">
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Annotation target"
          onLoad={handleImageLoad}
          className="max-w-full h-auto"
          style={{ display: 'none' }}
        />
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="max-w-full h-auto cursor-crosshair"
          style={{ display: imageLoaded ? 'block' : 'none' }}
        />
        {!imageLoaded && (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Loading image...</p>
          </div>
        )}
      </div>

      {/* Text Input Dialog */}
      <Dialog open={showTextDialog} onOpenChange={setShowTextDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Text Annotation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="textInput">Text</Label>
              <Input
                id="textInput"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Enter annotation text"
                onKeyDown={(e) => e.key === 'Enter' && addTextAnnotation()}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowTextDialog(false)}>
                Cancel
              </Button>
              <Button onClick={addTextAnnotation}>
                Add Text
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}