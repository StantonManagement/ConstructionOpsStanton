'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDraw, useSubmitDraw, useApproveDraw, useFundDraw, useDeleteDraw, DrawLineItem } from '@/hooks/queries/useDraws';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/theme';
import { ArrowLeft, Loader2, DollarSign, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function DrawDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [id, setId] = useState<string | null>(null);
  const returnTo = searchParams.get('returnTo');
  
  // Unwrap params
  useEffect(() => {
    params.then(p => setId(p.id));
  }, [params]);

  const { data: draw, isLoading } = useDraw(id || '');
  const { mutate: submitDraw, isPending: isSubmitting } = useSubmitDraw();
  const { mutate: approveDraw, isPending: isApproving } = useApproveDraw();
  const { mutate: fundDraw, isPending: isFunding } = useFundDraw();
  const { mutate: deleteDraw, isPending: isDeleting } = useDeleteDraw();

  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveAmount, setApproveAmount] = useState('');

  const handleBackNavigation = () => {
    if (returnTo) {
      router.push(returnTo);
      return;
    }

    const projectId = draw?.project_id;
    if (projectId) {
      router.push(`/renovations/draws?property_id=${projectId}`);
      return;
    }

    router.push('/renovations/draws');
  };

  const lineItems = draw?.line_items;

  // Group line items by category
  const itemsByCategory = React.useMemo(() => {
    if (!lineItems) return {};
    const grouped: Record<string, DrawLineItem[]> = {};
    lineItems.forEach((item) => {
      const cat = item.budget_category?.category || 'Uncategorized';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    });
    return grouped;
  }, [lineItems]);

  if (isLoading || !id) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!draw) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <p className="text-gray-500 mb-4">Draw not found</p>
        <Button onClick={handleBackNavigation}>Go Back</Button>
      </div>
    );
  }

  const statusColors = {
    draft: 'bg-gray-100 text-gray-800',
    submitted: 'bg-blue-100 text-blue-800',
    approved: 'bg-orange-100 text-orange-800',
    funded: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };

  const getTimelineSteps = () => {
    const steps = [
      { status: 'created', label: 'Created', date: draw.created_at, active: true },
      { status: 'submitted', label: 'Submitted', date: draw.submitted_at, active: ['submitted', 'approved', 'funded', 'rejected'].includes(draw.status) },
      { status: 'approved', label: 'Approved', date: draw.approved_at, active: ['approved', 'funded'].includes(draw.status) },
      { status: 'funded', label: 'Funded', date: draw.funded_at, active: draw.status === 'funded' },
    ];
    return steps;
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this draw? Tasks will become eligible for new draws.')) {
      deleteDraw({ id: draw.id, projectId: parseInt(draw.project_id.toString()) }, {
        onSuccess: () => handleBackNavigation()
      });
    }
  };

  const handleApprove = () => {
    approveDraw({ 
      id: draw.id, 
      amount_approved: approveAmount ? parseFloat(approveAmount) : undefined 
    }, {
      onSuccess: () => setShowApproveModal(false)
    });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={handleBackNavigation} className="-ml-2 pl-2">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <span className="text-gray-300">|</span>
            <span className="text-sm text-gray-500">{draw.projects?.name || `Project #${draw.project_id}`}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">Draw #{draw.draw_number}</h1>
            <Badge className={`${statusColors[draw.status]} border-0 text-sm px-3 py-1`}>
              {draw.status.charAt(0).toUpperCase() + draw.status.slice(1)}
            </Badge>
          </div>
        </div>

        <div className="flex flex-col items-end">
          <div className="text-3xl font-bold text-gray-900">
            {formatCurrency(draw.amount_approved || draw.amount_requested)}
          </div>
          <div className="text-sm text-gray-500">
            {draw.amount_approved ? 'Approved Amount' : 'Requested Amount'}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between relative">
            {/* Connecting Line */}
            <div className="absolute left-0 right-0 top-3 h-0.5 bg-gray-100 z-0 mx-8" />
            
            {getTimelineSteps().map((step) => (
              <div key={step.label} className="relative z-10 flex flex-col items-center">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center bg-white ${
                  step.active ? 'border-blue-600' : 'border-gray-300'
                }`}>
                  {step.active && <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
                </div>
                <span className={`text-sm font-medium mt-2 ${step.active ? 'text-gray-900' : 'text-gray-400'}`}>
                  {step.label}
                </span>
                {step.date && (
                  <span className="text-xs text-gray-500 mt-0.5">
                    {new Date(step.date).toLocaleDateString()}
                  </span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-gray-900">Line Items</h2>
        
        {Object.keys(itemsByCategory).length === 0 ? (
          <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg border border-dashed">
            No items in this draw yet.
          </div>
        ) : (
          Object.entries(itemsByCategory).map(([category, items]) => (
            <Card key={category}>
              <CardHeader className="py-3 px-4 bg-gray-50 border-b border-gray-100 flex flex-row justify-between items-center">
                <CardTitle className="text-base font-medium text-gray-900">{category}</CardTitle>
                <span className="text-sm font-semibold text-gray-700">
                  {formatCurrency(items.reduce((sum, i) => sum + (i.amount || 0), 0))}
                </span>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100">
                  {items.map((item) => (
                    <div key={item.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                      <div>
                        <p className="font-medium text-gray-900">{item.task?.name || 'Unknown Task'}</p>
                        <p className="text-xs text-gray-500">
                          {item.task?.verified_at && `Verified ${new Date(item.task.verified_at).toLocaleDateString()}`}
                        </p>
                      </div>
                      <span className="font-medium text-gray-900">{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Notes */}
      {draw.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap">{draw.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-20 shadow-lg">
        <div className="max-w-5xl mx-auto flex justify-end gap-3">
          {draw.status === 'draft' && (
            <>
              <Button 
                variant="outline" 
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                Delete Draft
              </Button>
              <Button 
                onClick={() => submitDraw(draw.id)} 
                disabled={isSubmitting || (draw.line_items?.length || 0) === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Draw'}
              </Button>
            </>
          )}

          {draw.status === 'submitted' && (
            <Button 
              onClick={() => {
                setApproveAmount(draw.amount_requested.toString());
                setShowApproveModal(true);
              }}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              Approve Draw
            </Button>
          )}

          {draw.status === 'approved' && (
            <Button 
              onClick={() => fundDraw(draw.id)} 
              disabled={isFunding}
              className="bg-green-600 hover:bg-green-700"
            >
              {isFunding ? <Loader2 className="w-4 h-4 animate-spin" /> : <><DollarSign className="w-4 h-4 mr-2" /> Mark as Funded</>}
            </Button>
          )}
        </div>
      </div>

      {/* Approve Modal */}
      <Dialog open={showApproveModal} onOpenChange={setShowApproveModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Draw #{draw.draw_number}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Approved Amount</Label>
              <Input 
                type="number" 
                value={approveAmount} 
                onChange={(e) => setApproveAmount(e.target.value)}
              />
              <p className="text-xs text-gray-500">Requested: {formatCurrency(draw.amount_requested)}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveModal(false)}>Cancel</Button>
            <Button onClick={handleApprove} disabled={isApproving}>
              {isApproving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Approval'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
