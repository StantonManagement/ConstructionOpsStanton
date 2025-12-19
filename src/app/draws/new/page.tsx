'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDrawEligibility } from '@/hooks/queries/useCashFlow';
import { useProjects } from '@/hooks/queries/useProjects';
import { useCreateDraw, useAddDrawLineItem } from '@/hooks/queries/useDraws';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, CheckCircle2, CircleDollarSign, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/theme';

function NewDrawContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get('project_id');
  const projectId = projectIdParam ? parseInt(projectIdParam) : undefined;

  const { data: projects } = useProjects();
  const { data: eligibility, isLoading: isEligibilityLoading } = useDrawEligibility(projectId);
  const { mutateAsync: createDraw, isPending: isCreating } = useCreateDraw();
  const { mutateAsync: addLineItem } = useAddDrawLineItem();

  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleProjectChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('project_id', value);
    router.replace(`/draws/new?${params.toString()}`);
    setSelectedTaskIds(new Set()); // Clear selection on project change
  };

  const toggleTask = (taskId: string) => {
    const newSelected = new Set(selectedTaskIds);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTaskIds(newSelected);
  };

  const selectAll = () => {
    if (!eligibility) return;
    if (selectedTaskIds.size === eligibility.eligible_tasks.length) {
      setSelectedTaskIds(new Set());
    } else {
      setSelectedTaskIds(new Set(eligibility.eligible_tasks.map(t => t.task_id)));
    }
  };

  const handleCreateDraw = async () => {
    if (!projectId || selectedTaskIds.size === 0) return;

    setIsSubmitting(true);
    try {
      // 1. Create Draw
      const drawRes = await createDraw({ project_id: projectId, notes });
      const drawId = drawRes.data.id;

      // 2. Add Line Items
      // We process them in parallel batches to avoid overwhelming the browser/network too much
      const taskIds = Array.from(selectedTaskIds);
      const batchSize = 5;
      
      for (let i = 0; i < taskIds.length; i += batchSize) {
        const batch = taskIds.slice(i, i + batchSize);
        await Promise.all(batch.map(taskId => addLineItem({ drawId, taskId })));
      }

      // 3. Redirect
      router.push(`/draws/${drawId}`);
    } catch (error) {
      console.error('Failed to create draw:', error);
      setIsSubmitting(false);
      // Ideally show toast error here
    }
  };

  // Calculate totals for selected
  const selectedTotal = eligibility?.eligible_tasks
    .filter(t => selectedTaskIds.has(t.task_id))
    .reduce((sum, t) => sum + t.cost, 0) || 0;

  if (isEligibilityLoading && projectId) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()} className="p-0 hover:bg-transparent">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Create New Draw Request</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Form & Selection */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Project Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Project</Label>
                <Select value={projectId?.toString()} onValueChange={handleProjectChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects?.map((p) => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Input 
                  placeholder="E.g., Draw #4 for Framing and MEP Rough-in" 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {projectId && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">Eligible Tasks</CardTitle>
                {eligibility?.eligible_tasks.length ? (
                  <Button variant="ghost" size="sm" onClick={selectAll}>
                    {selectedTaskIds.size === eligibility.eligible_tasks.length ? 'Deselect All' : 'Select All'}
                  </Button>
                ) : null}
              </CardHeader>
              <CardContent>
                {!eligibility?.eligible_tasks.length ? (
                  <div className="text-center py-8 text-gray-500">
                    No verified tasks eligible for draw.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                    {eligibility.eligible_tasks.map((task) => (
                      <div 
                        key={task.task_id} 
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedTaskIds.has(task.task_id) 
                            ? 'bg-blue-50 border-blue-200' 
                            : 'bg-white border-gray-100 hover:bg-gray-50'
                        }`}
                        onClick={() => toggleTask(task.task_id)}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox 
                            checked={selectedTaskIds.has(task.task_id)}
                            onCheckedChange={() => toggleTask(task.task_id)}
                          />
                          <div>
                            <p className="font-medium text-gray-900">{task.task_name}</p>
                            <p className="text-xs text-gray-500">
                              {task.location_name} • Verified {new Date(task.verified_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right font-medium text-gray-900">
                          {formatCurrency(task.cost)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6 border-l-4 border-l-blue-500">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CircleDollarSign className="w-5 h-5 text-blue-600" />
                Draw Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Selected Tasks</span>
                <span className="font-medium">{selectedTaskIds.size}</span>
              </div>
              <div className="pt-4 border-t border-gray-100">
                <div className="flex justify-between items-end">
                  <span className="text-base font-semibold text-gray-700">Total Request</span>
                  <span className="text-2xl font-bold text-gray-900">{formatCurrency(selectedTotal)}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white" 
                size="lg"
                disabled={!projectId || selectedTaskIds.size === 0 || isSubmitting}
                onClick={handleCreateDraw}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Draw...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Create Draft Draw
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function NewDrawPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <NewDrawContent />
    </Suspense>
  );
}
