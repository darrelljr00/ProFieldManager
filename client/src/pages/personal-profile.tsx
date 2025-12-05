import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  User, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  Star,
  TrendingUp,
  CheckCircle,
  XCircle,
  FileText
} from "lucide-react";
import { format } from "date-fns";

interface TimeOffRequest {
  id: number;
  employeeId: number;
  startDate: string;
  endDate: string;
  type: string;
  status: string;
  reason?: string;
  createdAt: string;
}

interface PerformanceReview {
  id: number;
  employeeId: number;
  reviewerId: number;
  reviewDate: string;
  rating: number;
  strengths?: string;
  areasForImprovement?: string;
  goals?: string;
  comments?: string;
  createdAt: string;
}

interface DisciplinaryAction {
  id: number;
  employeeId: number;
  type: string;
  date: string;
  description: string;
  actionTaken?: string;
  followUpDate?: string;
  status: string;
  createdAt: string;
}

export default function PersonalProfile() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: timeOffRequests = [], isLoading: loadingTimeOff } = useQuery<TimeOffRequest[]>({
    queryKey: ["/api/my-time-off-requests"],
  });

  const { data: performanceReviews = [], isLoading: loadingReviews } = useQuery<PerformanceReview[]>({
    queryKey: ["/api/my-performance-reviews"],
  });

  const { data: disciplinaryActions = [], isLoading: loadingDisciplinary } = useQuery<DisciplinaryAction[]>({
    queryKey: ["/api/my-disciplinary-actions"],
  });

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved":
        return <Badge className="bg-green-500">{status}</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500">{status}</Badge>;
      case "rejected":
      case "denied":
        return <Badge className="bg-red-500">{status}</Badge>;
      case "resolved":
        return <Badge className="bg-blue-500">{status}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getRatingStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            }`}
          />
        ))}
        <span className="ml-2 text-sm text-muted-foreground">({rating}/5)</span>
      </div>
    );
  };

  const approvedTimeOff = timeOffRequests.filter(r => r.status === "approved").length;
  const pendingTimeOff = timeOffRequests.filter(r => r.status === "pending").length;
  const avgRating = performanceReviews.length > 0 
    ? (performanceReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / performanceReviews.length).toFixed(1)
    : "N/A";

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <User className="h-8 w-8" />
            Personal Profile
          </h1>
          <p className="text-muted-foreground mt-1">
            View your HR records, time off requests, performance reviews, and more
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Off Approved</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedTimeOff}</div>
            <p className="text-xs text-muted-foreground">
              {pendingTimeOff} pending requests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgRating}</div>
            <p className="text-xs text-muted-foreground">
              {performanceReviews.length} reviews
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceReviews.length}</div>
            <p className="text-xs text-muted-foreground">
              Performance evaluations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disciplinary Records</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{disciplinaryActions.length}</div>
            <p className="text-xs text-muted-foreground">
              {disciplinaryActions.filter(d => d.status === "resolved").length} resolved
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">
            <User className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="time-off" data-testid="tab-time-off">
            <Calendar className="h-4 w-4 mr-2" />
            Time Off
          </TabsTrigger>
          <TabsTrigger value="performance" data-testid="tab-performance">
            <Star className="h-4 w-4 mr-2" />
            Performance Reviews
          </TabsTrigger>
          <TabsTrigger value="disciplinary" data-testid="tab-disciplinary">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Disciplinary Actions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Employee Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name:</span>
                  <span className="font-medium">{user?.firstName} {user?.lastName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-medium">{user?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Role:</span>
                  <Badge variant="outline" className="capitalize">{user?.role}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Username:</span>
                  <span className="font-medium">{user?.username}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {timeOffRequests.slice(0, 3).map((request) => (
                    <div key={request.id} className="flex items-center justify-between text-sm">
                      <span>Time Off Request ({request.type})</span>
                      {getStatusBadge(request.status)}
                    </div>
                  ))}
                  {performanceReviews.slice(0, 2).map((review) => (
                    <div key={review.id} className="flex items-center justify-between text-sm">
                      <span>Performance Review</span>
                      <span className="text-muted-foreground">
                        {format(new Date(review.reviewDate), "MMM dd, yyyy")}
                      </span>
                    </div>
                  ))}
                  {timeOffRequests.length === 0 && performanceReviews.length === 0 && (
                    <p className="text-muted-foreground text-sm">No recent activity</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="time-off" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Time Off Requests
              </CardTitle>
              <CardDescription>
                Your time off request history
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingTimeOff ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : timeOffRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No time off requests found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timeOffRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium capitalize">{request.type}</TableCell>
                        <TableCell>{format(new Date(request.startDate), "MMM dd, yyyy")}</TableCell>
                        <TableCell>{format(new Date(request.endDate), "MMM dd, yyyy")}</TableCell>
                        <TableCell className="max-w-xs truncate">{request.reason || "-"}</TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Performance Reviews
              </CardTitle>
              <CardDescription>
                Your performance evaluation history
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingReviews ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : performanceReviews.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No performance reviews found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {performanceReviews.map((review) => (
                    <Card key={review.id} className="border">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="font-medium">
                              Review Date: {format(new Date(review.reviewDate), "MMMM dd, yyyy")}
                            </p>
                          </div>
                          {getRatingStars(review.rating)}
                        </div>
                        
                        {review.strengths && (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-green-600 flex items-center gap-1">
                              <CheckCircle className="h-4 w-4" />
                              Strengths
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">{review.strengths}</p>
                          </div>
                        )}
                        
                        {review.areasForImprovement && (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-orange-600 flex items-center gap-1">
                              <TrendingUp className="h-4 w-4" />
                              Areas for Improvement
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">{review.areasForImprovement}</p>
                          </div>
                        )}
                        
                        {review.goals && (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-blue-600">Goals</p>
                            <p className="text-sm text-muted-foreground mt-1">{review.goals}</p>
                          </div>
                        )}
                        
                        {review.comments && (
                          <div>
                            <p className="text-sm font-medium">Comments</p>
                            <p className="text-sm text-muted-foreground mt-1">{review.comments}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="disciplinary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Disciplinary Actions
              </CardTitle>
              <CardDescription>
                Your disciplinary record history
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingDisciplinary ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : disciplinaryActions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-70" />
                  <p className="text-green-600 font-medium">No disciplinary actions on record</p>
                  <p className="text-sm mt-1">Keep up the good work!</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Action Taken</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {disciplinaryActions.map((action) => (
                      <TableRow key={action.id}>
                        <TableCell>{format(new Date(action.date), "MMM dd, yyyy")}</TableCell>
                        <TableCell className="font-medium capitalize">{action.type}</TableCell>
                        <TableCell className="max-w-xs truncate">{action.description}</TableCell>
                        <TableCell className="max-w-xs truncate">{action.actionTaken || "-"}</TableCell>
                        <TableCell>{getStatusBadge(action.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
