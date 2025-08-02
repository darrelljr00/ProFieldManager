import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Eye, ExternalLink, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FormField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  description?: string;
}

interface CustomForm {
  id: number;
  name: string;
  description?: string;
  formData: {
    fields: FormField[];
    settings: {
      submitButtonText: string;
      successMessage: string;
      allowAnonymous: boolean;
    };
  };
  isPublic: boolean;
  publicId?: string;
}

interface FormPreviewProps {
  form: CustomForm;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FormPreview({ form, open, onOpenChange }: FormPreviewProps) {
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (fieldId: string, value: any) => {
    setFormValues(prev => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const copyPublicUrl = () => {
    if (form.isPublic && form.publicId) {
      const url = `${window.location.origin}/public/forms/${form.publicId}`;
      navigator.clipboard.writeText(url);
      toast({
        title: "Copied!",
        description: "Public form URL copied to clipboard",
      });
    }
  };

  const renderField = (field: FormField) => {
    const value = formValues[field.id] || '';

    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
        return (
          <Input
            type={field.type}
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            required={field.required}
          />
        );
      
      case 'number':
        return (
          <Input
            type="number"
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            required={field.required}
          />
        );
      
      case 'textarea':
        return (
          <Textarea
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            required={field.required}
            rows={3}
          />
        );
      
      case 'select':
        return (
          <Select
            value={value}
            onValueChange={(val) => handleInputChange(field.id, val)}
            required={field.required}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an option..." />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option, index) => (
                <SelectItem key={index} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case 'radio':
        return (
          <div className="space-y-3">
            {field.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  type="radio"
                  id={`${field.id}_${index}`}
                  name={field.id}
                  value={option}
                  checked={value === option}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  required={field.required}
                  className="text-primary"
                />
                <Label htmlFor={`${field.id}_${index}`} className="text-sm">
                  {option}
                </Label>
              </div>
            ))}
          </div>
        );
      
      case 'checkbox':
        return (
          <div className="space-y-3">
            {field.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Checkbox
                  id={`${field.id}_${index}`}
                  checked={(value || []).includes(option)}
                  onCheckedChange={(checked) => {
                    const currentValues = value || [];
                    if (checked) {
                      handleInputChange(field.id, [...currentValues, option]);
                    } else {
                      handleInputChange(field.id, currentValues.filter((v: string) => v !== option));
                    }
                  }}
                />
                <Label htmlFor={`${field.id}_${index}`} className="text-sm">
                  {option}
                </Label>
              </div>
            ))}
          </div>
        );
      
      case 'date':
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            required={field.required}
          />
        );
      
      default:
        return (
          <Input
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            required={field.required}
          />
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Form Preview: {form.name}
            </DialogTitle>
            {form.isPublic && form.publicId && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyPublicUrl}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy URL
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(`/public/forms/${form.publicId}`, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Open Public
                </Button>
              </div>
            )}
          </div>
          {form.description && (
            <p className="text-muted-foreground">{form.description}</p>
          )}
        </DialogHeader>

        <div className="max-w-2xl mx-auto">
          {showSuccess ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-green-900 mb-2">
                {form.formData.settings.successMessage}
              </h3>
              <Button variant="outline" onClick={() => setShowSuccess(false)}>
                Fill Form Again
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {form.formData.fields.map((field) => (
                <div key={field.id} className="space-y-2">
                  <Label htmlFor={field.id}>
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  {field.description && (
                    <p className="text-sm text-muted-foreground">{field.description}</p>
                  )}
                  {renderField(field)}
                </div>
              ))}
              
              <Button type="submit" className="w-full">
                {form.formData.settings.submitButtonText}
              </Button>
            </form>
          )}
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
          <p className="text-sm text-yellow-800">
            <strong>Preview Mode:</strong> This is a preview of your form. 
            No data will be saved when submitted. Use the public URL to collect real submissions.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}