import React, { useRef, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PenTool, Trash2, Download, FileSignature, Save, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface JobSignatureCaptureProps {
  projectId: number;
  jobTitle?: string;
  customerName?: string;
}

interface SignatureData {
  id: number;
  signatureData: string;
  signerName: string;
  signerEmail?: string;
  signerRole?: string;
  signatureType: string;
  signedAt: string;
  notes?: string;
  status: string;
}

export default function JobSignatureCapture({ projectId, jobTitle, customerName }: JobSignatureCaptureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signerName, setSignerName] = useState(customerName || "");
  const [signerEmail, setSignerEmail] = useState("");
  const [signerRole, setSignerRole] = useState("customer");
  const [notes, setNotes] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch existing signatures for this job
  const { data: signatures = [] } = useQuery<SignatureData[]>({
    queryKey: [`/api/projects/${projectId}/signatures`],
    enabled: !!projectId,
  });

  const createSignatureMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/projects/${projectId}/signatures`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/signatures`] });
      toast({
        title: "Success",
        description: "Signature captured successfully",
      });
      clearCanvas();
      setSignerName(customerName || "");
      setSignerEmail("");
      setNotes("");
      setIsOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save signature",
        variant: "destructive",
      });
    },
  });

  const deleteSignatureMutation = useMutation({
    mutationFn: (signatureId: number) => apiRequest("DELETE", `/api/projects/${projectId}/signatures/${signatureId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/signatures`] });
      toast({
        title: "Success",
        description: "Signature deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete signature",
        variant: "destructive",
      });
    },
  });

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    canvas.width = 400;
    canvas.height = 200;

    // Set drawing styles
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Clear canvas with white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [isOpen]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const saveSignature = () => {
    if (!signerName.trim()) {
      toast({
        title: "Error",
        description: "Please enter the signer's name",
        variant: "destructive",
      });
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Convert canvas to base64
    const signatureData = canvas.toDataURL("image/png");

    // Check if canvas is empty (just white background)
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    let isEmpty = true;

    for (let i = 0; i < data.length; i += 4) {
      // Check if any pixel is not white
      if (data[i] !== 255 || data[i + 1] !== 255 || data[i + 2] !== 255) {
        isEmpty = false;
        break;
      }
    }

    if (isEmpty) {
      toast({
        title: "Error",
        description: "Please provide a signature",
        variant: "destructive",
      });
      return;
    }

    createSignatureMutation.mutate({
      signatureData,
      signerName: signerName.trim(),
      signerEmail: signerEmail.trim() || null,
      signerRole,
      signatureType: "digital",
      notes: notes.trim() || null,
    });
  };

  const downloadSignature = (signatureData: string, signerName: string) => {
    const link = document.createElement("a");
    link.download = `signature-${signerName.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.png`;
    link.href = signatureData;
    link.click();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'voided': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      {/* Existing Signatures */}
      {signatures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSignature className="w-5 h-5" />
              Job Signatures ({signatures.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {signatures.map((signature) => (
                <div key={signature.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <img
                      src={signature.signatureData}
                      alt={`Signature by ${signature.signerName}`}
                      className="w-20 h-10 border rounded object-contain bg-white"
                    />
                    <div>
                      <p className="font-medium">{signature.signerName}</p>
                      {signature.signerEmail && (
                        <p className="text-sm text-gray-600">{signature.signerEmail}</p>
                      )}
                      <p className="text-sm text-gray-500">
                        {signature.signerRole} • {new Date(signature.signedAt).toLocaleDateString()}
                      </p>
                      {signature.notes && (
                        <p className="text-sm text-gray-600 mt-1">{signature.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(signature.status)}>
                      {signature.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => downloadSignature(signature.signatureData, signature.signerName)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteSignatureMutation.mutate(signature.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Capture New Signature Button */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button className="w-full" variant="outline">
            <PenTool className="w-4 h-4 mr-2" />
            Capture Signature
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Capture Signature {jobTitle && `- ${jobTitle}`}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Signer Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="signerName">Signer Name *</Label>
                <Input
                  id="signerName"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Enter full name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="signerEmail">Email (Optional)</Label>
                <Input
                  id="signerEmail"
                  type="email"
                  value={signerEmail}
                  onChange={(e) => setSignerEmail(e.target.value)}
                  placeholder="Enter email address"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="signerRole">Role</Label>
                <Select value={signerRole} onValueChange={setSignerRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="contractor">Contractor</SelectItem>
                    <SelectItem value="inspector">Inspector</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="witness">Witness</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes"
                />
              </div>
            </div>

            {/* Signature Canvas */}
            <div>
              <Label>Signature *</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                <canvas
                  ref={canvasRef}
                  className="border bg-white rounded cursor-crosshair w-full"
                  style={{ maxWidth: "100%", height: "200px" }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
                <p className="text-sm text-gray-600 mt-2 text-center">
                  Sign above using your mouse or finger (touch devices)
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={clearCanvas}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Clear
              </Button>
              <div className="space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={saveSignature}
                  disabled={createSignatureMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {createSignatureMutation.isPending ? "Saving..." : "Save Signature"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}