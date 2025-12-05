import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart3, 
  CheckCircle2, 
  Clock, 
  FileImage, 
  ListTodo,
  TrendingUp,
  Activity,
  Camera,
  PlayCircle,
  StopCircle,
  Calendar
} from "lucide-react";
import { format } from "date-fns";

interface ReportSummary {
  taskStats: {
    total: number;
    completed: number;
    pending: number;
    inProgress: number;
    completionRate: number;
  };
  jobActivity: {
    totalClockIns: number;
    avgHoursPerDay: number;
    recentEntries: any[];
  };
  documentation: {
    totalImages: number;
    imagesThisMonth: number;
  };
}

export default function MyReports() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: reportSummary, isLoading } = useQuery<ReportSummary>({
    queryKey: ["/api/my-reports/summary"],
  });

  const { data: tasks = [] } = useQuery<any[]>({
    queryKey: ["/api/tasks/assigned-to-me"],
  });

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return <Badge className="bg-green-500">Completed</Badge>;
      case "in_progress":
      case "in-progress":
        return <Badge className="bg-blue-500">In Progress</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500">Pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const taskStats = reportSummary?.taskStats || { total: 0, completed: 0, pending: 0, inProgress: 0, completionRate: 0 };
  const jobActivity = reportSummary?.jobActivity || { totalClockIns: 0, avgHoursPerDay: 0, recentEntries: [] };
  const documentation = reportSummary?.documentation || { totalImages: 0, imagesThisMonth: 0 };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            My Reports
          </h1>
          <p className="text-muted-foreground mt-1">
            View your performance analytics, task completion rates, and job documentation
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Task Completion Rate</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{taskStats.completionRate}%</div>
                <Progress value={taskStats.completionRate} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  {taskStats.completed} of {taskStats.total} tasks completed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Clock-Ins</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{jobActivity.totalClockIns}</div>
                <p className="text-xs text-muted-foreground">
                  Avg {jobActivity.avgHoursPerDay} hours/day
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tasks In Progress</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{taskStats.inProgress}</div>
                <p className="text-xs text-muted-foreground">
                  {taskStats.pending} pending
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Documentation</CardTitle>
                <Camera className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{documentation.imagesThisMonth}</div>
                <p className="text-xs text-muted-foreground">
                  Images this month ({documentation.totalImages} total)
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview" data-testid="tab-report-overview">
                <TrendingUp className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="tasks" data-testid="tab-task-completion">
                <ListTodo className="h-4 w-4 mr-2" />
                Task Completion
              </TabsTrigger>
              <TabsTrigger value="job-activity" data-testid="tab-job-activity">
                <Clock className="h-4 w-4 mr-2" />
                Job Start/Stop Activity
              </TabsTrigger>
              <TabsTrigger value="documentation" data-testid="tab-documentation">
                <FileImage className="h-4 w-4 mr-2" />
                Documentation Compliance
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Performance Summary
                    </CardTitle>
                    <CardDescription>
                      Your overall performance metrics
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Task Completion</span>
                        <span className="font-medium">{taskStats.completionRate}%</span>
                      </div>
                      <Progress value={taskStats.completionRate} />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 pt-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{taskStats.completed}</div>
                        <div className="text-xs text-muted-foreground">Completed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{taskStats.inProgress}</div>
                        <div className="text-xs text-muted-foreground">In Progress</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">{taskStats.pending}</div>
                        <div className="text-xs text-muted-foreground">Pending</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Work Hours Summary
                    </CardTitle>
                    <CardDescription>
                      Your time tracking overview
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Total Clock-Ins:</span>
                      <span className="text-2xl font-bold">{jobActivity.totalClockIns}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Avg Hours/Day:</span>
                      <span className="text-2xl font-bold">{jobActivity.avgHoursPerDay}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Documentation Uploads:</span>
                      <span className="text-2xl font-bold">{documentation.totalImages}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="tasks" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ListTodo className="h-5 w-5" />
                    Task Completion Rates
                  </CardTitle>
                  <CardDescription>
                    Your assigned tasks and their completion status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {tasks.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ListTodo className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No tasks assigned</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Task</TableHead>
                          <TableHead>Project</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tasks.slice(0, 20).map((task: any) => (
                          <TableRow key={task.id}>
                            <TableCell className="font-medium">{task.title}</TableCell>
                            <TableCell>{task.projectName || "-"}</TableCell>
                            <TableCell>
                              {task.dueDate ? format(new Date(task.dueDate), "MMM dd, yyyy") : "-"}
                            </TableCell>
                            <TableCell>{getStatusBadge(task.status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="job-activity" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Job Start/Stop Activity
                  </CardTitle>
                  <CardDescription>
                    Your clock-in and clock-out history
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {jobActivity.recentEntries.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No clock entries found</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Clock In</TableHead>
                          <TableHead>Clock Out</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {jobActivity.recentEntries.map((entry: any) => {
                          const clockIn = new Date(entry.clockInTime);
                          const clockOut = entry.clockOutTime ? new Date(entry.clockOutTime) : null;
                          const duration = clockOut 
                            ? ((clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60)).toFixed(1) 
                            : "-";
                          
                          return (
                            <TableRow key={entry.id}>
                              <TableCell className="font-medium">
                                {format(clockIn, "MMM dd, yyyy")}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <PlayCircle className="h-4 w-4 text-green-500" />
                                  {format(clockIn, "hh:mm a")}
                                </div>
                              </TableCell>
                              <TableCell>
                                {clockOut ? (
                                  <div className="flex items-center gap-1">
                                    <StopCircle className="h-4 w-4 text-red-500" />
                                    {format(clockOut, "hh:mm a")}
                                  </div>
                                ) : (
                                  <Badge variant="outline">Active</Badge>
                                )}
                              </TableCell>
                              <TableCell>{duration !== "-" ? `${duration} hrs` : "-"}</TableCell>
                              <TableCell>
                                {entry.status === "clocked_in" ? (
                                  <Badge className="bg-green-500">Clocked In</Badge>
                                ) : (
                                  <Badge variant="secondary">Completed</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documentation" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileImage className="h-5 w-5" />
                    Job Documentation Compliance
                  </CardTitle>
                  <CardDescription>
                    Your photo documentation and job image uploads
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="p-6 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                          <Camera className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{documentation.totalImages}</p>
                          <p className="text-sm text-muted-foreground">Total Images Uploaded</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-6 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-500/10 rounded-full">
                          <Calendar className="h-6 w-6 text-green-500" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{documentation.imagesThisMonth}</p>
                          <p className="text-sm text-muted-foreground">Images This Month</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">Documentation Tips</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Take before and after photos for each job</li>
                      <li>• Document any issues or damage found</li>
                      <li>• Capture equipment and materials used</li>
                      <li>• Upload photos promptly for better compliance</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
