import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  MapPin, 
  Clock, 
  User, 
  CheckCircle, 
  Play, 
  Square 
} from "lucide-react";

interface JobLocation {
  id: number;
  projectId: number;
  projectName: string;
  address: string;
  lat: number;
  lng: number;
  scheduledTime: string;
  estimatedDuration: number;
  assignedTo?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'scheduled' | 'in-progress' | 'completed';
}

interface DraggableJobItemProps {
  job: JobLocation;
  index: number;
  onStatusUpdate: (jobId: number, status: string) => void;
}

export function DraggableJobItem({ job, index, onStatusUpdate }: DraggableJobItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: job.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in-progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'in-progress': return <Play className="h-4 w-4" />;
      default: return <Square className="h-4 w-4" />;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`border rounded-lg p-4 hover:bg-gray-50 cursor-move transition-all ${
        isDragging ? 'shadow-lg ring-2 ring-blue-300' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">
                Job {index + 1}
              </span>
              <span className="font-medium text-lg">{job.projectName}</span>
              <Badge className={getPriorityColor(job.priority)}>
                {job.priority}
              </Badge>
              <Badge className={getStatusColor(job.status)}>
                <div className="flex items-center gap-1">
                  {getStatusIcon(job.status)}
                  {job.status}
                </div>
              </Badge>
            </div>
          </div>
          
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{job.address}</span>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{job.scheduledTime}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Duration:</span>
                <span>{job.estimatedDuration}h</span>
              </div>
              
              {job.assignedTo && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{job.assignedTo}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 ml-4">
          {job.status !== 'in-progress' && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onStatusUpdate(job.projectId, 'in-progress');
              }}
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              <Play className="h-4 w-4 mr-1" />
              Start
            </Button>
          )}
          
          {job.status === 'in-progress' && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onStatusUpdate(job.projectId, 'completed');
              }}
              className="text-green-600 border-green-200 hover:bg-green-50"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Complete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}