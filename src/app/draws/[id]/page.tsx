'use client';

import React, { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDraw, useDeleteDraw, useSubmitDraw, useApproveDraw, useFundDraw, useRemoveDrawLineItem } from '@/hooks/queries/useDraws';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, CheckCircle, CheckCircle2, CircleDollarSign, FileText, Loader2, Trash2, X } from 'lucide-react';
import { formatCurrency } from '@/lib/theme';

interface DrawDetailContentProps {
  id: string;
}

function DrawDetailContent({ id }: DrawDetailContentProps) {
  const router = useRouter();
  const { data: draw, isLoading } = useDraw(id);
  const { mutate: deleteDraw, isPending: isDeleting } = useDeleteDraw();
  const { mutate: submitDraw, isPending: isSubmitting } = useSubmitDraw();
  const { mutate: approveDraw, isPending: isApproving } = useApproveDraw();
  const { mutate: fundDraw, isPending: isFunding } = useFundDraw();
  const { mutate: removeLineItem, isPending: isRemovingItem } = useRemoveDrawLineItem();

  const [confirmDelete, setConfirmDelete] = useState(false);

  if (isLoading) {
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
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  const handleDelete = () => {
    deleteDraw({ id: draw.id, projectId: draw.project_id }, {
      onSuccess: () => {
        router.push(`/`); // Or to project cash flow? Ideally to previous page.
      }
    });
  };

  const statusColors = {
    draft: 'bg-gray-100 text-gray-700',
    submitted: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-blue-100 text-blue-700',
    funded: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  };

  const steps = ['draft', 'submitted', 'approved', 'funded'];
  const currentStepIndex = steps.indexOf(draw.status);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()} className="p-0 hover:bg-transparent">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">Draw #{draw.draw_number}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-sm font-medium capitalize ${statusColors[draw.status]}`}>
                {draw.status}
              </span>
            </div>
            <p className="text-gray-500 mt-1">
              Created {new Date(draw.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {draw.status === 'draft' && (
            <>
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-red-600">Confirm delete?</span>
                  <Button size="sm" variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                    Yes, Delete
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button>
                </div>
              ) : (
                <Button variant="outline" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Draft
                </Button>
              )}
              
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => submitDraw(draw.id)}
                disabled={isSubmitting || (draw.line_items?.length || 0) === 0}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Draw'}
              </Button>
            </>
          )}

          {draw.status === 'submitted' && (
            <Button 
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => approveDraw({ id: draw.id })} // Assuming approve full amount by default
              disabled={isApproving}
            >
              {isApproving ? 'Approving...' : 'Approve Draw'}
            </Button>
          )}

          {draw.status === 'approved' && (
            <Button 
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => fundDraw(draw.id)}
              disabled={isFunding}
            >
              {isFunding ? 'Processing...' : 'Mark as Funded'}
            </Button>
          )}
        </div>
      </div>

      {/* Progress Timeline */}
      <div className="relative">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 -translate-y-1/2 z-0" />
        <div className="relative z-10 flex justify-between">
          {steps.map((step, index) => {
            const isCompleted = index <= currentStepIndex;
            const isCurrent = index === currentStepIndex;
            
            return (
              <div key={step} className="flex flex-col items-center gap-2 bg-gray-50 px-2">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors
                  ${isCompleted ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-gray-300 text-gray-300'}
                `}>
                  {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <div className="w-2 h-2 rounded-full bg-gray-300" />}
                </div>
                <span className={`text-xs font-medium capitalize ${isCurrent ? 'text-gray-900' : 'text-gray-500'}`}>
                  {step}
                </span>
                {/* Optional: Add dates here if available in draw object */}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Line Items */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Line Items</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {draw.line_items?.map((item) => (
                  <div key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                    <div className="space-y-1">
                      <p className="font-medium text-gray-900">{item.task?.name || 'Unknown Task'}</p>
                      <div className="text-xs text-gray-500 flex gap-2">
                        {item.budget_category?.category && (
                          <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                            {item.budget_category.category}
                          </span>
                        )}
                        {item.task?.verified_at && (
                          <span>Verified {new Date(item.task.verified_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-mono font-medium text-gray-900">
                        {formatCurrency(item.amount)}
                      </span>
                      {draw.status === 'draft' && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-gray-400 hover:text-red-600"
                          onClick={() => removeLineItem({ drawId: draw.id, lineItemId: item.id })}
                          disabled={isRemovingItem}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {(!draw.line_items || draw.line_items.length === 0) && (
                  <div className="p-8 text-center text-gray-500">
                    No items in this draw yet.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Requested Amount</span>
                <span className="font-medium text-gray-900">{formatCurrency(draw.amount_requested)}</span>
              </div>
              {draw.amount_approved !== null && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Approved Amount</span>
                  <span className="font-medium text-green-700">{formatCurrency(draw.amount_approved || 0)}</span>
                </div>
              )}
              
              <div className="pt-4 border-t border-gray-100 space-y-3">
                {draw.submitted_at && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar className="w-4 h-4" />
                    Submitted: {new Date(draw.submitted_at).toLocaleDateString()}
                  </div>
                )}
                {draw.approved_at && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <CheckCircle className="w-4 h-4" />
                    Approved: {new Date(draw.approved_at).toLocaleDateString()}
                  </div>
                )}
                {draw.funded_at && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <CircleDollarSign className="w-4 h-4" />
                    Funded: {new Date(draw.funded_at).toLocaleDateString()}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {draw.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-500">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{draw.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DrawDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params);
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <DrawDetailContent id={resolvedParams.id} />
    </Suspense>
  );
}
