import React, { useRef, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PenTool, Trash2, Download, FileSignature } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface DigitalSignatureProps {
  projectId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export default function DigitalSignature({ projectId, open, onOpenChange }: DigitalSignatureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [signerRole, setSignerRole] = useState("customer");
  const [notes, setNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch existing signatures
  const { data: signatures = [] } = useQuery<SignatureData[]>({
    queryKey: [`/api/projects/${projectId}/signatures`],
    enabled: open && !!projectId,
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
      setSignerName("");
      setSignerEmail("");
      setNotes("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save signature",
        variant: "destructive",
      });
    },
  });

  const deleteSignatureMutation = useMutation({
    mutationFn: (signatureId: number) => apiRequest("DELETE", `/api/signatures/${signatureId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/signatures`] });
      toast({
        title: "Success",
        description: "Signature deleted successfully",
      });
    },
  });

  useEffect(() => {
    if (open && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2;
      }
    }
  }, [open]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      setIsDrawing(true);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !signerName.trim()) {
      toast({
        title: "Error",
        description: "Please provide signer name and draw a signature",
        variant: "destructive",
      });
      return;
    }

    // Check if canvas has content
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const hasContent = imageData.data.some((channel, index) => index % 4 !== 3 && channel !== 0);

    if (!hasContent) {
      toast({
        title: "Error",
        description: "Please draw a signature on the canvas",
        variant: "destructive",
      });
      return;
    }

    const signatureData = canvas.toDataURL("image/png");

    createSignatureMutation.mutate({
      signatureData,
      signerName: signerName.trim(),
      signerEmail: signerEmail.trim() || null,
      signerRole,
      notes: notes.trim() || null,
      signatureType: "digital",
    });
  };

  const downloadSignature = (signature: SignatureData) => {
    const link = document.createElement("a");
    link.download = `signature-${signature.signerName}-${new Date(signature.signedAt).toLocaleDateString()}.png`;
    link.href = signature.signatureData;
    link.click();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "voided":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            Digital Signatures
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Signature Capture Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PenTool className="h-4 w-4" />
                Capture New Signature
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="signerName">Signer Name *</Label>
                  <Input
                    id="signerName"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    placeholder="Enter signer's full name"
                  />
                </div>
                <div>
                  <Label htmlFor="signerEmail">Signer Email</Label>
                  <Input
                    id="signerEmail"
                    type="email"
                    value={signerEmail}
                    onChange={(e) => setSignerEmail(e.target.value)}
                    placeholder="Enter signer's email (optional)"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="signerRole">Signer Role</Label>
                  <Select value={signerRole} onValueChange={setSignerRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer">Customer</SelectItem>
                      <SelectItem value="contractor">Contractor</SelectItem>
                      <SelectItem value="inspector">Inspector</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="witness">Witness</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional notes (optional)"
                  />
                </div>
              </div>

              <div>
                <Label>Signature Canvas</Label>
                <div className="border border-gray-300 rounded-lg p-4 bg-white">
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={200}
                    className="border border-gray-200 cursor-crosshair w-full"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                  />
                  <div className="flex gap-2 mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={clearCanvas}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                    <Button
                      type="button"
                      onClick={saveSignature}
                      disabled={createSignatureMutation.isPending}
                      className="ml-auto"
                    >
                      {createSignatureMutation.isPending ? "Saving..." : "Save Signature"}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Existing Signatures */}
          {signatures.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Existing Signatures ({signatures.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {signatures.map((signature) => (
                    <div key={signature.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-medium">{signature.signerName}</h4>
                          {signature.signerEmail && (
                            <p className="text-sm text-gray-600">{signature.signerEmail}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {signature.signerRole}
                            </Badge>
                            <Badge className={`text-xs ${getStatusColor(signature.status)}`}>
                              {signature.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Signed: {new Date(signature.signedAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadSignature(signature)}
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteSignatureMutation.mutate(signature.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 p-3 rounded border">
                        <img
                          src={signature.signatureData}
                          alt={`Signature by ${signature.signerName}`}
                          className="max-h-20 border bg-white"
                        />
                      </div>
                      
                      {signature.notes && (
                        <p className="text-sm text-gray-600 mt-2 italic">
                          Notes: {signature.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}