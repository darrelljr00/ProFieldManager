import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Copy, ExternalLink, Share2, Clock, Users, Eye } from "lucide-react";

const shareFormSchema = z.object({
  recipientEmail: z.string().email("Please enter a valid email address").optional(),
  recipientName: z.string().min(1, "Recipient name is required").optional(),
  expiresInHours: z.number().min(1, "Must be at least 1 hour").max(8760, "Cannot exceed 1 year"),
  maxAccess: z.number().min(1, "Must allow at least 1 access").optional(),
  message: z.string().optional(),
});

type ShareFormData = z.infer<typeof shareFormSchema>;

interface SharePhotosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: number | null;
  selectedImages: any[];
  projectName: string;
  onSuccess?: () => void;
}

export function SharePhotosDialog({ 
  open, 
  onOpenChange, 
  projectId, 
  selectedImages, 
  projectName,
  onSuccess
}: SharePhotosDialogProps) {
  const [shareUrl, setShareUrl] = useState<string>("");
  const [isShared, setIsShared] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ShareFormData>({
    resolver: zodResolver(shareFormSchema),
    defaultValues: {
      expiresInHours: 168, // 1 week default
      message: projectId ? `Here are the project photos for ${projectName}. This link will expire automatically for security.` : `Here are the shared photos. This link will expire automatically for security.`,
    },
  });

  const createShareLinkMutation = useMutation({
    mutationFn: async (data: ShareFormData) => {
      const imageIds = selectedImages.map(img => img.id);
      
      console.log('🔗 Creating share link with data:', {
        projectId,
        imageIds,
        selectedImagesCount: selectedImages.length,
        formData: data
      });
      
      // Note: projectId can be null for general image sharing
      
      if (!selectedImages || selectedImages.length === 0) {
        throw new Error('At least one image must be selected');
      }
      
      if (imageIds.some(id => !id)) {
        throw new Error('Some selected images are missing IDs');
      }
      
      return apiRequest('POST', '/api/shared-photo-links', {
        projectId: projectId && projectId > 0 ? projectId : null,
        imageIds,
        ...data,
      });
    },
    onSuccess: (data) => {
      setShareUrl(data.shareUrl);
      setIsShared(true);
      queryClient.invalidateQueries({ queryKey: ['/api/shared-photo-links'] });
      toast({
        title: "Share link created",
        description: "Secure link created successfully. You can now share it with your recipient.",
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error creating share link",
        description: error.message || "Failed to create share link",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: ShareFormData) => {
    createShareLinkMutation.mutate(data);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link copied",
        description: "Share link has been copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually",
        variant: "destructive",
      });
    }
  };

  const openShareLink = () => {
    window.open(shareUrl, '_blank');
  };

  const handleClose = () => {
    setIsShared(false);
    setShareUrl("");
    form.reset();
    onOpenChange(false);
  };

  const formatExpiryTime = (hours: number) => {
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''}`;
    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''}`;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Project Photos
          </DialogTitle>
          <DialogDescription>
            Create a secure, time-limited link to share {selectedImages.length} photo{selectedImages.length !== 1 ? 's' : ''} from {projectName}.
          </DialogDescription>
        </DialogHeader>

        {!isShared ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="recipientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recipient Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Client or team member name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="recipientEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recipient Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="recipient@example.com" {...field} />
                      </FormControl>
                      <FormDescription>Optional - for your records</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="expiresInHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Link Expires After</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select expiry time" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="24">24 Hours</SelectItem>
                          <SelectItem value="72">3 Days</SelectItem>
                          <SelectItem value="168">1 Week</SelectItem>
                          <SelectItem value="336">2 Weeks</SelectItem>
                          <SelectItem value="720">1 Month</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maxAccess"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Access Limit</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          placeholder="Unlimited"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormDescription>Optional max number of views</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Optional message to include with the shared photos"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>This message will be shown when the link is accessed</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Eye className="h-4 w-4" />
                  Selected Photos Preview
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedImages.slice(0, 6).map((image, index) => (
                    <div key={image.id} className="relative">
                      <img
                        src={image.url}
                        alt={image.originalName}
                        className="w-12 h-12 object-cover rounded border"
                      />
                      {index === 5 && selectedImages.length > 6 && (
                        <div className="absolute inset-0 bg-black/50 rounded flex items-center justify-center text-white text-xs font-medium">
                          +{selectedImages.length - 6}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createShareLinkMutation.isPending}
                  className="min-w-[120px]"
                >
                  {createShareLinkMutation.isPending ? "Creating..." : "Create Share Link"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600 flex items-center gap-2">
                  <Share2 className="h-5 w-5" />
                  Share Link Created Successfully
                </CardTitle>
                <CardDescription>
                  Your secure link is ready to share. The recipient can access the photos without needing an account.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <Input value={shareUrl} readOnly className="flex-1" />
                  <Button size="sm" variant="outline" onClick={copyToClipboard}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={openShareLink}>
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex gap-2 text-sm text-muted-foreground">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Expires in {formatExpiryTime(form.getValues().expiresInHours)}
                  </Badge>
                  {form.getValues().maxAccess && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      Max {form.getValues().maxAccess} views
                    </Badge>
                  )}
                  <Badge variant="secondary">
                    {selectedImages.length} photo{selectedImages.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <DialogFooter>
              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}