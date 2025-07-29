import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, ArrowLeft, User, Calendar, MapPin, DollarSign } from "lucide-react";
import { format } from "date-fns";

interface DeletedProject {
  id: number;
  name: string;
  description?: string;
  status: string;
  priority: string;
  budget?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  creatorName: string;
  creatorEmail: string;
  createdAt: string;
  updatedAt: string;
  taskCount: number;
  completedTasks: number;
}

export function DeletedJobs() {
  const { data: deletedJobs = [], isLoading } = useQuery<DeletedProject[]>({
    queryKey: ["/api/projects/deleted"],
  });

  const priorityColors = {
    low: "bg-green-100 text-green-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-orange-100 text-orange-800",
    urgent: "bg-red-100 text-red-800",
  };

  const formatCurrency = (amount?: string) => {
    if (!amount) return "Not set";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(parseFloat(amount));
  };

  const formatAddress = (project: DeletedProject) => {
    const parts = [project.address, project.city, project.state, project.zipCode].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "No address set";
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <Link href="/jobs">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Jobs
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Deleted Jobs</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">Jobs that have been moved to deleted folder</p>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-300">Loading deleted jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link href="/jobs">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Jobs
          </Button>
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <Trash2 className="w-8 h-8 text-red-600" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Deleted Jobs</h1>
        </div>
        <p className="text-gray-600 dark:text-gray-300">
          Jobs that have been moved to deleted folder ({deletedJobs.length} jobs)
        </p>
      </div>

      {deletedJobs.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Trash2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Deleted Jobs
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Jobs that are deleted will appear here. You can manage them separately from active jobs.
            </p>
            <Link href="/jobs">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Active Jobs
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {deletedJobs.map((job) => (
            <Card key={job.id} className="hover:shadow-lg transition-shadow border-red-200 dark:border-red-800">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg text-gray-900 dark:text-white">{job.name}</CardTitle>
                  <Badge className={priorityColors[job.priority as keyof typeof priorityColors] || "bg-gray-100 text-gray-800"}>
                    {job.priority.charAt(0).toUpperCase() + job.priority.slice(1)}
                  </Badge>
                </div>
                {job.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                    {job.description}
                  </p>
                )}
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {/* Contact Information */}
                  {job.contactName && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-900 dark:text-white">{job.contactName}</span>
                      {job.contactPhone && (
                        <span className="text-gray-600 dark:text-gray-300">• {job.contactPhone}</span>
                      )}
                    </div>
                  )}

                  {/* Location */}
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600 dark:text-gray-300">{formatAddress(job)}</span>
                  </div>

                  {/* Budget */}
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600 dark:text-gray-300">{formatCurrency(job.budget)}</span>
                  </div>

                  {/* Task Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-300">Tasks</span>
                      <span className="text-gray-900 dark:text-white">
                        {job.completedTasks}/{job.taskCount}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: job.taskCount > 0 ? `${(job.completedTasks / job.taskCount) * 100}%` : "0%",
                        }}
                      />
                    </div>
                  </div>

                  {/* Creator and Dates */}
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-600 dark:text-gray-300">
                        Created by {job.creatorName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-600 dark:text-gray-300">
                        Deleted {format(new Date(job.updatedAt), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}