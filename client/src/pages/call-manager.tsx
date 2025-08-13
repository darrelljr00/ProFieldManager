import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Phone, 
  PhoneCall, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX,
  Clock,
  User,
  MessageSquare,
  FileText,
  Calendar,
  Search,
  Plus,
  Settings
} from "lucide-react";

interface CallLog {
  id: string;
  phoneNumber: string;
  direction: 'inbound' | 'outbound';
  status: 'completed' | 'missed' | 'busy' | 'failed';
  duration?: number;
  timestamp: string;
  contactName?: string;
  recording?: string;
  transcript?: string;
  notes?: string;
}

interface Contact {
  id: string;
  name: string;
  phoneNumber: string;
  email?: string;
  company?: string;
  tags?: string[];
}

interface ActiveCall {
  id: string;
  phoneNumber: string;
  contactName?: string;
  status: 'connecting' | 'ringing' | 'active' | 'hold';
  startTime: string;
  duration: number;
  isMuted: boolean;
  isOnHold: boolean;
}

export default function CallManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [currentTab, setCurrentTab] = useState("dialer");

  // Fetch call logs
  const { data: callLogsData, isLoading: isLoadingLogs } = useQuery({
    queryKey: ["/api/call-manager/logs"],
    queryFn: () => apiRequest("GET", "/api/call-manager/logs"),
  });
  
  const callLogs = Array.isArray(callLogsData) ? callLogsData : [];

  // Fetch contacts
  const { data: contactsData, isLoading: isLoadingContacts } = useQuery({
    queryKey: ["/api/call-manager/contacts"],
    queryFn: () => apiRequest("GET", "/api/call-manager/contacts"),
  });
  
  const contacts = Array.isArray(contactsData) ? contactsData : [];

  // Fetch active calls
  const { data: activeCallsData } = useQuery({
    queryKey: ["/api/call-manager/active-calls"],
    queryFn: () => apiRequest("GET", "/api/call-manager/active-calls"),
    refetchInterval: 2000, // Poll every 2 seconds for active calls
  });
  
  const activeCalls = Array.isArray(activeCallsData) ? activeCallsData : [];

  // Make a call mutation
  const makeCallMutation = useMutation({
    mutationFn: (data: { phoneNumber: string; contactId?: string }) =>
      apiRequest("POST", "/api/call-manager/make-call", data),
    onSuccess: (data) => {
      setActiveCall(data.call);
      toast({
        title: "Call initiated",
        description: `Calling ${phoneNumber}...`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/call-manager/active-calls"] });
    },
    onError: (error) => {
      toast({
        title: "Call failed",
        description: "Unable to initiate call. Please try again.",
        variant: "destructive",
      });
    },
  });

  // End call mutation
  const endCallMutation = useMutation({
    mutationFn: (callId: string) =>
      apiRequest("POST", `/api/call-manager/end-call/${callId}`),
    onSuccess: () => {
      setActiveCall(null);
      toast({
        title: "Call ended",
        description: "Call has been disconnected.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/call-manager/logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/call-manager/active-calls"] });
    },
  });

  // Hold/Resume call mutation
  const toggleHoldMutation = useMutation({
    mutationFn: (data: { callId: string; action: 'hold' | 'resume' }) =>
      apiRequest("POST", "/api/call-manager/toggle-hold", data),
    onSuccess: (data) => {
      setActiveCall(prev => prev ? { ...prev, isOnHold: data.isOnHold } : null);
    },
  });

  // Mute/Unmute call mutation
  const toggleMuteMutation = useMutation({
    mutationFn: (data: { callId: string; action: 'mute' | 'unmute' }) =>
      apiRequest("POST", "/api/call-manager/toggle-mute", data),
    onSuccess: (data) => {
      setActiveCall(prev => prev ? { ...prev, isMuted: data.isMuted } : null);
    },
  });

  const handleMakeCall = () => {
    if (!phoneNumber.trim()) {
      toast({
        title: "Phone number required",
        description: "Please enter a phone number to call.",
        variant: "destructive",
      });
      return;
    }

    makeCallMutation.mutate({
      phoneNumber: phoneNumber.trim(),
      contactId: selectedContact?.id,
    });
  };

  const handleEndCall = () => {
    if (activeCall) {
      endCallMutation.mutate(activeCall.id);
    }
  };

  const handleToggleHold = () => {
    if (activeCall) {
      toggleHoldMutation.mutate({
        callId: activeCall.id,
        action: activeCall.isOnHold ? 'resume' : 'hold',
      });
    }
  };

  const handleToggleMute = () => {
    if (activeCall) {
      toggleMuteMutation.mutate({
        callId: activeCall.id,
        action: activeCall.isMuted ? 'unmute' : 'mute',
      });
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const filteredContacts = contacts.filter((contact: Contact) =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phoneNumber.includes(searchQuery) ||
    contact.company?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Update active call duration every second
  useEffect(() => {
    if (activeCall && activeCall.status === 'active') {
      const interval = setInterval(() => {
        setActiveCall(prev => {
          if (prev) {
            const elapsed = Math.floor((Date.now() - new Date(prev.startTime).getTime()) / 1000);
            return { ...prev, duration: elapsed };
          }
          return prev;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [activeCall]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Call Manager</h1>
          <p className="text-gray-600 mt-2">Make calls, manage contacts, and view call history</p>
        </div>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </div>

      {/* Active Call Display */}
      {activeCall && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                  <Phone className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    {activeCall.contactName || formatPhoneNumber(activeCall.phoneNumber)}
                  </h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span className="capitalize">{activeCall.status}</span>
                    {activeCall.status === 'active' && (
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatDuration(activeCall.duration)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant={activeCall.isMuted ? "default" : "outline"}
                  size="sm"
                  onClick={handleToggleMute}
                  disabled={toggleMuteMutation.isPending}
                >
                  {activeCall.isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                
                <Button
                  variant={activeCall.isOnHold ? "default" : "outline"}
                  size="sm"
                  onClick={handleToggleHold}
                  disabled={toggleHoldMutation.isPending}
                >
                  {activeCall.isOnHold ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </Button>
                
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleEndCall}
                  disabled={endCallMutation.isPending}
                >
                  <PhoneOff className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dialer">Dialer</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="history">Call History</TabsTrigger>
          <TabsTrigger value="recordings">Recordings</TabsTrigger>
        </TabsList>

        {/* Dialer Tab */}
        <TabsContent value="dialer">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Make a Call</CardTitle>
                <CardDescription>Enter a phone number or select a contact</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    disabled={!!activeCall}
                  />
                </div>
                
                {selectedContact && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium">{selectedContact.name}</p>
                    <p className="text-sm text-gray-600">{selectedContact.company}</p>
                    <p className="text-sm text-gray-600">{formatPhoneNumber(selectedContact.phoneNumber)}</p>
                  </div>
                )}
                
                <Button
                  onClick={handleMakeCall}
                  disabled={makeCallMutation.isPending || !!activeCall}
                  className="w-full"
                >
                  <PhoneCall className="h-4 w-4 mr-2" />
                  {makeCallMutation.isPending ? "Connecting..." : "Make Call"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Contacts</CardTitle>
                <CardDescription>Select a contact to call</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {contacts.slice(0, 10).map((contact: Contact) => (
                      <div
                        key={contact.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedContact?.id === contact.id
                            ? 'bg-blue-50 border-blue-200'
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => {
                          setSelectedContact(contact);
                          setPhoneNumber(contact.phoneNumber);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{contact.name}</p>
                            <p className="text-sm text-gray-600">{formatPhoneNumber(contact.phoneNumber)}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPhoneNumber(contact.phoneNumber);
                              setSelectedContact(contact);
                              handleMakeCall();
                            }}
                            disabled={!!activeCall}
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Contacts</CardTitle>
                  <CardDescription>Manage your call contacts</CardDescription>
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Contact
                </Button>
              </div>
              <div className="flex items-center space-x-2 mt-4">
                <Search className="h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-sm"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredContacts.map((contact: Contact) => (
                  <Card key={contact.id} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{contact.name}</h3>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setPhoneNumber(contact.phoneNumber);
                          setSelectedContact(contact);
                          setCurrentTab("dialer");
                        }}
                      >
                        <Phone className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{formatPhoneNumber(contact.phoneNumber)}</p>
                    {contact.company && (
                      <p className="text-sm text-gray-500 mb-2">{contact.company}</p>
                    )}
                    {contact.tags && (
                      <div className="flex flex-wrap gap-1">
                        {contact.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Call History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Call History</CardTitle>
              <CardDescription>Recent call activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {callLogs.map((log: CallLog) => (
                  <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        log.direction === 'inbound' ? 'bg-green-100' : 'bg-blue-100'
                      }`}>
                        <Phone className={`h-4 w-4 ${
                          log.direction === 'inbound' ? 'text-green-600' : 'text-blue-600'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium">
                          {log.contactName || formatPhoneNumber(log.phoneNumber)}
                        </p>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <span className="capitalize">{log.direction}</span>
                          <span>•</span>
                          <span className="capitalize">{log.status}</span>
                          {log.duration && (
                            <>
                              <span>•</span>
                              <span>{formatDuration(log.duration)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">
                        {new Date(log.timestamp).toLocaleDateString()}
                      </span>
                      {log.recording && (
                        <Button size="sm" variant="ghost">
                          <Volume2 className="h-4 w-4" />
                        </Button>
                      )}
                      {log.transcript && (
                        <Button size="sm" variant="ghost">
                          <FileText className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recordings Tab */}
        <TabsContent value="recordings">
          <Card>
            <CardHeader>
              <CardTitle>Call Recordings</CardTitle>
              <CardDescription>Listen to recorded calls and view transcripts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Volume2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No recordings available</p>
                <p className="text-sm text-gray-500 mt-2">
                  Call recordings will appear here once enabled
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}