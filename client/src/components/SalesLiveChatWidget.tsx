import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Send, X, Minimize2, User, Headphones } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";

interface LiveChatMessage {
  id: number;
  sessionId: number;
  senderRole: string;
  senderName?: string;
  message: string;
  createdAt: Date;
  readAt?: Date;
}

interface SalesLiveChatWidgetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SalesLiveChatWidget({ isOpen, onClose }: SalesLiveChatWidgetProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [visitorName, setVisitorName] = useState("");
  const [visitorEmail, setVisitorEmail] = useState("");
  const [visitorPhone, setVisitorPhone] = useState("");
  const [messageText, setMessageText] = useState("");
  const [hasStartedChat, setHasStartedChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading: messagesLoading } = useQuery<LiveChatMessage[]>({
    queryKey: ['/api/live-chat/messages', sessionId],
    enabled: !!sessionId && hasStartedChat,
    refetchInterval: 3000,
  });

  const createSessionMutation = useMutation({
    mutationFn: async ({ name, email, phone }: { name: string; email: string; phone: string }) => {
      const response = await apiRequest('POST', '/api/live-chat/sessions/sales', {
        visitorName: name,
        visitorEmail: email,
        visitorPhone: phone,
        source: 'footer_widget',
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
    mutationFn: async ({ sessionId, message }: { sessionId: number; message: string }) => {
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
    createSessionMutation.mutate({ name: visitorName, email: visitorEmail, phone: visitorPhone });
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  if (isMinimized) {
    return (
      <Button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-6 right-6 shadow-lg z-50 bg-blue-600 hover:bg-blue-700"
        variant="default"
        data-testid="button-restore-sales-chat"
      >
        <Headphones className="h-5 w-5 mr-2" />
        Sales Chat
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-6 w-96 h-[420px] shadow-2xl z-50 flex flex-col border-blue-500/20" data-testid="card-sales-chat-widget">
      <CardHeader className="flex-shrink-0 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2 text-white">
              <Headphones className="h-5 w-5" />
              Sales Team
            </CardTitle>
            <CardDescription className="text-blue-100">
              {hasStartedChat ? "We're here to help you!" : "Talk to our sales team"}
            </CardDescription>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMinimized(true)}
              className="text-white hover:bg-blue-500/50"
              data-testid="button-minimize-sales-chat"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-blue-500/50"
              data-testid="button-close-sales-chat"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-4 overflow-hidden bg-white dark:bg-gray-900">
        {!hasStartedChat ? (
          <div className="space-y-3">
            <div className="text-center py-2">
              <div className="bg-blue-100 dark:bg-blue-900/30 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-base mb-1 text-gray-900 dark:text-white">Welcome! 👋</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Questions about Pro Field Manager? We're here to help!
              </p>
            </div>

            <div className="space-y-2">
              <div>
                <label className="text-sm font-medium mb-1 block text-gray-700 dark:text-gray-300">Your Name *</label>
                <Input
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  placeholder="John Doe"
                  className="bg-white dark:bg-gray-800"
                  data-testid="input-sales-visitor-name"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block text-gray-700 dark:text-gray-300">Email</label>
                <Input
                  type="email"
                  value={visitorEmail}
                  onChange={(e) => setVisitorEmail(e.target.value)}
                  placeholder="john@company.com"
                  className="bg-white dark:bg-gray-800"
                  data-testid="input-sales-visitor-email"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block text-gray-700 dark:text-gray-300">Phone (Optional)</label>
                <Input
                  type="tel"
                  value={visitorPhone}
                  onChange={(e) => setVisitorPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="bg-white dark:bg-gray-800"
                  data-testid="input-sales-visitor-phone"
                />
              </div>

              <Button
                onClick={handleStartChat}
                disabled={createSessionMutation.isPending || !visitorName.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700"
                data-testid="button-start-sales-chat"
              >
                {createSessionMutation.isPending ? "Connecting..." : "Start Chat with Sales"}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 pr-4 mb-4">
              {messagesLoading ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  Loading messages...
                </div>
              ) : messages && messages.length > 0 ? (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.senderRole === 'visitor' ? 'justify-end' : 'justify-start'}`}
                      data-testid={`sales-message-${message.id}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          message.senderRole === 'visitor'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                        }`}
                      >
                        <div className="text-xs font-medium mb-1 opacity-80">
                          {message.senderName || (message.senderRole === 'agent' ? 'Sales Team' : 'You')}
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
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Connected! A sales representative will be with you shortly.
                    </p>
                  </div>
                  <p className="text-xs text-gray-500">
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
                className="resize-none bg-white dark:bg-gray-800"
                rows={2}
                data-testid="input-sales-chat-message"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!messageText.trim() || sendMessageMutation.isPending}
                size="icon"
                className="self-end bg-blue-600 hover:bg-blue-700"
                data-testid="button-send-sales-message"
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
