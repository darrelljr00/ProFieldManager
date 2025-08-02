import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Plus,
  Trash2,
  Settings,
  Type,
  Mail,
  Phone,
  Calendar,
  FileText,
  CheckSquare,
  Circle,
  List,
  Hash,
  GripVertical,
  Eye,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface FormField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
  };
  description?: string;
}

interface FormData {
  fields: FormField[];
  settings: {
    submitButtonText: string;
    successMessage: string;
    allowAnonymous: boolean;
    notifications: {
      email: string;
      enableNotifications: boolean;
    };
  };
}

interface CustomForm {
  id: number;
  name: string;
  description?: string;
  status: string;
  formData: FormData;
  settings: any;
  isPublic: boolean;
}

interface FormBuilderEditorProps {
  form: CustomForm;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}

const fieldTypes = [
  { value: 'text', label: 'Text Input', icon: Type },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'phone', label: 'Phone', icon: Phone },
  { value: 'number', label: 'Number', icon: Hash },
  { value: 'textarea', label: 'Text Area', icon: FileText },
  { value: 'select', label: 'Dropdown', icon: List },
  { value: 'radio', label: 'Radio Buttons', icon: Circle },
  { value: 'checkbox', label: 'Checkboxes', icon: CheckSquare },
  { value: 'date', label: 'Date', icon: Calendar },
];

export function FormBuilderEditor({ form, open, onOpenChange, onSave }: FormBuilderEditorProps) {
  const [formData, setFormData] = useState<FormData>(form.formData || {
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
  });
  const [selectedField, setSelectedField] = useState<FormField | null>(null);
  const [isFieldEditorOpen, setIsFieldEditorOpen] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const saveFormMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('PUT', `/api/custom-forms/${form.id}`, {
        formData,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Form saved successfully",
      });
      onSave();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save form",
        variant: "destructive",
      });
    },
  });

  const generateFieldId = () => {
    return `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const addField = (type: string) => {
    const newField: FormField = {
      id: generateFieldId(),
      type,
      label: `New ${fieldTypes.find(ft => ft.value === type)?.label || 'Field'}`,
      required: false,
      ...(type === 'select' || type === 'radio' || type === 'checkbox' ? { options: ['Option 1', 'Option 2'] } : {}),
    };

    setFormData(prev => ({
      ...prev,
      fields: [...prev.fields, newField],
    }));
  };

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.map(field =>
        field.id === fieldId ? { ...field, ...updates } : field
      ),
    }));
  };

  const deleteField = (fieldId: string) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.filter(field => field.id !== fieldId),
    }));
  };

  const moveField = (fieldId: string, direction: 'up' | 'down') => {
    setFormData(prev => {
      const fields = [...prev.fields];
      const index = fields.findIndex(f => f.id === fieldId);
      if (index === -1) return prev;

      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= fields.length) return prev;

      [fields[index], fields[newIndex]] = [fields[newIndex], fields[index]];
      return { ...prev, fields };
    });
  };

  const editField = (field: FormField) => {
    setSelectedField(field);
    setIsFieldEditorOpen(true);
  };

  const handleSave = () => {
    saveFormMutation.mutate();
  };

  const renderFieldPreview = (field: FormField) => {
    const baseProps = {
      placeholder: field.placeholder,
      required: field.required,
    };

    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
        return <Input {...baseProps} type={field.type} disabled />;
      case 'number':
        return <Input {...baseProps} type="number" disabled />;
      case 'textarea':
        return <Textarea {...baseProps} rows={3} disabled />;
      case 'select':
        return (
          <Select disabled>
            <SelectTrigger>
              <SelectValue placeholder="Select an option..." />
            </SelectTrigger>
          </Select>
        );
      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input type="radio" disabled className="text-primary" />
                <label className="text-sm">{option}</label>
              </div>
            ))}
          </div>
        );
      case 'checkbox':
        return (
          <div className="space-y-2">
            {field.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input type="checkbox" disabled className="text-primary" />
                <label className="text-sm">{option}</label>
              </div>
            ))}
          </div>
        );
      case 'date':
        return <Input type="date" disabled />;
      default:
        return <Input {...baseProps} disabled />;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Form: {form.name}</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden">
            <Tabs defaultValue="builder" className="h-full flex flex-col">
              <TabsList>
                <TabsTrigger value="builder">Form Builder</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>

              <TabsContent value="builder" className="flex-1 overflow-hidden">
                <div className="grid grid-cols-12 gap-6 h-full">
                  {/* Field Types Palette */}
                  <div className="col-span-3">
                    <Card className="h-full">
                      <CardHeader>
                        <CardTitle className="text-lg">Field Types</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {fieldTypes.map((fieldType) => {
                            const Icon = fieldType.icon;
                            return (
                              <Button
                                key={fieldType.value}
                                variant="outline"
                                className="w-full justify-start"
                                onClick={() => addField(fieldType.value)}
                              >
                                <Icon className="h-4 w-4 mr-2" />
                                {fieldType.label}
                              </Button>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Form Builder Area */}
                  <div className="col-span-9 overflow-y-auto">
                    <Card className="h-full">
                      <CardHeader>
                        <CardTitle className="text-lg">Form Fields</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {formData.fields.length === 0 ? (
                          <div className="text-center py-12">
                            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-medium mb-2">No fields yet</h3>
                            <p className="text-muted-foreground">
                              Add fields from the palette on the left to build your form
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {formData.fields.map((field, index) => (
                              <div
                                key={field.id}
                                className="border rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors"
                              >
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center space-x-2">
                                    <GripVertical className="h-4 w-4 text-gray-400" />
                                    <div>
                                      <Label className="font-medium">
                                        {field.label}
                                        {field.required && <span className="text-red-500 ml-1">*</span>}
                                      </Label>
                                      {field.description && (
                                        <p className="text-sm text-muted-foreground">
                                          {field.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => moveField(field.id, 'up')}
                                      disabled={index === 0}
                                    >
                                      ↑
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => moveField(field.id, 'down')}
                                      disabled={index === formData.fields.length - 1}
                                    >
                                      ↓
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => editField(field)}
                                    >
                                      <Settings className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => deleteField(field.id)}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                                {renderFieldPreview(field)}
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="flex-1 overflow-y-auto">
                <Card>
                  <CardHeader>
                    <CardTitle>Form Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label htmlFor="submit-button-text">Submit Button Text</Label>
                      <Input
                        id="submit-button-text"
                        value={formData.settings.submitButtonText}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          settings: {
                            ...prev.settings,
                            submitButtonText: e.target.value,
                          },
                        }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="success-message">Success Message</Label>
                      <Textarea
                        id="success-message"
                        value={formData.settings.successMessage}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          settings: {
                            ...prev.settings,
                            successMessage: e.target.value,
                          },
                        }))}
                        rows={3}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="allow-anonymous"
                        checked={formData.settings.allowAnonymous}
                        onCheckedChange={(checked) => setFormData(prev => ({
                          ...prev,
                          settings: {
                            ...prev.settings,
                            allowAnonymous: checked,
                          },
                        }))}
                      />
                      <Label htmlFor="allow-anonymous">Allow anonymous submissions</Label>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="enable-notifications"
                          checked={formData.settings.notifications.enableNotifications}
                          onCheckedChange={(checked) => setFormData(prev => ({
                            ...prev,
                            settings: {
                              ...prev.settings,
                              notifications: {
                                ...prev.settings.notifications,
                                enableNotifications: checked,
                              },
                            },
                          }))}
                        />
                        <Label htmlFor="enable-notifications">Enable email notifications</Label>
                      </div>
                      {formData.settings.notifications.enableNotifications && (
                        <div>
                          <Label htmlFor="notification-email">Notification Email</Label>
                          <Input
                            id="notification-email"
                            type="email"
                            value={formData.settings.notifications.email}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              settings: {
                                ...prev.settings,
                                notifications: {
                                  ...prev.settings.notifications,
                                  email: e.target.value,
                                },
                              },
                            }))}
                            placeholder="Enter email to receive notifications"
                          />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="preview" className="flex-1 overflow-y-auto">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      Form Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-w-2xl mx-auto space-y-6">
                      {formData.fields.map((field) => (
                        <div key={field.id} className="space-y-2">
                          <Label>
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </Label>
                          {field.description && (
                            <p className="text-sm text-muted-foreground">{field.description}</p>
                          )}
                          {renderFieldPreview(field)}
                        </div>
                      ))}
                      <Button className="w-full" disabled>
                        {formData.settings.submitButtonText}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saveFormMutation.isPending}>
              {saveFormMutation.isPending ? "Saving..." : "Save Form"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Field Editor Dialog */}
      {selectedField && (
        <FieldEditor
          field={selectedField}
          open={isFieldEditorOpen}
          onOpenChange={setIsFieldEditorOpen}
          onSave={(updatedField) => {
            updateField(selectedField.id, updatedField);
            setIsFieldEditorOpen(false);
          }}
        />
      )}
    </>
  );
}

// Field Editor Component
interface FieldEditorProps {
  field: FormField;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (field: Partial<FormField>) => void;
}

function FieldEditor({ field, open, onOpenChange, onSave }: FieldEditorProps) {
  const [editedField, setEditedField] = useState<FormField>({ ...field });

  const handleSave = () => {
    onSave(editedField);
  };

  const addOption = () => {
    setEditedField(prev => ({
      ...prev,
      options: [...(prev.options || []), `Option ${(prev.options?.length || 0) + 1}`],
    }));
  };

  const updateOption = (index: number, value: string) => {
    setEditedField(prev => ({
      ...prev,
      options: prev.options?.map((opt, i) => i === index ? value : opt),
    }));
  };

  const removeOption = (index: number) => {
    setEditedField(prev => ({
      ...prev,
      options: prev.options?.filter((_, i) => i !== index),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Field</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="field-label">Label</Label>
            <Input
              id="field-label"
              value={editedField.label}
              onChange={(e) => setEditedField(prev => ({ ...prev, label: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="field-placeholder">Placeholder</Label>
            <Input
              id="field-placeholder"
              value={editedField.placeholder || ''}
              onChange={(e) => setEditedField(prev => ({ ...prev, placeholder: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="field-description">Description (optional)</Label>
            <Textarea
              id="field-description"
              value={editedField.description || ''}
              onChange={(e) => setEditedField(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="field-required"
              checked={editedField.required}
              onCheckedChange={(checked) => setEditedField(prev => ({ ...prev, required: checked }))}
            />
            <Label htmlFor="field-required">Required field</Label>
          </div>

          {/* Options for select, radio, checkbox */}
          {(editedField.type === 'select' || editedField.type === 'radio' || editedField.type === 'checkbox') && (
            <div>
              <Label>Options</Label>
              <div className="space-y-2">
                {editedField.options?.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeOption(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={addOption}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Option
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}