import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Star, MessageCircle, TrendingUp, Calendar, Phone, Mail, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface ReviewRequest {
  id: number;
  projectId: number;
  customerId: number;
  customerName: string;
  customerPhone: string;
  projectName: string;
  status: 'pending' | 'sent' | 'reviewed' | 'expired';
  sentAt?: string;
  reviewedAt?: string;
  rating?: number;
  createdAt: string;
}

interface ReviewAnalytics {
  totalRequests: number;
  sentRequests: number;
  completedReviews: number;
  averageRating: number;
  responseRate: number;
  pendingRequests: number;
  expiredRequests: number;
  monthlyStats: {
    month: string;
    requests: number;
    reviews: number;
    averageRating: number;
  }[];
}

export default function Reviews() {
  const [selectedTab, setSelectedTab] = useState("analytics");

  const { data: analytics, isLoading: analyticsLoading } = useQuery<ReviewAnalytics>({
    queryKey: ['/api/reviews/analytics'],
  });

  const { data: requests, isLoading: requestsLoading } = useQuery<ReviewRequest[]>({
    queryKey: ['/api/reviews/requests'],
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'sent': return 'default';
      case 'reviewed': return 'default';
      case 'expired': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600';
      case 'sent': return 'text-blue-600';
      case 'reviewed': return 'text-green-600';
      case 'expired': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (analyticsLoading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-16 animate-pulse mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-32 animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Review Management</h1>
          <p className="text-muted-foreground">Track and manage customer review requests and responses</p>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.totalRequests || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{analytics?.monthlyStats?.[0]?.requests || 0} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reviews Received</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.completedReviews || 0}</div>
            <p className="text-xs text-muted-foreground">
              {analytics?.responseRate ? `${analytics.responseRate.toFixed(1)}% response rate` : '0% response rate'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.averageRating ? analytics.averageRating.toFixed(1) : '0.0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Out of 5 stars
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.pendingRequests || 0}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting response
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for detailed view */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="requests">All Requests</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Review Activity</CardTitle>
                <CardDescription>Requests sent and reviews received over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics?.monthlyStats?.map((month, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{month.month}</p>
                        <p className="text-sm text-muted-foreground">
                          {month.requests} requests • {month.reviews} reviews
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="font-medium">{month.averageRating.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  )) || (
                    <p className="text-center text-muted-foreground py-8">No data available</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status Breakdown</CardTitle>
                <CardDescription>Current status of all review requests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span>Sent</span>
                    </div>
                    <span className="font-medium">{analytics?.sentRequests || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span>Reviewed</span>
                    </div>
                    <span className="font-medium">{analytics?.completedReviews || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span>Pending</span>
                    </div>
                    <span className="font-medium">{analytics?.pendingRequests || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span>Expired</span>
                    </div>
                    <span className="font-medium">{analytics?.expiredRequests || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle>All Review Requests</CardTitle>
              <CardDescription>Complete history of review requests sent to customers</CardDescription>
            </CardHeader>
            <CardContent>
              {requestsLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent Date</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests?.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{request.customerName}</p>
                            <p className="text-sm text-muted-foreground">{request.customerPhone}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{request.projectName}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(request.status)}>
                            {request.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {request.sentAt ? format(new Date(request.sentAt), 'MMM d, yyyy') : '-'}
                        </TableCell>
                        <TableCell>
                          {request.rating ? (
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 text-yellow-500" />
                              <span>{request.rating}</span>
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm">
                              <Phone className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Mail className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )) || (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No review requests found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Review Requests</CardTitle>
              <CardDescription>Requests that have been sent but not yet reviewed</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Sent Date</TableHead>
                    <TableHead>Days Pending</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests?.filter(r => r.status === 'pending' || r.status === 'sent').map((request) => {
                    const daysPending = request.sentAt 
                      ? Math.floor((new Date().getTime() - new Date(request.sentAt).getTime()) / (1000 * 60 * 60 * 24))
                      : 0;
                    
                    return (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{request.customerName}</p>
                            <p className="text-sm text-muted-foreground">{request.customerPhone}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{request.projectName}</p>
                        </TableCell>
                        <TableCell>
                          {request.sentAt ? format(new Date(request.sentAt), 'MMM d, yyyy') : '-'}
                        </TableCell>
                        <TableCell>
                          <span className={daysPending > 7 ? 'text-orange-600 font-medium' : ''}>
                            {daysPending} days
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm">
                              Resend
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Phone className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  }) || (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No pending requests
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed">
          <Card>
            <CardHeader>
              <CardTitle>Completed Reviews</CardTitle>
              <CardDescription>Reviews that have been submitted by customers</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Review Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests?.filter(r => r.status === 'reviewed').map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{request.customerName}</p>
                          <p className="text-sm text-muted-foreground">{request.customerPhone}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{request.projectName}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`h-4 w-4 ${i < (request.rating || 0) ? 'text-yellow-500 fill-current' : 'text-gray-300'}`} 
                            />
                          ))}
                          <span className="ml-2 font-medium">{request.rating}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {request.reviewedAt ? format(new Date(request.reviewedAt), 'MMM d, yyyy') : '-'}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) || (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No completed reviews yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}