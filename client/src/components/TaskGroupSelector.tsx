import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Folder, CheckCircle2 } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface TaskGroup {
  id: number;
  name: string;
  description: string;
  color: string;
  taskCount: number;
  createdBy: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

interface TaskGroupSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  onTasksAdded?: () => void;
}

export default function TaskGroupSelector({ 
  open, 
  onOpenChange, 
  projectId,
  onTasksAdded 
}: TaskGroupSelectorProps) {
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const { toast } = useToast();

  // Fetch task groups
  const { data: taskGroups = [], isLoading } = useQuery({
    queryKey: ['/api/task-groups'],
    enabled: open,
    retry: 1
  });

  // Add task group to project mutation
  const addTaskGroupMutation = useMutation({
    mutationFn: (taskGroupId: number) => 
      apiRequest('POST', `/api/projects/${projectId}/add-task-group`, { taskGroupId }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'tasks'] });
      onOpenChange(false);
      setSelectedGroupId(null);
      if (onTasksAdded) {
        onTasksAdded();
      }
      toast({
        title: "Success",
        description: data.message || "Tasks added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add tasks from group",
        variant: "destructive",
      });
    }
  });

  const handleAddTasks = () => {
    if (!selectedGroupId) {
      toast({
        title: "Error",
        description: "Please select a task group",
        variant: "destructive",
      });
      return;
    }
    addTaskGroupMutation.mutate(selectedGroupId);
  };

  const handleClose = () => {
    onOpenChange(false);
    setSelectedGroupId(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Task Group</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : taskGroups.length === 0 ? (
            <div className="text-center p-8">
              <Folder className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Task Groups Available</h3>
              <p className="text-gray-500">Create task groups first to use this feature.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600">
                Select a task group to add all its tasks to this project:
              </p>
              <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
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
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <div 
                              className="w-3 h-3 rounded-full mr-2"
                              style={{ backgroundColor: group.color }}
                            />
                            <h4 className="font-medium">{group.name}</h4>
                            {selectedGroupId === group.id && (
                              <CheckCircle2 className="h-5 w-5 text-blue-500 ml-2" />
                            )}
                          </div>
                          {group.description && (
                            <p className="text-sm text-gray-600 mb-2">{group.description}</p>
                          )}
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <Badge variant="secondary">
                              {group.taskCount} tasks
                            </Badge>
                            <span>By {group.createdBy.firstName} {group.createdBy.lastName}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
          
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleAddTasks}
              disabled={!selectedGroupId || addTaskGroupMutation.isPending || taskGroups.length === 0}
            >
              {addTaskGroupMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Add Tasks
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}