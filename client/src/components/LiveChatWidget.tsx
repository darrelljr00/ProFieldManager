import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, Send, X, Minimize2, User } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";

interface LiveChatMessage {
  id: number;
  sessionId: number;
  senderRole: string;
  senderName?: string;
  message: string;
  createdAt: Date;
  readAt?: Date;
}

interface LiveChatDepartment {
  id: number;
  name: string;
  description?: string;
  color?: string;
  isActive: boolean;
  displayOrder: number;
}

export function LiveChatWidget() {
  const { user } = useAuth();
  const { lastMessage } = useWebSocket();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [visitorName, setVisitorName] = useState("");
  const [visitorEmail, setVisitorEmail] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [messageText, setMessageText] = useState("");
  const [hasStartedChat, setHasStartedChat] = useState(false);
  const [organizationId, setOrganizationId] = useState<number | null>(null);
  const [isResolvingOrg, setIsResolvingOrg] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Admin and API routes that should NOT show the visitor chat widget
  const adminRoutes = [
    '/dashboard', '/invoices', '/quotes', '/projects', '/customers', '/jobs',
    '/expenses', '/leads', '/payments', '/calendar', '/time-clock', '/tasks',
    '/file-manager', '/employees', '/hr', '/users', '/admin-settings', '/saas-admin',
    '/reports', '/settings', '/notifications', '/internal-messages', '/team-messages',
    '/gps-tracking', '/inspections', '/form-builder', '/tutorials', '/my-schedule',
    '/api', '/login', '/signup', '/logout', '/screen-sharing', '/mobile-test',
    '/parts-supplies', '/call-manager', '/file-security', '/frontend-management',
    '/slider-management', '/popup-management', '/live-chat-management', '/weather',
    '/reviews', '/market-research', '/image-gallery', '/sms', '/messages', '/geofences'
  ];

  // Resolve organization ID from URL path on mount
  useEffect(() => {
    async function resolveOrganization() {
      const currentPath = window.location.pathname;

      // Don't show widget on admin/backend pages
      const isAdminPage = adminRoutes.some(route => currentPath.startsWith(route));
      if (isAdminPage) {
        setIsResolvingOrg(false);
        return;
      }

      // If user is authenticated (on admin side), don't show visitor widget
      // TODO: Replace with AdminSupportWidget for admin users to contact platform support
      if (user?.organizationId) {
        setIsResolvingOrg(false);
        return;
      }

      // Extract slug from path (e.g., /site/company-a or /company-a -> company-a)
      const pathSegments = currentPath.split('/').filter(s => s);
      
      // Handle /site/:slug pattern from page builder
      const slug = pathSegments[0] === 'site' ? pathSegments[1] : pathSegments[0];

      // If no slug (homepage or empty path), hide widget
      if (!slug) {
        setIsResolvingOrg(false);
        return;
      }

      try {
        const response = await fetch(`/api/web/organizations/by-slug?slug=${encodeURIComponent(slug)}`);
        if (response.ok) {
          const org = await response.json();
          setOrganizationId(org.id);
        } else {
          console.warn('Organization not found for slug:', slug);
        }
      } catch (error) {
        console.error('Failed to resolve organization:', error);
      } finally {
        setIsResolvingOrg(false);
      }
    }

    resolveOrganization();
  }, [user?.organizationId]);

  const { data: messages, isLoading: messagesLoading } = useQuery<LiveChatMessage[]>({
    queryKey: ['/api/live-chat/messages', sessionId],
    enabled: !!sessionId && hasStartedChat,
  });

  const { data: departmentsData } = useQuery<{ departments: LiveChatDepartment[] }>({
    queryKey: ['/api/live-chat/departments'],
    enabled: !!organizationId,
  });

  const activeDepartments = (departmentsData?.departments || [])
    .filter(dept => dept.isActive)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  const createSessionMutation = useMutation({
    mutationFn: async ({ name, email, departmentId }: { name: string, email: string, departmentId?: number }) => {
      if (!organizationId) {
        throw new Error('Organization not resolved');
      }
      const response = await apiRequest('POST', '/api/live-chat/sessions', {
        organizationId,
        visitorName: name,
        visitorEmail: email,
        departmentId,
      });
      if (!response.ok) throw new Error('Failed to create chat session');
      return response.json();
    },
    onSuccess: (session) => {
      setSessionId(session.id);
      setHasStartedChat(true);
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ sessionId, message }: { sessionId: number, message: string }) => {
      const response = await apiRequest('POST', `/api/live-chat/sessions/${sessionId}/messages`, {
        message,
        senderRole: 'visitor',
        senderName: visitorName || 'Visitor',
      });
      if (!response.ok) throw new Error('Failed to send message');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/live-chat/messages', sessionId] });
      setMessageText("");
    },
  });

  const handleStartChat = () => {
    if (!visitorName.trim()) {
      alert("Please enter your name");
      return;
    }
    const departmentId = selectedDepartment ? parseInt(selectedDepartment) : undefined;
    createSessionMutation.mutate({ name: visitorName, email: visitorEmail, departmentId });
  };

  const handleSendMessage = () => {
    if (!sessionId || !messageText.trim()) return;
    sendMessageMutation.mutate({ sessionId, message: messageText });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Listen for WebSocket updates for real-time messages
  useEffect(() => {
    if (lastMessage?.eventType === 'live_chat_message' && lastMessage?.data?.sessionId === sessionId) {
      queryClient.invalidateQueries({ queryKey: ['/api/live-chat/messages', sessionId] });
    }
  }, [lastMessage, sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Hide widget if organization cannot be resolved or still resolving
  if (isResolvingOrg || !organizationId) {
    return null;
  }

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        size="icon"
        data-testid="button-open-chat"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  if (isMinimized) {
    return (
      <Button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-6 right-6 shadow-lg z-50"
        variant="default"
        data-testid="button-restore-chat"
      >
        <MessageCircle className="h-5 w-5 mr-2" />
        Chat with us
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-96 h-[600px] shadow-2xl z-50 flex flex-col" data-testid="card-chat-widget">
      <CardHeader className="flex-shrink-0 border-b">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Live Chat Support
            </CardTitle>
            <CardDescription>
              {hasStartedChat ? "We're here to help!" : "Start a conversation"}
            </CardDescription>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMinimized(true)}
              data-testid="button-minimize-chat"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              data-testid="button-close-chat"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-4 overflow-hidden">
        {!hasStartedChat ? (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <User className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Welcome! 👋</h3>
              <p className="text-sm text-muted-foreground">
                Please provide your details to start chatting with our team
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Your Name *</label>
                <Input
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  placeholder="John Doe"
                  data-testid="input-visitor-name"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Email (Optional)</label>
                <Input
                  type="email"
                  value={visitorEmail}
                  onChange={(e) => setVisitorEmail(e.target.value)}
                  placeholder="john@example.com"
                  data-testid="input-visitor-email"
                />
              </div>

              {activeDepartments.length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-1 block">Department (Optional)</label>
                  <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                    <SelectTrigger data-testid="select-department">
                      <SelectValue placeholder="Select a department" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeDepartments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id.toString()}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: dept.color }}
                            />
                            <span>{dept.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button
                onClick={handleStartChat}
                disabled={createSessionMutation.isPending || !visitorName.trim()}
                className="w-full"
                data-testid="button-start-chat"
              >
                {createSessionMutation.isPending ? "Starting..." : "Start Chat"}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 pr-4 mb-4">
              {messagesLoading ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Loading messages...
                </div>
              ) : messages && messages.length > 0 ? (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.senderRole === 'visitor' ? 'justify-end' : 'justify-start'}`}
                      data-testid={`message-${message.id}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          message.senderRole === 'visitor'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <div className="text-xs font-medium mb-1 opacity-80">
                          {message.senderName || (message.senderRole === 'agent' ? 'Support Agent' : 'You')}
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                        <span className="text-xs opacity-70 mt-1 block">
                          {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="bg-muted rounded-lg p-4 mb-4">
                    <p className="text-sm text-muted-foreground">
                      Your chat session has started! An agent will be with you shortly.
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Send a message to get started
                  </p>
                </div>
              )}
            </ScrollArea>

            <div className="flex gap-2 flex-shrink-0">
              <Textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={sendMessageMutation.isPending}
                className="resize-none"
                rows={2}
                data-testid="input-chat-message"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!messageText.trim() || sendMessageMutation.isPending}
                size="icon"
                className="self-end"
                data-testid="button-send-chat-message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
