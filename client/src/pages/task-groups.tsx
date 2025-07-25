import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Edit, Trash2, CheckSquare, Type, ImageIcon, Move3D, Users, FolderPlus, Settings } from "lucide-react";

interface TaskTemplate {
  id?: number;
  title: string;
  description: string;
  type: 'checkbox' | 'text' | 'image';
  isRequired: boolean;
  priority: 'low' | 'medium' | 'high';
  order: number;
}

interface TaskGroup {
  id: number;
  name: string;
  description: string;
  color: string;
  isActive: boolean;
  taskCount: number;
  createdBy: {
    id: number;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
}

interface Project {
  id: number;
  name: string;
  status: string;
  description: string;
}

export default function TaskGroups() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedGroup, setSelectedGroup] = useState<TaskGroup | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupColor, setGroupColor] = useState("#3B82F6");
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<number[]>([]);

  // Fetch task groups
  const { data: taskGroups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ['/api/task-groups'],
  });

  // Fetch projects for assignment
  const { data: projects = [] } = useQuery({
    queryKey: ['/api/projects'],
  });

  // Fetch templates for selected group
  const { data: groupTemplates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['/api/task-groups', selectedGroup?.id, 'templates'],
    enabled: !!selectedGroup?.id,
  });

  // Create task group mutation
  const createGroupMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/task-groups', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/task-groups'] });
      resetForm();
      setShowCreateDialog(false);
      toast({
        title: "Success",
        description: "Task group created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create task group",
        variant: "destructive",
      });
    },
  });

  // Assign task group to projects mutation
  const assignToProjectsMutation = useMutation({
    mutationFn: async ({ groupId, projectIds }: { groupId: number; projectIds: number[] }) => {
      const promises = projectIds.map(projectId =>
        apiRequest('POST', `/api/projects/${projectId}/task-groups`, { taskGroupId: groupId })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      setShowAssignDialog(false);
      setSelectedProjects([]);
      toast({
        title: "Success",
        description: `Task group assigned to ${selectedProjects.length} project(s)`,
      });
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to assign task group to projects",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setGroupName("");
    setGroupDescription("");
    setGroupColor("#3B82F6");
    setTemplates([]);
  };

  const addTemplate = () => {
    const newTemplate: TaskTemplate = {
      title: "",
      description: "",
      type: 'checkbox',
      isRequired: false,
      priority: 'medium',
      order: templates.length,
    };
    setTemplates([...templates, newTemplate]);
  };

  const updateTemplate = (index: number, updates: Partial<TaskTemplate>) => {
    const updated = templates.map((template, i) => 
      i === index ? { ...template, ...updates } : template
    );
    setTemplates(updated);
  };

  const removeTemplate = (index: number) => {
    setTemplates(templates.filter((_, i) => i !== index));
  };

  const moveTemplate = (index: number, direction: 'up' | 'down') => {
    const newTemplates = [...templates];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < templates.length) {
      [newTemplates[index], newTemplates[targetIndex]] = [newTemplates[targetIndex], newTemplates[index]];
      // Update order values
      newTemplates.forEach((template, i) => {
        template.order = i;
      });
      setTemplates(newTemplates);
    }
  };

  const handleCreateGroup = () => {
    if (!groupName.trim()) {
      toast({
        title: "Error",
        description: "Group name is required",
        variant: "destructive",
      });
      return;
    }

    if (templates.length === 0) {
      toast({
        title: "Error", 
        description: "At least one task template is required",
        variant: "destructive",
      });
      return;
    }

    createGroupMutation.mutate({
      name: groupName,
      description: groupDescription,
      color: groupColor,
      templates: templates.map((template, index) => ({
        ...template,
        order: index,
      })),
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'checkbox': return <CheckSquare className="h-4 w-4" />;
      case 'text': return <Type className="h-4 w-4" />;
      case 'image': return <ImageIcon className="h-4 w-4" />;
      default: return <CheckSquare className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (groupsLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Task Groups</h1>
          <p className="text-muted-foreground">Create reusable task templates and assign them to projects</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Task Group
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Task Group</DialogTitle>
              <DialogDescription>
                Create a reusable group of tasks that can be assigned to multiple projects
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Group Details</TabsTrigger>
                <TabsTrigger value="tasks">Task Templates</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Group Name *</Label>
                    <Input
                      id="name"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder="e.g., Vehicle Inspection Checklist"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="color">Color</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="color"
                        type="color"
                        value={groupColor}
                        onChange={(e) => setGroupColor(e.target.value)}
                        className="w-12 h-10"
                      />
                      <Input
                        value={groupColor}
                        onChange={(e) => setGroupColor(e.target.value)}
                        placeholder="#3B82F6"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={groupDescription}
                    onChange={(e) => setGroupDescription(e.target.value)}
                    placeholder="Describe what this task group is used for..."
                    rows={3}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="tasks" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Task Templates</h3>
                  <Button onClick={addTemplate} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Task
                  </Button>
                </div>
                
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {templates.map((template, index) => (
                      <Card key={index} className="border-l-4" style={{ borderLeftColor: groupColor }}>
                        <CardContent className="pt-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Task Title *</Label>
                              <Input
                                value={template.title}
                                onChange={(e) => updateTemplate(index, { title: e.target.value })}
                                placeholder="e.g., Check tire pressure"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label>Task Type</Label>
                              <Select
                                value={template.type}
                                onValueChange={(value: 'checkbox' | 'text' | 'image') => 
                                  updateTemplate(index, { type: value })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="checkbox">
                                    <div className="flex items-center">
                                      <CheckSquare className="h-4 w-4 mr-2" />
                                      Checkbox
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="text">
                                    <div className="flex items-center">
                                      <Type className="h-4 w-4 mr-2" />
                                      Text Input
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="image">
                                    <div className="flex items-center">
                                      <ImageIcon className="h-4 w-4 mr-2" />
                                      Image Upload
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          <div className="mt-4 space-y-2">
                            <Label>Description</Label>
                            <Textarea
                              value={template.description}
                              onChange={(e) => updateTemplate(index, { description: e.target.value })}
                              placeholder="Provide additional details..."
                              rows={2}
                            />
                          </div>
                          
                          <div className="mt-4 flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-2">
                                <Switch
                                  checked={template.isRequired}
                                  onCheckedChange={(checked) => updateTemplate(index, { isRequired: checked })}
                                />
                                <Label>Required</Label>
                              </div>
                              
                              <Select
                                value={template.priority}
                                onValueChange={(value: 'low' | 'medium' | 'high') => 
                                  updateTemplate(index, { priority: value })
                                }
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="low">Low</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="high">High</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => moveTemplate(index, 'up')}
                                disabled={index === 0}
                              >
                                ↑
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => moveTemplate(index, 'down')}
                                disabled={index === templates.length - 1}
                              >
                                ↓
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeTemplate(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    {templates.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No task templates added yet</p>
                        <p className="text-sm">Click "Add Task" to create your first task template</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
            
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateGroup} disabled={createGroupMutation.isPending}>
                {createGroupMutation.isPending ? "Creating..." : "Create Group"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {taskGroups.map((group: TaskGroup) => (
          <Card 
            key={group.id} 
            className="hover:shadow-lg transition-shadow cursor-pointer border-l-4"
            style={{ borderLeftColor: group.color }}
            onClick={() => setSelectedGroup(group)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{group.name}</CardTitle>
                <Badge variant="secondary">
                  {group.taskCount} task{group.taskCount !== 1 ? 's' : ''}
                </Badge>
              </div>
              <CardDescription className="line-clamp-2">
                {group.description || "No description provided"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Created by {group.createdBy.firstName} {group.createdBy.lastName}
                </span>
                <span>
                  {new Date(group.createdAt).toLocaleDateString()}
                </span>
              </div>
              
              <div className="mt-4 flex items-center justify-between">
                <Badge 
                  variant={group.isActive ? "default" : "secondary"}
                  className="text-xs"
                >
                  {group.isActive ? "Active" : "Inactive"}
                </Badge>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedGroup(group);
                    setShowAssignDialog(true);
                  }}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Assign to Projects
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {taskGroups.length === 0 && (
        <div className="text-center py-12">
          <FolderPlus className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">No Task Groups</h3>
          <p className="text-muted-foreground mb-4">
            Create your first task group to organize reusable tasks
          </p>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Task Group
          </Button>
        </div>
      )}

      {/* Task Group Detail Dialog */}
      <Dialog open={!!selectedGroup && !showAssignDialog} onOpenChange={(open) => !open && setSelectedGroup(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <div 
                className="w-4 h-4 rounded-full" 
                style={{ backgroundColor: selectedGroup?.color }}
              ></div>
              <span>{selectedGroup?.name}</span>
            </DialogTitle>
            <DialogDescription>
              {selectedGroup?.description || "No description provided"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Task Templates</h3>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setSelectedGroup(null);
                    setShowAssignDialog(true);
                  }}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Assign to Projects
                </Button>
              </div>
            </div>
            
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {templatesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  groupTemplates.map((template: any, index: number) => (
                    <Card key={template.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              {getTypeIcon(template.type)}
                              <h4 className="font-semibold">{template.title}</h4>
                              {template.isRequired && (
                                <Badge variant="destructive" className="text-xs">Required</Badge>
                              )}
                            </div>
                            
                            {template.description && (
                              <p className="text-sm text-muted-foreground mb-2">
                                {template.description}
                              </p>
                            )}
                            
                            <div className="flex items-center space-x-2">
                              <Badge className={getPriorityColor(template.priority)}>
                                {template.priority}
                              </Badge>
                              <Badge variant="outline">
                                {template.type}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="text-sm text-muted-foreground">
                            #{index + 1}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign to Projects Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Task Group to Projects</DialogTitle>
            <DialogDescription>
              Select projects to assign "{selectedGroup?.name}" task group
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {projects.map((project: Project) => (
                  <div key={project.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`project-${project.id}`}
                      checked={selectedProjects.includes(project.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedProjects([...selectedProjects, project.id]);
                        } else {
                          setSelectedProjects(selectedProjects.filter(id => id !== project.id));
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor={`project-${project.id}`} className="flex-1 cursor-pointer">
                      <div className="text-sm font-medium">{project.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {project.description || "No description"}
                      </div>
                    </label>
                    <Badge variant="outline" className="text-xs">
                      {project.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (selectedGroup && selectedProjects.length > 0) {
                  assignToProjectsMutation.mutate({
                    groupId: selectedGroup.id,
                    projectIds: selectedProjects,
                  });
                }
              }}
              disabled={selectedProjects.length === 0 || assignToProjectsMutation.isPending}
            >
              {assignToProjectsMutation.isPending ? "Assigning..." : `Assign to ${selectedProjects.length} Project(s)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}