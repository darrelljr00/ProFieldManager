import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  Phone, 
  PhoneCall, 
  MessageSquare, 
  DollarSign, 
  Users, 
  Clock, 
  TrendingUp,
  Settings,
  Search,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  PlayCircle,
  AlertTriangle,
  Info,
  Activity,
  BarChart3,
  RefreshCw,
  Shield,
  Loader2
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function SaasAdminCallManager() {
  const [searchNumbers, setSearchNumbers] = useState({ areaCode: "", region: "" });
  const [availableNumbers, setAvailableNumbers] = useState([]);

  // Fetch Twilio account info
  const { data: accountInfo, isLoading: isLoadingAccount } = useQuery({
    queryKey: ["/api/twilio/account"],
    retry: false,
  });

  // Fetch Twilio phone numbers
  const { data: twilioNumbers = [], isLoading: isLoadingNumbers } = useQuery({
    queryKey: ["/api/twilio/phone-numbers"],
    retry: false,
  });

  // Fetch call logs
  const { data: callLogs = [], isLoading: isLoadingCalls } = useQuery({
    queryKey: ["/api/twilio/call-logs"],
    retry: false,
  });

  // Fetch usage statistics
  const { data: usageStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["/api/twilio/usage-stats"],
    retry: false,
  });

  // Search available numbers mutation
  const searchNumbersMutation = useMutation({
    mutationFn: async (params: { areaCode?: string; region?: string }) => {
      const query = new URLSearchParams();
      if (params.areaCode) query.append('areaCode', params.areaCode);
      if (params.region) query.append('region', params.region);
      
      return apiRequest(`/api/twilio/available-numbers?${query.toString()}`);
    },
    onSuccess: (data) => {
      setAvailableNumbers(data);
      toast({
        title: "Search Complete",
        description: `Found ${data.length} available phone numbers`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Search Failed",
        description: error.message || "Failed to search available numbers",
        variant: "destructive",
      });
    },
  });

  // Purchase number mutation
  const purchaseNumberMutation = useMutation({
    mutationFn: async (params: { phoneNumber: string; friendlyName?: string }) => {
      return apiRequest("/api/twilio/purchase-number", {
        method: "POST",
        body: JSON.stringify(params),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/twilio/phone-numbers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/twilio/usage-stats"] });
      toast({
        title: "Number Purchased",
        description: "Phone number purchased successfully",
      });
      setAvailableNumbers([]);
    },
    onError: (error: any) => {
      toast({
        title: "Purchase Failed",
        description: error.message || "Failed to purchase phone number",
        variant: "destructive",
      });
    },
  });

  // Release number mutation
  const releaseNumberMutation = useMutation({
    mutationFn: async (sid: string) => {
      return apiRequest(`/api/twilio/phone-numbers/${sid}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/twilio/phone-numbers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/twilio/usage-stats"] });
      toast({
        title: "Number Released",
        description: "Phone number released successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Release Failed",
        description: error.message || "Failed to release phone number",
        variant: "destructive",
      });
    },
  });

  const handleSearchNumbers = () => {
    searchNumbersMutation.mutate(searchNumbers);
  };

  const handlePurchaseNumber = (phoneNumber: string, friendlyName?: string) => {
    purchaseNumberMutation.mutate({ phoneNumber, friendlyName });
  };

  const handleReleaseNumber = (sid: string) => {
    if (confirm("Are you sure you want to release this phone number? This action cannot be undone.")) {
      releaseNumberMutation.mutate(sid);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Call Manager</h1>
          <p className="text-gray-600 mt-1">
            Manage Twilio phone numbers, monitor call activity, and track usage
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge 
            variant="outline" 
            className={accountInfo?.isConfigured ? "bg-green-50 text-green-700 border-green-200" : "bg-yellow-50 text-yellow-700 border-yellow-200"}
          >
            <Activity className="w-3 h-3 mr-1" />
            {accountInfo?.isConfigured ? "Twilio Connected" : "Demo Mode"}
          </Badge>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Calls</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoadingStats ? "..." : (usageStats?.calls?.totalCalls?.toLocaleString() || "0")}
                </p>
              </div>
              <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Phone className="h-4 w-4 text-blue-600" />
              </div>
            </div>
            <div className="flex items-center mt-2 text-sm">
              <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              <span className="text-green-600">This month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Call Minutes</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoadingStats ? "..." : (usageStats?.calls?.totalMinutes?.toLocaleString() || "0")}
                </p>
              </div>
              <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Clock className="h-4 w-4 text-green-600" />
              </div>
            </div>
            <div className="flex items-center mt-2 text-sm">
              <span className="text-gray-600">
                Avg: {usageStats?.calls?.averageDuration ? `${Math.floor(usageStats.calls.averageDuration / 60)}:${(usageStats.calls.averageDuration % 60).toString().padStart(2, '0')}` : "0:00"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Numbers</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoadingNumbers ? "..." : twilioNumbers.length}
                </p>
              </div>
              <div className="h-8 w-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
            <div className="flex items-center mt-2 text-sm">
              <span className="text-gray-600">Phone numbers configured</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Monthly Spend</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${isLoadingStats ? "..." : (usageStats?.monthlySpend?.toFixed(2) || "0.00")}
                </p>
              </div>
              <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-purple-600" />
              </div>
            </div>
            <div className="flex items-center mt-2 text-sm">
              <span className="text-gray-600">Current billing cycle</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Account Status Alert */}
      {accountInfo && !accountInfo.isConfigured && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>Demo Mode:</strong> Twilio credentials not configured. Add your Twilio Account SID and Auth Token to enable real phone number management.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="numbers" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="numbers" className="flex items-center space-x-2">
            <Phone className="w-4 h-4" />
            <span>Phone Numbers</span>
          </TabsTrigger>
          <TabsTrigger value="calls" className="flex items-center space-x-2">
            <PhoneCall className="w-4 h-4" />
            <span>Call Logs</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4" />
            <span>Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center space-x-2">
            <Settings className="w-4 h-4" />
            <span>Account</span>
          </TabsTrigger>
        </TabsList>

        {/* Phone Numbers Tab */}
        <TabsContent value="numbers" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-lg font-semibold">Phone Number Management</CardTitle>
                <CardDescription>
                  Purchase, configure, and manage your Twilio phone numbers
                </CardDescription>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Purchase Number
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Purchase Phone Number</DialogTitle>
                    <DialogDescription>
                      Search for and purchase a new Twilio phone number for your organization
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="areaCode">Area Code</Label>
                        <Input
                          id="areaCode"
                          placeholder="e.g., 555"
                          value={searchNumbers.areaCode}
                          onChange={(e) => setSearchNumbers(prev => ({ ...prev, areaCode: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="region">State/Region</Label>
                        <Input
                          id="region"
                          placeholder="e.g., TX"
                          value={searchNumbers.region}
                          onChange={(e) => setSearchNumbers(prev => ({ ...prev, region: e.target.value }))}
                        />
                      </div>
                    </div>
                    <Button 
                      onClick={handleSearchNumbers} 
                      disabled={searchNumbersMutation.isPending}
                      className="w-full"
                    >
                      {searchNumbersMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Searching...
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4 mr-2" />
                          Search Available Numbers
                        </>
                      )}
                    </Button>

                    {availableNumbers.length > 0 && (
                      <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
                        <h4 className="font-medium mb-3">Available Numbers:</h4>
                        <div className="space-y-2">
                          {availableNumbers.map((number: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-2 border rounded">
                              <div>
                                <p className="font-medium">{number.phoneNumber}</p>
                                <p className="text-sm text-gray-600">{number.friendlyName}</p>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => handlePurchaseNumber(number.phoneNumber, number.friendlyName)}
                                disabled={purchaseNumberMutation.isPending}
                              >
                                {purchaseNumberMutation.isPending ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  "Purchase"
                                )}
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {isLoadingNumbers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Phone Number</TableHead>
                      <TableHead>Friendly Name</TableHead>
                      <TableHead>Capabilities</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {twilioNumbers.length > 0 ? twilioNumbers.map((number: any) => (
                      <TableRow key={number.sid}>
                        <TableCell className="font-medium">{number.phoneNumber}</TableCell>
                        <TableCell>{number.friendlyName}</TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            {number.capabilities?.voice && (
                              <Badge variant="secondary" className="text-xs">Voice</Badge>
                            )}
                            {number.capabilities?.sms && (
                              <Badge variant="secondary" className="text-xs">SMS</Badge>
                            )}
                            {number.capabilities?.mms && (
                              <Badge variant="secondary" className="text-xs">MMS</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{new Date(number.dateCreated).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleReleaseNumber(number.sid)}
                              disabled={releaseNumberMutation.isPending}
                              className="text-red-600 hover:text-red-700"
                            >
                              {releaseNumberMutation.isPending ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Trash2 className="w-3 h-3" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                          No phone numbers configured. Purchase your first number to get started.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Call Logs Tab */}
        <TabsContent value="calls" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Recent Call Activity</CardTitle>
              <CardDescription>
                Monitor all incoming and outgoing calls across your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingCalls ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Direction</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Date & Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {callLogs.length > 0 ? callLogs.map((call: any) => (
                      <TableRow key={call.sid}>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={call.direction.includes('outbound') ? "bg-blue-50 text-blue-700" : "bg-green-50 text-green-700"}
                          >
                            {call.direction.includes('outbound') ? 'Outbound' : 'Inbound'}
                          </Badge>
                        </TableCell>
                        <TableCell>{call.from}</TableCell>
                        <TableCell>{call.to}</TableCell>
                        <TableCell>
                          {call.duration ? `${Math.floor(call.duration / 60)}:${(call.duration % 60).toString().padStart(2, '0')}` : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            className={
                              call.status === 'completed' ? "bg-green-100 text-green-800" :
                              call.status === 'failed' ? "bg-red-100 text-red-800" :
                              "bg-yellow-100 text-yellow-800"
                            }
                          >
                            {call.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{call.price ? `$${Math.abs(parseFloat(call.price)).toFixed(3)}` : 'N/A'}</TableCell>
                        <TableCell>{new Date(call.dateCreated).toLocaleString()}</TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          No call logs available.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Usage Summary</CardTitle>
                <CardDescription>
                  Current month call and SMS statistics
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingStats ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Total Calls</span>
                      <span className="text-lg font-semibold">{usageStats?.calls?.totalCalls || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Call Minutes</span>
                      <span className="text-lg font-semibold">{usageStats?.calls?.totalMinutes || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">SMS Messages</span>
                      <span className="text-lg font-semibold">{usageStats?.sms?.totalMessages || 0}</span>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Voice Calls Cost</span>
                        <span className="font-medium">${usageStats?.calls?.totalCost?.toFixed(2) || "0.00"}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">SMS Cost</span>
                        <span className="font-medium">${usageStats?.sms?.totalCost?.toFixed(2) || "0.00"}</span>
                      </div>
                      <div className="flex justify-between text-sm font-semibold border-t pt-2">
                        <span>Total Monthly Spend</span>
                        <span>${usageStats?.monthlySpend?.toFixed(2) || "0.00"}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Account Balance</CardTitle>
                <CardDescription>
                  Twilio account balance and billing information
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingAccount ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Account Status</span>
                      <Badge 
                        className={accountInfo?.status === 'active' ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}
                      >
                        {accountInfo?.status || 'Unknown'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Account Type</span>
                      <span className="text-lg font-semibold">{accountInfo?.type || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Current Balance</span>
                      <span className="text-lg font-semibold">${usageStats?.currentBalance?.toFixed(2) || "N/A"}</span>
                    </div>
                    {accountInfo?.isConfigured && (
                      <Alert className="border-blue-200 bg-blue-50">
                        <Shield className="h-4 w-4 text-blue-600" />
                        <AlertDescription className="text-blue-800">
                          Twilio integration is active and working properly.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Twilio Account Information</CardTitle>
              <CardDescription>
                View your Twilio account details and configuration status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoadingAccount ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label>Account SID</Label>
                        <Input
                          value={accountInfo?.sid || "Not configured"}
                          readOnly
                          className="font-mono text-sm bg-gray-50"
                        />
                      </div>
                      <div>
                        <Label>Account Name</Label>
                        <Input
                          value={accountInfo?.friendlyName || "Not configured"}
                          readOnly
                          className="bg-gray-50"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label>Status</Label>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge 
                            className={accountInfo?.status === 'active' ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}
                          >
                            {accountInfo?.status || 'Unknown'}
                          </Badge>
                          {accountInfo?.isConfigured && (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          )}
                        </div>
                      </div>
                      <div>
                        <Label>Account Type</Label>
                        <Input
                          value={accountInfo?.type || "Unknown"}
                          readOnly
                          className="bg-gray-50"
                        />
                      </div>
                    </div>
                  </div>

                  {!accountInfo?.isConfigured && (
                    <Alert className="border-amber-200 bg-amber-50">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-800">
                        <strong>Configuration Required:</strong> Add your Twilio Account SID and Auth Token to the environment variables to enable full functionality.
                        <br />
                        <br />
                        <strong>Required Environment Variables:</strong>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          <li>TWILIO_ACCOUNT_SID</li>
                          <li>TWILIO_AUTH_TOKEN</li>
                          <li>TWILIO_PHONE_NUMBER (optional)</li>
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex justify-end">
                    <Button 
                      onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/twilio/account"] })}
                      variant="outline"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh Account Info
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}