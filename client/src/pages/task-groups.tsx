import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Folder, Settings, Edit, Trash2, CheckSquare, Users } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface TaskGroup {
  id: number;
  name: string;
  description: string;
  color: string;
  taskCount: number;
  isActive: boolean;
  createdBy: {
    id: number;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface TaskTemplate {
  id: number;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedHours: number;
  taskGroupId: number;
}

export default function TaskGroups() {
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    color: '#3B82F6'
  });
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium' as const,
    estimatedHours: 1
  });
  const { toast } = useToast();

  // Fetch task groups
  const { data: taskGroups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ['/api/task-groups'],
    retry: 1
  });

  // Fetch tasks for selected group
  const { data: groupTasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['/api/task-groups', selectedGroupId, 'tasks'],
    enabled: !!selectedGroupId,
    retry: 1
  });

  // Create task group mutation
  const createGroupMutation = useMutation({
    mutationFn: (groupData: any) => apiRequest('POST', '/api/task-groups', groupData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/task-groups'] });
      setIsCreateGroupOpen(false);
      setNewGroup({ name: '', description: '', color: '#3B82F6' });
      toast({
        title: "Success",
        description: "Task group created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create task group",
        variant: "destructive",
      });
    }
  });

  // Add task to group mutation
  const addTaskMutation = useMutation({
    mutationFn: (taskData: any) => apiRequest('POST', `/api/task-groups/${selectedGroupId}/tasks`, taskData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/task-groups', selectedGroupId, 'tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/task-groups'] });
      setIsAddTaskOpen(false);
      setNewTask({ title: '', description: '', priority: 'medium', estimatedHours: 1 });
      toast({
        title: "Success",
        description: "Task added to group successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add task to group",
        variant: "destructive",
      });
    }
  });

  const handleCreateGroup = () => {
    if (!newGroup.name.trim()) {
      toast({
        title: "Error",
        description: "Group name is required",
        variant: "destructive",
      });
      return;
    }
    createGroupMutation.mutate(newGroup);
  };

  const handleAddTask = () => {
    if (!newTask.title.trim()) {
      toast({
        title: "Error",
        description: "Task title is required",
        variant: "destructive",
      });
      return;
    }
    addTaskMutation.mutate(newTask);
  };

  const selectedGroup = taskGroups.find((group: TaskGroup) => group.id === selectedGroupId);

  if (groupsLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Task Groups</h1>
          <p className="text-gray-600">Create and manage reusable task templates for your projects</p>
        </div>
        <Dialog open={isCreateGroupOpen} onOpenChange={setIsCreateGroupOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Task Group</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Group Name</Label>
                <Input
                  id="name"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  placeholder="e.g., Standard Cleaning Tasks"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                  placeholder="Describe what this task group contains"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="color">Color</Label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    id="color"
                    value={newGroup.color}
                    onChange={(e) => setNewGroup({ ...newGroup, color: e.target.value })}
                    className="w-12 h-8 rounded border"
                  />
                  <Input
                    value={newGroup.color}
                    onChange={(e) => setNewGroup({ ...newGroup, color: e.target.value })}
                    placeholder="#3B82F6"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsCreateGroupOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateGroup}
                  disabled={createGroupMutation.isPending}
                >
                  {createGroupMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Create Group
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="groups" className="space-y-6">
        <TabsList>
          <TabsTrigger value="groups">All Groups</TabsTrigger>
          <TabsTrigger value="details" disabled={!selectedGroupId}>
            Group Details
          </TabsTrigger>
        </TabsList>

        <TabsContent value="groups" className="space-y-4">
          {taskGroups.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Folder className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Task Groups</h3>
                <p className="text-gray-500 mb-4">Create your first task group to organize reusable task templates.</p>
                <Button onClick={() => setIsCreateGroupOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Task Group
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {taskGroups.map((group: TaskGroup) => (
                <Card 
                  key={group.id} 
                  className={`cursor-pointer transition-all ${
                    selectedGroupId === group.id 
                      ? 'ring-2 ring-blue-500 bg-blue-50' 
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => setSelectedGroupId(group.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: group.color }}
                        />
                        {group.name}
                      </CardTitle>
                      <Badge variant="secondary">
                        {group.taskCount} tasks
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {group.description && (
                      <p className="text-sm text-gray-600 mb-3">{group.description}</p>
                    )}
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>By {group.createdBy.firstName} {group.createdBy.lastName}</span>
                      <span>{new Date(group.createdAt).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          {selectedGroup && (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div 
                        className="w-4 h-4 rounded-full mr-3"
                        style={{ backgroundColor: selectedGroup.color }}
                      />
                      <div>
                        <CardTitle>{selectedGroup.name}</CardTitle>
                        {selectedGroup.description && (
                          <p className="text-sm text-gray-600 mt-1">{selectedGroup.description}</p>
                        )}
                      </div>
                    </div>
                    <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Task
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Task to Group</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="taskTitle">Task Title</Label>
                            <Input
                              id="taskTitle"
                              value={newTask.title}
                              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                              placeholder="e.g., Pre-cleaning inspection"
                            />
                          </div>
                          <div>
                            <Label htmlFor="taskDescription">Description</Label>
                            <Textarea
                              id="taskDescription"
                              value={newTask.description}
                              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                              placeholder="Describe what needs to be done"
                              rows={3}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="priority">Priority</Label>
                              <Select 
                                value={newTask.priority} 
                                onValueChange={(value: any) => setNewTask({ ...newTask, priority: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="low">Low</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="high">High</SelectItem>
                                  <SelectItem value="urgent">Urgent</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="estimatedHours">Estimated Hours</Label>
                              <Input
                                id="estimatedHours"
                                type="number"
                                step="0.5"
                                min="0.5"
                                value={newTask.estimatedHours}
                                onChange={(e) => setNewTask({ ...newTask, estimatedHours: parseFloat(e.target.value) || 1 })}
                              />
                            </div>
                          </div>
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              onClick={() => setIsAddTaskOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleAddTask}
                              disabled={addTaskMutation.isPending}
                            >
                              {addTaskMutation.isPending && (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              )}
                              Add Task
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CheckSquare className="h-5 w-5 mr-2" />
                    Tasks in Group ({groupTasks.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {tasksLoading ? (
                    <div className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                      <p className="text-gray-500">Loading tasks...</p>
                    </div>
                  ) : groupTasks.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <h4 className="text-lg font-medium text-gray-900 mb-2">No Tasks Yet</h4>
                      <p className="text-gray-500 mb-4">Add tasks to this group to create reusable templates.</p>
                      <Button onClick={() => setIsAddTaskOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add First Task
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {groupTasks.map((task: TaskTemplate) => (
                        <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <h4 className="font-medium">{task.title}</h4>
                            {task.description && (
                              <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                            )}
                            <div className="flex items-center space-x-4 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {task.priority}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                ~{task.estimatedHours}h
                              </span>
                            </div>
                          </div>
                          <div className="flex space-x-1">
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}