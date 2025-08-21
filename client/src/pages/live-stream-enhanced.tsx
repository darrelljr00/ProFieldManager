import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Camera, 
  CameraOff, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  RotateCcw, 
  Users, 
  Circle as Record, 
  Square,
  Download,
  Share2,
  AlertTriangle,
  CheckCircle,
  UserPlus,
  Send,
  Bell,
  Eye,
  Play,
  Pause
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface StreamSession {
  id: string;
  title: string;
  description?: string;
  streamerId: number;
  organizationId: number;
  status: 'active' | 'ended';
  startedAt: string;
  endedAt?: string;
}

interface StreamViewer {
  id: number;
  streamId: string;
  userId: number;
  joinedAt: string;
  leftAt?: string;
  isActive: boolean;
}

interface StreamInvitation {
  id: number;
  streamId: string;
  organizationId: number;
  invitedById: number;
  invitedUserId: number;
  message?: string;
  role: 'viewer' | 'moderator' | 'co-host';
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  sentAt: string;
  respondedAt?: string;
  expiresAt?: string;
}

interface OrganizationUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

export default function LiveStreamEnhanced() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Stream state
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [streamTitle, setStreamTitle] = useState('');
  const [streamDescription, setStreamDescription] = useState('');
  const [currentStreamId, setCurrentStreamId] = useState<string | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  
  // Invitation state
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteRole, setInviteRole] = useState<'viewer' | 'moderator' | 'co-host'>('viewer');
  
  // Media refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  
  // Error handling
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);

  // Fetch active streams
  const { data: activeStreams, refetch: refetchStreams } = useQuery({
    queryKey: ['/api/streams/active'],
    refetchInterval: 5000,
  });

  // Fetch stream viewers for current stream
  const { data: streamViewers } = useQuery({
    queryKey: ['/api/streams', currentStreamId, 'viewers'],
    enabled: !!currentStreamId && isStreaming,
    refetchInterval: 3000,
  });

  // Fetch organization users for invitations
  const { data: organizationUsers } = useQuery({
    queryKey: ['/api/streams/users'],
  });

  // Fetch pending invitations for current user
  const { data: pendingInvitations } = useQuery({
    queryKey: ['/api/streams/invitations/pending'],
    refetchInterval: 10000,
  });

  // Fetch stream notifications
  const { data: streamNotifications } = useQuery({
    queryKey: ['/api/streams/notifications'],
    refetchInterval: 5000,
  });

  // Start stream mutation
  const startStreamMutation = useMutation({
    mutationFn: async (data: { title: string; description?: string }) =>
      apiRequest('/api/streams/start', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (data: StreamSession) => {
      setCurrentStreamId(data.id);
      setIsStreaming(true);
      queryClient.invalidateQueries({ queryKey: ['/api/streams/active'] });
      toast({
        title: "Stream Started",
        description: "Your live stream is now active!",
      });
    },
    onError: (error: any) => {
      setStreamError('Failed to start stream: ' + error.message);
      toast({
        title: "Error",
        description: "Failed to start stream",
        variant: "destructive",
      });
    },
  });

  // End stream mutation
  const endStreamMutation = useMutation({
    mutationFn: async (streamId: string) =>
      apiRequest(`/api/streams/${streamId}/end`, {
        method: 'POST',
      }),
    onSuccess: () => {
      setIsStreaming(false);
      setCurrentStreamId(null);
      queryClient.invalidateQueries({ queryKey: ['/api/streams/active'] });
      toast({
        title: "Stream Ended",
        description: "Your live stream has ended successfully.",
      });
    },
  });

  // Send invitations mutation
  const sendInvitationsMutation = useMutation({
    mutationFn: async (data: {
      streamId: string;
      userIds: number[];
      message?: string;
      role: string;
    }) =>
      apiRequest(`/api/streams/${data.streamId}/invite`, {
        method: 'POST',
        body: JSON.stringify({
          userIds: data.userIds,
          message: data.message,
          role: data.role,
        }),
      }),
    onSuccess: (data) => {
      toast({
        title: "Invitations Sent",
        description: data.message,
      });
      setShowInviteDialog(false);
      setSelectedUsers([]);
      setInviteMessage('');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to send invitations",
        variant: "destructive",
      });
    },
  });

  // Respond to invitation mutation
  const respondToInvitationMutation = useMutation({
    mutationFn: async (data: { invitationId: number; response: 'accepted' | 'declined' }) =>
      apiRequest(`/api/streams/invitations/${data.invitationId}/respond`, {
        method: 'POST',
        body: JSON.stringify({ response: data.response }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/streams/invitations/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/streams/active'] });
    },
  });

  // Media access and controls
  const startCamera = async () => {
    try {
      setPermissionError(null);
      const constraints = {
        video: { facingMode: cameraFacing },
        audio: audioEnabled
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      setVideoEnabled(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      setPermissionError('Unable to access camera. Please check permissions and try again.');
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setVideoEnabled(false);
  };

  const toggleCamera = async () => {
    if (videoEnabled) {
      stopCamera();
    } else {
      await startCamera();
    }
  };

  const switchCamera = async () => {
    const newFacing = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(newFacing);
    
    if (videoEnabled) {
      stopCamera();
      setTimeout(() => {
        setCameraFacing(newFacing);
        startCamera();
      }, 100);
    }
  };

  const toggleAudio = () => {
    if (mediaStreamRef.current) {
      const audioTracks = mediaStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !audioEnabled;
      });
    }
    setAudioEnabled(!audioEnabled);
  };

  const startRecording = () => {
    if (mediaStreamRef.current) {
      recordedChunksRef.current = [];
      mediaRecorderRef.current = new MediaRecorder(mediaStreamRef.current);
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      setTimeout(() => {
        if (recordedChunksRef.current.length > 0) {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `stream-recording-${new Date().getTime()}.webm`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      }, 100);
    }
  };

  const handleStartStream = () => {
    if (!streamTitle.trim()) {
      setStreamError('Please enter a stream title');
      return;
    }

    startStreamMutation.mutate({
      title: streamTitle.trim(),
      description: streamDescription.trim() || undefined,
    });
  };

  const handleEndStream = () => {
    if (currentStreamId) {
      endStreamMutation.mutate(currentStreamId);
      if (isRecording) {
        stopRecording();
      }
      stopCamera();
    }
  };

  const handleSendInvitations = () => {
    if (!currentStreamId) return;
    if (selectedUsers.length === 0) {
      toast({
        title: "No Users Selected",
        description: "Please select at least one user to invite",
        variant: "destructive",
      });
      return;
    }

    sendInvitationsMutation.mutate({
      streamId: currentStreamId,
      userIds: selectedUsers,
      message: inviteMessage.trim() || undefined,
      role: inviteRole,
    });
  };

  const handleUserSelection = (userId: number) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const getActiveStreamCount = () => {
    return activeStreams?.length || 0;
  };

  const getViewerCount = () => {
    return streamViewers?.filter(v => v.isActive).length || 0;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Live Stream</h1>
        <p className="text-gray-600">Stream live to your team with invitations and real-time notifications</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Stream Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Camera Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Camera Preview</CardTitle>
              <CardDescription>
                Configure your camera and audio before streaming
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Video Preview */}
              <div className="relative mb-4 bg-gray-900 rounded-lg overflow-hidden aspect-video">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {!videoEnabled && (
                  <div className="absolute inset-0 flex items-center justify-center text-white">
                    <div className="text-center">
                      <CameraOff className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>Camera is off</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Camera Controls */}
              <div className="flex flex-wrap gap-2 mb-4">
                <Button
                  variant={videoEnabled ? "default" : "outline"}
                  size="sm"
                  onClick={toggleCamera}
                >
                  {videoEnabled ? <Camera className="w-4 h-4 mr-1" /> : <CameraOff className="w-4 h-4 mr-1" />}
                  {videoEnabled ? "Turn Off" : "Turn On"}
                </Button>

                <Button
                  variant={audioEnabled ? "default" : "outline"}
                  size="sm"
                  onClick={toggleAudio}
                >
                  {audioEnabled ? <Mic className="w-4 h-4 mr-1" /> : <MicOff className="w-4 h-4 mr-1" />}
                  {audioEnabled ? "Mute" : "Unmute"}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={switchCamera}
                  disabled={!videoEnabled}
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Flip
                </Button>

                <Button
                  variant={isRecording ? "destructive" : "outline"}
                  size="sm"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={!videoEnabled}
                >
                  {isRecording ? <Square className="w-4 h-4 mr-1" /> : <Record className="w-4 h-4 mr-1" />}
                  {isRecording ? "Stop Recording" : "Start Recording"}
                </Button>
              </div>

              {/* Error Messages */}
              {permissionError && (
                <Alert className="mb-4">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>{permissionError}</AlertDescription>
                </Alert>
              )}

              {streamError && (
                <Alert className="mb-4">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>{streamError}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Stream Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Stream Setup</CardTitle>
              <CardDescription>
                Configure your stream details and invite team members
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="streamTitle">Stream Title *</Label>
                <Input
                  id="streamTitle"
                  placeholder="Enter stream title..."
                  value={streamTitle}
                  onChange={(e) => setStreamTitle(e.target.value)}
                  disabled={isStreaming}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="streamDescription">Description</Label>
                <Textarea
                  id="streamDescription"
                  placeholder="Describe your stream (optional)..."
                  value={streamDescription}
                  onChange={(e) => setStreamDescription(e.target.value)}
                  disabled={isStreaming}
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                {!isStreaming ? (
                  <Button 
                    onClick={handleStartStream}
                    disabled={!streamTitle.trim() || startStreamMutation.isPending}
                    className="flex-1"
                  >
                    <Video className="w-4 h-4 mr-2" />
                    Start Stream
                  </Button>
                ) : (
                  <>
                    <Button 
                      onClick={handleEndStream}
                      variant="destructive"
                      disabled={endStreamMutation.isPending}
                      className="flex-1"
                    >
                      <Square className="w-4 h-4 mr-2" />
                      End Stream
                    </Button>

                    {/* Invite Users Dialog */}
                    <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                      <DialogTrigger asChild>
                        <Button variant="outline">
                          <UserPlus className="w-4 h-4 mr-2" />
                          Invite
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Invite Team Members</DialogTitle>
                          <DialogDescription>
                            Select team members to invite to your live stream
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-4">
                          {/* User Selection */}
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {organizationUsers?.map((user) => (
                              <div key={user.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`user-${user.id}`}
                                  checked={selectedUsers.includes(user.id)}
                                  onCheckedChange={() => handleUserSelection(user.id)}
                                />
                                <Label 
                                  htmlFor={`user-${user.id}`}
                                  className="flex-1 text-sm"
                                >
                                  <div>
                                    <span className="font-medium">{user.name}</span>
                                    <span className="text-gray-500 ml-2">({user.role})</span>
                                  </div>
                                  <div className="text-xs text-gray-400">{user.email}</div>
                                </Label>
                              </div>
                            ))}
                          </div>

                          {/* Role Selection */}
                          <div className="space-y-2">
                            <Label>Invite as</Label>
                            <Select value={inviteRole} onValueChange={(value: any) => setInviteRole(value)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="viewer">Viewer</SelectItem>
                                <SelectItem value="moderator">Moderator</SelectItem>
                                <SelectItem value="co-host">Co-host</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Custom Message */}
                          <div className="space-y-2">
                            <Label htmlFor="inviteMessage">Custom Message (Optional)</Label>
                            <Textarea
                              id="inviteMessage"
                              placeholder="Add a personal message to your invitation..."
                              value={inviteMessage}
                              onChange={(e) => setInviteMessage(e.target.value)}
                              rows={3}
                            />
                          </div>

                          <div className="flex gap-2">
                            <Button
                              onClick={handleSendInvitations}
                              disabled={selectedUsers.length === 0 || sendInvitationsMutation.isPending}
                              className="flex-1"
                            >
                              <Send className="w-4 h-4 mr-2" />
                              Send Invitations ({selectedUsers.length})
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </>
                )}
              </div>

              {/* Stream Status */}
              {isStreaming && (
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-green-700 font-medium">LIVE</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-green-600">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {getViewerCount()} viewers
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stream Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Stream Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Active Streams</span>
                  <Badge variant="secondary">{getActiveStreamCount()}</Badge>
                </div>
                {isStreaming && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Current Viewers</span>
                    <Badge variant="secondary">{getViewerCount()}</Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pending Invitations */}
          {pendingInvitations && pendingInvitations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Stream Invitations
                  <Badge variant="destructive" className="ml-auto">
                    {pendingInvitations.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingInvitations.map((invitation: StreamInvitation) => (
                  <div key={invitation.id} className="p-3 border rounded-lg">
                    <div className="font-medium text-sm mb-1">
                      Stream Invitation
                    </div>
                    {invitation.message && (
                      <p className="text-xs text-gray-600 mb-2">
                        "{invitation.message}"
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => respondToInvitationMutation.mutate({
                          invitationId: invitation.id,
                          response: 'accepted'
                        })}
                        disabled={respondToInvitationMutation.isPending}
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => respondToInvitationMutation.mutate({
                          invitationId: invitation.id,
                          response: 'declined'
                        })}
                        disabled={respondToInvitationMutation.isPending}
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Active Streams */}
          <Card>
            <CardHeader>
              <CardTitle>Active Streams</CardTitle>
              <CardDescription>
                Join or view active streams in your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeStreams && activeStreams.length > 0 ? (
                <div className="space-y-3">
                  {activeStreams.map((stream: StreamSession) => (
                    <div key={stream.id} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium text-sm">{stream.title}</h4>
                          {stream.description && (
                            <p className="text-xs text-gray-600 mt-1">
                              {stream.description}
                            </p>
                          )}
                        </div>
                        <Badge variant="destructive" className="text-xs">
                          LIVE
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">
                          Started {new Date(stream.startedAt).toLocaleTimeString()}
                        </span>
                        {stream.streamerId !== user?.id && (
                          <Button size="sm" variant="outline">
                            <Play className="w-3 h-3 mr-1" />
                            Join
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  No active streams
                </p>
              )}
            </CardContent>
          </Card>

          {/* Stream Tips */}
          <Card>
            <CardHeader>
              <CardTitle>Streaming Tips</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>• Test your camera and audio before starting</p>
              <p>• Use a stable internet connection</p>
              <p>• Good lighting improves video quality</p>
              <p>• Invite specific team members for focused discussions</p>
              <p>• Recording saves automatically when you stop</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}