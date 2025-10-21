import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Fuel, TrendingUp, DollarSign, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

interface VehicleFuelData {
  vehicleId: number;
  vehicleNumber: string;
  fuelEconomyMpg: number;
  tripCount: number;
  totalMiles: number;
  estimatedGallons: number;
  estimatedCost: number;
}

export default function FuelUsageToday() {
  const { data: fuelData, isLoading } = useQuery<VehicleFuelData[]>({
    queryKey: ["/api/fuel/today"],
    refetchInterval: 30000, // Refresh every 30 seconds to get latest data
  });

  const totalMiles = fuelData?.reduce((sum, v) => sum + v.totalMiles, 0) || 0;
  const totalGallons = fuelData?.reduce((sum, v) => sum + v.estimatedGallons, 0) || 0;
  const totalCost = fuelData?.reduce((sum, v) => sum + v.estimatedCost, 0) || 0;
  const totalTrips = fuelData?.reduce((sum, v) => sum + v.tripCount, 0) || 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Today's Fuel Usage</h1>
          <p className="text-gray-500 dark:text-gray-400">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card data-testid="card-total-miles">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Miles</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="text-total-miles">
                  {totalMiles.toFixed(2)}
                </div>
                <p className="text-xs text-gray-500">{totalTrips} trips today</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-fuel-consumed">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fuel Consumed</CardTitle>
            <Fuel className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="text-fuel-gallons">
                  {totalGallons.toFixed(2)}
                </div>
                <p className="text-xs text-gray-500">gallons</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-estimated-cost">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estimated Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="text-fuel-cost">
                  ${totalCost.toFixed(2)}
                </div>
                <p className="text-xs text-gray-500">at current rates</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-last-update">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Update</CardTitle>
            <Clock className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{format(new Date(), "h:mm a")}</div>
                <p className="text-xs text-gray-500">Live tracking</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Vehicle Breakdown */}
      <Card data-testid="card-vehicle-breakdown">
        <CardHeader>
          <CardTitle>Vehicle Breakdown</CardTitle>
          <CardDescription>
            Fuel usage calculated using: (Total Miles ÷ Vehicle MPG) × Fuel Price
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : fuelData && fuelData.length > 0 ? (
            <div className="space-y-4">
              {fuelData.map((vehicle) => (
                <div
                  key={vehicle.vehicleId}
                  className="flex items-center justify-between p-4 border rounded-lg"
                  data-testid={`vehicle-${vehicle.vehicleId}`}
                >
                  <div className="flex-1">
                    <h3 className="font-semibold" data-testid={`text-vehicle-name-${vehicle.vehicleId}`}>
                      {vehicle.vehicleNumber}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {vehicle.fuelEconomyMpg} MPG • {vehicle.tripCount} trips
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="text-lg font-bold" data-testid={`text-vehicle-miles-${vehicle.vehicleId}`}>
                      {vehicle.totalMiles.toFixed(2)} mi
                    </div>
                    <div className="text-sm text-gray-500" data-testid={`text-vehicle-gallons-${vehicle.vehicleId}`}>
                      {vehicle.estimatedGallons.toFixed(2)} gal = ${vehicle.estimatedCost.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Fuel className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No driving data yet today</p>
              <p className="text-sm">GPS tracking is active. Data will appear as vehicles drive.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calculation Details */}
      {!isLoading && fuelData && fuelData.length > 0 && (
        <Card data-testid="card-calculation-details">
          <CardHeader>
            <CardTitle>Calculation Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total distance driven:</span>
                <span className="font-medium">{totalMiles.toFixed(2)} miles</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Estimated gallons used:</span>
                <span className="font-medium">{totalGallons.toFixed(2)} gallons</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Average fuel price:</span>
                <span className="font-medium">
                  ${totalGallons > 0 ? (totalCost / totalGallons).toFixed(2) : "0.00"}/gallon
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="font-semibold">Total estimated cost:</span>
                <span className="font-bold text-lg">${totalCost.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
