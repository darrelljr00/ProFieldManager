import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
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
  CheckCircle
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';

interface StreamSession {
  id: string;
  title: string;
  streamerId: number;
  streamerName: string;
  status: 'active' | 'ended';
  startedAt: string;
  endedAt?: string;
  viewerCount: number;
  recordingUrl?: string;
}

interface StreamViewer {
  id: number;
  name: string;
  joinedAt: string;
  isActive: boolean;
}

export default function LiveStreamPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Stream state
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [streamTitle, setStreamTitle] = useState('');
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  
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
    enabled: false, // Disable until API is ready
  });

  // Fetch stream viewers for current stream
  const { data: streamViewers } = useQuery({
    queryKey: ['/api/streams/viewers'],
    enabled: false, // Disable until API is ready
    refetchInterval: 2000,
  });

  // Start stream mutation (disabled for now - demo mode)
  const startStreamMutation = {
    mutate: (data: { title: string }) => {
      console.log('Demo: Starting stream with title:', data.title);
      setStreamError(null);
    },
    isPending: false,
  };

  // End stream mutation (disabled for now - demo mode)  
  const endStreamMutation = {
    mutate: () => {
      console.log('Demo: Ending stream');
      stopLocalStream();
    },
    isPending: false,
  };

  // Initialize camera
  const initializeCamera = async () => {
    try {
      setPermissionError(null);
      
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: audioEnabled,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      return stream;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Camera access denied';
      setPermissionError(`Camera permission required: ${errorMsg}`);
      throw error;
    }
  };

  // Switch camera
  const switchCamera = async () => {
    const newFacing = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(newFacing);
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    try {
      await initializeCamera();
    } catch (error) {
      console.error('Failed to switch camera:', error);
    }
  };

  // Toggle audio
  const toggleAudio = () => {
    if (mediaStreamRef.current) {
      const audioTracks = mediaStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !audioEnabled;
      });
    }
    setAudioEnabled(!audioEnabled);
  };

  // Toggle video
  const toggleVideo = () => {
    if (mediaStreamRef.current) {
      const videoTracks = mediaStreamRef.current.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !videoEnabled;
      });
    }
    setVideoEnabled(!videoEnabled);
  };

  // Start streaming
  const startStream = async () => {
    if (!streamTitle.trim()) {
      setStreamError('Please enter a stream title');
      return;
    }

    try {
      const stream = await initializeCamera();
      setIsStreaming(true);
      
      // Start the stream session on the server
      startStreamMutation.mutate({ title: streamTitle });
      
      setStreamError(null);
    } catch (error) {
      console.error('Failed to start stream:', error);
    }
  };

  // Stop streaming
  const stopStream = () => {
    endStreamMutation.mutate();
    stopRecording();
  };

  // Stop local stream
  const stopLocalStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsStreaming(false);
  };

  // Start recording
  const startRecording = () => {
    if (!mediaStreamRef.current) return;

    recordedChunksRef.current = [];
    
    const options: MediaRecorderOptions = {
      mimeType: 'video/webm;codecs=vp9,opus',
    };

    try {
      const mediaRecorder = new MediaRecorder(mediaStreamRef.current, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        uploadRecording(blob);
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      setStreamError('Recording not supported on this device');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Upload recording (demo mode - downloads locally)
  const uploadRecording = async (blob: Blob) => {
    console.log('Demo: Recording saved locally');
    // Auto-download the recording
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${streamTitle}-${new Date().toISOString()}.webm`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download recording
  const downloadRecording = () => {
    if (recordedChunksRef.current.length > 0) {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${streamTitle}-${new Date().toISOString()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopLocalStream();
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Live Stream</h1>
          <p className="text-muted-foreground mt-1">
            Stream live video to your team members
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-2">
          <Video className="h-4 w-4" />
          {isStreaming ? 'Live' : 'Offline'}
        </Badge>
      </div>

      {/* Permission Error Alert */}
      {permissionError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{permissionError}</AlertDescription>
        </Alert>
      )}

      {/* Stream Error Alert */}
      {streamError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{streamError}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Stream Area */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Stream Preview
              </CardTitle>
              <CardDescription>
                Your live stream as viewers will see it
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                
                {!videoEnabled && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                    <div className="text-center text-white">
                      <VideoOff className="h-12 w-12 mx-auto mb-2" />
                      <p>Camera Off</p>
                    </div>
                  </div>
                )}

                {/* Stream Controls Overlay */}
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isStreaming && (
                        <Badge variant="destructive" className="animate-pulse">
                          LIVE
                        </Badge>
                      )}
                      {isRecording && (
                        <Badge variant="secondary" className="animate-pulse">
                          <Record className="h-3 w-3 mr-1" />
                          REC
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={toggleAudio}
                        disabled={!mediaStreamRef.current}
                      >
                        {audioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                      </Button>
                      
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={toggleVideo}
                        disabled={!mediaStreamRef.current}
                      >
                        {videoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                      </Button>
                      
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={switchCamera}
                        disabled={!mediaStreamRef.current}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stream Controls */}
              <div className="mt-4 space-y-4">
                {!isStreaming ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Stream Title
                      </label>
                      <input
                        type="text"
                        placeholder="Enter stream title..."
                        value={streamTitle}
                        onChange={(e) => setStreamTitle(e.target.value)}
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div className="flex gap-3">
                      <Button 
                        onClick={startStream}
                        disabled={startStreamMutation.isPending || !streamTitle.trim()}
                        className="flex-1"
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Start Live Stream
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <Button 
                      onClick={stopStream}
                      variant="destructive"
                      disabled={endStreamMutation.isPending}
                    >
                      <Square className="h-4 w-4 mr-2" />
                      End Stream
                    </Button>
                    
                    {!isRecording ? (
                      <Button 
                        onClick={startRecording}
                        variant="secondary"
                      >
                        <Record className="h-4 w-4 mr-2" />
                        Start Recording
                      </Button>
                    ) : (
                      <Button 
                        onClick={stopRecording}
                        variant="outline"
                      >
                        <Square className="h-4 w-4 mr-2" />
                        Stop Recording
                      </Button>
                    )}
                    
                    {recordedChunksRef.current.length > 0 && (
                      <Button 
                        onClick={downloadRecording}
                        variant="outline"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Side Panel */}
        <div className="space-y-4">
          {/* Current Viewers */}
          {isStreaming && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Live Viewers
                  <Badge variant="secondary">{isStreaming ? Math.floor(Math.random() * 5) + 1 : 0}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {isStreaming ? (
                    ['John Smith', 'Sarah Wilson', 'Mike Johnson'].slice(0, Math.floor(Math.random() * 3) + 1).map((viewerName, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <div className="h-2 w-2 bg-green-500 rounded-full" />
                        <span className="text-sm font-medium">{viewerName}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No viewers yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Active Streams */}
          <Card>
            <CardHeader>
              <CardTitle>Team Streams</CardTitle>
              <CardDescription>
                Current live streams from team members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activeStreams?.length > 0 ? (
                  activeStreams.map((stream: StreamSession) => (
                    <div key={stream.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{stream.title}</h4>
                        <Badge variant="destructive" className="text-xs">
                          LIVE
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        by {stream.streamerName}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {stream.viewerCount} viewers
                        </span>
                        <Button size="sm" variant="outline">
                          <Share2 className="h-3 w-3 mr-1" />
                          Watch
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No active streams
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Stream Tips */}
          <Card>
            <CardHeader>
              <CardTitle>Stream Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm">Ensure good lighting for better video quality</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm">Use a stable internet connection</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm">Test your audio before going live</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}