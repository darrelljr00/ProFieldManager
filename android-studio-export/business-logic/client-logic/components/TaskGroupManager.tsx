import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Folder, Settings, Edit, Trash2 } from 'lucide-react';
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

interface TaskGroupManagerProps {
  onSelectGroup?: (groupId: number) => void;
}

export default function TaskGroupManager({ onSelectGroup }: TaskGroupManagerProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    color: '#3B82F6'
  });
  const { toast } = useToast();

  // Fetch task groups
  const { data: taskGroups = [], isLoading } = useQuery({
    queryKey: ['/api/task-groups'],
    retry: 1
  });

  // Create task group mutation
  const createGroupMutation = useMutation({
    mutationFn: (groupData: any) => apiRequest('POST', '/api/task-groups', groupData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/task-groups'] });
      setIsCreateOpen(false);
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

  const handleGroupSelect = (groupId: number) => {
    if (onSelectGroup) {
      onSelectGroup(groupId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Task Groups</h3>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
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
                <label className="text-sm font-medium">Group Name</label>
                <Input
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  placeholder="Enter group name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                  placeholder="Enter group description"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Color</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
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
                  onClick={() => setIsCreateOpen(false)}
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

      {taskGroups.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Folder className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Task Groups</h3>
            <p className="text-gray-500 mb-4">Create your first task group to organize tasks efficiently.</p>
            <Button onClick={() => setIsCreateOpen(true)}>
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
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleGroupSelect(group.id)}
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
    </div>
  );
}