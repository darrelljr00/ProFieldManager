import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Send, 
  Plus, 
  Search,
  MoreVertical,
  Phone,
  Video,
  Info,
  Smile,
  Paperclip,
  MessageSquare,
  FileImage,
  File,
  X
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface User {
  id: number;
  username: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: string;
}

interface ChatMessage {
  id: number;
  senderId: number;
  content: string;
  messageType: string;
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

interface ChatRoom {
  id: string;
  name: string;
  type: 'direct' | 'group';
  participants: User[];
  lastMessage?: ChatMessage;
  unreadCount: number;
}

export default function InternalMessagesPage() {
  const [selectedChatRoom, setSelectedChatRoom] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: messages = [], isLoading: messagesLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/internal-messages"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("/api/internal-messages", "POST", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/internal-messages"] });
      setNewMessage('');
      setAttachedFiles([]);
      toast({
        title: "Message sent",
        description: "Your message has been delivered",
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

  // Common emojis for the picker
  const commonEmojis = [
    '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
    '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
    '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩',
    '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
    '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬',
    '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗',
    '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯',
    '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐',
    '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈',
    '👍', '👎', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙',
    '👈', '👉', '👆', '🖕', '👇', '☝️', '👋', '🤚', '🖐️', '✋',
    '🖖', '👏', '🙌', '🤝', '🙏', '✍️', '💪', '🦾', '🦿', '🦵'
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => {
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit
      const isValidType = file.type.startsWith('image/') || 
                         file.type.startsWith('video/') || 
                         file.type === 'application/pdf' ||
                         file.type.startsWith('text/') ||
                         file.type.includes('document');
      
      if (!isValidSize) {
        toast({
          title: "File too large",
          description: `${file.name} is larger than 10MB`,
          variant: "destructive"
        });
        return false;
      }
      
      if (!isValidType) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a supported file type`,
          variant: "destructive"
        });
        return false;
      }
      
      return true;
    });
    
    setAttachedFiles(prev => [...prev, ...validFiles]);
  };

  const removeAttachedFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const addEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setIsEmojiPickerOpen(false);
  };

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) return [];
    
    setUploadingFiles(true);
    const uploadedUrls: string[] = [];
    
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });
        
        if (response.ok) {
          const result = await response.json();
          uploadedUrls.push(result.url);
        } else {
          throw new Error(`Failed to upload ${file.name}`);
        }
      }
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUploadingFiles(false);
    }
    
    return uploadedUrls;
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Create chat rooms from users (simplified)
  const chatRooms: ChatRoom[] = users.filter(u => u.id !== user?.id).map(u => ({
    id: `direct_${u.id}`,
    name: u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.username,
    type: 'direct' as const,
    participants: [u],
    lastMessage: messages.filter(m => 
      m.senderId === u.id || m.recipients.some(r => r.recipientId === u.id)
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0],
    unreadCount: messages.filter(m => 
      m.senderId === u.id && 
      m.recipients.some(r => r.recipientId === user?.id && !r.isRead)
    ).length
  }));

  const selectedRoom = chatRooms.find(room => room.id === selectedChatRoom);
  const roomMessages = selectedRoom ? messages.filter(m => 
    m.senderId === selectedRoom.participants[0].id || 
    m.recipients.some(r => r.recipientId === selectedRoom.participants[0].id)
  ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) : [];

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && attachedFiles.length === 0) || !selectedRoom) return;

    try {
      // Upload files first if any
      const uploadedUrls = await uploadFiles(attachedFiles);
      
      let messageContent = newMessage.trim();
      if (uploadedUrls.length > 0) {
        messageContent += (messageContent ? '\n\n' : '') + 
          uploadedUrls.map(url => `[Attachment: ${url}]`).join('\n');
      }

      const messageData = {
        content: messageContent,
        messageType: 'individual',
        recipientIds: [selectedRoom.participants[0].id],
        subject: '',
        priority: 'normal'
      };

      sendMessageMutation.mutate(messageData);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const formatMessageTime = (timestamp: string) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  const getUserInitials = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    return user.username[0].toUpperCase();
  };

  const getUserDisplayName = (user: User) => {
    return user.firstName && user.lastName 
      ? `${user.firstName} ${user.lastName}` 
      : user.username;
  };

  if (messagesLoading) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-background">
      {/* Sidebar - Chat List */}
      <div className="w-80 border-r border-border flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-semibold">Messages</h1>
            <Dialog open={isNewChatOpen} onOpenChange={setIsNewChatOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="ghost">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Start New Chat</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search team members..."
                      className="pl-9"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {users.filter(u => 
                      u.id !== user?.id && 
                      getUserDisplayName(u).toLowerCase().includes(searchQuery.toLowerCase())
                    ).map(u => (
                      <div
                        key={u.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                        onClick={() => {
                          setSelectedChatRoom(`direct_${u.id}`);
                          setIsNewChatOpen(false);
                          setSearchQuery('');
                        }}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>{getUserInitials(u)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{getUserDisplayName(u)}</p>
                          <p className="text-sm text-muted-foreground">{u.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              className="pl-9"
            />
          </div>
        </div>

        {/* Chat List */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {chatRooms.map((room) => (
              <div
                key={room.id}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedChatRoom === room.id 
                    ? 'bg-primary/10 border border-primary/20' 
                    : 'hover:bg-muted'
                }`}
                onClick={() => setSelectedChatRoom(room.id)}
              >
                <Avatar className="h-10 w-10">
                  <AvatarFallback>{getUserInitials(room.participants[0])}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium truncate">{room.name}</p>
                    {room.lastMessage && (
                      <span className="text-xs text-muted-foreground">
                        {formatMessageTime(room.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {room.lastMessage?.content || "No messages yet"}
                  </p>
                </div>
                {room.unreadCount > 0 && (
                  <div className="bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {room.unreadCount}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedRoom ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{getUserInitials(selectedRoom.participants[0])}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedRoom.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedRoom.participants[0].role}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm">
                  <Phone className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Video className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Info className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {roomMessages.map((message) => {
                  const isOwnMessage = message.senderId === user?.id;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className="flex items-end gap-2 max-w-xs lg:max-w-md">
                        {!isOwnMessage && (
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {getUserInitials(message.sender)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div
                          className={`rounded-lg px-3 py-2 ${
                            isOwnMessage
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p
                            className={`text-xs mt-1 ${
                              isOwnMessage
                                ? 'text-primary-foreground/70'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {formatMessageTime(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t border-border">
              {/* File Attachments Preview */}
              {attachedFiles.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {attachedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2 text-sm"
                    >
                      {file.type.startsWith('image/') ? (
                        <FileImage className="h-4 w-4" />
                      ) : (
                        <File className="h-4 w-4" />
                      )}
                      <span className="truncate max-w-[150px]">{file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0"
                        onClick={() => removeAttachedFile(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                {/* File Attachment Button */}
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFiles}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>

                {/* Emoji Picker */}
                <Popover open={isEmojiPickerOpen} onOpenChange={setIsEmojiPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="ghost" size="sm">
                      <Smile className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="start">
                    <div className="grid grid-cols-10 gap-2 p-2">
                      {commonEmojis.map((emoji, index) => (
                        <Button
                          key={index}
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-base hover:bg-muted"
                          onClick={() => addEmoji(emoji)}
                        >
                          {emoji}
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Message Input */}
                <div className="flex-1">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                  />
                </div>

                {/* Send Button */}
                <Button 
                  type="submit" 
                  size="sm"
                  disabled={(!newMessage.trim() && attachedFiles.length === 0) || sendMessageMutation.isPending || uploadingFiles}
                >
                  {sendMessageMutation.isPending || uploadingFiles ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>

              {/* Hidden File Input */}
              <input
                type="file"
                ref={fileInputRef}
                multiple
                accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </>
        ) : (
          /* No Chat Selected */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
              <p className="text-muted-foreground mb-4">
                Choose from your existing conversations or start a new one
              </p>
              <Button onClick={() => setIsNewChatOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Start New Chat
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}