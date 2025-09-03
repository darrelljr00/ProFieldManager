import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Eye, Clock, User, MessageSquare, ArrowLeft, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface SharedPhoto {
  id: number;
  filename: string;
  originalName: string;
  cloudinaryUrl: string;
  size: number;
  mimeType: string;
  uploadDate: string;
}

interface SharedPhotoLinkData {
  id: number;
  shareToken: string;
  projectId: number | null;
  projectName?: string;
  imageIds: number[];
  images: SharedPhoto[];
  createdBy: number;
  createdByName: string;
  recipientName?: string;
  recipientEmail?: string;
  expiresAt: string;
  accessCount: number;
  maxAccess?: number;
  message?: string;
  isActive: boolean;
  createdAt: string;
}

export default function SharedPhotosViewer() {
  const [, params] = useRoute("/shared/:token");
  const [selectedImage, setSelectedImage] = useState<SharedPhoto | null>(null);
  const token = params?.token;

  console.log('🔗 SharedPhotosViewer - Route params:', { params: params || null, token, currentPath: window.location.pathname });

  // Workaround for custom domain authentication issue - route shared photo requests to Replit API
  const getSharedPhotoUrl = (token: string) => {
    const isCustomDomain = window.location.hostname === 'profieldmanager.com';
    if (isCustomDomain) {
      // Route to Replit API directly to bypass custom domain authentication issues
      return `https://d08781a3-d8ec-4b72-a274-8e025593045b-00-1v1hzi896az5i.riker.replit.dev/api/shared/${token}`;
    }
    return `/api/shared/${token}`;
  };

  const { data: sharedData, isLoading, error } = useQuery({
    queryKey: [`shared-photos-${token}`],
    queryFn: async () => {
      if (!token) throw new Error('No token provided');
      
      const url = getSharedPhotoUrl(token);
      console.log('📸 Fetching shared photos from:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'SharedPhotoViewer/1.0'
        },
        credentials: 'omit' // Don't send credentials for shared photo requests
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch shared photos: ${response.status} ${response.statusText}`);
      }
      
      return response.json();
    },
    enabled: !!token,
    retry: false,
  });

  console.log('🔗 SharedPhotosViewer - Query state:', { 
    isLoading, 
    error, 
    hasData: !!sharedData, 
    dataType: typeof sharedData,
    token 
  });

  // Add early return if token is missing
  if (!token) {
    console.error('🔗 SharedPhotosViewer - No token found in URL');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Invalid Link</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600">This shared link appears to be invalid.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-gray-600">Loading shared photos...</p>
        </div>
      </div>
    );
  }

  if (error || !sharedData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Link Not Found</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              This shared link may have expired, been deactivated, or reached its access limit.
            </p>
            <Button 
              onClick={() => window.location.href = 'https://profieldmanager.com'}
              className="w-full"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Visit Pro Field Manager
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Validate that we have the correct data structure for shared photo links
  if (!sharedData.shareToken || !sharedData.images || !Array.isArray(sharedData.images)) {
    console.error('🔗 Invalid shared photo data structure:', sharedData);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Invalid Shared Link</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600">
              This does not appear to be a valid shared photo link. Please check the URL and try again.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const linkData = sharedData as SharedPhotoLinkData;
  const isExpired = new Date() > new Date(linkData.expiresAt);
  const isAccessLimitReached = linkData.maxAccess && linkData.accessCount >= linkData.maxAccess;

  if (isExpired || isAccessLimitReached || !linkData.isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <CardTitle className="text-amber-600">Link Unavailable</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              {isExpired ? "This shared link has expired." : 
               isAccessLimitReached ? "This shared link has reached its access limit." :
               "This shared link has been deactivated."}
            </p>
            <Button 
              onClick={() => window.location.href = 'https://profieldmanager.com'}
              className="w-full"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Visit Pro Field Manager
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selectedImage) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center relative">
        <Button
          onClick={() => setSelectedImage(null)}
          variant="outline"
          size="sm"
          className="absolute top-4 left-4 z-10 bg-white/90 hover:bg-white"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Gallery
        </Button>
        
        <Button
          onClick={() => {
            const link = document.createElement('a');
            link.href = selectedImage.cloudinaryUrl;
            link.download = selectedImage.originalName;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }}
          variant="outline"
          size="sm"
          className="absolute top-4 right-4 z-10 bg-white/90 hover:bg-white"
        >
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>

        <img
          src={selectedImage.cloudinaryUrl}
          alt={selectedImage.originalName}
          className="max-w-full max-h-full object-contain"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Shared Photos</CardTitle>
                {linkData.projectName && (
                  <p className="text-gray-600 mt-1">From project: {linkData.projectName}</p>
                )}
              </div>
              <div className="text-right">
                <Badge variant="secondary" className="mb-2">
                  <Eye className="h-3 w-3 mr-1" />
                  {linkData.accessCount} view{linkData.accessCount !== 1 ? 's' : ''}
                </Badge>
                {linkData.maxAccess && (
                  <p className="text-sm text-gray-500">
                    {linkData.maxAccess - linkData.accessCount} remaining
                  </p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {linkData.message && (
              <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
                <div className="flex items-start gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-blue-800">{linkData.message}</p>
                </div>
              </div>
            )}
            
            <div className="flex flex-wrap gap-3 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                Shared by {linkData.createdByName}
              </div>
              {linkData.recipientName && (
                <div className="flex items-center gap-1">
                  <span>•</span>
                  <span>For {linkData.recipientName}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Expires {format(new Date(linkData.expiresAt), 'MMM d, yyyy at h:mm a')}
              </div>
              <div className="flex items-center gap-1">
                <span>•</span>
                <span>{linkData.images.length} photo{linkData.images.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Photo Gallery */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {linkData.images.map((image) => (
            <Card key={image.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-square relative group cursor-pointer">
                <img
                  src={image.cloudinaryUrl}
                  alt={image.originalName}
                  className="w-full h-full object-cover"
                  onClick={() => setSelectedImage(image)}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImage(image);
                      }}
                      className="bg-white/90 hover:bg-white"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        const link = document.createElement('a');
                        link.href = image.cloudinaryUrl;
                        link.download = image.originalName;
                        link.target = '_blank';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="bg-white/90 hover:bg-white"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <CardContent className="p-3">
                <p className="text-sm font-medium truncate" title={image.originalName}>
                  {image.originalName}
                </p>
                <div className="flex justify-between items-center mt-1 text-xs text-gray-500">
                  <span>{format(new Date(image.uploadDate), 'MMM d, yyyy')}</span>
                  <span>{(image.size / 1024 / 1024).toFixed(1)} MB</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-gray-500 text-sm mb-4">
            Powered by <strong>Pro Field Manager</strong> - Professional Field Service Management
          </p>
          <Button 
            variant="outline"
            onClick={() => window.location.href = 'https://profieldmanager.com'}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Learn More About Pro Field Manager
          </Button>
        </div>
      </div>
    </div>
  );
}