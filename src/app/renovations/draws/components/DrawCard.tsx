import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/theme';
import { Calendar, Building2, ChevronRight } from 'lucide-react';
import { Draw } from '@/hooks/queries/useDraws';
import { useRouter } from 'next/navigation';

interface Props {
  draw: Draw;
  returnTo?: string;
}

export const DrawCard: React.FC<Props> = ({ draw, returnTo }) => {
  const router = useRouter();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
      case 'submitted': return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'approved': return 'bg-orange-100 text-orange-800 hover:bg-orange-200';
      case 'funded': return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 hover:bg-red-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const statusLabel = draw.status.charAt(0).toUpperCase() + draw.status.slice(1);
  const dateLabel = draw.status === 'funded' ? 'Funded' : draw.status === 'submitted' ? 'Submitted' : 'Created';
  const dateValue = draw.funded_at || draw.submitted_at || draw.created_at;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-lg text-gray-900">Draw #{draw.draw_number}</span>
            <Badge className={`${getStatusColor(draw.status)} border-0`}>
              {statusLabel}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Building2 className="w-4 h-4" />
            <span>{draw.projects?.name || 'Unknown Project'}</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Calendar className="w-3 h-3" />
            <span>{dateLabel} {new Date(dateValue).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-6 min-w-[200px]">
          <div className="text-right">
            <p className="text-lg font-bold text-gray-900">{formatCurrency(draw.amount_requested)}</p>
            <p className="text-xs text-gray-500">Amount</p>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="hover:bg-gray-100"
            onClick={() => router.push(returnTo ? `/renovations/draws/${draw.id}?returnTo=${encodeURIComponent(returnTo)}` : `/renovations/draws/${draw.id}`)}
          >
            View
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
