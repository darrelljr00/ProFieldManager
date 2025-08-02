import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  Download,
  Search,
  Calendar,
  User,
  FileSpreadsheet,
  Eye,
} from "lucide-react";

interface FormSubmission {
  id: number;
  submissionData: Record<string, any>;
  submittedBy?: number;
  submittedByName?: string;
  ipAddress?: string;
  submittedAt: string;
}

interface CustomForm {
  id: number;
  name: string;
  formData: {
    fields: Array<{
      id: string;
      label: string;
      type: string;
    }>;
  };
  submissionCount: number;
}

interface FormSubmissionsProps {
  form: CustomForm;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FormSubmissions({ form, open, onOpenChange }: FormSubmissionsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);
  const [isViewingSubmission, setIsViewingSubmission] = useState(false);
  const [dateFilter, setDateFilter] = useState<string>("all");

  // Fetch form submissions
  const submissionsQuery = useQuery({
    queryKey: ['/api/form-submissions', form.id],
    enabled: open,
  });

  const submissions = (submissionsQuery.data as FormSubmission[]) || [];

  // Filter submissions based on search and date
  const filteredSubmissions = submissions.filter(submission => {
    const matchesSearch = searchTerm === "" || 
      Object.values(submission.submissionData).some(value => 
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      ) ||
      (submission.submittedByName && submission.submittedByName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesDate = dateFilter === "all" || (() => {
      const submissionDate = new Date(submission.submittedAt);
      const now = new Date();
      
      switch (dateFilter) {
        case "today":
          return submissionDate.toDateString() === now.toDateString();
        case "week":
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return submissionDate >= weekAgo;
        case "month":
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return submissionDate >= monthAgo;
        default:
          return true;
      }
    })();

    return matchesSearch && matchesDate;
  });

  const handleExportCSV = () => {
    if (submissions.length === 0) return;

    // Create CSV headers
    const headers = ['Submission ID', 'Submitted At', 'Submitted By', 'IP Address'];
    form.formData.fields.forEach(field => {
      headers.push(field.label);
    });

    // Create CSV rows
    const rows = filteredSubmissions.map(submission => {
      const row = [
        submission.id,
        new Date(submission.submittedAt).toLocaleString(),
        submission.submittedByName || 'Anonymous',
        submission.ipAddress || 'Unknown'
      ];
      
      form.formData.fields.forEach(field => {
        const value = submission.submissionData[field.id];
        if (Array.isArray(value)) {
          row.push(value.join(', '));
        } else {
          row.push(String(value || ''));
        }
      });
      
      return row;
    });

    // Create CSV content
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${form.name}-submissions.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderFieldValue = (field: any, value: any) => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-muted-foreground">-</span>;
    }

    if (Array.isArray(value)) {
      return value.join(', ');
    }

    if (field.type === 'date' && value) {
      return new Date(value).toLocaleDateString();
    }

    return String(value);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-7xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Form Submissions: {form.name}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{submissions.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">This Week</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {submissions.filter(s => {
                    const submissionDate = new Date(s.submittedAt);
                    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                    return submissionDate >= weekAgo;
                  }).length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Anonymous</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {submissions.filter(s => !s.submittedBy).length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Registered Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {submissions.filter(s => s.submittedBy).length}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2 flex-1">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search submissions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={handleExportCSV}
              disabled={filteredSubmissions.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>

          <div className="flex-1 overflow-hidden">
            {submissionsQuery.isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="text-center py-12">
                <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No submissions yet</h3>
                <p className="text-muted-foreground">
                  {submissions.length === 0 
                    ? "This form hasn't received any submissions yet."
                    : "No submissions match your current filters."
                  }
                </p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">ID</TableHead>
                        <TableHead className="w-40">Submitted</TableHead>
                        <TableHead className="w-32">User</TableHead>
                        {form.formData.fields.slice(0, 4).map((field) => (
                          <TableHead key={field.id} className="min-w-32">
                            {field.label}
                          </TableHead>
                        ))}
                        <TableHead className="w-20">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSubmissions.map((submission) => (
                        <TableRow key={submission.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">#{submission.id}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                {new Date(submission.submittedAt).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(submission.submittedAt).toLocaleTimeString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                {submission.submittedByName || 'Anonymous'}
                              </span>
                            </div>
                            {submission.ipAddress && (
                              <div className="text-xs text-muted-foreground">
                                {submission.ipAddress}
                              </div>
                            )}
                          </TableCell>
                          {form.formData.fields.slice(0, 4).map((field) => (
                            <TableCell key={field.id} className="max-w-32 truncate">
                              {renderFieldValue(field, submission.submissionData[field.id])}
                            </TableCell>
                          ))}
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedSubmission(submission);
                                setIsViewingSubmission(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Submission Detail Dialog */}
      {selectedSubmission && (
        <Dialog open={isViewingSubmission} onOpenChange={setIsViewingSubmission}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Submission Details #{selectedSubmission.id}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label>Submitted At</Label>
                  <div className="font-medium">
                    {new Date(selectedSubmission.submittedAt).toLocaleString()}
                  </div>
                </div>
                <div>
                  <Label>Submitted By</Label>
                  <div className="font-medium">
                    {selectedSubmission.submittedByName || 'Anonymous'}
                  </div>
                </div>
                {selectedSubmission.ipAddress && (
                  <div>
                    <Label>IP Address</Label>
                    <div className="font-medium">{selectedSubmission.ipAddress}</div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <Label className="text-base font-medium">Form Data</Label>
                {form.formData.fields.map((field) => (
                  <div key={field.id} className="space-y-2">
                    <Label className="text-sm font-medium">{field.label}</Label>
                    <div className="p-3 bg-gray-50 rounded border min-h-[40px] flex items-center">
                      {renderFieldValue(field, selectedSubmission.submissionData[field.id])}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}