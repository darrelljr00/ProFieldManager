import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Send, MessageSquare, Phone, User, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

type Message = {
  id: number;
  to: string;
  from: string;
  body: string;
  status: string;
  direction: 'inbound' | 'outbound';
  twilioSid: string;
  createdAt: string;
  customerName?: string;
};

type Customer = {
  id: number;
  name: string;
  phone: string;
  email: string;
};

export default function Messages() {
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [messageBody, setMessageBody] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showNewMessageDialog, setShowNewMessageDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
    refetchInterval: 5000, // Refresh every 5 seconds for new messages
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const sendMessageMutation = useMutation({
    mutationFn: (data: { to: string; body: string; customerId?: number }) =>
      apiRequest("POST", "/api/messages/send", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      toast({
        title: "Success",
        description: "Message sent successfully",
      });
      setMessageBody("");
      setPhoneNumber("");
      setSelectedCustomer("");
      setShowNewMessageDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    let phoneToUse = phoneNumber;
    let customerIdToUse: number | undefined;

    if (selectedCustomer) {
      const customer = customers.find(c => c.id.toString() === selectedCustomer);
      if (customer) {
        phoneToUse = customer.phone;
        customerIdToUse = customer.id;
      }
    }

    if (!phoneToUse || !messageBody) {
      toast({
        title: "Error",
        description: "Please provide a phone number and message",
        variant: "destructive",
      });
      return;
    }

    sendMessageMutation.mutate({
      to: phoneToUse,
      body: messageBody,
      customerId: customerIdToUse,
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "delivered":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "sent":
      case "queued":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "delivered":
        return "default";
      case "failed":
        return "destructive";
      case "sent":
      case "queued":
        return "secondary";
      default:
        return "outline";
    }
  };

  const formatPhoneNumber = (phone: string) => {
    // Simple phone number formatting
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  if (messagesLoading) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="h-64 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageSquare className="h-8 w-8" />
            Text Messaging
          </h1>
          <p className="text-muted-foreground">Send and receive SMS messages with customers</p>
        </div>
        <Dialog open={showNewMessageDialog} onOpenChange={setShowNewMessageDialog}>
          <DialogTrigger asChild>
            <Button>
              <Send className="h-4 w-4 mr-2" />
              New Message
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send New Message</DialogTitle>
              <DialogDescription>
                Send an SMS message to a customer or phone number
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSendMessage} className="space-y-4">
              <div>
                <Label htmlFor="customer">Customer (Optional)</Label>
                <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a customer or enter phone manually" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers
                      .filter(customer => customer.phone)
                      .map((customer) => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          {customer.name} - {formatPhoneNumber(customer.phone)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {!selectedCustomer && (
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    placeholder="+1 (555) 123-4567"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
              )}

              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Type your message here..."
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  rows={4}
                  maxLength={1600}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  {messageBody.length}/1600 characters
                </p>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewMessageDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={sendMessageMutation.isPending}>
                  {sendMessageMutation.isPending ? "Sending..." : "Send Message"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Message History</CardTitle>
            <CardDescription>
              All SMS conversations with customers
            </CardDescription>
          </CardHeader>
          <CardContent>
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No messages yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start a conversation by sending your first message
                </p>
                <Button onClick={() => setShowNewMessageDialog(true)}>
                  <Send className="h-4 w-4 mr-2" />
                  Send First Message
                </Button>
              </div>
            ) : (
              <div className="mb-4 flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  {messages.length} message{messages.length !== 1 ? 's' : ''} • Auto-refreshing every 5 seconds
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Simulate receiving a message for demo purposes
                    const demoMessage = {
                      to: "+15559876543",
                      from: "+15551234567",
                      body: "Thanks for the quote! When can we schedule the work?",
                      status: "received",
                      direction: "inbound" as const,
                      twilioSid: `SM${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
                    };
                    
                    apiRequest("POST", "/api/messages/webhook", {
                      MessageSid: demoMessage.twilioSid,
                      From: demoMessage.from,
                      To: demoMessage.to,
                      Body: demoMessage.body,
                    }).then(() => {
                      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
                    });
                  }}
                >
                  Simulate Incoming Message
                </Button>
              </div>
            )}
            {messages.length > 0 && (
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.direction === 'outbound' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-4 ${
                          message.direction === 'outbound'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {message.direction === 'outbound' ? (
                            <div className="flex items-center gap-1 text-blue-100">
                              <User className="h-3 w-3" />
                              <span className="text-xs">You</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-gray-600">
                              <Phone className="h-3 w-3" />
                              <span className="text-xs">
                                {message.customerName || formatPhoneNumber(message.from)}
                              </span>
                            </div>
                          )}
                          <span
                            className={`text-xs ${
                              message.direction === 'outbound'
                                ? 'text-blue-100'
                                : 'text-gray-500'
                            }`}
                          >
                            {format(new Date(message.createdAt), "MMM dd, h:mm a")}
                          </span>
                        </div>
                        <p className="text-sm">{message.body}</p>
                        {message.direction === 'outbound' && (
                          <div className="flex items-center gap-1 mt-2">
                            {getStatusIcon(message.status)}
                            <Badge
                              variant={getStatusColor(message.status) as any}
                              className="text-xs"
                            >
                              {message.status}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Message Statistics</CardTitle>
            <CardDescription>
              Overview of your SMS activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {messages.filter(m => m.direction === 'outbound').length}
                </div>
                <div className="text-sm text-muted-foreground">Sent</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {messages.filter(m => m.direction === 'inbound').length}
                </div>
                <div className="text-sm text-muted-foreground">Received</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {messages.filter(m => m.status === 'delivered').length}
                </div>
                <div className="text-sm text-muted-foreground">Delivered</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {messages.filter(m => m.status === 'failed').length}
                </div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}