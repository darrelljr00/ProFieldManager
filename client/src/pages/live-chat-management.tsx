import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, User, Clock, CheckCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { useWebSocket } from "@/hooks/useWebSocket";

interface LiveChatSession {
  id: number;
  visitorName?: string;
  visitorEmail?: string;
  status: string;
  assignedAgent?: number;
  createdAt: Date;
  lastMessageAt?: Date;
  unreadCount?: number;
}

interface LiveChatMessage {
  id: number;
  sessionId: number;
  senderRole: string;
  senderName?: string;
  message: string;
  createdAt: Date;
  readAt?: Date;
}

export default function LiveChatManagement() {
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [messageText, setMessageText] = useState("");
  const { toast } = useToast();
  const { lastMessage } = useWebSocket();

  const { data: sessions, isLoading: sessionsLoading } = useQuery<LiveChatSession[]>({
    queryKey: ['/api/live-chat/sessions'],
  });

  const { data: messages, isLoading: messagesLoading } = useQuery<LiveChatMessage[]>({
    queryKey: ['/api/live-chat/messages', selectedSession],
    enabled: !!selectedSession,
  });

  // Listen for WebSocket updates for real-time messages
  useEffect(() => {
    if (lastMessage?.eventType === 'live_chat_message') {
      // Invalidate sessions list to update unread counts
      queryClient.invalidateQueries({ queryKey: ['/api/live-chat/sessions'] });
      
      // If the message is for the selected session, invalidate messages
      if (lastMessage?.data?.sessionId === selectedSession) {
        queryClient.invalidateQueries({ queryKey: ['/api/live-chat/messages', selectedSession] });
      }
    }
  }, [lastMessage, selectedSession]);

  const sendMessageMutation = useMutation({
    mutationFn: async ({ sessionId, message }: { sessionId: number, message: string }) => {
      const response = await apiRequest('POST', `/api/live-chat/sessions/${sessionId}/messages`, { 
        message,
        senderRole: 'agent'
      });
      if (!response.ok) throw new Error('Failed to send message');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/live-chat/messages', selectedSession] });
      queryClient.invalidateQueries({ queryKey: ['/api/live-chat/sessions'] });
      setMessageText("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to send message", description: error.message, variant: "destructive" });
    }
  });

  const assignToSelfMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      const response = await apiRequest('POST', `/api/live-chat/sessions/${sessionId}/assign`);
      if (!response.ok) throw new Error('Failed to assign session');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/live-chat/sessions'] });
      toast({ title: "Session assigned to you" });
    },
  });

  const closeSessionMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      const response = await apiRequest('POST', `/api/live-chat/sessions/${sessionId}/close`);
      if (!response.ok) throw new Error('Failed to close session');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/live-chat/sessions'] });
      toast({ title: "Chat session closed" });
      setSelectedSession(null);
    },
  });

  const handleSendMessage = () => {
    if (!selectedSession || !messageText.trim()) return;
    sendMessageMutation.mutate({ sessionId: selectedSession, message: messageText });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      waiting: "secondary",
      closed: "outline",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  const selectedSessionData = sessions?.find(s => s.id === selectedSession);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Live Chat Management</h1>
        <p className="text-muted-foreground">Manage customer conversations in real-time</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Chat Sessions</CardTitle>
            <CardDescription>
              {sessions?.filter(s => s.status === 'active' || s.status === 'waiting').length || 0} active conversations
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-320px)]">
              {sessionsLoading ? (
                <div className="text-center py-8">Loading sessions...</div>
              ) : sessions && sessions.length > 0 ? (
                <div className="space-y-2 p-4">
                  {sessions.map((session) => (
                    <Card
                      key={session.id}
                      className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                        selectedSession === session.id ? 'border-primary bg-muted' : ''
                      }`}
                      onClick={() => setSelectedSession(session.id)}
                      data-testid={`card-session-${session.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {session.visitorName || 'Anonymous Visitor'}
                            </span>
                          </div>
                          {getStatusBadge(session.status)}
                        </div>
                        {session.visitorEmail && (
                          <div className="text-sm text-muted-foreground mb-1">
                            {session.visitorEmail}
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {session.lastMessageAt 
                            ? formatDistanceToNow(new Date(session.lastMessageAt), { addSuffix: true })
                            : formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })
                          }
                        </div>
                        {session.unreadCount && session.unreadCount > 0 && (
                          <Badge variant="destructive" className="mt-2">
                            {session.unreadCount} new
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No active chat sessions
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          {selectedSession && selectedSessionData ? (
            <>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      {selectedSessionData.visitorName || 'Anonymous Visitor'}
                    </CardTitle>
                    <CardDescription>
                      {selectedSessionData.visitorEmail}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {!selectedSessionData.assignedAgent && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => assignToSelfMutation.mutate(selectedSession)}
                        data-testid="button-assign-session"
                      >
                        Assign to Me
                      </Button>
                    )}
                    {selectedSessionData.status !== 'closed' && (
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => closeSessionMutation.mutate(selectedSession)}
                        data-testid="button-close-session"
                      >
                        Close Chat
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[calc(100vh-450px)] mb-4 p-4 border rounded-md">
                  {messagesLoading ? (
                    <div className="text-center py-8">Loading messages...</div>
                  ) : messages && messages.length > 0 ? (
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.senderRole === 'agent' ? 'justify-end' : 'justify-start'}`}
                          data-testid={`message-${message.id}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                              message.senderRole === 'agent'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium">
                                {message.senderName || (message.senderRole === 'agent' ? 'Agent' : 'Visitor')}
                              </span>
                              {message.readAt && message.senderRole === 'agent' && (
                                <CheckCheck className="h-3 w-3" />
                              )}
                            </div>
                            <p className="text-sm">{message.message}</p>
                            <span className="text-xs opacity-70 mt-1 block">
                              {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No messages yet
                    </div>
                  )}
                </ScrollArea>

                {selectedSessionData.status !== 'closed' && (
                  <div className="flex gap-2">
                    <Input
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type a message..."
                      disabled={sendMessageMutation.isPending}
                      data-testid="input-message"
                    />
                    <Button 
                      onClick={handleSendMessage}
                      disabled={!messageText.trim() || sendMessageMutation.isPending}
                      data-testid="button-send-message"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a chat session to view messages</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
