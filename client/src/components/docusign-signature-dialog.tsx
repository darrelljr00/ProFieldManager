import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PenTool, FileSignature, ExternalLink, Download, X } from "lucide-react";

const signatureFormSchema = z.object({
  recipientEmail: z.string().email("Please enter a valid email address"),
  recipientName: z.string().min(1, "Recipient name is required"),
  subject: z.string().optional(),
});

type SignatureFormData = z.infer<typeof signatureFormSchema>;

interface DocuSignSignatureDialogProps {
  file: {
    id: number;
    originalName: string;
    mimeType: string;
    signatureStatus?: string;
    docusignEnvelopeId?: string;
    signatureUrl?: string;
  };
  projectId: number;
  trigger?: React.ReactNode;
}

export function DocuSignSignatureDialog({ file, projectId, trigger }: DocuSignSignatureDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<SignatureFormData>({
    resolver: zodResolver(signatureFormSchema),
    defaultValues: {
      recipientEmail: "",
      recipientName: "",
      subject: `Signature request for ${file.originalName}`,
    },
  });

  const sendForSignatureMutation = useMutation({
    mutationFn: async (data: SignatureFormData) => {
      return await apiRequest("POST", "/api/docusign/send-for-signature", {
        fileId: file.id,
        ...data,
      });
    },
    onSuccess: () => {
      toast({
        title: "Document sent for signature",
        description: "The recipient will receive an email with signing instructions.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      setOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send document",
        description: error.message || "An error occurred while sending the document for signature.",
        variant: "destructive",
      });
    },
  });

  const voidEnvelopeMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/docusign/envelope/${file.docusignEnvelopeId}/void`, {
        reason: "Cancelled by user",
      });
    },
    onSuccess: () => {
      toast({
        title: "Signature request cancelled",
        description: "The document signature request has been cancelled.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to cancel request",
        description: error.message || "An error occurred while cancelling the signature request.",
        variant: "destructive",
      });
    },
  });

  const downloadSignedDocumentMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/docusign/envelope/${file.docusignEnvelopeId}/download`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to download signed document");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `signed-${file.originalName}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    },
    onError: (error: any) => {
      toast({
        title: "Download failed",
        description: error.message || "An error occurred while downloading the signed document.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SignatureFormData) => {
    sendForSignatureMutation.mutate(data);
  };

  const getStatusBadge = () => {
    switch (file.signatureStatus) {
      case "sent":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Sent for Signature</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Signed</Badge>;
      case "voided":
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Cancelled</Badge>;
      default:
        return null;
    }
  };

  const isSignableDocument = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.mimeType);

  if (!isSignableDocument) {
    return (
      <div className="mt-2 p-2 bg-yellow-100 text-xs">
        DocuSign not available for this file type: {file.mimeType}
        <br />Supported types: PDF, DOC, DOCX
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {getStatusBadge()}
      
      {file.signatureStatus === "completed" && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => downloadSignedDocumentMutation.mutate()}
          disabled={downloadSignedDocumentMutation.isPending}
        >
          <Download className="h-4 w-4 mr-1" />
          Download Signed
        </Button>
      )}
      
      {file.signatureStatus === "sent" && (
        <div className="flex items-center gap-2">
          {file.signatureUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(file.signatureUrl, "_blank")}
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Open Signing Link
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => voidEnvelopeMutation.mutate()}
            disabled={voidEnvelopeMutation.isPending}
          >
            <X className="h-4 w-4 mr-1" />
            Cancel Request
          </Button>
        </div>
      )}
      
      {(!file.signatureStatus || file.signatureStatus === "voided") && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            {trigger || (
              <Button variant="outline" size="sm">
                <PenTool className="h-4 w-4 mr-1" />
                Send for Signature
              </Button>
            )}
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSignature className="h-5 w-5" />
                Send Document for Signature
              </DialogTitle>
              <DialogDescription>
                Send "{file.originalName}" to someone for electronic signature using DocuSign.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="recipientEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recipient Email</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter email address" {...field} />
                      </FormControl>
                      <FormDescription>
                        The person who will receive the document to sign
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="recipientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recipient Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Subject (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Signature request subject" {...field} />
                      </FormControl>
                      <FormDescription>
                        Custom subject line for the signature request email
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={sendForSignatureMutation.isPending}>
                    {sendForSignatureMutation.isPending ? "Sending..." : "Send for Signature"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}