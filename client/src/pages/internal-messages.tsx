import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { 
  Send, 
  Plus, 
  Users, 
  MessageSquare, 
  User, 
  Clock, 
  AlertCircle,
  CheckCircle2,
  Reply,
  Trash2,
  Group
} from "lucide-react";

interface User {
  id: number;
  username: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: string;
}

interface InternalMessage {
  id: number;
  senderId: number;
  subject: string;
  content: string;
  messageType: string;
  priority: string;
  createdAt: string;
  sender: User;
  recipients: Array<{
    id: number;
    recipientId: number;
    isRead: boolean;
    readAt?: string;
    user: User;
  }>;
}

interface MessageGroup {
  id: number;
  name: string;
  description?: string;
  createdBy: number;
  members: Array<{
    id: number;
    userId: number;
    role: string;
    user: User;
  }>;
}

export default function InternalMessagesPage() {
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<InternalMessage | null>(null);
  const [selectedRecipients, setSelectedRecipients] = useState<number[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<number[]>([]);
  const [messageType, setMessageType] = useState<'individual' | 'group' | 'broadcast'>('individual');
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading: messagesLoading } = useQuery<InternalMessage[]>({
    queryKey: ["/api/internal-messages"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: groups = [] } = useQuery<MessageGroup[]>({
    queryKey: ["/api/message-groups"],
  });

  const sendMessageMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/internal-messages", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/internal-messages"] });
      setIsComposeOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Message sent successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/message-groups", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/message-groups"] });
      setIsGroupDialogOpen(false);
      toast({
        title: "Success",
        description: "Group created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create group",
        variant: "destructive",
      });
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: (messageId: number) => apiRequest("PUT", `/api/internal-messages/${messageId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/internal-messages"] });
    },
  });

  const resetForm = () => {
    setSelectedRecipients([]);
    setSelectedGroups([]);
    setMessageType('individual');
  };

  const handleSendMessage = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const messageData = {
      subject: formData.get('subject') as string,
      content: formData.get('content') as string,
      priority: formData.get('priority') as string,
      messageType,
      recipientIds: messageType === 'individual' ? selectedRecipients : [],
      groupIds: messageType === 'group' ? selectedGroups : [],
    };

    sendMessageMutation.mutate(messageData);
  };

  const handleCreateGroup = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const groupData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      memberIds: selectedRecipients,
    };

    createGroupMutation.mutate(groupData);
  };

  const handleRecipientToggle = (userId: number) => {
    setSelectedRecipients(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleGroupToggle = (groupId: number) => {
    setSelectedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const getUnreadCount = () => {
    return messages.filter(message => 
      message.recipients.some(recipient => 
        recipient.recipientId === user?.id && !recipient.isRead
      )
    ).length;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'normal':
        return 'bg-blue-100 text-blue-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isMessageUnread = (message: InternalMessage) => {
    return message.recipients.some(recipient => 
      recipient.recipientId === user?.id && !recipient.isRead
    );
  };

  if (messagesLoading) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="h-96 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Internal Messages</h1>
          <p className="text-muted-foreground">
            Send messages to team members and manage groups
            {getUnreadCount() > 0 && (
              <Badge variant="destructive" className="ml-2">
                {getUnreadCount()} unread
              </Badge>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Group className="h-4 w-4 mr-2" />
                Create Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Message Group</DialogTitle>
                <DialogDescription>
                  Create a group to send messages to multiple team members at once
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateGroup} className="space-y-4">
                <div>
                  <Label htmlFor="name">Group Name</Label>
                  <Input
                    id="name"
                    name="name"
                    required
                    placeholder="e.g., Development Team"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Optional description of the group"
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Group Members</Label>
                  <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                    {users.filter(u => u.id !== user?.id).map(u => (
                      <div key={u.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`group-user-${u.id}`}
                          checked={selectedRecipients.includes(u.id)}
                          onCheckedChange={() => handleRecipientToggle(u.id)}
                        />
                        <Label htmlFor={`group-user-${u.id}`} className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback>
                              {u.firstName?.[0] || u.username[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {u.firstName && u.lastName 
                            ? `${u.firstName} ${u.lastName}` 
                            : u.username
                          }
                          <Badge variant="outline" className="text-xs">
                            {u.role}
                          </Badge>
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsGroupDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createGroupMutation.isPending}>
                    Create Group
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
            <DialogTrigger asChild>
              <Button>
                <Send className="h-4 w-4 mr-2" />
                Compose Message
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Compose New Message</DialogTitle>
                <DialogDescription>
                  Send a message to team members or groups
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSendMessage} className="space-y-4">
                <div>
                  <Label>Message Type</Label>
                  <Tabs value={messageType} onValueChange={(value: any) => setMessageType(value)} className="mt-2">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="individual">
                        <User className="h-4 w-4 mr-1" />
                        Individual
                      </TabsTrigger>
                      <TabsTrigger value="group">
                        <Users className="h-4 w-4 mr-1" />
                        Group
                      </TabsTrigger>
                      <TabsTrigger value="broadcast">
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Broadcast
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="individual" className="space-y-2">
                      <Label>Select Recipients</Label>
                      <div className="space-y-2 max-h-40 overflow-y-auto border rounded p-2">
                        {users.filter(u => u.id !== user?.id).map(u => (
                          <div key={u.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`user-${u.id}`}
                              checked={selectedRecipients.includes(u.id)}
                              onCheckedChange={() => handleRecipientToggle(u.id)}
                            />
                            <Label htmlFor={`user-${u.id}`} className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback>
                                  {u.firstName?.[0] || u.username[0].toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              {u.firstName && u.lastName 
                                ? `${u.firstName} ${u.lastName}` 
                                : u.username
                              }
                              <Badge variant="outline" className="text-xs">
                                {u.role}
                              </Badge>
                            </Label>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="group" className="space-y-2">
                      <Label>Select Groups</Label>
                      <div className="space-y-2 max-h-40 overflow-y-auto border rounded p-2">
                        {groups.map(group => (
                          <div key={group.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`group-${group.id}`}
                              checked={selectedGroups.includes(group.id)}
                              onCheckedChange={() => handleGroupToggle(group.id)}
                            />
                            <Label htmlFor={`group-${group.id}`} className="flex items-center gap-2">
                              <Group className="h-4 w-4" />
                              {group.name}
                              <Badge variant="outline" className="text-xs">
                                {group.members.length} members
                              </Badge>
                            </Label>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="broadcast">
                      <p className="text-sm text-muted-foreground">
                        This message will be sent to all team members.
                      </p>
                    </TabsContent>
                  </Tabs>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      name="subject"
                      required
                      placeholder="Message subject"
                    />
                  </div>
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select name="priority" defaultValue="normal">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="content">Message</Label>
                  <Textarea
                    id="content"
                    name="content"
                    required
                    placeholder="Type your message here..."
                    rows={5}
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => {
                    setIsComposeOpen(false);
                    resetForm();
                  }}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={sendMessageMutation.isPending}>
                    <Send className="h-4 w-4 mr-2" />
                    Send Message
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Messages</CardTitle>
            <CardDescription>
              Your inbox and sent messages
            </CardDescription>
          </CardHeader>
          <CardContent>
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No messages yet</p>
                <Button onClick={() => setIsComposeOpen(true)}>
                  <Send className="h-4 w-4 mr-2" />
                  Send your first message
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => {
                  const unread = isMessageUnread(message);
                  const isSender = message.senderId === user?.id;
                  
                  return (
                    <div
                      key={message.id}
                      className={`border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                        unread ? 'border-primary bg-primary/5' : ''
                      }`}
                      onClick={() => {
                        setSelectedMessage(message);
                        if (unread && !isSender) {
                          markAsReadMutation.mutate(message.id);
                        }
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {message.sender.firstName?.[0] || message.sender.username[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">
                                {message.sender.firstName && message.sender.lastName
                                  ? `${message.sender.firstName} ${message.sender.lastName}`
                                  : message.sender.username
                                }
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {isSender ? 'You' : 'To you'} • {new Date(message.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <h3 className={`font-semibold mb-2 ${unread ? 'text-primary' : ''}`}>
                            {message.subject}
                          </h3>
                          <p className="text-muted-foreground line-clamp-2">
                            {message.content}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getPriorityColor(message.priority)}>
                            {message.priority}
                          </Badge>
                          {unread && !isSender && (
                            <Badge variant="destructive">
                              New
                            </Badge>
                          )}
                          <Badge variant="outline">
                            {message.messageType}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Message Groups */}
        <Card>
          <CardHeader>
            <CardTitle>Message Groups</CardTitle>
            <CardDescription>
              Groups for organizing team communications
            </CardDescription>
          </CardHeader>
          <CardContent>
            {groups.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No groups created yet</p>
                <Button onClick={() => setIsGroupDialogOpen(true)}>
                  <Group className="h-4 w-4 mr-2" />
                  Create your first group
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groups.map((group) => (
                  <div key={group.id} className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Group className="h-5 w-5" />
                      <h3 className="font-semibold">{group.name}</h3>
                    </div>
                    {group.description && (
                      <p className="text-sm text-muted-foreground mb-3">
                        {group.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">
                        {group.members.length} members
                      </Badge>
                      <Button size="sm" variant="outline">
                        Manage
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Message Detail Dialog */}
      {selectedMessage && (
        <Dialog open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>{selectedMessage.subject}</DialogTitle>
                <div className="flex items-center gap-2">
                  <Badge className={getPriorityColor(selectedMessage.priority)}>
                    {selectedMessage.priority}
                  </Badge>
                  <Badge variant="outline">
                    {selectedMessage.messageType}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Avatar className="h-6 w-6">
                  <AvatarFallback>
                    {selectedMessage.sender.firstName?.[0] || selectedMessage.sender.username[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span>
                  From: {selectedMessage.sender.firstName && selectedMessage.sender.lastName
                    ? `${selectedMessage.sender.firstName} ${selectedMessage.sender.lastName}`
                    : selectedMessage.sender.username
                  }
                </span>
                <span>•</span>
                <Clock className="h-4 w-4" />
                <span>{new Date(selectedMessage.createdAt).toLocaleString()}</span>
              </div>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="whitespace-pre-wrap">{selectedMessage.content}</p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Recipients ({selectedMessage.recipients.length})</h4>
                <div className="space-y-2">
                  {selectedMessage.recipients.map((recipient) => (
                    <div key={recipient.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback>
                            {recipient.user.firstName?.[0] || recipient.user.username[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          {recipient.user.firstName && recipient.user.lastName
                            ? `${recipient.user.firstName} ${recipient.user.lastName}`
                            : recipient.user.username
                          }
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {recipient.isRead ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-xs">
                              Read {recipient.readAt && new Date(recipient.readAt).toLocaleString()}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span className="text-xs">Unread</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedMessage(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}