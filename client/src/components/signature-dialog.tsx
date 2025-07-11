import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import SignaturePad from './signature-pad';
import { FileSignature, Download, Eye, PenTool, Calendar, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface FileItem {
  id: number;
  originalName: string;
  mimeType: string;
  signatureStatus?: string;
  signatureData?: string;
  signedBy?: string;
  signedByUserId?: number;
  signedAt?: string;
  signedDocumentUrl?: string;
}

interface SignatureDialogProps {
  file: FileItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SignatureDialog({ file, open, onOpenChange }: SignatureDialogProps) {
  const [step, setStep] = useState<'info' | 'signature'>('info');
  const [signerName, setSignerName] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isSignable = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.mimeType);

  const signDocumentMutation = useMutation({
    mutationFn: async (data: { fileId: number; signatureData: string; signerName: string }) => {
      return await apiRequest('POST', `/api/files/${data.fileId}/sign`, {
        signatureData: data.signatureData,
        signerName: data.signerName,
      });
    },
    onSuccess: () => {
      toast({
        title: 'Document signed successfully',
        description: 'The document has been digitally signed.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      onOpenChange(false);
      setStep('info');
      setSignerName('');
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to sign document',
        description: error.message || 'An error occurred while signing the document.',
        variant: 'destructive',
      });
    },
  });

  const downloadSignedDocumentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('GET', `/api/files/${file.id}/download-signed`);
      return response.blob();
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `signed_${file.originalName}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onError: (error: any) => {
      toast({
        title: 'Download failed',
        description: error.message || 'Failed to download signed document',
        variant: 'destructive',
      });
    },
  });

  const getStatusBadge = () => {
    switch (file.signatureStatus) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending Signature</Badge>;
      case 'signed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Signed</Badge>;
      case 'declined':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Declined</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Not Signed</Badge>;
    }
  };

  const handleSaveSignature = (signatureData: string) => {
    if (!signerName.trim()) {
      toast({
        title: 'Signer name required',
        description: 'Please enter the name of the person signing the document.',
        variant: 'destructive',
      });
      return;
    }

    signDocumentMutation.mutate({
      fileId: file.id,
      signatureData,
      signerName: signerName.trim(),
    });
  };

  if (!isSignable) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Document Signature</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <FileSignature className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">
              This file type is not supported for digital signatures.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Only PDF and Word documents can be signed.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            Document Signature - {file.originalName}
          </DialogTitle>
        </DialogHeader>

        {step === 'info' && (
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-medium">Signature Status</h3>
                    <p className="text-sm text-muted-foreground">Current status of this document</p>
                  </div>
                  {getStatusBadge()}
                </div>

                {file.signatureStatus === 'signed' && file.signedBy && file.signedAt && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium">Signed by: {file.signedBy}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-green-600" />
                        <span className="text-sm">
                          {formatDistanceToNow(new Date(file.signedAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    
                    {file.signatureData && (
                      <div className="mt-3">
                        <p className="text-xs text-gray-600 mb-2">Digital Signature:</p>
                        <img 
                          src={file.signatureData} 
                          alt="Digital signature" 
                          className="border border-gray-300 rounded bg-white max-w-xs h-16 object-contain"
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  {file.signatureStatus === 'signed' && (
                    <Button
                      onClick={() => downloadSignedDocumentMutation.mutate()}
                      disabled={downloadSignedDocumentMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download Signed Document
                    </Button>
                  )}

                  {file.signatureStatus !== 'signed' && (
                    <>
                      <div className="flex-1">
                        <Label htmlFor="signer-name">Your Name</Label>
                        <Input
                          id="signer-name"
                          placeholder="Enter your full name"
                          value={signerName}
                          onChange={(e) => setSignerName(e.target.value)}
                        />
                      </div>
                      <Button
                        onClick={() => setStep('signature')}
                        disabled={!signerName.trim()}
                        className="flex items-center gap-2 self-end"
                      >
                        <PenTool className="h-4 w-4" />
                        Sign Document
                      </Button>
                    </>
                  )}

                  <Button
                    variant="outline"
                    onClick={() => window.open(`/api/files/${file.id}/preview`, '_blank')}
                    className="flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Preview
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 'signature' && (
          <div className="space-y-4">
            <SignaturePad
              onSave={handleSaveSignature}
              onCancel={() => setStep('info')}
              signerName={signerName}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}