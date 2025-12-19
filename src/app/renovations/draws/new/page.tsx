'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCreateDraw } from '@/hooks/queries/useDraws';
import { usePortfolioProperties } from '@/hooks/queries/usePortfolio';
import { useQuery } from '@tanstack/react-query';
import { authFetch } from '@/lib/authFetch';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { formatCurrency } from '@/lib/theme';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

// Define a local interface for the task structure expected here since it might differ slightly from global Task
interface EligibleTask {
  task_id: string;
  task_name: string;
  cost: number;
  location_name: string;
  verified_at: string;
}

export default function CreateDrawPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedProjectId = searchParams.get('property_id');
  const returnTo = searchParams.get('returnTo');

  const [selectedProjectId, setSelectedProjectId] = useState<string>(preSelectedProjectId || '');
  const [notes, setNotes] = useState('');
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const { data: portfolio } = usePortfolioProperties();
  const { mutate: createDraw, isPending: isCreating } = useCreateDraw();

  // Fetch eligible tasks for selected project using React Query
  const { data: projectEligibilityData, isLoading: isLoadingTasks } = useQuery({
    queryKey: ['draw-eligibility', selectedProjectId],
    queryFn: async () => {
      const res = await authFetch(`/api/cash-flow/draw-eligibility?project_id=${selectedProjectId}`);
      if (!res.ok) throw new Error('Failed to fetch eligibility');
      const json = await res.json();
      return json.data;
    },
    enabled: !!selectedProjectId,
  });

  const projectTasks = React.useMemo(() => (projectEligibilityData?.eligible_tasks as EligibleTask[]) || [], [projectEligibilityData]);

  // Group tasks by category
  const tasksByLocation = React.useMemo(() => {
    const grouped: Record<string, EligibleTask[]> = {};
    projectTasks.forEach((task) => {
      const loc = task.location_name || 'Unknown Location';
      if (!grouped[loc]) grouped[loc] = [];
      grouped[loc].push(task);
    });
    return grouped;
  }, [projectTasks]);

  const totalSelectedAmount = React.useMemo(() => {
    let total = 0;
    projectTasks.forEach((task) => {
      if (selectedTasks.has(task.task_id)) {
        total += task.cost;
      }
    });
    return total;
  }, [projectTasks, selectedTasks]);

  const toggleTask = (taskId: string) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const toggleLocation = (locationName: string, tasks: EligibleTask[]) => {
    const newSelected = new Set(selectedTasks);
    const allSelected = tasks.every(t => newSelected.has(t.task_id));
    
    if (allSelected) {
      tasks.forEach(t => newSelected.delete(t.task_id));
    } else {
      tasks.forEach(t => newSelected.add(t.task_id));
    }
    setSelectedTasks(newSelected);
  };

  const handleCreate = () => {
    if (!selectedProjectId) {
      setError('Please select a property');
      return;
    }
    if (selectedTasks.size === 0) {
      setError('Please select at least one task');
      return;
    }

    createDraw({
      project_id: parseInt(selectedProjectId),
      notes: notes
    }, {
      onSuccess: (data) => {
        // data structure depends on API response, typically { data: draw } or just draw
        // useCreateDraw returns res.json()
        const actualId = data.data?.id || data.id; 
        if (actualId) {
             handleAddItems(actualId);
        } else {
            console.error("No ID returned from createDraw", data);
            setError("Failed to create draw: No ID returned");
        }
      }
    });
  };

  const handleAddItems = async (drawId: string) => {
    const tasks = Array.from(selectedTasks);
    
    // Batch in chunks of 5 to avoid overwhelming
    for (let i = 0; i < tasks.length; i += 5) {
        const chunk = tasks.slice(i, i + 5);
        await Promise.all(chunk.map(taskId => 
            authFetch(`/api/draws/${drawId}/line-items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ task_id: taskId })
            })
        ));
    }
    
    router.push(returnTo ? `/renovations/draws/${drawId}?returnTo=${encodeURIComponent(returnTo)}` : `/renovations/draws/${drawId}`);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => {
          if (returnTo) {
            router.push(returnTo);
            return;
          }
          router.push('/renovations/draws');
        }} className="pl-0">
          <ArrowLeft className="w-5 h-5 mr-1" />
          Back
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Create New Draw Request</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Configuration */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <Label>Property</Label>
                <Select 
                  value={selectedProjectId} 
                  onValueChange={setSelectedProjectId}
                  disabled={!!preSelectedProjectId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Property" />
                  </SelectTrigger>
                  <SelectContent>
                    {portfolio?.properties.map(p => (
                      <SelectItem key={p.project_id} value={p.project_id.toString()}>
                        {p.project_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Input 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  placeholder="E.g. December draws for painting..."
                />
              </div>

              <div className="pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-500">Selected Amount</span>
                  <span className="text-xl font-bold text-gray-900">{formatCurrency(totalSelectedAmount)}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                  <span>Tasks</span>
                  <span>{selectedTasks.size}</span>
                </div>

                {error && (
                  <div className="bg-red-50 text-red-600 text-sm p-2 rounded mb-4 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                <Button 
                  className="w-full" 
                  onClick={handleCreate}
                  disabled={isCreating || !selectedProjectId || selectedTasks.size === 0}
                >
                  {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Draft Draw'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Task Selection */}
        <div className="lg:col-span-2">
          {!selectedProjectId ? (
            <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-300 min-h-[300px]">
              <p className="text-gray-500">Select a property to view eligible tasks</p>
            </div>
          ) : isLoadingTasks ? (
            <div className="h-full flex items-center justify-center min-h-[300px]">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : projectTasks.length === 0 ? (
            <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-300 min-h-[300px]">
              <p className="text-gray-500">No eligible tasks found for this property.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(tasksByLocation).map(([location, tasks]) => {
                const allSelected = tasks.every(t => selectedTasks.has(t.task_id));
                const someSelected = tasks.some(t => selectedTasks.has(t.task_id));
                const total = tasks.reduce((sum, t) => sum + (t.cost || 0), 0);

                return (
                  <Card key={location} className="overflow-hidden">
                    <div 
                      className="bg-gray-50 p-3 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => toggleLocation(location, tasks)}
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox checked={allSelected || (someSelected && "indeterminate")} />
                        <span className="font-medium text-gray-900">{location}</span>
                        <span className="text-xs text-gray-500">({tasks.length} tasks)</span>
                      </div>
                      <span className="font-semibold text-gray-900">{formatCurrency(total)}</span>
                    </div>
                    <CardContent className="p-0 divide-y divide-gray-100">
                      {tasks.map(task => (
                        <div key={task.task_id} className="p-3 flex items-center justify-between hover:bg-gray-50">
                          <div className="flex items-center gap-3">
                            <Checkbox 
                              checked={selectedTasks.has(task.task_id)}
                              onCheckedChange={() => toggleTask(task.task_id)}
                            />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{task.task_name}</p>
                              <p className="text-xs text-gray-500">Verified: {new Date(task.verified_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <span className="text-sm font-medium text-gray-900">{formatCurrency(task.cost)}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
