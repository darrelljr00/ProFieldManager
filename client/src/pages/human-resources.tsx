import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Users, 
  UserPlus, 
  Calendar, 
  Clock, 
  Award, 
  FileText, 
  DollarSign, 
  TrendingUp, 
  BookOpen,
  Building2,
  Mail,
  Phone,
  MapPin,
  Edit,
  Trash2,
  Download,
  Plus,
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Shield,
  Upload,
  Paperclip
} from "lucide-react";

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  position: string;
  department: string;
  hireDate: string;
  salary?: number;
  status: "active" | "inactive" | "on_leave";
  manager?: string;
  location?: string;
  profileImage?: string;
}

interface TimeOffRequest {
  id: number;
  employeeId: number;
  employeeName: string;
  type: "vacation" | "sick" | "personal" | "other";
  startDate: string;
  endDate: string;
  days: number;
  status: "pending" | "approved" | "rejected";
  reason?: string;
  requestedAt: string;
}

interface PerformanceReview {
  id: number;
  employeeId: number;
  employeeName: string;
  reviewPeriod: string;
  overallRating: number;
  goals: string[];
  feedback: string;
  reviewDate: string;
  reviewerId: number;
  reviewerName: string;
  status: "draft" | "completed" | "pending_employee_review";
}

interface Department {
  id: number;
  organizationId: number;
  name: string;
  description?: string;
  managerId?: number;
  budget?: number;
  location?: string;
  createdAt: string;
  updatedAt: string;
}

interface DisciplinaryAction {
  id: number;
  employeeId: number;
  employeeName: string;
  employeePosition: string;
  type: "verbal_warning" | "written_warning" | "suspension" | "termination" | "counseling";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  incident: string;
  actionTaken: string;
  followUpRequired: boolean;
  followUpDate?: string;
  issuedBy: string;
  witnessName?: string;
  dateIssued: string;
  status: "active" | "resolved" | "appealed" | "overturned";
  appealNotes?: string;
  resolutionNotes?: string;
  documentUrl?: string;
  documentName?: string;
}

// Mock data for demonstration
const mockEmployees: Employee[] = [
  {
    id: 1,
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@company.com",
    phone: "+1 (555) 123-4567",
    position: "Senior Developer",
    department: "Engineering",
    hireDate: "2022-01-15",
    salary: 95000,
    status: "active",
    manager: "Jane Smith",
    location: "New York, NY"
  },
  {
    id: 2,
    firstName: "Sarah",
    lastName: "Johnson",
    email: "sarah.johnson@company.com",
    phone: "+1 (555) 234-5678",
    position: "Project Manager",
    department: "Operations",
    hireDate: "2021-08-22",
    salary: 85000,
    status: "active",
    manager: "Mike Wilson",
    location: "Los Angeles, CA"
  },
  {
    id: 3,
    firstName: "Mike",
    lastName: "Chen",
    email: "mike.chen@company.com",
    phone: "+1 (555) 345-6789",
    position: "UX Designer",
    department: "Design",
    hireDate: "2023-03-10",
    salary: 78000,
    status: "on_leave",
    manager: "Lisa Brown",
    location: "Austin, TX"
  }
];

const mockTimeOffRequests: TimeOffRequest[] = [
  {
    id: 1,
    employeeId: 1,
    employeeName: "John Doe",
    type: "vacation",
    startDate: "2025-01-20",
    endDate: "2025-01-24",
    days: 5,
    status: "pending",
    reason: "Family vacation",
    requestedAt: "2025-01-10"
  },
  {
    id: 2,
    employeeId: 2,
    employeeName: "Sarah Johnson",
    type: "sick",
    startDate: "2025-01-15",
    endDate: "2025-01-16",
    days: 2,
    status: "approved",
    reason: "Medical appointment",
    requestedAt: "2025-01-14"
  }
];

const mockPerformanceReviews: PerformanceReview[] = [
  {
    id: 1,
    employeeId: 1,
    employeeName: "John Doe",
    reviewPeriod: "Q4 2024",
    overallRating: 4.5,
    goals: ["Complete React migration", "Mentor junior developers", "Improve code quality"],
    feedback: "Excellent performance with strong technical leadership",
    reviewDate: "2024-12-15",
    reviewerId: 4,
    reviewerName: "Jane Smith",
    status: "completed"
  }
];

const mockDisciplinaryActions: DisciplinaryAction[] = [
  {
    id: 1,
    employeeId: 1,
    employeeName: "John Doe",
    employeePosition: "Senior Developer",
    type: "verbal_warning",
    severity: "medium",
    description: "Tardiness and attendance issues",
    incident: "Employee was late to work 5 times in the past month without prior notification",
    actionTaken: "Verbal warning issued and discussion about punctuality expectations",
    followUpRequired: true,
    followUpDate: "2024-02-15",
    issuedBy: "Jane Smith",
    witnessName: "Mike Wilson",
    dateIssued: "2024-01-15",
    status: "active"
  },
  {
    id: 2,
    employeeId: 3,
    employeeName: "Mike Wilson",
    employeePosition: "Marketing Director",
    type: "written_warning",
    severity: "high",
    description: "Inappropriate workplace behavior",
    incident: "Reported for unprofessional conduct during team meeting",
    actionTaken: "Written warning issued, mandatory sensitivity training scheduled",
    followUpRequired: true,
    followUpDate: "2024-03-01",
    issuedBy: "HR Department",
    witnessName: "Sarah Johnson",
    dateIssued: "2024-01-20",
    status: "active",
    documentUrl: "/uploads/disciplinary-writeup-2.pdf",
    documentName: "Written Warning - Mike Wilson.pdf"
  },
  {
    id: 3,
    employeeId: 2,
    employeeName: "Sarah Johnson",
    employeePosition: "Project Manager",
    type: "counseling",
    severity: "low",
    description: "Performance improvement discussion",
    incident: "Project deadlines missed on multiple occasions",
    actionTaken: "Counseling session to discuss workload management and support needed",
    followUpRequired: true,
    followUpDate: "2024-02-20",
    issuedBy: "Mike Wilson",
    dateIssued: "2024-01-10",
    status: "resolved",
    resolutionNotes: "Employee showed significant improvement after additional training",
    documentUrl: "/uploads/disciplinary-writeup-3.pdf",
    documentName: "Performance Counseling - Sarah Johnson.pdf"
  }
];

export default function HumanResources() {
  const [selectedTab, setSelectedTab] = useState("employees");
  const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false);
  const [departmentDialogOpen, setDepartmentDialogOpen] = useState(false);
  const [timeOffDialogOpen, setTimeOffDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [disciplinaryDialogOpen, setDisciplinaryDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showUserSync, setShowUserSync] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const { toast } = useToast();

  // Real API queries
  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ["/api/employees"],
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users"],
  });

  const { data: timeOffRequests = [], isLoading: timeOffLoading } = useQuery({
    queryKey: ["/api/time-off-requests"],
  });

  const { data: performanceReviews = [], isLoading: reviewsLoading } = useQuery({
    queryKey: ["/api/performance-reviews"],
  });

  const { data: disciplinaryActions = [], isLoading: disciplinaryLoading } = useQuery({
    queryKey: ["/api/disciplinary-actions"],
  });

  const { data: departments = [], isLoading: departmentsLoading } = useQuery({
    queryKey: ["/api/departments"],
  });

  // Helper function to get users that aren't already employees
  const availableUsers = users.filter(user => 
    !employees.some(emp => emp.userId === user.id)
  );

  // Function to handle user sync
  const handleUserSync = (userId: string) => {
    const user = users.find(u => u.id === parseInt(userId));
    if (user) {
      // Pre-fill form with user data
      const form = document.forms.namedItem('addEmployeeForm') as HTMLFormElement;
      if (form) {
        (form.elements.namedItem('firstName') as HTMLInputElement).value = user.firstName || '';
        (form.elements.namedItem('lastName') as HTMLInputElement).value = user.lastName || '';
        (form.elements.namedItem('email') as HTMLInputElement).value = user.email;
        (form.elements.namedItem('phone') as HTMLInputElement).value = user.phone || '';
      }
    }
  };

  // Mutations for employee management
  const createEmployeeMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/employees", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      setEmployeeDialogOpen(false);
      setShowUserSync(false);
      setSelectedUserId("");
      toast({
        title: "Success",
        description: "Employee created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create employee",
        variant: "destructive",
      });
    },
  });

  const createTimeOffMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/time-off-requests", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-off-requests"] });
      setTimeOffDialogOpen(false);
      toast({
        title: "Success",
        description: "Time off request submitted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit time off request",
        variant: "destructive",
      });
    },
  });

  const createPerformanceReviewMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/performance-reviews", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/performance-reviews"] });
      setReviewDialogOpen(false);
      toast({
        title: "Success",
        description: "Performance review created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create performance review",
        variant: "destructive",
      });
    },
  });

  const createDisciplinaryMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/disciplinary-actions", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/disciplinary-actions"] });
      setDisciplinaryDialogOpen(false);
      toast({
        title: "Success",
        description: "Disciplinary action created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create disciplinary action",
        variant: "destructive",
      });
    },
  });

  const createDepartmentMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/departments", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      setDepartmentDialogOpen(false);
      toast({
        title: "Success",
        description: "Department created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create department",
        variant: "destructive",
      });
    },
  });

  const deleteDepartmentMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/departments/${id}`, {
      method: "DELETE",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      toast({
        title: "Success",
        description: "Department deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete department",
        variant: "destructive",
      });
    },
  });

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = searchTerm === "" || 
      `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.position.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = departmentFilter === "all" || employee.department === departmentFilter;
    const matchesStatus = statusFilter === "all" || employee.status === statusFilter;
    
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "inactive": return "bg-red-100 text-red-800";
      case "on_leave": return "bg-yellow-100 text-yellow-800";
      case "pending": return "bg-blue-100 text-blue-800";
      case "approved": return "bg-green-100 text-green-800";
      case "rejected": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const departmentList = Array.from(new Set(employees.map(emp => emp.department)));
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(emp => emp.status === "active").length;
  const onLeaveEmployees = employees.filter(emp => emp.status === "on_leave").length;
  const pendingTimeOff = timeOffRequests.filter(req => req.status === "pending").length;
  const activeDisciplinaryActions = disciplinaryActions.filter(action => action.status === "active").length;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast({
          title: "Invalid file type",
          description: "Please select a PDF file",
          variant: "destructive"
        });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 10MB",
          variant: "destructive"
        });
        return;
      }
      setUploadedFile(file);
    }
  };

  const handleDisciplinarySubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    try {
      setIsUploading(true);
      
      let documentUrl = '';
      let documentName = '';
      
      // Upload document if provided
      if (uploadedFile) {
        const uploadFormData = new FormData();
        uploadFormData.append('document', uploadedFile);
        
        const uploadResponse = await fetch('/api/disciplinary/upload', {
          method: 'POST',
          body: uploadFormData
        });
        
        if (!uploadResponse.ok) {
          throw new Error('Failed to upload document');
        }
        
        const uploadResult = await uploadResponse.json();
        documentUrl = uploadResult.documentUrl;
        documentName = uploadResult.documentName;
      }
      
      // Create disciplinary action record (this would typically save to database)
      const disciplinaryData = {
        employeeId: parseInt(formData.get('employeeId') as string),
        type: formData.get('type') as string,
        severity: formData.get('severity') as string,
        description: formData.get('description') as string,
        incident: formData.get('incident') as string,
        actionTaken: formData.get('actionTaken') as string,
        issuedBy: formData.get('issuedBy') as string,
        witnessName: formData.get('witnessName') as string,
        followUpDate: formData.get('followUpDate') as string,
        documentUrl,
        documentName
      };
      
      toast({
        title: "Disciplinary action created",
        description: "The disciplinary action has been documented successfully"
      });
      
      setDisciplinaryDialogOpen(false);
      setUploadedFile(null);
      
    } catch (error) {
      console.error('Error creating disciplinary action:', error);
      toast({
        title: "Error",
        description: "Failed to create disciplinary action",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Human Resources</h1>
        <p className="text-gray-600">Manage employees, time off, and performance reviews</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Employees</p>
                <p className="text-2xl font-bold">{totalEmployees}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold">{activeEmployees}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">On Leave</p>
                <p className="text-2xl font-bold">{onLeaveEmployees}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Requests</p>
                <p className="text-2xl font-bold">{pendingTimeOff}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Disciplinary</p>
                <p className="text-2xl font-bold">{activeDisciplinaryActions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="timeoff">Time Off</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="disciplinary">Disciplinary</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Employee Directory</CardTitle>
                  <CardDescription>Manage your team members and their information</CardDescription>
                </div>
                <Dialog open={employeeDialogOpen} onOpenChange={setEmployeeDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add Employee
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add New Employee</DialogTitle>
                      <DialogDescription>
                        Add a new team member to your organization
                      </DialogDescription>
                    </DialogHeader>
                    
                    {/* User Sync Option */}
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center space-x-2 mb-3">
                        <Checkbox
                          id="syncWithUser"
                          checked={showUserSync}
                          onCheckedChange={setShowUserSync}
                        />
                        <Label htmlFor="syncWithUser" className="text-sm font-medium">
                          Sync with existing user profile
                        </Label>
                      </div>
                      
                      {showUserSync && (
                        <div>
                          <Label htmlFor="userSelect" className="text-sm">Select User</Label>
                          <Select value={selectedUserId} onValueChange={(value) => {
                            setSelectedUserId(value);
                            handleUserSync(value);
                          }}>
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Choose a user to sync with..." />
                            </SelectTrigger>
                            <SelectContent>
                              {availableUsers.map((user) => (
                                <SelectItem key={user.id} value={user.id.toString()}>
                                  {user.firstName} {user.lastName} ({user.email})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {availableUsers.length === 0 && (
                            <p className="text-sm text-gray-500 mt-1">
                              All users already have employee records
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <form name="addEmployeeForm" className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="firstName">First Name</Label>
                          <Input id="firstName" name="firstName" required />
                        </div>
                        <div>
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input id="lastName" name="lastName" required />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="email">Email</Label>
                          <Input id="email" name="email" type="email" required />
                        </div>
                        <div>
                          <Label htmlFor="phone">Phone</Label>
                          <Input id="phone" name="phone" type="tel" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="position">Position</Label>
                          <Input id="position" name="position" required />
                        </div>
                        <div>
                          <Label htmlFor="department">Department</Label>
                          <Select name="department">
                            <SelectTrigger>
                              <SelectValue placeholder="Select department" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Engineering">Engineering</SelectItem>
                              <SelectItem value="Operations">Operations</SelectItem>
                              <SelectItem value="Design">Design</SelectItem>
                              <SelectItem value="Sales">Sales</SelectItem>
                              <SelectItem value="Marketing">Marketing</SelectItem>
                              <SelectItem value="HR">Human Resources</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="hireDate">Hire Date</Label>
                          <Input id="hireDate" name="hireDate" type="date" required />
                        </div>
                        <div>
                          <Label htmlFor="salary">Salary</Label>
                          <Input id="salary" name="salary" type="number" />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="location">Location</Label>
                        <Input id="location" name="location" />
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full"
                        onClick={(e) => {
                          e.preventDefault();
                          const form = e.currentTarget.closest('form') as HTMLFormElement;
                          const formData = new FormData(form);
                          
                          const employeeData = {
                            firstName: formData.get('firstName'),
                            lastName: formData.get('lastName'),
                            email: formData.get('email'),
                            phone: formData.get('phone'),
                            position: formData.get('position'),
                            department: formData.get('department'),
                            hireDate: formData.get('hireDate'),
                            salary: formData.get('salary') ? parseFloat(formData.get('salary') as string) : null,
                            location: formData.get('location'),
                            ...(showUserSync && selectedUserId && { userId: parseInt(selectedUserId) })
                          };
                          
                          createEmployeeMutation.mutate(employeeData);
                        }}
                        disabled={createEmployeeMutation.isPending}
                      >
                        {createEmployeeMutation.isPending ? 'Adding...' : 'Add Employee'}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <Label htmlFor="search">Search</Label>
                  <Input
                    id="search"
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="department-filter">Department</Label>
                  <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departmentList.map((dept) => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status-filter">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="on_leave">On Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Employee Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Hire Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeesLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        Loading employees...
                      </TableCell>
                    </TableRow>
                  ) : filteredEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        No employees found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEmployees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarImage src={employee.profileImage} />
                            <AvatarFallback>
                              {employee.firstName[0]}{employee.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{employee.firstName} {employee.lastName}</div>
                            <div className="text-sm text-gray-500">{employee.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{employee.position}</TableCell>
                      <TableCell>{employee.department}</TableCell>
                      <TableCell>{new Date(employee.hireDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(employee.status)}>
                          {employee.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departments" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Department Management</CardTitle>
                  <CardDescription>Manage your organization's departments and structure</CardDescription>
                </div>
                <Dialog open={departmentDialogOpen} onOpenChange={setDepartmentDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Department
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add New Department</DialogTitle>
                      <DialogDescription>
                        Create a new department to organize your team structure.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.target as HTMLFormElement);
                      createDepartmentMutation.mutate({
                        name: formData.get('name'),
                        description: formData.get('description'),
                        managerId: formData.get('managerId') ? parseInt(formData.get('managerId') as string) : null,
                        budget: formData.get('budget') ? parseFloat(formData.get('budget') as string) : null,
                        location: formData.get('location'),
                      });
                    }} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Department Name *</Label>
                        <Input id="name" name="name" placeholder="e.g., Engineering, Sales, Marketing" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" name="description" placeholder="Brief description of the department" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="managerId">Department Manager</Label>
                        <Select name="managerId">
                          <SelectTrigger>
                            <SelectValue placeholder="Select manager (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            {employees.map(employee => (
                              <SelectItem key={employee.id} value={employee.id.toString()}>
                                {employee.firstName} {employee.lastName} - {employee.position}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="budget">Annual Budget</Label>
                        <Input id="budget" name="budget" type="number" placeholder="e.g., 500000" step="0.01" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <Input id="location" name="location" placeholder="e.g., Building A, Floor 2" />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setDepartmentDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createDepartmentMutation.isPending}>
                          {createDepartmentMutation.isPending ? "Creating..." : "Create Department"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {departmentsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="text-gray-500">Loading departments...</div>
                </div>
              ) : departments.length === 0 ? (
                <div className="text-center py-8">
                  <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">No departments created yet</p>
                  <Button onClick={() => setDepartmentDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Department
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {departments.map((department: Department) => (
                    <Card key={department.id} className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-lg">{department.name}</h3>
                          {department.description && (
                            <p className="text-sm text-gray-600 mt-1">{department.description}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteDepartmentMutation.mutate(department.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-2 text-sm">
                        {department.managerId && (
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span>Manager: {employees.find(emp => emp.id === department.managerId)?.firstName} {employees.find(emp => emp.id === department.managerId)?.lastName}</span>
                          </div>
                        )}
                        {department.location && (
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span>{department.location}</span>
                          </div>
                        )}
                        {department.budget && (
                          <div className="flex items-center space-x-2">
                            <DollarSign className="h-4 w-4 text-gray-400" />
                            <span>Budget: ${department.budget.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span>Employees: {employees.filter(emp => emp.departmentId === department.id).length}</span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeoff" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Time Off Requests</CardTitle>
                  <CardDescription>Manage employee vacation and time off requests</CardDescription>
                </div>
                <Dialog open={timeOffDialogOpen} onOpenChange={setTimeOffDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      New Request
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Submit Time Off Request</DialogTitle>
                      <DialogDescription>
                        Request time off for vacation, sick leave, or personal days
                      </DialogDescription>
                    </DialogHeader>
                    <form className="space-y-4">
                      <div>
                        <Label htmlFor="employee">Employee</Label>
                        <Select name="employee">
                          <SelectTrigger>
                            <SelectValue placeholder="Select employee" />
                          </SelectTrigger>
                          <SelectContent>
                            {employees.map((emp) => (
                              <SelectItem key={emp.id} value={emp.id.toString()}>
                                {emp.firstName} {emp.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="type">Type</Label>
                        <Select name="type">
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="vacation">Vacation</SelectItem>
                            <SelectItem value="sick">Sick Leave</SelectItem>
                            <SelectItem value="personal">Personal</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="startDate">Start Date</Label>
                          <Input id="startDate" name="startDate" type="date" required />
                        </div>
                        <div>
                          <Label htmlFor="endDate">End Date</Label>
                          <Input id="endDate" name="endDate" type="date" required />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="reason">Reason</Label>
                        <Textarea id="reason" name="reason" rows={3} />
                      </div>
                      <Button type="submit" className="w-full">
                        Submit Request
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeOffRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>{request.employeeName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {request.type.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{request.days} days</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(request.status)}>
                          {request.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {request.status === "pending" && (
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" className="text-green-600">
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" className="text-red-600">
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Performance Reviews</CardTitle>
                  <CardDescription>Track and manage employee performance evaluations</CardDescription>
                </div>
                <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Award className="mr-2 h-4 w-4" />
                      New Review
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Create Performance Review</DialogTitle>
                      <DialogDescription>
                        Conduct a performance evaluation for an employee
                      </DialogDescription>
                    </DialogHeader>
                    <form className="space-y-4">
                      <div>
                        <Label htmlFor="reviewEmployee">Employee</Label>
                        <Select name="reviewEmployee">
                          <SelectTrigger>
                            <SelectValue placeholder="Select employee" />
                          </SelectTrigger>
                          <SelectContent>
                            {employees.map((emp) => (
                              <SelectItem key={emp.id} value={emp.id.toString()}>
                                {emp.firstName} {emp.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="reviewPeriod">Review Period</Label>
                          <Input id="reviewPeriod" name="reviewPeriod" placeholder="Q1 2025" />
                        </div>
                        <div>
                          <Label htmlFor="overallRating">Overall Rating (1-5)</Label>
                          <Input id="overallRating" name="overallRating" type="number" min="1" max="5" step="0.1" />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="goals">Goals & Objectives</Label>
                        <Textarea id="goals" name="goals" rows={3} placeholder="List key goals and objectives..." />
                      </div>
                      <div>
                        <Label htmlFor="feedback">Feedback & Comments</Label>
                        <Textarea id="feedback" name="feedback" rows={4} placeholder="Provide detailed feedback..." />
                      </div>
                      <Button type="submit" className="w-full">
                        Create Review
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Review Date</TableHead>
                    <TableHead>Reviewer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {performanceReviews.map((review) => (
                    <TableRow key={review.id}>
                      <TableCell>{review.employeeName}</TableCell>
                      <TableCell>{review.reviewPeriod}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{review.overallRating}/5</span>
                          <Progress value={review.overallRating * 20} className="w-16" />
                        </div>
                      </TableCell>
                      <TableCell>{new Date(review.reviewDate).toLocaleDateString()}</TableCell>
                      <TableCell>{review.reviewerName}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(review.status)}>
                          {review.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>HR Reports & Analytics</CardTitle>
              <CardDescription>Generate insights and reports on your workforce</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Department Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {departmentList.map((dept) => {
                        const count = employees.filter(emp => emp.department === dept).length;
                        const percentage = (count / totalEmployees) * 100;
                        return (
                          <div key={dept} className="flex items-center justify-between">
                            <span className="text-sm font-medium">{dept}</span>
                            <div className="flex items-center space-x-2">
                              <Progress value={percentage} className="w-20" />
                              <span className="text-sm text-gray-500">{count}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Hires</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {employees
                        .sort((a, b) => new Date(b.hireDate).getTime() - new Date(a.hireDate).getTime())
                        .slice(0, 5)
                        .map((emp) => (
                          <div key={emp.id} className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-sm">{emp.firstName} {emp.lastName}</div>
                              <div className="text-xs text-gray-500">{emp.position}</div>
                            </div>
                            <div className="text-sm text-gray-500">
                              {new Date(emp.hireDate).toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-6 flex space-x-4">
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Export Employee List
                </Button>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Time Off Report
                </Button>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Performance Summary
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="disciplinary" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Disciplinary Actions</CardTitle>
                  <CardDescription>Track and manage employee disciplinary actions and proceedings</CardDescription>
                </div>
                <Dialog open={disciplinaryDialogOpen} onOpenChange={setDisciplinaryDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      New Disciplinary Action
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create Disciplinary Action</DialogTitle>
                      <DialogDescription>
                        Document a new disciplinary action for an employee
                      </DialogDescription>
                    </DialogHeader>
                    <form className="space-y-4" onSubmit={handleDisciplinarySubmit}>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="employeeSelect">Employee</Label>
                          <Select name="employeeId">
                            <SelectTrigger>
                              <SelectValue placeholder="Select employee" />
                            </SelectTrigger>
                            <SelectContent>
                              {employees.map((emp) => (
                                <SelectItem key={emp.id} value={emp.id.toString()}>
                                  {emp.firstName} {emp.lastName} - {emp.position}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="actionType">Action Type</Label>
                          <Select name="type">
                            <SelectTrigger>
                              <SelectValue placeholder="Select action type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="verbal_warning">Verbal Warning</SelectItem>
                              <SelectItem value="written_warning">Written Warning</SelectItem>
                              <SelectItem value="suspension">Suspension</SelectItem>
                              <SelectItem value="termination">Termination</SelectItem>
                              <SelectItem value="counseling">Counseling</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="severity">Severity Level</Label>
                          <Select name="severity">
                            <SelectTrigger>
                              <SelectValue placeholder="Select severity" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="critical">Critical</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="issuedBy">Issued By</Label>
                          <Input id="issuedBy" name="issuedBy" placeholder="Manager/HR Name" required />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Input id="description" name="description" placeholder="Brief description of the action" required />
                      </div>

                      <div>
                        <Label htmlFor="incident">Incident Details</Label>
                        <Textarea id="incident" name="incident" placeholder="Detailed description of the incident that led to this action" rows={3} required />
                      </div>

                      <div>
                        <Label htmlFor="actionTaken">Action Taken</Label>
                        <Textarea id="actionTaken" name="actionTaken" placeholder="Describe the specific disciplinary action taken" rows={3} required />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="witnessName">Witness (Optional)</Label>
                          <Input id="witnessName" name="witnessName" placeholder="Name of witness if applicable" />
                        </div>
                        <div>
                          <Label htmlFor="followUpDate">Follow-up Date</Label>
                          <Input id="followUpDate" name="followUpDate" type="date" />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="document">Upload Disciplinary Document (PDF)</Label>
                        <div className="mt-2">
                          {uploadedFile ? (
                            <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <Paperclip className="h-5 w-5 text-gray-500 mr-2" />
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">{uploadedFile.name}</p>
                                    <p className="text-xs text-gray-500">{Math.round(uploadedFile.size / 1024)} KB</p>
                                  </div>
                                </div>
                                <Button 
                                  type="button" 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => setUploadedFile(null)}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                              <Upload className="mx-auto h-12 w-12 text-gray-400" />
                              <div className="mt-4">
                                <label htmlFor="document" className="cursor-pointer">
                                  <span className="mt-2 block text-sm font-medium text-gray-900">
                                    Upload a PDF file
                                  </span>
                                  <span className="mt-1 block text-sm text-gray-500">
                                    PDF up to 10MB
                                  </span>
                                </label>
                                <input
                                  id="document"
                                  name="document"
                                  type="file"
                                  accept=".pdf"
                                  onChange={handleFileChange}
                                  className="sr-only"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-end space-x-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setDisciplinaryDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isUploading}>
                          {isUploading ? (
                            <>
                              <Upload className="mr-2 h-4 w-4 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            "Create Disciplinary Action"
                          )}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search and Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search by employee name, action type, or description..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="appealed">Appealed</SelectItem>
                    <SelectItem value="overturned">Overturned</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Disciplinary Actions Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Action Type</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Date Issued</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Document</TableHead>
                      <TableHead>Follow-up</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {disciplinaryActions.map((action) => (
                      <TableRow key={action.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{action.employeeName}</div>
                            <div className="text-sm text-gray-500">{action.employeePosition}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            {action.type === "verbal_warning" && <AlertCircle className="h-4 w-4 mr-2 text-yellow-500" />}
                            {action.type === "written_warning" && <FileText className="h-4 w-4 mr-2 text-orange-500" />}
                            {action.type === "suspension" && <Clock className="h-4 w-4 mr-2 text-red-500" />}
                            {action.type === "termination" && <XCircle className="h-4 w-4 mr-2 text-red-700" />}
                            {action.type === "counseling" && <Users className="h-4 w-4 mr-2 text-blue-500" />}
                            <span className="capitalize">{action.type.replace('_', ' ')}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              action.severity === "critical" ? "destructive" :
                              action.severity === "high" ? "destructive" :
                              action.severity === "medium" ? "outline" : "secondary"
                            }
                          >
                            {action.severity.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(action.dateIssued).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={action.status === "active" ? "destructive" : action.status === "resolved" ? "secondary" : "outline"}
                          >
                            {action.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {action.documentUrl ? (
                            <div className="flex items-center space-x-2">
                              <Paperclip className="h-4 w-4 text-gray-500" />
                              <a 
                                href={action.documentUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 text-sm truncate max-w-32"
                                title={action.documentName}
                              >
                                {action.documentName}
                              </a>
                              <Button variant="ghost" size="sm" className="p-1">
                                <Download className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">No document</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {action.followUpRequired ? (
                            <div className="text-sm">
                              <div className="text-gray-900">{action.followUpDate ? new Date(action.followUpDate).toLocaleDateString() : "TBD"}</div>
                              <div className="text-red-600">Required</div>
                            </div>
                          ) : (
                            <span className="text-gray-500">Not required</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Summary Statistics */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <AlertTriangle className="h-6 w-6 text-red-600 mr-2" />
                      <div>
                        <p className="text-sm font-medium">Active Actions</p>
                        <p className="text-xl font-bold">{disciplinaryActions.filter(a => a.status === "active").length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <CheckCircle className="h-6 w-6 text-green-600 mr-2" />
                      <div>
                        <p className="text-sm font-medium">Resolved</p>
                        <p className="text-xl font-bold">{disciplinaryActions.filter(a => a.status === "resolved").length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <Clock className="h-6 w-6 text-orange-600 mr-2" />
                      <div>
                        <p className="text-sm font-medium">Pending Follow-up</p>
                        <p className="text-xl font-bold">{disciplinaryActions.filter(a => a.followUpRequired && a.status === "active").length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <Shield className="h-6 w-6 text-blue-600 mr-2" />
                      <div>
                        <p className="text-sm font-medium">This Month</p>
                        <p className="text-xl font-bold">{disciplinaryActions.filter(a => new Date(a.dateIssued).getMonth() === new Date().getMonth()).length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}