import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { FileText, Download, Upload, Edit, Trash2, Eye, Calendar, User, Shield, FolderOpen } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface EmployeeDocumentsProps {
  employeeId: number;
  employeeName: string;
}

interface EmployeeDocument {
  id: number;
  employeeId: number;
  fileName: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  fileType: string;
  documentType: string;
  category: string;
  title: string;
  description?: string;
  tags?: string[];
  confidentialityLevel: string;
  accessLevel: string;
  status: string;
  expirationDate?: string;
  reminderDate?: string;
  version: number;
  notes?: string;
  downloadCount: number;
  lastAccessedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const DOCUMENT_TYPES = [
  { value: 'resume', label: 'Resume/CV' },
  { value: 'contract', label: 'Employment Contract' },
  { value: 'id_copy', label: 'ID Copy' },
  { value: 'tax_form', label: 'Tax Form' },
  { value: 'certification', label: 'Certification' },
  { value: 'training', label: 'Training Document' },
  { value: 'performance', label: 'Performance Review' },
  { value: 'medical', label: 'Medical Document' },
  { value: 'other', label: 'Other' }
];

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'personal', label: 'Personal' },
  { value: 'legal', label: 'Legal' },
  { value: 'training', label: 'Training' },
  { value: 'hr', label: 'HR' },
  { value: 'medical', label: 'Medical' },
  { value: 'financial', label: 'Financial' }
];

const CONFIDENTIALITY_LEVELS = [
  { value: 'public', label: 'Public' },
  { value: 'internal', label: 'Internal' },
  { value: 'confidential', label: 'Confidential' },
  { value: 'restricted', label: 'Restricted' }
];

const ACCESS_LEVELS = [
  { value: 'employee_only', label: 'Employee Only' },
  { value: 'hr_only', label: 'HR Only' },
  { value: 'manager_access', label: 'Manager Access' },
  { value: 'full_access', label: 'Full Access' }
];

export function EmployeeDocuments({ employeeId, employeeName }: EmployeeDocumentsProps) {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({
    documentType: '',
    category: 'general',
    title: '',
    description: '',
    confidentialityLevel: 'internal',
    accessLevel: 'hr_only'
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch employee documents
  const { data: documents = [], isLoading } = useQuery({
    queryKey: [`/api/employees/${employeeId}/documents`],
    enabled: !!employeeId
  });

  // Upload document mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch(`/api/employees/${employeeId}/documents`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/employees/${employeeId}/documents`] });
      setIsUploadDialogOpen(false);
      setSelectedFile(null);
      setUploadForm({
        documentType: '',
        category: 'general',
        title: '',
        description: '',
        confidentialityLevel: 'internal',
        accessLevel: 'hr_only'
      });
      toast({
        title: "Success",
        description: "Document uploaded successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Delete document mutation
  const deleteMutation = useMutation({
    mutationFn: async (documentId: number) => {
      await apiRequest(`/api/employee-documents/${documentId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/employees/${employeeId}/documents`] });
      toast({
        title: "Success",
        description: "Document deleted successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-fill title with filename if empty
      if (!uploadForm.title) {
        setUploadForm(prev => ({
          ...prev,
          title: file.name.replace(/\.[^/.]+$/, "") // Remove extension
        }));
      }
    }
  };

  const handleUpload = () => {
    if (!selectedFile || !uploadForm.documentType || !uploadForm.title) {
      toast({
        title: "Missing Information",
        description: "Please select a file, document type, and title",
        variant: "destructive"
      });
      return;
    }

    const formData = new FormData();
    formData.append('document', selectedFile);
    formData.append('documentType', uploadForm.documentType);
    formData.append('category', uploadForm.category);
    formData.append('title', uploadForm.title);
    formData.append('description', uploadForm.description);
    formData.append('confidentialityLevel', uploadForm.confidentialityLevel);
    formData.append('accessLevel', uploadForm.accessLevel);

    uploadMutation.mutate(formData);
  };

  const handleDownload = (document: EmployeeDocument) => {
    window.open(`/api/employee-documents/${document.id}/download`, '_blank');
  };

  const handleDelete = (documentId: number) => {
    if (confirm('Are you sure you want to delete this document?')) {
      deleteMutation.mutate(documentId);
    }
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'image':
        return <Eye className="h-4 w-4" />;
      case 'document':
        return <FileText className="h-4 w-4" />;
      default:
        return <FolderOpen className="h-4 w-4" />;
    }
  };

  const getConfidentialityColor = (level: string) => {
    switch (level) {
      case 'public':
        return 'bg-green-100 text-green-800';
      case 'internal':
        return 'bg-blue-100 text-blue-800';
      case 'confidential':
        return 'bg-yellow-100 text-yellow-800';
      case 'restricted':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return <div className="flex justify-center p-4">Loading documents...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Documents for {employeeName}</h3>
          <p className="text-sm text-muted-foreground">
            {documents.length} document{documents.length !== 1 ? 's' : ''} uploaded
          </p>
        </div>
        
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
              <DialogDescription>
                Add a new document for {employeeName}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="file">Select File</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                  onChange={handleFileSelect}
                  className="mt-1"
                />
                {selectedFile && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="documentType">Document Type *</Label>
                <Select 
                  value={uploadForm.documentType} 
                  onValueChange={(value) => setUploadForm(prev => ({ ...prev, documentType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Document title"
                />
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select 
                  value={uploadForm.category} 
                  onValueChange={(value) => setUploadForm(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(category => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="confidentiality">Confidentiality</Label>
                  <Select 
                    value={uploadForm.confidentialityLevel} 
                    onValueChange={(value) => setUploadForm(prev => ({ ...prev, confidentialityLevel: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONFIDENTIALITY_LEVELS.map(level => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="access">Access Level</Label>
                  <Select 
                    value={uploadForm.accessLevel} 
                    onValueChange={(value) => setUploadForm(prev => ({ ...prev, accessLevel: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCESS_LEVELS.map(level => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpload} 
                  disabled={uploadMutation.isPending}
                >
                  {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {documents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Documents</h3>
            <p className="text-muted-foreground text-center mb-4">
              No documents have been uploaded for this employee yet.
            </p>
            <Button onClick={() => setIsUploadDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload First Document
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {documents.map((document: EmployeeDocument) => (
            <Card key={document.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="mt-1">
                      {getFileIcon(document.fileType)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium truncate">{document.title}</h4>
                        <Badge variant="secondary" className="text-xs">
                          {DOCUMENT_TYPES.find(t => t.value === document.documentType)?.label || document.documentType}
                        </Badge>
                        <Badge className={`text-xs ${getConfidentialityColor(document.confidentialityLevel)}`}>
                          <Shield className="h-3 w-3 mr-1" />
                          {document.confidentialityLevel}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-2">
                        {document.originalName} • {formatFileSize(document.fileSize)}
                      </p>
                      
                      {document.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {document.description}
                        </p>
                      )}
                      
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDistanceToNow(new Date(document.createdAt), { addSuffix: true })}
                        </span>
                        <span className="flex items-center">
                          <Download className="h-3 w-3 mr-1" />
                          {document.downloadCount} downloads
                        </span>
                        {document.lastAccessedAt && (
                          <span className="flex items-center">
                            <User className="h-3 w-3 mr-1" />
                            Last accessed {formatDistanceToNow(new Date(document.lastAccessedAt), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(document)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(document.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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