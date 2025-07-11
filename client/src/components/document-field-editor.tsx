import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Move, Edit3, FileSignature, Calendar, Type, Edit } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface SignatureField {
  id?: number;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
  fieldType: 'signature' | 'initial' | 'date' | 'text';
  fieldLabel: string;
  required: boolean;
  signerRole: string;
  status: 'pending' | 'signed' | 'declined';
  signatureData?: string;
  signedBy?: string;
  signedAt?: string;
}

interface DocumentFieldEditorProps {
  file: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentFieldEditor({ file, open, onOpenChange }: DocumentFieldEditorProps) {
  const [fields, setFields] = useState<SignatureField[]>([]);
  const [selectedField, setSelectedField] = useState<SignatureField | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [newFieldType, setNewFieldType] = useState<'signature' | 'initial' | 'date' | 'text'>('signature');
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldRole, setNewFieldRole] = useState('customer');
  const documentRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch existing signature fields for this document
  const { data: existingFields, isLoading } = useQuery({
    queryKey: ['/api/files', file?.id, 'signature-fields'],
    enabled: !!file?.id && open,
  });

  useEffect(() => {
    if (existingFields) {
      setFields(existingFields);
    }
  }, [existingFields]);

  // Save signature field mutation
  const saveFieldMutation = useMutation({
    mutationFn: async (fieldData: Partial<SignatureField>) => {
      return await apiRequest(`/api/files/${file.id}/signature-fields`, {
        method: 'POST',
        body: JSON.stringify(fieldData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files', file.id, 'signature-fields'] });
      toast({
        title: "Success",
        description: "Signature field saved successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save signature field",
        variant: "destructive",
      });
    },
  });

  // Delete signature field mutation
  const deleteFieldMutation = useMutation({
    mutationFn: async (fieldId: number) => {
      return await apiRequest(`/api/signature-fields/${fieldId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files', file.id, 'signature-fields'] });
      toast({
        title: "Success",
        description: "Signature field deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete signature field",
        variant: "destructive",
      });
    },
  });

  const handleDocumentClick = (event: React.MouseEvent) => {
    if (!documentRef.current || isEditing) return;

    const rect = documentRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    const newField: SignatureField = {
      x: Math.max(0, Math.min(85, x)), // Keep within bounds
      y: Math.max(0, Math.min(90, y)),
      width: 15, // Default width
      height: 8, // Default height
      page: 1,
      fieldType: newFieldType,
      fieldLabel: newFieldLabel || `${newFieldType.charAt(0).toUpperCase() + newFieldType.slice(1)} Field`,
      required: true,
      signerRole: newFieldRole,
      status: 'pending',
    };

    setFields([...fields, newField]);
  };

  const handleFieldDragStart = (field: SignatureField, event: React.MouseEvent) => {
    setIsDragging(true);
    setSelectedField(field);
    setDragStart({ x: event.clientX, y: event.clientY });
    event.stopPropagation();
  };

  const handleFieldDrag = (event: React.MouseEvent) => {
    if (!isDragging || !selectedField || !documentRef.current) return;

    const rect = documentRef.current.getBoundingClientRect();
    const deltaX = ((event.clientX - dragStart.x) / rect.width) * 100;
    const deltaY = ((event.clientY - dragStart.y) / rect.height) * 100;

    const updatedFields = fields.map(field => {
      if (field === selectedField) {
        return {
          ...field,
          x: Math.max(0, Math.min(85, field.x + deltaX)),
          y: Math.max(0, Math.min(90, field.y + deltaY)),
        };
      }
      return field;
    });

    setFields(updatedFields);
    setDragStart({ x: event.clientX, y: event.clientY });
  };

  const handleFieldDragEnd = () => {
    setIsDragging(false);
    setSelectedField(null);
  };

  const handleDeleteField = (fieldToDelete: SignatureField) => {
    if (fieldToDelete.id) {
      deleteFieldMutation.mutate(fieldToDelete.id);
    }
    setFields(fields.filter(field => field !== fieldToDelete));
  };

  const handleSaveFields = () => {
    fields.forEach(field => {
      if (!field.id) {
        saveFieldMutation.mutate(field);
      }
    });
  };

  const getFieldIcon = (type: string) => {
    switch (type) {
      case 'signature':
        return <FileSignature className="w-3 h-3" />;
      case 'initial':
        return <Edit3 className="w-3 h-3" />;
      case 'date':
        return <Calendar className="w-3 h-3" />;
      case 'text':
        return <Type className="w-3 h-3" />;
      default:
        return <FileSignature className="w-3 h-3" />;
    }
  };

  const getFieldColor = (type: string) => {
    switch (type) {
      case 'signature':
        return 'border-blue-500 bg-blue-50';
      case 'initial':
        return 'border-green-500 bg-green-50';
      case 'date':
        return 'border-purple-500 bg-purple-50';
      case 'text':
        return 'border-orange-500 bg-orange-50';
      default:
        return 'border-blue-500 bg-blue-50';
    }
  };

  if (!file) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Place Signature Fields - {file.originalName}</DialogTitle>
        </DialogHeader>
        
        <div className="flex gap-6 h-[calc(90vh-100px)]">
          {/* Document Preview Area */}
          <div className="flex-1 border rounded-lg bg-white overflow-auto">
            <div 
              ref={documentRef}
              className="relative min-h-[800px] bg-white cursor-crosshair"
              onClick={handleDocumentClick}
              onMouseMove={handleFieldDrag}
              onMouseUp={handleFieldDragEnd}
              style={{ aspectRatio: '8.5 / 11' }} // Standard document ratio
            >
              {/* Document background */}
              <div className="absolute inset-0 bg-gray-50 border-2 border-dashed border-gray-300 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <div className="text-lg font-medium mb-2">Document Preview</div>
                  <div className="text-sm">{file.originalName}</div>
                  <div className="text-xs mt-2">Click to place signature fields</div>
                </div>
              </div>

              {/* Signature Fields */}
              {fields.map((field, index) => (
                <div
                  key={index}
                  className={`absolute border-2 border-dashed cursor-move ${getFieldColor(field.fieldType)} hover:opacity-80 transition-opacity`}
                  style={{
                    left: `${field.x}%`,
                    top: `${field.y}%`,
                    width: `${field.width}%`,
                    height: `${field.height}%`,
                  }}
                  onMouseDown={(e) => handleFieldDragStart(field, e)}
                >
                  <div className="flex items-center justify-between h-full px-2 text-xs">
                    <div className="flex items-center gap-1">
                      {getFieldIcon(field.fieldType)}
                      <span className="font-medium">{field.fieldLabel}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-4 w-4 p-0 hover:bg-red-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteField(field);
                      }}
                    >
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </Button>
                  </div>
                  
                  {field.status === 'signed' && (
                    <Badge className="absolute -top-1 -right-1 text-xs">Signed</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Field Controls Sidebar */}
          <div className="w-80 border-l pl-6 overflow-auto">
            <div className="space-y-6">
              {/* Add New Field */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Add New Field</h3>
                
                <div>
                  <Label htmlFor="field-type">Field Type</Label>
                  <Select value={newFieldType} onValueChange={(value: any) => setNewFieldType(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select field type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="signature">Signature</SelectItem>
                      <SelectItem value="initial">Initial</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="text">Text</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="field-label">Field Label</Label>
                  <Input
                    id="field-label"
                    value={newFieldLabel}
                    onChange={(e) => setNewFieldLabel(e.target.value)}
                    placeholder="Enter field label"
                  />
                </div>

                <div>
                  <Label htmlFor="signer-role">Signer Role</Label>
                  <Select value={newFieldRole} onValueChange={setNewFieldRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select signer role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer">Customer</SelectItem>
                      <SelectItem value="contractor">Contractor</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="witness">Witness</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="text-sm text-gray-600">
                  Click on the document to place a new {newFieldType} field
                </div>
              </div>

              {/* Existing Fields */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Signature Fields ({fields.length})</h3>
                
                {fields.length === 0 ? (
                  <div className="text-sm text-gray-500 italic">
                    No signature fields added yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {fields.map((field, index) => (
                      <div key={index} className="p-3 border rounded-lg bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getFieldIcon(field.fieldType)}
                            <span className="font-medium text-sm">{field.fieldLabel}</span>
                          </div>
                          <Badge variant={field.status === 'signed' ? 'default' : 'secondary'}>
                            {field.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-600">
                          Position: {field.x.toFixed(1)}%, {field.y.toFixed(1)}%<br />
                          Role: {field.signerRole}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-3 pt-4 border-t">
                <Button 
                  onClick={handleSaveFields}
                  disabled={saveFieldMutation.isPending || fields.length === 0}
                  className="w-full"
                >
                  {saveFieldMutation.isPending ? "Saving..." : "Save All Fields"}
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="w-full"
                >
                  Close Editor
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}