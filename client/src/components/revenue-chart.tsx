import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3 } from "lucide-react";

export function RevenueChart() {
  return (
    <Card className="bg-white shadow-sm border border-gray-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">Revenue Overview</CardTitle>
          <div className="flex items-center space-x-2">
            <Button size="sm" className="bg-primary text-white">6M</Button>
            <Button size="sm" variant="ghost" className="text-gray-600 hover:bg-gray-100">3M</Button>
            <Button size="sm" variant="ghost" className="text-gray-600 hover:bg-gray-100">1M</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
          <div className="text-center">
            <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 font-medium">Revenue Chart Component</p>
            <p className="text-sm text-gray-400 mt-1">Integration with Chart.js/Recharts required</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
