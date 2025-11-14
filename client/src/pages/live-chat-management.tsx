import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { MessageSquare, Send, User, Clock, CheckCheck, Plus, Edit, Trash2, Tag, Settings as SettingsIcon, Save } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { useWebSocket } from "@/hooks/useWebSocket";

interface LiveChatSession {
  id: number;
  visitorName?: string;
  visitorEmail?: string;
  status: string;
  assignedAgentId?: number;
  assignedAgentName?: string;
  createdAt: Date;
  lastMessageAt?: Date;
  unreadCount?: number;
  departmentId?: number;
  departmentName?: string;
  departmentColor?: string;
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

interface LiveChatDepartment {
  id: number;
  name: string;
  description?: string;
  color?: string;
  isActive: boolean;
  displayOrder: number;
}

export default function LiveChatManagement() {
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [messageText, setMessageText] = useState("");
  const [isDepartmentDialogOpen, setIsDepartmentDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<LiveChatDepartment | null>(null);
  const [departmentFormData, setDepartmentFormData] = useState({
    name: '',
    description: '',
    color: '#3b82f6',
    isActive: true,
    displayOrder: 0,
  });
  const { toast } = useToast();
  const { lastMessage } = useWebSocket();

  const { data: sessions, isLoading: sessionsLoading } = useQuery<LiveChatSession[]>({
    queryKey: ['/api/live-chat/sessions'],
  });

  const { data: messages, isLoading: messagesLoading } = useQuery<LiveChatMessage[]>({
    queryKey: ['/api/live-chat/messages', selectedSession],
    enabled: !!selectedSession,
  });

  const { data: departmentsData } = useQuery<{ departments: LiveChatDepartment[] }>({
    queryKey: ['/api/live-chat/departments'],
  });

  const departments = departmentsData?.departments || [];

  const { data: settings, isLoading: settingsLoading } = useQuery<any>({
    queryKey: ['/api/live-chat/settings'],
  });

  const [settingsForm, setSettingsForm] = useState<any>({});

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

  const createDepartmentMutation = useMutation({
    mutationFn: async (data: typeof departmentFormData) => {
      const response = await apiRequest('POST', '/api/live-chat/departments', data);
      if (!response.ok) throw new Error('Failed to create department');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/live-chat/departments'] });
      toast({ title: "Department created successfully" });
      setIsDepartmentDialogOpen(false);
      resetDepartmentForm();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create department", description: error.message, variant: "destructive" });
    }
  });

  const updateDepartmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: typeof departmentFormData }) => {
      const response = await apiRequest('PATCH', `/api/live-chat/departments/${id}`, data);
      if (!response.ok) throw new Error('Failed to update department');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/live-chat/departments'] });
      toast({ title: "Department updated successfully" });
      setIsDepartmentDialogOpen(false);
      resetDepartmentForm();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update department", description: error.message, variant: "destructive" });
    }
  });

  const deleteDepartmentMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/live-chat/departments/${id}`);
      if (!response.ok) throw new Error('Failed to delete department');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/live-chat/departments'] });
      toast({ title: "Department deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete department", description: error.message, variant: "destructive" });
    }
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

  const resetDepartmentForm = () => {
    setDepartmentFormData({
      name: '',
      description: '',
      color: '#3b82f6',
      isActive: true,
      displayOrder: 0,
    });
    setEditingDepartment(null);
  };

  const handleAddDepartment = () => {
    resetDepartmentForm();
    setIsDepartmentDialogOpen(true);
  };

  const handleEditDepartment = (department: LiveChatDepartment) => {
    setEditingDepartment(department);
    setDepartmentFormData({
      name: department.name,
      description: department.description || '',
      color: department.color || '#3b82f6',
      isActive: department.isActive,
      displayOrder: department.displayOrder,
    });
    setIsDepartmentDialogOpen(true);
  };

  const handleSaveDepartment = () => {
    if (editingDepartment) {
      updateDepartmentMutation.mutate({ id: editingDepartment.id, data: departmentFormData });
    } else {
      createDepartmentMutation.mutate(departmentFormData);
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
        <p className="text-muted-foreground">Manage customer conversations and departments</p>
      </div>

      <Tabs defaultValue="sessions" className="w-full">
        <TabsList>
          <TabsTrigger value="sessions">Chat Sessions</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="settings">
            <SettingsIcon className="w-4 h-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="mt-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-280px)]">
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
                        {session.departmentName && (
                          <div className="flex items-center gap-1.5 mb-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: session.departmentColor || '#3b82f6' }}
                            />
                            <span className="text-xs text-muted-foreground">
                              {session.departmentName}
                            </span>
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
                    {!selectedSessionData.assignedAgentId && (
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
        </TabsContent>

        <TabsContent value="departments" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Chat Departments</CardTitle>
                  <CardDescription>
                    Organize chats by department for better routing and management
                  </CardDescription>
                </div>
                <Button onClick={handleAddDepartment} data-testid="button-add-department">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Department
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {departments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No departments created yet. Add your first department to get started.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {departments.map((dept) => (
                    <Card key={dept.id} data-testid={`card-department-${dept.id}`}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: dept.color || '#3b82f6' }}
                            />
                            <h3 className="font-medium">{dept.name}</h3>
                          </div>
                          <div className="flex gap-1">
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleEditDepartment(dept)}
                              data-testid={`button-edit-department-${dept.id}`}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this department?')) {
                                  deleteDepartmentMutation.mutate(dept.id);
                                }
                              }}
                              data-testid={`button-delete-department-${dept.id}`}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        {dept.description && (
                          <p className="text-sm text-muted-foreground mb-2">{dept.description}</p>
                        )}
                        <div className="flex items-center justify-between">
                          <Badge variant={dept.isActive ? "default" : "secondary"}>
                            {dept.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Order: {dept.displayOrder}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isDepartmentDialogOpen} onOpenChange={setIsDepartmentDialogOpen}>
        <DialogContent data-testid="dialog-department-form">
          <DialogHeader>
            <DialogTitle>
              {editingDepartment ? 'Edit Department' : 'Add Department'}
            </DialogTitle>
            <DialogDescription>
              {editingDepartment 
                ? 'Update department details' 
                : 'Create a new department to organize your live chat conversations'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Department Name *</Label>
              <Input
                id="name"
                value={departmentFormData.name}
                onChange={(e) => setDepartmentFormData({ ...departmentFormData, name: e.target.value })}
                placeholder="e.g., Sales, Support, Technical"
                data-testid="input-department-name"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={departmentFormData.description}
                onChange={(e) => setDepartmentFormData({ ...departmentFormData, description: e.target.value })}
                placeholder="Optional description"
                data-testid="input-department-description"
              />
            </div>
            <div>
              <Label htmlFor="color">Color</Label>
              <div className="flex gap-2">
                <Input
                  id="color"
                  type="color"
                  value={departmentFormData.color}
                  onChange={(e) => setDepartmentFormData({ ...departmentFormData, color: e.target.value })}
                  className="w-20 h-10"
                  data-testid="input-department-color"
                />
                <Input
                  value={departmentFormData.color}
                  onChange={(e) => setDepartmentFormData({ ...departmentFormData, color: e.target.value })}
                  placeholder="#3b82f6"
                  className="flex-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="displayOrder">Display Order</Label>
              <Input
                id="displayOrder"
                type="number"
                value={departmentFormData.displayOrder}
                onChange={(e) => setDepartmentFormData({ ...departmentFormData, displayOrder: Number(e.target.value) })}
                data-testid="input-department-order"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={departmentFormData.isActive}
                onChange={(e) => setDepartmentFormData({ ...departmentFormData, isActive: e.target.checked })}
                className="rounded"
                data-testid="input-department-active"
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDepartmentDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveDepartment}
              disabled={!departmentFormData.name || createDepartmentMutation.isPending || updateDepartmentMutation.isPending}
              data-testid="button-save-department"
            >
              {editingDepartment ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Chat Widget Settings</CardTitle>
              <CardDescription>
                Customize how the live chat widget appears on your website
              </CardDescription>
            </CardHeader>
            <CardContent>
              {settingsLoading ? (
                <div className="text-center py-8">Loading settings...</div>
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Page Visibility</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="showOnAllPages">Show on all pages</Label>
                            <p className="text-sm text-muted-foreground">Display chat widget across your entire website</p>
                          </div>
                          <Switch 
                            id="showOnAllPages"
                            checked={settings?.showOnAllPages ?? true}
                            onCheckedChange={(checked) => {
                              const updateMutation = useMutation({
                                mutationFn: async (updates: any) => {
                                  const response = await apiRequest('PATCH', '/api/live-chat/settings', updates);
                                  if (!response.ok) throw new Error('Failed to update settings');
                                  return response.json();
                                },
                                onSuccess: () => {
                                  queryClient.invalidateQueries({ queryKey: ['/api/live-chat/settings'] });
                                  toast({ title: "Settings updated successfully" });
                                },
                              });
                              updateMutation.mutate({ showOnAllPages: checked });
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Icon Style</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="iconColor">Icon Color</Label>
                          <div className="flex gap-2 mt-1">
                            <Input
                              id="iconColor"
                              type="color"
                              value={settings?.iconColor || '#3b82f6'}
                              className="w-20 h-10"
                            />
                            <Input
                              value={settings?.iconColor || '#3b82f6'}
                              placeholder="#3b82f6"
                              className="flex-1"
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="iconPosition">Position</Label>
                          <Select 
                            value={settings?.iconPosition || 'bottom-right'}
                          >
                            <SelectTrigger id="iconPosition">
                              <SelectValue placeholder="Select position" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bottom-right">Bottom Right</SelectItem>
                              <SelectItem value="bottom-left">Bottom Left</SelectItem>
                              <SelectItem value="top-right">Top Right</SelectItem>
                              <SelectItem value="top-left">Top Left</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Chat Colors</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="primaryColor">Primary Color</Label>
                          <div className="flex gap-2 mt-1">
                            <Input
                              id="primaryColor"
                              type="color"
                              value={settings?.primaryColor || '#3b82f6'}
                              className="w-20 h-10"
                            />
                            <Input
                              value={settings?.primaryColor || '#3b82f6'}
                              placeholder="#3b82f6"
                              className="flex-1"
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="chatBubbleUserColor">User Bubble Color</Label>
                          <div className="flex gap-2 mt-1">
                            <Input
                              id="chatBubbleUserColor"
                              type="color"
                              value={settings?.chatBubbleUserColor || '#3b82f6'}
                              className="w-20 h-10"
                            />
                            <Input
                              value={settings?.chatBubbleUserColor || '#3b82f6'}
                              placeholder="#3b82f6"
                              className="flex-1"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Messages</h3>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="welcomeMessage">Welcome Message</Label>
                          <Input
                            id="welcomeMessage"
                            value={settings?.welcomeMessage || 'Hi! How can we help you today?'}
                            placeholder="Hi! How can we help you today?"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="offlineMessage">Offline Message</Label>
                          <Input
                            id="offlineMessage"
                            value={settings?.offlineMessage || "We're currently offline. Please leave a message."}
                            placeholder="We're currently offline"
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="text-sm text-muted-foreground">
                        Changes are saved automatically
                      </div>
                      <Button variant="outline" size="sm">
                        <Save className="w-4 h-4 mr-2" />
                        Preview Widget
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
