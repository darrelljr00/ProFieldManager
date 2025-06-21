import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Copy,
  Settings,
  FileText,
  BarChart3,
  Download,
  ExternalLink,
  DragHandleDots2Icon as GripVertical,
} from "lucide-react";
import { FormBuilderEditor } from "@/components/form-builder-editor";
import { FormPreview } from "@/components/form-preview";
import { FormSubmissions } from "@/components/form-submissions";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface CustomForm {
  id: number;
  name: string;
  description?: string;
  status: 'draft' | 'published' | 'archived';
  formData: any;
  settings: any;
  isPublic: boolean;
  publicId?: string;
  submissionCount: number;
  lastSubmission?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: number;
  createdByName?: string;
}

interface FormTemplate {
  id: number;
  name: string;
  description?: string;
  category: string;
  templateData: any;
  isSystem: boolean;
  usageCount: number;
}

export default function FormBuilder() {
  const [selectedTab, setSelectedTab] = useState("forms");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<CustomForm | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSubmissionsOpen, setIsSubmissionsOpen] = useState(false);
  const [newFormName, setNewFormName] = useState("");
  const [newFormDescription, setNewFormDescription] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch custom forms
  const formsQuery = useQuery({
    queryKey: ['/api/custom-forms'],
  });

  // Fetch form templates
  const templatesQuery = useQuery({
    queryKey: ['/api/form-templates'],
  });

  // Create form mutation
  const createFormMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; templateId?: string }) => {
      let formData = {
        fields: [],
        settings: {
          submitButtonText: 'Submit',
          successMessage: 'Thank you for your submission!',
          allowAnonymous: true,
          notifications: {
            email: '',
            enableNotifications: false,
          },
        },
      };

      // If template selected, use template data
      if (data.templateId) {
        const template = templatesQuery.data?.find((t: FormTemplate) => t.id === parseInt(data.templateId));
        if (template) {
          formData = template.templateData;
        }
      }

      return apiRequest('/api/custom-forms', 'POST', {
        name: data.name,
        description: data.description,
        formData,
        status: 'draft',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/custom-forms'] });
      setIsCreateOpen(false);
      setNewFormName("");
      setNewFormDescription("");
      setSelectedTemplate("");
      toast({
        title: "Success",
        description: "Form created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create form",
        variant: "destructive",
      });
    },
  });

  // Delete form mutation
  const deleteFormMutation = useMutation({
    mutationFn: async (formId: number) => {
      return apiRequest(`/api/custom-forms/${formId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/custom-forms'] });
      toast({
        title: "Success",
        description: "Form deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete form",
        variant: "destructive",
      });
    },
  });

  // Duplicate form mutation
  const duplicateFormMutation = useMutation({
    mutationFn: async (form: CustomForm) => {
      return apiRequest('/api/custom-forms', 'POST', {
        name: `${form.name} (Copy)`,
        description: form.description,
        formData: form.formData,
        status: 'draft',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/custom-forms'] });
      toast({
        title: "Success",
        description: "Form duplicated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to duplicate form",
        variant: "destructive",
      });
    },
  });

  const handleCreateForm = () => {
    if (!newFormName.trim()) {
      toast({
        title: "Error",
        description: "Form name is required",
        variant: "destructive",
      });
      return;
    }

    createFormMutation.mutate({
      name: newFormName.trim(),
      description: newFormDescription.trim() || undefined,
      templateId: selectedTemplate || undefined,
    });
  };

  const handleDeleteForm = (form: CustomForm) => {
    if (confirm(`Are you sure you want to delete "${form.name}"? This action cannot be undone.`)) {
      deleteFormMutation.mutate(form.id);
    }
  };

  const handleDuplicateForm = (form: CustomForm) => {
    duplicateFormMutation.mutate(form);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPublicUrl = (form: CustomForm) => {
    if (form.isPublic && form.publicId) {
      return `${window.location.origin}/public/forms/${form.publicId}`;
    }
    return null;
  };

  const forms = formsQuery.data as CustomForm[] || [];
  const templates = templatesQuery.data as FormTemplate[] || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Form Builder</h1>
          <p className="text-muted-foreground">
            Create and manage custom forms for your organization
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Form
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Form</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="form-name">Form Name</Label>
                <Input
                  id="form-name"
                  value={newFormName}
                  onChange={(e) => setNewFormName(e.target.value)}
                  placeholder="Enter form name..."
                />
              </div>
              <div>
                <Label htmlFor="form-description">Description (optional)</Label>
                <Textarea
                  id="form-description"
                  value={newFormDescription}
                  onChange={(e) => setNewFormDescription(e.target.value)}
                  placeholder="Describe what this form is for..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="template-select">Start with Template (optional)</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Blank Form</SelectItem>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id.toString()}>
                        {template.name} - {template.category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateForm}
                  disabled={createFormMutation.isPending}
                >
                  {createFormMutation.isPending ? "Creating..." : "Create Form"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="forms">My Forms</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="forms">
          {formsQuery.isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : forms.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No forms yet</h3>
                <p className="text-muted-foreground mb-4">Create your first custom form to get started</p>
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Form
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {forms.map((form) => (
                <Card key={form.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">{form.name}</CardTitle>
                        {form.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {form.description}
                          </p>
                        )}
                      </div>
                      <Badge className={getStatusColor(form.status)}>
                        {form.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Submissions:</span>
                        <div className="font-medium">{form.submissionCount}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Updated:</span>
                        <div className="font-medium">
                          {new Date(form.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    {form.isPublic && (
                      <div className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                        <ExternalLink className="h-4 w-4 text-blue-600" />
                        <span className="text-sm text-blue-600">Public form</span>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedForm(form);
                          setIsEditorOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedForm(form);
                          setIsPreviewOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedForm(form);
                          setIsSubmissionsOpen(true);
                        }}
                      >
                        <BarChart3 className="h-4 w-4 mr-1" />
                        Data
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDuplicateForm(form)}
                        disabled={duplicateFormMutation.isPending}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copy
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteForm(form)}
                        disabled={deleteFormMutation.isPending}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates">
          {templatesQuery.isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template) => (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    {template.description && (
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">{template.category}</Badge>
                      <span className="text-sm text-muted-foreground">
                        Used {template.usageCount} times
                      </span>
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => {
                        setSelectedTemplate(template.id.toString());
                        setIsCreateOpen(true);
                      }}
                    >
                      Use Template
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Form Editor Dialog */}
      {selectedForm && (
        <FormBuilderEditor
          form={selectedForm}
          open={isEditorOpen}
          onOpenChange={setIsEditorOpen}
          onSave={() => {
            queryClient.invalidateQueries({ queryKey: ['/api/custom-forms'] });
            setIsEditorOpen(false);
          }}
        />
      )}

      {/* Form Preview Dialog */}
      {selectedForm && (
        <FormPreview
          form={selectedForm}
          open={isPreviewOpen}
          onOpenChange={setIsPreviewOpen}
        />
      )}

      {/* Form Submissions Dialog */}
      {selectedForm && (
        <FormSubmissions
          form={selectedForm}
          open={isSubmissionsOpen}
          onOpenChange={setIsSubmissionsOpen}
        />
      )}
    </div>
  );
}