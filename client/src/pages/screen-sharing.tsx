import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Monitor, 
  MonitorOff, 
  Phone, 
  PhoneOff,
  Users,
  MessageSquare,
  Calendar,
  Plus,
  Settings,
  Copy,
  Send,
  PlayCircle,
  StopCircle,
  Upload,
  Clock,
  UserPlus,
  Bell,
  Zap,
  Camera
} from 'lucide-react';
import { format } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';

interface Meeting {
  id: number;
  title: string;
  description?: string;
  scheduledStartTime: string;
  scheduledEndTime?: string;
  actualStartTime?: string;
  actualEndTime?: string;
  status: 'scheduled' | 'active' | 'ended' | 'cancelled';
  hostUserId: string;
  organizationId: number;
  meetingUrl?: string;
  isRecording: boolean;
  maxParticipants?: number;
  createdAt: string;
  updatedAt: string;
  participants?: MeetingParticipant[];
  messages?: MeetingMessage[];
  recordings?: MeetingRecording[];
}

interface MeetingParticipant {
  id: number;
  meetingId: number;
  userId: string;
  joinedAt: string;
  leftAt?: string;
  role: 'host' | 'participant';
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface MeetingMessage {
  id: number;
  meetingId: number;
  senderId: string;
  content: string;
  messageType: 'text' | 'system';
  sentAt: string;
  sender?: {
    firstName: string;
    lastName: string;
  };
}

interface MeetingRecording {
  id: number;
  meetingId: number;
  title: string;
  recordingUrl: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  fileSize?: number;
  recordedBy: string;
  createdAt: string;
}

export default function ScreenSharing() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State management
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isInMeeting, setIsInMeeting] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [participants, setParticipants] = useState<MeetingParticipant[]>([]);
  const [chatMessages, setChatMessages] = useState<MeetingMessage[]>([]);
  const [hasMediaAccess, setHasMediaAccess] = useState(false);
  const [mediaPermissionDenied, setMediaPermissionDenied] = useState(false);
  
  // WebRTC refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localScreenRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const screenStream = useRef<MediaStream | null>(null);
  
  // Form states
  const [newMeeting, setNewMeeting] = useState({
    title: '',
    description: '',
    scheduledStartTime: '',
    scheduledEndTime: '',
    maxParticipants: 10
  });

  // Additional dialogs and instant meeting state
  const [isStartNowDialogOpen, setIsStartNowDialogOpen] = useState(false);
  const [instantMeeting, setInstantMeeting] = useState({
    title: '',
    description: '',
    selectedParticipants: [] as number[],
    sendToAll: false,
    enableReminder: false,
    reminderMinutes: 5
  });

  // Organization members data
  const { data: organizationMembers = [] } = useQuery({
    queryKey: ['/api/users/organization-members']
  });

  // Fetch meetings
  const { data: meetings = [], isLoading: meetingsLoading } = useQuery({
    queryKey: ['/api/meetings'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Create meeting mutation
  const createMeetingMutation = useMutation({
    mutationFn: async (meetingData: any) => {
      return await apiRequest('POST', '/api/meetings', meetingData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meetings'] });
      setIsCreateDialogOpen(false);
      setNewMeeting({
        title: '',
        description: '',
        scheduledStartTime: '',
        scheduledEndTime: '',
        maxParticipants: 10
      });
      toast({
        title: 'Success',
        description: 'Meeting created successfully',
      });
    },
    onError: (error: any) => {
      console.error('Create meeting error:', error);
      toast({
        title: 'Error',
        description: 'Failed to create meeting',
        variant: 'destructive',
      });
    },
  });



  // Join meeting mutation
  const joinMeetingMutation = useMutation({
    mutationFn: async (meetingId: number) => {
      return await apiRequest('POST', `/api/meetings/${meetingId}/join`);
    },
    onSuccess: () => {
      setIsInMeeting(true);
      initializeWebRTC();
      toast({
        title: 'Success',
        description: 'Joined meeting successfully',
      });
    },
    onError: (error: any) => {
      console.error('Join meeting error:', error);
      toast({
        title: 'Error',
        description: 'Failed to join meeting',
        variant: 'destructive',
      });
    },
  });

  // Leave meeting mutation
  const leaveMeetingMutation = useMutation({
    mutationFn: async (meetingId: number) => {
      return await apiRequest('POST', `/api/meetings/${meetingId}/leave`);
    },
    onSuccess: () => {
      setIsInMeeting(false);
      setSelectedMeeting(null);
      cleanupWebRTC();
      toast({
        title: 'Success',
        description: 'Left meeting successfully',
      });
    },
    onError: (error: any) => {
      console.error('Leave meeting error:', error);
      toast({
        title: 'Error',
        description: 'Failed to leave meeting',
        variant: 'destructive',
      });
    },
  });

  // Start meeting now mutation
  const startMeetingNowMutation = useMutation({
    mutationFn: async (meetingData: any) => {
      // Create meeting with immediate start time
      const now = new Date();
      const endTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
      
      const payload = {
        title: meetingData.title,
        description: meetingData.description,
        scheduledStartTime: now.toISOString(),
        scheduledEndTime: endTime.toISOString(),
        maxParticipants: meetingData.selectedParticipants.length + 1
      };

      const meeting = await apiRequest('POST', '/api/meetings', payload);
      
      // Send notifications/invitations to participants if needed
      if (meetingData.sendToAll || meetingData.selectedParticipants.length > 0) {
        await sendMeetingNotifications(meeting, meetingData);
      }

      return meeting;
    },
    onSuccess: (meeting: Meeting) => {
      queryClient.invalidateQueries({ queryKey: ['/api/meetings'] });
      setIsStartNowDialogOpen(false);
      setInstantMeeting({
        title: '',
        description: '',
        selectedParticipants: [],
        sendToAll: false,
        enableReminder: false,
        reminderMinutes: 5
      });
      
      // Auto-join the meeting
      setSelectedMeeting(meeting);
      joinMeetingMutation.mutate(meeting.id);

      toast({
        title: "Meeting Started",
        description: `"${meeting.title}" has started successfully`
      });
    },
    onError: (error: any) => {
      console.error("Meeting creation error:", error);
      toast({
        title: "Failed to Start Meeting",
        description: error.message || "Could not start the meeting. Please try again.",
        variant: "destructive"
      });
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ meetingId, content }: { meetingId: number; content: string }) => {
      return await apiRequest('POST', `/api/meetings/${meetingId}/messages`, { content, messageType: 'text' });
    },
    onSuccess: () => {
      setChatMessage('');
      fetchMessages();
    },
    onError: (error: any) => {
      console.error('Send message error:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    },
  });

  // Handler functions
  const handleParticipantToggle = (participantId: number) => {
    setInstantMeeting(prev => ({
      ...prev,
      selectedParticipants: prev.selectedParticipants.includes(participantId)
        ? prev.selectedParticipants.filter(id => id !== participantId)
        : [...prev.selectedParticipants, participantId]
    }));
  };

  const handleStartMeetingNow = () => {
    startMeetingNowMutation.mutate(instantMeeting);
  };

  const playNotificationSound = () => {
    try {
      // Create audio context for notification sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Create a pleasant notification sound (similar to Teams/Zoom)
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.warn('Failed to play notification sound:', error);
    }
  };

  const sendMeetingNotifications = async (meeting: any, meetingData: any) => {
    try {
      // Play notification sound if enabled
      if (meetingData.enableReminder) {
        playNotificationSound();
      }

      // Send notifications to participants
      if (meetingData.sendToAll) {
        await apiRequest('POST', '/api/notifications', {
          type: 'meeting_invite',
          title: `Meeting Started: ${meetingData.title}`,
          message: `${meetingData.title} has started. Click to join.`,
          userId: null, // Send to all organization members
          data: { meetingId: meeting.id, meetingUrl: `/screen-sharing?meeting=${meeting.id}` }
        });
      } else if (meetingData.selectedParticipants?.length > 0) {
        for (const participantId of meetingData.selectedParticipants) {
          await apiRequest('POST', '/api/notifications', {
            type: 'meeting_invite',
            title: `Meeting Started: ${meetingData.title}`,
            message: `${meetingData.title} has started. Click to join.`,
            userId: participantId,
            data: { meetingId: meeting.id, meetingUrl: `/screen-sharing?meeting=${meeting.id}` }
          });
        }
      }
    } catch (error) {
      console.warn('Failed to send meeting notifications:', error);
    }
  };

  // WebRTC initialization
  const initializeWebRTC = async () => {
    try {
      // Check if mediaDevices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('WebRTC not supported in this browser');
      }

      // Try to get user media with graceful fallbacks
      let stream: MediaStream | null = null;
      
      try {
        // First try with both video and audio
        stream = await navigator.mediaDevices.getUserMedia({
          video: isVideoEnabled,
          audio: isAudioEnabled,
        });
      } catch (error: any) {
        console.warn('Failed to get both video and audio, trying audio only:', error);
        
        try {
          // If video fails, try audio only
          stream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: isAudioEnabled,
          });
          
          toast({
            title: 'Camera Access Denied',
            description: 'Using audio only. Please allow camera access in browser settings for video.',
            variant: 'default',
          });
        } catch (audioError: any) {
          console.warn('Failed to get audio, proceeding without media:', audioError);
          
          if (audioError.name === 'NotAllowedError') {
            setMediaPermissionDenied(true);
          }
          
          toast({
            title: 'Media Access Limited',
            description: 'Could not access camera or microphone. You can still join the meeting to chat and view shared content.',
            variant: 'default',
          });
        }
      }
      
      // Set up local stream if we got one
      if (stream) {
        localStream.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setHasMediaAccess(true);
        setMediaPermissionDenied(false);
      } else {
        setHasMediaAccess(false);
      }

      // Initialize peer connection regardless of media access
      peerConnection.current = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
        ],
      });

      // Add local stream tracks if available
      if (stream) {
        stream.getTracks().forEach(track => {
          peerConnection.current?.addTrack(track, stream);
        });
      }

      // Handle remote stream
      peerConnection.current.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      };

      // Handle connection state changes
      peerConnection.current.onconnectionstatechange = () => {
        const state = peerConnection.current?.connectionState;
        console.log('WebRTC connection state:', state);
        
        if (state === 'failed' || state === 'disconnected') {
          toast({
            title: 'Connection Issue',
            description: 'WebRTC connection lost. Trying to reconnect...',
            variant: 'destructive',
          });
        }
      };

    } catch (error: any) {
      console.error('Failed to initialize WebRTC:', error);
      
      let errorMessage = 'Failed to access camera/microphone';
      if (error.name === 'NotAllowedError') {
        setMediaPermissionDenied(true);
        errorMessage = 'Camera/microphone access denied. Please allow permissions and refresh.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera or microphone found. You can still join for chat.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'WebRTC not supported in this browser.';
      }
      
      toast({
        title: 'WebRTC Setup Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  // Manual permission request
  const requestMediaPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      
      // Set up the stream
      localStream.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      // Update states
      setHasMediaAccess(true);
      setMediaPermissionDenied(false);
      setIsVideoEnabled(true);
      setIsAudioEnabled(true);
      
      toast({
        title: 'Success',
        description: 'Camera and microphone access granted!',
      });
      
      // Re-initialize WebRTC with media
      if (isInMeeting) {
        initializeWebRTC();
      }
      
    } catch (error: any) {
      console.error('Permission request failed:', error);
      
      if (error.name === 'NotAllowedError') {
        setMediaPermissionDenied(true);
        toast({
          title: 'Permission Denied',
          description: 'Please allow camera and microphone access in your browser settings.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to access camera or microphone.',
          variant: 'destructive',
        });
      }
    }
  };

  // Screen sharing
  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStreamData = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        
        screenStream.current = screenStreamData;
        if (localScreenRef.current) {
          localScreenRef.current.srcObject = screenStreamData;
        }

        // Replace video track in peer connection
        if (peerConnection.current) {
          const videoTrack = screenStreamData.getVideoTracks()[0];
          const sender = peerConnection.current.getSenders().find(s => 
            s.track && s.track.kind === 'video'
          );
          if (sender) {
            await sender.replaceTrack(videoTrack);
          }
        }

        setIsScreenSharing(true);
        
        // Handle screen share end
        screenStreamData.getVideoTracks()[0].addEventListener('ended', () => {
          setIsScreenSharing(false);
          stopScreenShare();
        });
        
      } else {
        stopScreenShare();
      }
    } catch (error) {
      console.error('Screen sharing error:', error);
      toast({
        title: 'Error',
        description: 'Failed to start screen sharing',
        variant: 'destructive',
      });
    }
  };

  const stopScreenShare = async () => {
    if (screenStream.current) {
      screenStream.current.getTracks().forEach(track => track.stop());
      screenStream.current = null;
    }
    
    if (localScreenRef.current) {
      localScreenRef.current.srcObject = null;
    }

    // Restore camera video
    if (localStream.current && peerConnection.current) {
      const videoTrack = localStream.current.getVideoTracks()[0];
      const sender = peerConnection.current.getSenders().find(s => 
        s.track && s.track.kind === 'video'
      );
      if (sender && videoTrack) {
        await sender.replaceTrack(videoTrack);
      }
    }

    setIsScreenSharing(false);
  };

  // Cleanup WebRTC
  const cleanupWebRTC = () => {
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
      localStream.current = null;
    }
    
    if (screenStream.current) {
      screenStream.current.getTracks().forEach(track => track.stop());
      screenStream.current = null;
    }
    
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStream.current) {
      const videoTrack = localStream.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoEnabled;
        setIsVideoEnabled(!isVideoEnabled);
      }
    }
  };

  // Toggle audio
  const toggleAudio = () => {
    if (localStream.current) {
      const audioTrack = localStream.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isAudioEnabled;
        setIsAudioEnabled(!isAudioEnabled);
      }
    }
  };

  // Fetch participants and messages
  const fetchParticipants = async (meetingId: number) => {
    try {
      const response = await apiRequest('GET', `/api/meetings/${meetingId}/participants`);
      const data = await response.json();
      setParticipants(data);
    } catch (error) {
      console.error('Failed to fetch participants:', error);
    }
  };

  const fetchMessages = async () => {
    if (!selectedMeeting) return;
    
    try {
      const response = await apiRequest('GET', `/api/meetings/${selectedMeeting.id}/messages`);
      const data = await response.json();
      setChatMessages(data);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };







  // Effects
  useEffect(() => {
    if (selectedMeeting) {
      fetchParticipants(selectedMeeting.id);
      fetchMessages();
    }
  }, [selectedMeeting]);

  useEffect(() => {
    return () => {
      cleanupWebRTC();
    };
  }, []);

  // Handle create meeting
  const handleCreateMeeting = () => {
    createMeetingMutation.mutate(newMeeting);
  };

  // Handle join meeting
  const handleJoinMeeting = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    joinMeetingMutation.mutate(meeting.id);
  };

  // Handle leave meeting
  const handleLeaveMeeting = () => {
    if (selectedMeeting) {
      leaveMeetingMutation.mutate(selectedMeeting.id);
    }
  };

  // Handle send message
  const handleSendMessage = () => {
    if (selectedMeeting && chatMessage.trim()) {
      sendMessageMutation.mutate({ 
        meetingId: selectedMeeting.id, 
        content: chatMessage.trim() 
      });
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'scheduled': return 'bg-blue-500';
      case 'ended': return 'bg-gray-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // Copy meeting URL
  const copyMeetingUrl = (meeting: Meeting) => {
    const url = `${window.location.origin}/screen-sharing?meeting=${meeting.id}`;
    navigator.clipboard.writeText(url);
    toast({
      title: 'Success',
      description: 'Meeting URL copied to clipboard',
    });
  };

  if (isInMeeting && selectedMeeting) {
    return (
      <div className="flex flex-col h-screen bg-gray-900">
        {/* Media Status Banner */}
        {!hasMediaAccess && (
          <div className="bg-yellow-600 text-white px-4 py-2 text-sm text-center">
            <span className="font-medium">Media Access Required:</span> 
            {mediaPermissionDenied 
              ? " Camera/microphone access was denied. Click 'Enable Media' to grant permissions."
              : " Click 'Enable Media' to access camera and microphone for full meeting experience."
            }
          </div>
        )}

        {/* Meeting Header */}
        <div className="flex justify-between items-center p-4 bg-gray-800 border-b border-gray-700">
          <div>
            <h1 className="text-white text-xl font-semibold">{selectedMeeting.title}</h1>
            <p className="text-gray-300 text-sm">
              Meeting ID: {selectedMeeting.id} • {participants.length} participants
              {hasMediaAccess && <span className="text-green-400 ml-2">• Media Connected</span>}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={toggleVideo}
              variant={isVideoEnabled ? "default" : "destructive"}
              size="sm"
              disabled={!hasMediaAccess}
            >
              {isVideoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            </Button>
            
            <Button
              onClick={toggleAudio}
              variant={isAudioEnabled ? "default" : "destructive"}
              size="sm"
              disabled={!hasMediaAccess}
            >
              {isAudioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </Button>
            
            {/* Media permission request button */}
            {!hasMediaAccess && (
              <Button
                onClick={requestMediaPermissions}
                variant="outline"
                size="sm"
                className="bg-yellow-50 border-yellow-200 text-yellow-800 hover:bg-yellow-100"
              >
                <Camera className="w-4 h-4 mr-1" />
                Enable Media
              </Button>
            )}
            
            <Button
              onClick={toggleScreenShare}
              variant={isScreenSharing ? "destructive" : "default"}
              size="sm"
            >
              {isScreenSharing ? <MonitorOff className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
            </Button>
            
            <Button
              onClick={handleLeaveMeeting}
              variant="destructive"
              size="sm"
            >
              <PhoneOff className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Video Area */}
        <div className="flex-1 flex">
          <div className="flex-1 relative bg-black">
            {/* Main video (remote or screen share) */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            
            {/* No video placeholder for remote */}
            {!hasMediaAccess && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-gray-400">
                <div className="text-center">
                  <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Waiting for participants</p>
                  <p className="text-sm">Enable media to join with camera and microphone</p>
                </div>
              </div>
            )}
            
            {/* Local video/screen share */}
            <div className="absolute bottom-4 right-4 w-48 h-32 bg-gray-800 rounded-lg overflow-hidden">
              {isScreenSharing ? (
                <video
                  ref={localScreenRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              ) : hasMediaAccess ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-700 text-gray-400">
                  <div className="text-center">
                    <Camera className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">No Camera</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Chat Sidebar */}
          <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
            {/* Participants */}
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-gray-300" />
                <span className="text-white font-medium">Participants ({participants.length})</span>
              </div>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {participants.map((participant) => (
                  <div key={participant.id} className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-gray-300 text-sm">
                      {participant.user?.firstName} {participant.user?.lastName}
                      {participant.role === 'host' && (
                        <Badge variant="secondary" className="ml-2 text-xs">Host</Badge>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-4 h-4 text-gray-300" />
                <span className="text-white font-medium">Chat</span>
              </div>
              
              <div className="space-y-3">
                {chatMessages.map((message) => (
                  <div key={message.id} className="bg-gray-700 p-2 rounded-lg">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-blue-300 font-medium text-sm">
                        {message.sender?.firstName} {message.sender?.lastName}
                      </span>
                      <span className="text-gray-400 text-xs">
                        {format(new Date(message.sentAt), 'HH:mm')}
                      </span>
                    </div>
                    <p className="text-gray-200 text-sm">{message.content}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-gray-700">
              <div className="flex gap-2">
                <Input
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="bg-gray-700 border-gray-600 text-white"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSendMessage();
                    }
                  }}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!chatMessage.trim() || sendMessageMutation.isPending}
                  size="sm"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Screen Sharing & Meetings</h1>
          <p className="text-gray-600 mt-2">Collaborate with your team through video meetings and screen sharing</p>
        </div>
        
        <div className="flex gap-3">
          <Dialog open={isStartNowDialogOpen} onOpenChange={setIsStartNowDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="default" className="flex items-center gap-2 bg-green-600 hover:bg-green-700">
                <Zap className="w-4 h-4" />
                Start Meeting Now
              </Button>
            </DialogTrigger>
            
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-green-600" />
                  Start Meeting Now
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="instant-title">Meeting Title *</Label>
                  <Input
                    id="instant-title"
                    value={instantMeeting.title}
                    onChange={(e) => setInstantMeeting(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Quick team meeting"
                  />
                </div>
                
                <div>
                  <Label htmlFor="instant-description">Description (Optional)</Label>
                  <Textarea
                    id="instant-description"
                    value={instantMeeting.description}
                    onChange={(e) => setInstantMeeting(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of the meeting"
                    rows={2}
                  />
                </div>
                
                {/* Participant Selection */}
                <div className="space-y-3">
                  <Label>Invite Participants</Label>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="send-to-all"
                      checked={instantMeeting.sendToAll}
                      onCheckedChange={(checked) => 
                        setInstantMeeting(prev => ({ 
                          ...prev, 
                          sendToAll: !!checked,
                          selectedParticipants: !!checked ? [] : prev.selectedParticipants
                        }))
                      }
                    />
                    <label htmlFor="send-to-all" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Send to all organization members
                    </label>
                  </div>

                  {!instantMeeting.sendToAll && (
                    <div className="border rounded-lg p-3 max-h-48 overflow-y-auto">
                      <p className="text-sm font-medium mb-2">Select specific members:</p>
                      {(organizationMembers as any[]).length === 0 ? (
                        <p className="text-sm text-gray-500">Loading members...</p>
                      ) : (
                        <div className="space-y-2">
                          {(organizationMembers as any[]).map((member: any) => (
                            <div key={member.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`member-${member.id}`}
                                checked={instantMeeting.selectedParticipants.includes(member.id)}
                                onCheckedChange={() => handleParticipantToggle(member.id)}
                              />
                              <label htmlFor={`member-${member.id}`} className="text-sm">
                                {member.firstName} {member.lastName} ({member.email})
                              </label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Notification Settings */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="enable-reminder"
                      checked={instantMeeting.enableReminder}
                      onCheckedChange={(checked) => 
                        setInstantMeeting(prev => ({ ...prev, enableReminder: !!checked }))
                      }
                    />
                    <label htmlFor="enable-reminder" className="text-sm font-medium leading-none">
                      <Bell className="w-4 h-4 inline mr-1" />
                      Play notification sound
                    </label>
                  </div>

                  {instantMeeting.enableReminder && (
                    <div>
                      <Label htmlFor="reminder-minutes">Reminder Time</Label>
                      <Select 
                        value={instantMeeting.reminderMinutes.toString()}
                        onValueChange={(value) => setInstantMeeting(prev => ({ 
                          ...prev, 
                          reminderMinutes: parseInt(value) 
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Immediately</SelectItem>
                          <SelectItem value="1">1 minute before</SelectItem>
                          <SelectItem value="5">5 minutes before</SelectItem>
                          <SelectItem value="10">10 minutes before</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsStartNowDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleStartMeetingNow}
                    disabled={startMeetingNowMutation.isPending || !instantMeeting.title.trim()}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    {startMeetingNowMutation.isPending ? 'Starting...' : 'Start Meeting Now'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Schedule Meeting
              </Button>
            </DialogTrigger>
            
            <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Meeting</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Meeting Title *</Label>
                <Input
                  id="title"
                  value={newMeeting.title}
                  onChange={(e) => setNewMeeting(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter meeting title"
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newMeeting.description}
                  onChange={(e) => setNewMeeting(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Meeting description (optional)"
                />
              </div>
              
              <div>
                <Label htmlFor="scheduledStartTime">Start Time *</Label>
                <Input
                  id="scheduledStartTime"
                  type="datetime-local"
                  value={newMeeting.scheduledStartTime}
                  onChange={(e) => setNewMeeting(prev => ({ ...prev, scheduledStartTime: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="scheduledEndTime">End Time</Label>
                <Input
                  id="scheduledEndTime"
                  type="datetime-local"
                  value={newMeeting.scheduledEndTime}
                  onChange={(e) => setNewMeeting(prev => ({ ...prev, scheduledEndTime: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="maxParticipants">Max Participants</Label>
                <Input
                  id="maxParticipants"
                  type="number"
                  min="2"
                  max="100"
                  value={newMeeting.maxParticipants}
                  onChange={(e) => setNewMeeting(prev => ({ ...prev, maxParticipants: parseInt(e.target.value) || 10 }))}
                />
              </div>
              
              <Button
                onClick={handleCreateMeeting}
                disabled={!newMeeting.title || !newMeeting.scheduledStartTime || createMeetingMutation.isPending}
                className="w-full"
              >
                {createMeetingMutation.isPending ? 'Creating...' : 'Create Meeting'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      </div>

      {/* Meetings List */}
      <div className="grid gap-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Meetings
        </h2>
        
        {meetingsLoading ? (
          <div className="text-center py-8 text-gray-500">Loading meetings...</div>
        ) : meetings.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Video className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No meetings scheduled</p>
              <p className="text-gray-400 text-sm mt-2">Create your first meeting to get started</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {(meetings as Meeting[]).map((meeting: Meeting) => (
              <Card key={meeting.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{meeting.title}</CardTitle>
                      {meeting.description && (
                        <p className="text-gray-600 text-sm">{meeting.description}</p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge className={`${getStatusColor(meeting.status)} text-white`}>
                        {meeting.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">
                        <strong>Scheduled:</strong> {format(new Date(meeting.scheduledStartTime), 'MMM dd, yyyy HH:mm')}
                      </p>
                      
                      {meeting.scheduledEndTime && (
                        <p className="text-sm text-gray-600">
                          <strong>Ends:</strong> {format(new Date(meeting.scheduledEndTime), 'MMM dd, yyyy HH:mm')}
                        </p>
                      )}
                      
                      <p className="text-sm text-gray-600">
                        <strong>Meeting ID:</strong> {meeting.id}
                      </p>
                      
                      {meeting.maxParticipants && (
                        <p className="text-sm text-gray-600">
                          <strong>Max Participants:</strong> {meeting.maxParticipants}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => copyMeetingUrl(meeting)}
                        variant="outline"
                        size="sm"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      
                      {meeting.status === 'scheduled' || meeting.status === 'active' ? (
                        <Button
                          onClick={() => handleJoinMeeting(meeting)}
                          disabled={joinMeetingMutation.isPending}
                          size="sm"
                        >
                          <Video className="w-4 h-4 mr-2" />
                          {joinMeetingMutation.isPending ? 'Joining...' : 'Join Meeting'}
                        </Button>
                      ) : (
                        <Button disabled size="sm" variant="secondary">
                          Meeting {meeting.status}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
