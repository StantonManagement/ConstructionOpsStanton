import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/theme';
import { PropertyWithStats } from '@/hooks/queries/usePortfolio';

interface PropertyCardProps {
  property: PropertyWithStats;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({ property }) => {
  const router = useRouter();

  const locationProgress = property.total_locations > 0 
    ? (property.complete_locations / property.total_locations) * 100 
    : 0;

  const taskProgress = property.total_tasks > 0
    ? (property.verified_tasks / property.total_tasks) * 100
    : 0;

  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-transparent hover:border-l-blue-500"
      onClick={() => router.push(`/renovations/locations?property_id=${property.project_id}`)}
    >
      <CardContent className="p-5">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Header & Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-bold text-gray-900 truncate">
                {property.project_name}
              </h3>
              {property.blocked_locations > 0 && (
                <Badge variant="destructive" className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200">
                  {property.blocked_locations} blocked
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-500 mb-4">
              {property.total_locations} total units
            </p>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Verified Cost: </span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(property.verified_cost)}
                </span>
                <span className="text-gray-400 text-xs"> / {formatCurrency(property.total_estimated_cost)}</span>
              </div>
            </div>
          </div>

          {/* Progress Bars */}
          <div className="flex-1 space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Locations</span>
                <span className="font-medium text-gray-900">
                  {property.complete_locations} / {property.total_locations} ({Math.round(locationProgress)}%)
                </span>
              </div>
              <Progress value={locationProgress} className="h-2" />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tasks</span>
                <span className="font-medium text-gray-900">
                  {property.verified_tasks} / {property.total_tasks} ({Math.round(taskProgress)}%)
                </span>
              </div>
              <Progress value={taskProgress} className="h-2 bg-purple-100" indicatorClassName="bg-purple-600" />
            </div>
          </div>

          {/* Action */}
          <div className="flex items-center justify-end md:w-24">
            <div className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors">
              <ArrowRight className="w-5 h-5" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
