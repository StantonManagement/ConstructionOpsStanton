'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Building, Users, DollarSign, Calendar, AlertCircle, CheckCircle, Clock, RefreshCw, Eye, Plus } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

// Utility functions
const formatCurrency = (amount: number | null | undefined): string => {
  if (amount == null) return '-';
  return `$${amount.toLocaleString()}`;
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

interface ProjectsViewProps {
  searchQuery?: string;
}

const ProjectsView: React.FC<ProjectsViewProps> = ({ searchQuery = '' }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showDataModal, setShowDataModal] = useState(false);
  const [modalData, setModalData] = useState<any[]>([]);
  const [modalTitle, setModalTitle] = useState('');
  const [modalType, setModalType] = useState('');
  const [loadingModalData, setLoadingModalData] = useState(false);
  const [projectModalData, setProjectModalData] = useState<any>({});
  const [loadingProjectModal, setLoadingProjectModal] = useState(false);

  // Fetch projects with stats
  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .order('name');

      if (projectsError) throw projectsError;

      // Enrich projects with stats
      const enrichedProjects = await Promise.all((projectsData || []).map(async (project: any) => {
        // Get contractors count
        const { data: contractorsData } = await supabase
          .from('project_contractors')
          .select('id')
          .eq('project_id', project.id)
          .eq('contract_status', 'active');

        // Get payment applications count
        const { data: paymentAppsData } = await supabase
          .from('payment_applications')
          .select('id, status')
          .eq('project_id', project.id);

        // Get total budget from active contracts
        const { data: budgetData } = await supabase
          .from('project_contractors')
          .select('contract_amount, paid_to_date')
          .eq('project_id', project.id)
          .eq('contract_status', 'active');

        const totalBudget = budgetData?.reduce((sum: number, contract: any) => 
          sum + (Number(contract.contract_amount) || 0), 0) || 0;
        
        // Calculate actual spent from approved payment applications only
        const { data: approvedPayments } = await supabase
          .from('payment_applications')
          .select('current_payment')
          .eq('project_id', project.id)
          .eq('status', 'approved');

        const totalSpent = approvedPayments?.reduce((sum: number, payment: any) => 
          sum + (Number(payment.current_payment) || 0), 0) || 0;

        const activePaymentApps = paymentAppsData?.filter((app: any) => 
          ['submitted', 'needs_review', 'approved'].includes(app.status)).length || 0;

        const completedPaymentApps = paymentAppsData?.filter((app: any) => 
          ['check_ready', 'sms_sent'].includes(app.status)).length || 0;

        const completionPercentage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

        return {
          ...project,
          stats: {
            totalContractors: contractorsData?.length || 0,
            activePaymentApps,
            completedPaymentApps,
            totalBudget,
            totalSpent,
            completionPercentage
          }
        };
      }));

      setProjects(enrichedProjects);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Filter projects based on search query
  const filteredProjects = projects.filter(project => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      project.name?.toLowerCase().includes(query) ||
      project.client_name?.toLowerCase().includes(query) ||
      project.current_phase?.toLowerCase().includes(query)
    );
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchProjects();
    setIsRefreshing(false);
  };

  // Function to handle stat card clicks
  const handleStatCardClick = async (project: any, type: string) => {
    setModalType(type);
    setLoadingModalData(true);
    setShowDataModal(true);

    try {
      let data: any[] = [];
      let title = '';

      switch (type) {
        case 'contractors':
          const { data: contractors, error: contractorsError } = await supabase
            .from('project_contractors')
            .select(`
              *,
              contractors:contractor_id (
                id,
                name,
                email,
                phone,
                trade
              )
            `)
            .eq('project_id', project.id)
            .eq('contract_status', 'active');

          if (!contractorsError && contractors) {
            data = contractors.map((pc: any) => ({
              id: pc.id,
              name: pc.contractors?.name || 'Unknown',
              email: pc.contractors?.email || '',
              phone: pc.contractors?.phone || '',
              trade: pc.contractors?.trade || '',
              contract_amount: pc.contract_amount,
              paid_to_date: pc.paid_to_date,
              contract_status: pc.contract_status
            }));
            title = `Contractors for ${project.name}`;
          }
          break;

        case 'payment_apps':
          const { data: paymentApps, error: paymentAppsError } = await supabase
            .from('payment_applications')
            .select(`
              *,
              contractors:contractor_id (
                id,
                name,
                trade
              )
            `)
            .eq('project_id', project.id)
            .in('status', ['submitted', 'sms_sent']);

          if (!paymentAppsError && paymentApps) {
            data = paymentApps.map((app: any) => ({
              id: app.id,
              contractor_name: app.contractors?.name || 'Unknown',
              trade: app.contractors?.trade || '',
              status: app.status,
              created_at: app.created_at,
              grand_total: app.grand_total
            }));
            title = `Active Payment Applications for ${project.name}`;
          }
          break;

        case 'completed':
          const { data: completedApps, error: completedAppsError } = await supabase
            .from('payment_applications')
            .select(`
              *,
              contractors:contractor_id (
                id,
                name,
                trade
              )
            `)
            .eq('project_id', project.id)
            .in('status', ['check_ready', 'sms_sent', 'approved']);

          if (!completedAppsError && completedApps) {
            data = completedApps.map((app: any) => ({
              id: app.id,
              contractor_name: app.contractors?.name || 'Unknown',
              trade: app.contractors?.trade || '',
              status: app.status,
              created_at: app.created_at,
              grand_total: app.grand_total
            }));
            title = `Completed Payment Applications for ${project.name}`;
          }
          break;
      }

      setModalData(data);
      setModalTitle(title);
    } catch (error) {
      console.error('Error fetching modal data:', error);
      setModalData([]);
    } finally {
      setLoadingModalData(false);
    }
  };

  // Function to close data modal
  const handleCloseDataModal = () => {
    setShowDataModal(false);
    setModalData([]);
    setModalTitle('');
    setModalType('');
  };

  const handleProjectClick = async (project: any) => {
    setSelectedProject(project);
    setShowProjectModal(true);
    setLoadingProjectModal(true);

    try {
      // Fetch comprehensive project data
      const [
        projectDetails,
        contractorsResult,
        paymentAppsResult,
        dailyLogsResult,
        pmNotesResult,
        lineItemsResult,
        contractsResult
      ] = await Promise.all([
        // Project details
        supabase
          .from('projects')
          .select('*')
          .eq('id', project.id)
          .single(),
        
        // Contractors
        supabase
          .from('project_contractors')
          .select(`
            *,
            contractors:contractor_id (
              id, name, trade, phone, email, performance_score
            )
          `)
          .eq('project_id', project.id),
        
        // Payment applications
        supabase
          .from('payment_applications')
          .select(`
            *,
            contractors:contractor_id (
              id, name, trade
            )
          `)
          .eq('project_id', project.id)
          .order('created_at', { ascending: false }),
        
        // Daily log requests
        supabase
          .from('daily_log_requests')
          .select('*')
          .eq('project_id', project.id)
          .order('request_date', { ascending: false }),
        
        // PM notes
        supabase
          .from('pm_notes')
          .select('*')
          .eq('project_id', project.id)
          .order('created_at', { ascending: false }),
        
        // Line items
        supabase
          .from('project_line_items')
          .select(`
            *,
            contractors:contractor_id (
              id, name, trade
            )
          `)
          .eq('project_id', project.id)
          .order('display_order', { ascending: true }),
        
        // Contracts
        supabase
          .from('contracts')
          .select(`
            *,
            contractors:subcontractor_id (
              id, name, trade
            )
          `)
          .eq('project_id', project.id)
      ]);

      setProjectModalData({
        project: projectDetails.data,
        contractors: contractorsResult.data || [],
        paymentApps: paymentAppsResult.data || [],
        dailyLogs: dailyLogsResult.data || [],
        pmNotes: pmNotesResult.data || [],
        lineItems: lineItemsResult.data || [],
        contracts: contractsResult.data || []
      });
    } catch (error) {
      console.error('Error fetching project data:', error);
    } finally {
      setLoadingProjectModal(false);
    }
  };

  const handleCloseModal = () => {
    setShowProjectModal(false);
    setSelectedProject(null);
    setProjectModalData({});
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-3 text-gray-600">Loading projects...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-600 mt-1">
            {filteredProjects.length} projects • Updated {new Date().toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-800">{error}</span>
            <button
              onClick={() => {
                setError(null);
                fetchProjects();
              }}
              className="ml-auto text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map((project) => (
          <div
            key={project.id}
            className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => handleProjectClick(project)}
          >
            {/* Project Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{project.name}</h3>
                <p className="text-sm text-gray-600">{project.client_name}</p>
              </div>
              <div className="flex items-center gap-2">
                {project.atRisk && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    At Risk
                  </span>
                )}
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  project.stats.completionPercentage >= 80 
                    ? 'bg-green-100 text-green-800' 
                    : project.stats.completionPercentage >= 50 
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {project.stats.completionPercentage}% Complete
                </span>
              </div>
            </div>

            {/* Interactive Stat Cards */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div 
                className="bg-blue-50 p-3 rounded-lg cursor-pointer hover:shadow-md transition-all duration-200"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatCardClick(project, 'contractors');
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-blue-600" />
                  <h4 className="font-medium text-gray-900 text-sm">Contractors</h4>
                </div>
                <p className="text-xl font-bold text-blue-600">{project.stats.totalContractors}</p>
                <p className="text-xs text-gray-600">Active</p>
                <div className="mt-1 text-xs text-blue-600 font-medium">
                  Click to view
                </div>
              </div>

              <div 
                className="bg-yellow-50 p-3 rounded-lg cursor-pointer hover:shadow-md transition-all duration-200"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatCardClick(project, 'payment_apps');
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-yellow-600" />
                  <h4 className="font-medium text-gray-900 text-sm">Payment Apps</h4>
                </div>
                <p className="text-xl font-bold text-yellow-600">{project.stats.activePaymentApps}</p>
                <p className="text-xs text-gray-600">Pending</p>
                <div className="mt-1 text-xs text-yellow-600 font-medium">
                  Click to view
                </div>
              </div>

              <div 
                className="bg-green-50 p-3 rounded-lg cursor-pointer hover:shadow-md transition-all duration-200"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatCardClick(project, 'completed');
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <h4 className="font-medium text-gray-900 text-sm">Completed</h4>
                </div>
                <p className="text-xl font-bold text-green-600">{project.stats.completedPaymentApps}</p>
                <p className="text-xs text-gray-600">Approved</p>
                <div className="mt-1 text-xs text-green-600 font-medium">
                  Click to view
                </div>
              </div>
            </div>

            {/* Budget Progress */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600">Budget</span>
                <span className="font-medium text-gray-900">{formatCurrency(project.stats.totalBudget)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    project.stats.completionPercentage > 90 ? 'bg-red-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(project.stats.completionPercentage, 100)}%` }}
                ></div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                <span>Spent: {formatCurrency(project.stats.totalSpent)}</span>
                <span>{project.stats.completionPercentage}%</span>
              </div>
            </div>

            {/* Project Details */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Phase:</span>
                <span className="font-medium text-gray-900">{project.current_phase}</span>
              </div>
              {project.daysToInspection > 0 && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Inspection:</span>
                  <span className={`font-medium ${project.daysToInspection <= 3 ? 'text-red-600' : 'text-gray-900'}`}>
                    {project.daysToInspection} days
                  </span>
                </div>
              )}
            </div>

            {/* Action Button */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const params = new URLSearchParams(searchParams.toString());
                  params.set('tab', 'payment');
                  params.set('subtab', 'processing');
                  params.set('project', project.id.toString());
                  router.replace(`/?${params.toString()}`, { scroll: false });
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Create Payment App
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredProjects.length === 0 && (
        <div className="text-center py-12 bg-white border-2 border-dashed border-gray-300 rounded-lg">
          <div className="text-4xl mb-4">🏗️</div>
          <p className="text-gray-500 font-medium">No projects found</p>
          <p className="text-sm text-gray-400">
            {searchQuery ? 'Try adjusting your search terms' : 'Create a new project to get started'}
          </p>
        </div>
      )}

      {/* Data Modal */}
      {showDataModal && (
        <div className="fixed inset-0  bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {modalTitle}
                </h3>
                <button
                  onClick={handleCloseDataModal}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {loadingModalData ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-3 text-gray-600">Loading data...</span>
                </div>
              ) : modalData.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="text-4xl mb-4">📭</div>
                    <p className="text-gray-500 font-medium">No data found</p>
                    <p className="text-sm text-gray-400">
                      {modalType === 'contractors' ? 'No contractors assigned to this project' :
                       modalType === 'payment_apps' ? 'No active payment applications found' :
                       modalType === 'completed' ? 'No completed payment applications found' :
                       'No data available'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {modalData.map((item: any) => (
                    <div key={item.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-gray-900">
                              {item.name || item.contractor_name || 'Unknown'}
                            </span>
                            {item.trade && (
                              <span className="text-xs text-gray-500">
                                {item.trade}
                              </span>
                            )}
                          </div>
                          {item.email && (
                            <div className="text-sm text-gray-600">
                              {item.email}
                            </div>
                          )}
                          {item.phone && (
                            <div className="text-sm text-gray-600">
                              {item.phone}
                            </div>
                          )}
                          {item.created_at && (
                            <div className="text-sm text-gray-600">
                              Created: {formatDate(item.created_at)}
                            </div>
                          )}
                          {item.grand_total && (
                            <div className="text-sm text-gray-600">
                              Amount: {formatCurrency(item.grand_total)}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          {item.status && (
                            <div className={`text-sm font-medium ${
                              item.status === 'approved' ? 'text-green-600' :
                              item.status === 'submitted' ? 'text-red-600' :
                              item.status === 'needs_review' ? 'text-yellow-600' :
                              item.status === 'check_ready' ? 'text-purple-600' :
                              item.status === 'sms_sent' ? 'text-blue-600' :
                              'text-gray-600'
                            }`}>
                              {item.status.replace('_', ' ').toUpperCase()}
                            </div>
                          )}
                          {item.contract_amount && (
                            <div className="text-sm text-gray-600">
                              Contract: {formatCurrency(item.contract_amount)}
                            </div>
                          )}
                          {item.paid_to_date && (
                            <div className="text-sm text-gray-600">
                              Paid: {formatCurrency(item.paid_to_date)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Project Detail Modal */}
      {showProjectModal && selectedProject && (
        <div className="fixed inset-0  bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">
                  {loadingProjectModal ? 'Loading Project Details...' : `${projectModalData.project?.name || 'Project Details'}`}
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(95vh-120px)]">
              {loadingProjectModal ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-3 text-gray-600">Loading project data...</span>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Project Overview */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Project Overview</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Project Name</label>
                        <p className="text-lg font-semibold text-gray-900">{projectModalData.project?.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Client</label>
                        <p className="text-lg font-semibold text-gray-900">{projectModalData.project?.client_name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Status</label>
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          projectModalData.project?.at_risk 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {projectModalData.project?.at_risk ? '⚠️ At Risk' : '✅ On Track'}
                        </span>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Phase</label>
                        <p className="text-lg font-semibold text-gray-900">{projectModalData.project?.current_phase || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Budget</label>
                        <p className="text-lg font-semibold text-gray-900">{formatCurrency(projectModalData.project?.budget || 0)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Spent</label>
                        <p className="text-lg font-semibold text-gray-900">{formatCurrency(projectModalData.project?.spent || 0)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Start Date</label>
                        <p className="text-lg font-semibold text-gray-900">
                          {projectModalData.project?.start_date ? formatDate(projectModalData.project.start_date) : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Target Completion</label>
                        <p className="text-lg font-semibold text-gray-900">
                          {projectModalData.project?.target_completion_date ? formatDate(projectModalData.project.target_completion_date) : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Contractors */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Contractors ({projectModalData.contractors?.length || 0})</h4>
                    {projectModalData.contractors?.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trade</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contract Amount</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid to Date</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {projectModalData.contractors.map((contractor: any) => (
                              <tr key={contractor.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {contractor.contractors?.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {contractor.contractors?.trade}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  <div>{contractor.contractors?.phone}</div>
                                  <div>{contractor.contractors?.email}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {formatCurrency(contractor.contract_amount || 0)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {formatCurrency(contractor.paid_to_date || 0)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                    contractor.contract_status === 'active' 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {contractor.contract_status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-gray-50 rounded-lg">
                        <div className="text-4xl mb-4">👷</div>
                        <p className="text-gray-500 font-medium">No contractors assigned</p>
                        <p className="text-sm text-gray-400">This project doesn't have any contractors assigned yet</p>
                      </div>
                    )}
                  </div>

                  {/* Payment Applications */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Payment Applications ({projectModalData.paymentApps?.length || 0})</h4>
                    {projectModalData.paymentApps?.length > 0 ? (
                      <div className="space-y-3">
                        {projectModalData.paymentApps.map((app: any) => (
                          <div key={app.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors cursor-pointer">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-sm font-medium text-gray-900">
                                    {app.contractors?.name || 'Unknown Contractor'}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {app.contractors?.trade || ''}
                                  </span>
                                </div>
                                <div className="text-sm text-gray-600">
                                  Amount: {formatCurrency(app.current_payment || 0)} • Created: {formatDate(app.created_at)}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className={`text-sm font-medium ${
                                  app.status === 'approved' ? 'text-green-600' :
                                  app.status === 'submitted' ? 'text-red-600' :
                                  app.status === 'needs_review' ? 'text-yellow-600' :
                                  app.status === 'check_ready' ? 'text-purple-600' :
                                  app.status === 'sms_sent' ? 'text-blue-600' :
                                  'text-gray-600'
                                }`}>
                                  {app.status.replace('_', ' ').toUpperCase()}
                                </div>
                                <div className="text-xs text-gray-500">
                                  ID: {app.id}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-gray-50 rounded-lg">
                        <div className="text-4xl mb-4">📋</div>
                        <p className="text-gray-500 font-medium">No payment applications</p>
                        <p className="text-sm text-gray-400">This project doesn't have any payment applications yet</p>
                      </div>
                    )}
                  </div>

                  {/* Daily Log Requests */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Daily Log Requests ({projectModalData.dailyLogs?.length || 0})</h4>
                    {projectModalData.dailyLogs?.length > 0 ? (
                      <div className="space-y-3">
                        {projectModalData.dailyLogs.map((log: any) => (
                          <div key={log.id} className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900">
                                  {formatDate(log.request_date)}
                                </span>
                                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                  log.request_status === 'received' ? 'bg-green-100 text-green-800' :
                                  log.request_status === 'sent' ? 'bg-blue-100 text-blue-800' :
                                  log.request_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {log.request_status.toUpperCase()}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500">
                                Retries: {log.retry_count}/{log.max_retries}
                              </div>
                            </div>
                            <div className="text-sm text-gray-600">
                              <div>PM Phone: {log.pm_phone_number}</div>
                              <div>Request Time: {log.request_time}</div>
                              {log.received_notes && (
                                <div className="mt-2 p-2 bg-white rounded border">
                                  <strong>Notes:</strong> {log.received_notes}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">No daily log requests for this project</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.set('tab', 'payment');
                  params.set('subtab', 'processing');
                  params.set('project', selectedProject.id.toString());
                  router.replace(`/?${params.toString()}`, { scroll: false });
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Payment Apps
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsView;
