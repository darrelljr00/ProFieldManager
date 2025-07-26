import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DraggableJobItem } from "./draggable-job-item";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Truck, Calendar, Undo2 } from "lucide-react";

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
  vehicleId?: string;
}

interface DroppableVehicleContainerProps {
  vehicleId: string;
  vehicleNumber: string;
  jobs: JobLocation[];
  selectedDate: string;
  onStatusUpdate: (jobId: number, status: string) => void;
  onUndo?: () => void;
  canUndo?: boolean;
  maxJobsPerVehicle?: string | number;
}

export function DroppableVehicleContainer({ 
  vehicleId, 
  vehicleNumber, 
  jobs, 
  selectedDate,
  onStatusUpdate,
  onUndo,
  canUndo,
  maxJobsPerVehicle
}: DroppableVehicleContainerProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: vehicleId,
  });

  const vehicleJobs = jobs.filter(job => job.vehicleId === vehicleId);

  return (
    <Card className={`transition-colors ${isOver ? 'ring-2 ring-blue-300 bg-blue-50' : ''}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Scheduled Jobs Vehicle {vehicleNumber}
          <Badge 
            variant="secondary" 
            className={`ml-auto ${
              vehicleId !== 'unassigned' && 
              maxJobsPerVehicle !== 'unlimited' && 
              maxJobsPerVehicle &&
              vehicleJobs.length >= parseInt(maxJobsPerVehicle as string) 
                ? 'bg-red-100 text-red-800' 
                : ''
            }`}
          >
            {vehicleId === 'unassigned' || maxJobsPerVehicle === 'unlimited' 
              ? `${vehicleJobs.length} jobs`
              : `${vehicleJobs.length}/${maxJobsPerVehicle} jobs`
            }
          </Badge>
          {vehicleId === 'unassigned' && onUndo && (
            <Button
              variant="outline"
              size="sm"
              onClick={onUndo}
              disabled={!canUndo}
              className="ml-2"
            >
              <Undo2 className="h-4 w-4 mr-1" />
              Undo
            </Button>
          )}
        </CardTitle>
        <CardDescription>
          Jobs scheduled for {new Date(selectedDate).toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      <CardContent ref={setNodeRef}>
        {vehicleJobs.length === 0 ? (
          <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Drop jobs here to assign to Vehicle {vehicleNumber}</p>
            <p className="text-xs mt-2">No scheduled jobs assigned to this vehicle</p>
          </div>
        ) : (
          <SortableContext items={vehicleJobs.map(job => job.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {vehicleJobs.map((job, index) => (
                <DraggableJobItem
                  key={job.id}
                  job={job}
                  index={index}
                  onStatusUpdate={onStatusUpdate}
                />
              ))}
            </div>
          </SortableContext>
        )}
      </CardContent>
    </Card>
  );
}