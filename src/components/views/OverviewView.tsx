import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useData } from '@/app/context/DataContext';
import ProjectCard from '@/components/shared/ProjectCard';
import { supabase } from '@/lib/supabaseClient';
import { Project } from '@/app/context/DataContext';

const OverviewView: React.FC = () => {
  const { state } = useData();
  const [enhancedProjects, setEnhancedProjects] = useState<Array<Project & { calculatedBudget: number; calculatedSpent: number; spent: number }>>([]);
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEnhancedProjects = useCallback(async () => {
    try {
      const { data: projects, error: projectsError } = await supabase.from('projects').select('*');
      if (projectsError) throw projectsError;

      const { data: contractors, error: contractorsError } = await supabase.from('project_contractors').select('*');
      if (contractorsError) throw contractorsError;

      const enhanced = projects?.map(project => {
        const projectContractors = contractors?.filter(c => c.project_id === project.id) || [];
        const calculatedBudget = projectContractors.reduce((sum, c) => sum + (Number(c.contract_amount) || 0), 0);
        const calculatedSpent = projectContractors.reduce((sum, c) => sum + (Number(c.paid_to_date) || 0), 0);

        return {
          ...project,
          calculatedBudget,
          calculatedSpent,
          spent: calculatedSpent
        };
      }) || [];

      setEnhancedProjects(enhanced);
    } catch (error) {
      console.error('Error fetching enhanced projects:', error);
    }
  }, []);

  const fetchQueue = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('payment_applications')
        .select(`
          *,
          project:projects(id, name),
          contractor:contractors(id, name)
        `)
        .in('status', ['submitted', 'sms_sent']);

      if (error) throw error;
      setQueue(data || []);
    } catch (error) {
      console.error('Error fetching queue:', error);
      setQueue([]);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchEnhancedProjects(), fetchQueue()]);
      setLoading(false);
    };
    loadData();
  }, [fetchEnhancedProjects, fetchQueue]);

  // Group queue by project and determine highest priority
  const projectQueueSummary = useMemo(() => {
    const map: Record<string, { projectName: string, count: number, total: number, highestPriority: string }> = {};
    const priorityOrder = ['urgent', 'high', 'medium', 'low'];
    queue.forEach(app => {
      const projectName = app.project?.name || 'Unknown Project';
      // Assume app.priority exists, fallback to 'medium' if not
      const priority = (app as any).priority || 'medium';
      if (!map[projectName]) {
        map[projectName] = { projectName, count: 0, total: 0, highestPriority: priority };
      }
      map[projectName].count += 1;
      map[projectName].total += app.current_payment || 0; // Using current_payment
      // Update highest priority if this app is higher
      if (priorityOrder.indexOf(priority) < priorityOrder.indexOf(map[projectName].highestPriority)) {
        map[projectName].highestPriority = priority;
      }
    });
    return Object.values(map);
  }, [queue]);

  // Priority badge config
  const priorityBadge = {
    urgent: { color: 'bg-red-100 text-red-800 border-red-300', label: 'Urgent', icon: '🚨' },
    high: { color: 'bg-orange-100 text-orange-800 border-orange-300', label: 'High', icon: '⚡' },
    medium: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', label: 'Medium', icon: '⚠️' },
    low: { color: 'bg-gray-100 text-gray-800 border-gray-300', label: 'Low', icon: '📝' }
  };

  // Calculate overall project statistics
  const projectStats = useMemo(() => {
    const totalProjects = enhancedProjects.length;
    const activeProjects = enhancedProjects.filter(p => p.current_phase !== 'completed').length;
    const totalBudget = enhancedProjects.reduce((sum, p) => sum + (p.calculatedBudget || p.budget || 0), 0);
    const totalSpent = enhancedProjects.reduce((sum, p) => sum + (p.calculatedSpent || 0), 0);
    const remainingBudget = totalBudget - totalSpent;
    const utilizationRate = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
    const avgProjectBudget = totalProjects > 0 ? Math.round(totalBudget / totalProjects) : 0;

    return {
      totalProjects,
      activeProjects,
      totalBudget,
      totalSpent,
      remainingBudget,
      utilizationRate,
      avgProjectBudget
    };
  }, [enhancedProjects]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Project Overview</h2>
        <p className="text-gray-600">Monitor your construction projects and financial performance</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Projects</p>
              <p className="text-2xl font-bold text-gray-900">{projectStats.totalProjects}</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 text-xl">🏗️</span>
            </div>
          </div>
        </div>

        <div
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => window.dispatchEvent(new CustomEvent('navigate-to', { detail: 'projects' }))}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Projects</p>
              <p className="text-2xl font-bold text-gray-900">{projectStats.activeProjects}</p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-green-600 text-xl">⚡</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Budget</p>
              <p className="text-2xl font-bold text-gray-900">${(projectStats.totalBudget / 1000000).toFixed(1)}M</p>
            </div>
            <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <span className="text-yellow-600 text-xl">💰</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Utilization Rate</p>
              <p className="text-2xl font-bold text-gray-900">{Math.round(projectStats.utilizationRate)}%</p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-purple-600 text-xl">📊</span>
            </div>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {enhancedProjects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onSelect={() => window.dispatchEvent(new CustomEvent('navigate-to', { detail: 'projects' }))}
          />
        ))}
      </div>

      {/* Payment Queue Summary */}
      {projectQueueSummary.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Pending Payment Applications</h3>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="divide-y divide-gray-200">
              {projectQueueSummary.map((summary, index) => (
                <div key={index} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${priorityBadge[summary.highestPriority as keyof typeof priorityBadge]?.color}`}>
                        {priorityBadge[summary.highestPriority as keyof typeof priorityBadge]?.icon} {priorityBadge[summary.highestPriority as keyof typeof priorityBadge]?.label}
                      </span>
                      <h4 className="font-medium text-gray-900">{summary.projectName}</h4>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{summary.count} applications</p>
                      <p className="text-sm text-gray-600">${summary.total.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OverviewView;