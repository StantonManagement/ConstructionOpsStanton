"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Header from "./Header";
import UserProfile from "./UserProfile";

// Utility functions
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Tab Navigation Component
function TabNavigation({ activeTab, onTabChange }: { activeTab: string; onTabChange: (tab: string) => void }) {
  const tabs = [
    { id: 'payments', label: 'Payment Applications', icon: '💰' },
    { id: 'projects', label: 'Projects', icon: '🏗️' },
    { id: 'notes', label: 'Daily Log Requests', icon: '📝' }
  ];

  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="-mb-px flex space-x-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

// Project Overview Component
function ProjectOverview({ project, onCreatePaymentApps, onStatsPaymentAppClick }: { project: any; onCreatePaymentApps: (projectId: number) => void; onStatsPaymentAppClick: (appId: number) => void }) {
  const [loading, setLoading] = useState(false);
  const [projectStats, setProjectStats] = useState<any>({
    totalContractors: 0,
    activePaymentApps: 0,
    completedPaymentApps: 0,
    totalBudget: 0,
    totalSpent: 0,
    completionPercentage: 0
  });

  // New state for data modal
  const [showDataModal, setShowDataModal] = useState(false);
  const [modalData, setModalData] = useState<any[]>([]);
  const [modalTitle, setModalTitle] = useState('');
  const [modalType, setModalType] = useState('');
  const [loadingModalData, setLoadingModalData] = useState(false);
  const [needsRefresh, setNeedsRefresh] = useState(false);

  const router = useRouter();

  // Project modal state
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projectModalData, setProjectModalData] = useState<any>({});
  const [loadingProjectModal, setLoadingProjectModal] = useState(false);

  if (!project) return null;

  // Function to handle stat card clicks
  const handleStatCardClick = async (type: string) => {
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
            .eq('status', 'approved');

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

  // Function to handle payment application click
  const handlePaymentAppClick = (appId: number) => {
    // Pass the current context as URL parameters for proper back navigation
    const returnTo = `/pm-dashboard?tab=projects&projectId=${project.id}`;
    router.push(`/payments/${appId}/verify?returnTo=${encodeURIComponent(returnTo)}&projectId=${project.id}`);
  };

  // Function to refresh project stats
  const handleRefreshStats = async () => {
    setLoading(true);
    try {
      // Fetch contractors for this project
      const { data: contractors, error: contractorsError } = await supabase
        .from('project_contractors')
        .select('*')
        .eq('project_id', project.id)
        .eq('contract_status', 'active');

      // Fetch payment applications for this project
      const { data: paymentApps, error: paymentAppsError } = await supabase
        .from('payment_applications')
        .select('*')
        .eq('project_id', project.id);

      if (!contractorsError && !paymentAppsError) {
        const activeApps = paymentApps?.filter((app: any) => 
          ['submitted', 'sms_sent'].includes(app.status)
        ) || [];
        const completedApps = paymentApps?.filter((app: any) => 
          app.status === 'approved'
        ) || [];

        const totalBudget = contractors?.reduce((sum: number, c: any) => 
          sum + (Number(c.contract_amount) || 0), 0
        ) || 0;
        const totalSpent = contractors?.reduce((sum: number, c: any) => 
          sum + (Number(c.paid_to_date) || 0), 0
        ) || 0;

        setProjectStats({
          totalContractors: contractors?.length || 0,
          activePaymentApps: activeApps.length,
          completedPaymentApps: completedApps.length,
          totalBudget,
          totalSpent,
          completionPercentage: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0
        });
      }
    } catch (error) {
      console.error('Error refreshing project stats:', error);
    } finally {
      setLoading(false);
      setNeedsRefresh(false);
    }
  };

  // Function to get status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'submitted':
        return 'bg-yellow-100 text-yellow-800';
      case 'sms_sent':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  useEffect(() => {
    const fetchProjectStats = async () => {
      setLoading(true);
      try {
        // Fetch contractors for this project
        const { data: contractors, error: contractorsError } = await supabase
          .from('project_contractors')
          .select('*')
          .eq('project_id', project.id)
          .eq('contract_status', 'active');

        // Fetch payment applications for this project
        const { data: paymentApps, error: paymentAppsError } = await supabase
          .from('payment_applications')
          .select('*')
          .eq('project_id', project.id);

        if (!contractorsError && !paymentAppsError) {
          const activeApps = paymentApps?.filter((app: any) => 
            ['submitted', 'sms_sent'].includes(app.status)
          ) || [];
          const completedApps = paymentApps?.filter((app: any) => 
            app.status === 'approved'
          ) || [];

          const totalBudget = contractors?.reduce((sum: number, c: any) => 
            sum + (Number(c.contract_amount) || 0), 0
          ) || 0;
          
          // Calculate actual spent from approved payment applications
          const { data: approvedPayments } = await supabase
            .from('payment_applications')
            .select('current_payment')
            .eq('project_id', project.id)
            .eq('status', 'approved');

          const totalSpent = approvedPayments?.reduce((sum: number, payment: any) => 
            sum + (Number(payment.current_payment) || 0), 0
          ) || 0;

          setProjectStats({
            totalContractors: contractors?.length || 0,
            activePaymentApps: activeApps.length,
            completedPaymentApps: completedApps.length,
            totalBudget,
            totalSpent,
            completionPercentage: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0
          });
        }
      } catch (error) {
        console.error('Error fetching project stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (project) {
      fetchProjectStats();
    }
  }, [project]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            <div className="h-3 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  // Function to handle project card click
  const handleProjectCardClick = async () => {
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

  const handleCloseProjectModal = () => {
    setShowProjectModal(false);
    setProjectModalData({});
  };

  return (
    <>
      <div 
        className="bg-white rounded-lg border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-all duration-200"
        onClick={handleProjectCardClick}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              project.at_risk 
                ? 'bg-red-100 text-red-800' 
                : 'bg-green-100 text-green-800'
            }`}>
              {project.at_risk ? '⚠️ At Risk' : '✅ On Track'}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation(); // Prevent triggering the card click
                onCreatePaymentApps(project.id);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              📋 Create Payment App
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div 
            className="bg-blue-50 p-4 rounded-lg cursor-pointer hover:shadow-md transition-all duration-200"
            onClick={(e) => {
              e.stopPropagation(); // Prevent triggering the project card click
              handleStatCardClick('contractors');
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-blue-600">👥</span>
              <h4 className="font-medium text-gray-900">Contractors</h4>
            </div>
            <p className="text-2xl font-bold text-blue-600">{projectStats.totalContractors}</p>
            <p className="text-sm text-gray-600">Active on project</p>
            <div className="mt-2 text-xs text-blue-600 font-medium">
              💬 Click to view details
            </div>
          </div>

          <div 
            className="bg-yellow-50 p-4 rounded-lg cursor-pointer hover:shadow-md transition-all duration-200"
            onClick={(e) => {
              e.stopPropagation(); // Prevent triggering the project card click
              handleStatCardClick('payment_apps');
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-yellow-600">📋</span>
              <h4 className="font-medium text-gray-900">Payment Apps</h4>
            </div>
            <p className="text-2xl font-bold text-yellow-600">{projectStats.activePaymentApps}</p>
            <p className="text-sm text-gray-600">Pending review</p>
            <div className="mt-2 text-xs text-yellow-600 font-medium">
              💬 Click to view details
            </div>
          </div>

          <div 
            className="bg-green-50 p-4 rounded-lg cursor-pointer hover:shadow-md transition-all duration-200"
            onClick={(e) => {
              e.stopPropagation(); // Prevent triggering the project card click
              handleStatCardClick('completed');
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-green-600">✅</span>
              <h4 className="font-medium text-gray-900">Completed</h4>
            </div>
            <p className="text-2xl font-bold text-green-600">{projectStats.completedPaymentApps}</p>
            <p className="text-sm text-gray-600">Approved payments</p>
            <div className="mt-2 text-xs text-green-600 font-medium">
              💬 Click to view details
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Budget Progress</span>
              <span className="text-sm text-gray-600">
                {formatCurrency(projectStats.totalSpent)} / {formatCurrency(projectStats.totalBudget)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  projectStats.completionPercentage > 90 ? 'bg-red-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(projectStats.completionPercentage, 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-gray-500">
                {projectStats.completionPercentage}% Complete
              </span>
              <span className="text-xs text-gray-500">
                {projectStats.completionPercentage > 90 ? '⚠️ Over Budget' : '✅ On Track'}
              </span>
            </div>
          </div>
        </div>
      </div>

              {/* Data Modal */}
        {showDataModal && (
          <div className="fixed inset-0  bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {modalTitle}
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRefreshStats}
                      className="text-blue-600 hover:text-blue-700 p-1"
                      title="Refresh data"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
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
              </div>

        {/* Project Modal */}
        {showProjectModal && (
          <div className="fixed inset-0  bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {loadingProjectModal ? 'Loading Project Details...' : `${projectModalData.project?.name || 'Project Details'}`}
                  </h3>
                  <button
                    onClick={handleCloseProjectModal}
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
                        <p className="text-gray-500 text-center py-4">No contractors assigned to this project</p>
                      )}
                    </div>

                    {/* Payment Applications */}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Payment Applications ({projectModalData.paymentApps?.length || 0})</h4>
                      {projectModalData.paymentApps?.length > 0 ? (
                        <div className="space-y-3">
                          {projectModalData.paymentApps.map((app: any) => (
                            <div key={app.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors cursor-pointer"
                                 onClick={() => onStatsPaymentAppClick(app.id)}>
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
                        <p className="text-gray-500 text-center py-4">No payment applications for this project</p>
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

                    {/* PM Notes */}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">PM Notes ({projectModalData.pmNotes?.length || 0})</h4>
                      {projectModalData.pmNotes?.length > 0 ? (
                        <div className="space-y-3">
                          {projectModalData.pmNotes.map((note: any) => (
                            <div key={note.id} className="bg-gray-50 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-900">
                                    {formatDate(note.created_at)}
                                  </span>
                                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                    note.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {note.is_active ? 'ACTIVE' : 'INACTIVE'}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500">
                                  {note.scheduled_time}
                                </div>
                              </div>
                              <div className="text-sm text-gray-600">
                                {note.note}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-4">No PM notes for this project</p>
                      )}
                    </div>

                    {/* Line Items */}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Line Items ({projectModalData.lineItems?.length || 0})</h4>
                      {projectModalData.lineItems?.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item No</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contractor</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scheduled Value</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">% Complete</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {projectModalData.lineItems.map((item: any) => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {item.item_no}
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                    {item.description_of_work}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {item.contractors?.name}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {formatCurrency(item.scheduled_value || 0)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {item.percent_completed ? `${Math.round(item.percent_completed * 100)}%` : 'N/A'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                      item.status === 'active' 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-gray-100 text-gray-800'
                                    }`}>
                                      {item.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-4">No line items for this project</p>
                      )}
                    </div>

                    {/* Contracts */}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Contracts ({projectModalData.contracts?.length || 0})</h4>
                      {projectModalData.contracts?.length > 0 ? (
                        <div className="space-y-3">
                          {projectModalData.contracts.map((contract: any) => (
                            <div key={contract.id} className="bg-gray-50 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-900">
                                    {contract.contractors?.name || 'Unknown Contractor'}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {contract.contractors?.trade || ''}
                                  </span>
                                </div>
                                <div className="text-sm font-medium text-gray-900">
                                  {formatCurrency(contract.contract_amount || 0)}
                                </div>
                              </div>
                              <div className="text-sm text-gray-600">
                                <div>Start: {contract.start_date ? formatDate(contract.start_date) : 'N/A'}</div>
                                <div>End: {contract.end_date ? formatDate(contract.end_date) : 'N/A'}</div>
                                <div>Created: {formatDate(contract.created_at)}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-4">No contracts for this project</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {loadingModalData ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">Loading data...</span>
                </div>
              ) : modalData.length > 0 ? (
                <div className="space-y-4">
                  {modalType === 'contractors' ? (
                    // Contractors table
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trade</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contract Amount</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid to Date</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {modalData.map((contractor: any) => (
                            <tr key={contractor.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {contractor.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {contractor.trade}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <div>{contractor.email}</div>
                                <div>{contractor.phone}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatCurrency(contractor.contract_amount || 0)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatCurrency(contractor.paid_to_date || 0)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    // Payment applications table
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contractor</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trade</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {modalData.map((app: any) => (
                            <tr 
                              key={app.id} 
                              className="hover:bg-gray-50 cursor-pointer"
                              onClick={() => handlePaymentAppClick(app.id)}
                            >
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                #{app.id}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {app.contractor_name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {app.trade}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(app.status)}`}>
                                  {app.status.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatCurrency(app.grand_total || 0)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatDate(app.created_at)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">
                    {modalType === 'contractors' ? '👥' : '📋'}
                  </div>
                  <p className="text-gray-500 font-medium">No data found</p>
                  <p className="text-sm text-gray-400">
                    {modalType === 'contractors' 
                      ? 'No active contractors found for this project.'
                      : modalType === 'payment_apps'
                      ? 'No active payment applications found for this project.'
                      : 'No completed payment applications found for this project.'
                    }
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  {modalData.length > 0 ? (
                    <span>
                      Found {modalData.length} {modalType === 'contractors' ? 'contractor' : 'payment application'}{modalData.length !== 1 ? 's' : ''}
                      {modalType !== 'contractors' && (
                        <span className="ml-2 text-blue-600">💡 Click on any row to view details</span>
                      )}
                    </span>
                  ) : (
                    <span>No data available</span>
                  )}
                </div>
                <button
                  onClick={handleCloseDataModal}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// PM Notes Component
function DailyLogRequests({ projects }: { projects: any[] }) {
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [showAddRequest, setShowAddRequest] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [pmPhoneNumber, setPmPhoneNumber] = useState('');
  const [requestTime, setRequestTime] = useState('18:00'); // Default to 6 PM EST

  // New state for view modal
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [pmNotes, setPmNotes] = useState<any[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);

  // Phone number validation
  const validatePhoneNumber = (phone: string) => {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    // Check if it's a valid US phone number (10 or 11 digits)
    return cleaned.length === 10 || cleaned.length === 11;
  };

  const [phoneError, setPhoneError] = useState('');

  if (!projects || !Array.isArray(projects)) return null;

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_log_requests')
        .select(`
          *,
          project:projects(name, client_name)
        `)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setRequests(data);
      }
    } catch (error) {
      console.error('Error fetching daily log requests:', error);
    }
  };

  const handleAddRequest = async () => {
    if (!selectedProject || !pmPhoneNumber.trim()) return;

    // Validate phone number
    if (!validatePhoneNumber(pmPhoneNumber)) {
      setPhoneError('Please enter a valid phone number (10 or 11 digits)');
      return;
    }
    setPhoneError('');

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('daily_log_requests')
        .insert({
          project_id: selectedProject.id,
          request_date: new Date().toISOString().split('T')[0],
          pm_phone_number: pmPhoneNumber.trim(),
          request_status: 'pending',
          request_time: requestTime // Add the custom time
        })
        .select();

      if (!error && data) {
        setSelectedProject(null);
        setPmPhoneNumber('');
        setRequestTime('18:00'); // Reset to default
        setShowAddRequest(false);
        await fetchRequests();
        alert(`Daily log request added successfully! The system will automatically request notes from the PM daily at ${requestTime} EST.`);
      } else {
        alert('Failed to add request: ' + (error?.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error adding request:', error);
      alert('Failed to add request');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRequest = async (requestId: number) => {
    if (!confirm('Are you sure you want to delete this daily log request?')) return;

    try {
      const { error } = await supabase
        .from('daily_log_requests')
        .delete()
        .eq('id', requestId);

      if (!error) {
        await fetchRequests();
        alert('Request deleted successfully');
      } else {
        alert('Failed to delete request: ' + error.message);
      }
    } catch (error) {
      console.error('Error deleting request:', error);
      alert('Failed to delete request');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; text: string }> = {
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending' },
      sent: { color: 'bg-blue-100 text-blue-800', text: 'Sent' },
      received: { color: 'bg-green-100 text-green-800', text: 'Received' },
      failed: { color: 'bg-red-100 text-red-800', text: 'Failed' }
    };

    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', text: status };
    return <span className={`text-xs px-2 py-1 rounded-full ${config.color}`}>{config.text}</span>;
  };

  // Function to handle viewing PM notes for a request
  const handleViewRequest = async (request: any) => {
    setSelectedRequest(request);
    setShowViewModal(true);
    setLoadingNotes(true);

    try {
      // Fetch PM notes from payment applications for this project
      const { data: notes, error } = await supabase
        .from('payment_applications')
        .select('id, pm_notes, created_at, status')
        .eq('project_id', request.project_id)
        .not('pm_notes', 'is', null)
        .order('created_at', { ascending: false });

      if (!error && notes) {
        setPmNotes(notes);
      } else {
        console.error('Error fetching PM notes:', error);
        setPmNotes([]);
      }
    } catch (error) {
      console.error('Error fetching PM notes:', error);
      setPmNotes([]);
    } finally {
      setLoadingNotes(false);
    }
  };

  // Function to close view modal
  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setSelectedRequest(null);
    setPmNotes([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Daily Log Requests</h2>
        <button
          onClick={() => setShowAddRequest(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          📝 Add Request
        </button>
      </div>

      {/* Add Request Modal */}
      {showAddRequest && (
        <div className="fixed inset-0  bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Daily Log Request</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Project</label>
                  <select
                    value={selectedProject?.id || ''}
                    onChange={(e) => {
                      const project = projects.find(p => p.id === Number(e.target.value));
                      setSelectedProject(project);
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name} - {project.client_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">PM Phone Number</label>
                  <input
                    type="tel"
                    value={pmPhoneNumber}
                    onChange={(e) => {
                      setPmPhoneNumber(e.target.value);
                      if (phoneError) setPhoneError('');
                    }}
                    className={`w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 ${
                      phoneError ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="+1234567890"
                  />
                  {phoneError && (
                    <p className="text-sm text-red-600 mt-1">{phoneError}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Request Time (EST)</label>
                  <input
                    type="time"
                    value={requestTime}
                    onChange={(e) => setRequestTime(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Select the time when the system should send daily SMS requests (EST timezone)
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>How it works:</strong> The system will automatically send SMS requests to the PM daily at {requestTime} EST, 
                    asking for notes about each active project. It will retry every 30 minutes until notes are received.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddRequest(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddRequest}
                  disabled={loading || !selectedProject || !pmPhoneNumber.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Adding...' : 'Add Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Requests List */}
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {requests.map((request) => (
              <div 
                key={request.id} 
                className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:shadow-md transition-all duration-200"
                onClick={() => handleViewRequest(request)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        {request.project?.name} - {request.project?.client_name}
                      </span>
                      {getStatusBadge(request.request_status)}
                    </div>

                    <div className="text-sm text-gray-600 mb-2">
                      <div>PM Phone: {request.pm_phone_number}</div>
                      <div>Request Date: {request.request_date}</div>
                      <div>Request Time: {request.request_time || '18:00'} EST</div>
                      {request.retry_count > 0 && (
                        <div>Retry Count: {request.retry_count}</div>
                      )}
                      {request.received_notes && (
                        <div className="mt-2 p-2 bg-gray-50 rounded border">
                          <strong>Received Notes:</strong> {request.received_notes}
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-gray-500">
                      Created: {request.created_at ? formatDate(request.created_at) : 'Unknown'}
                      {request.last_request_sent_at && (
                        <span> • Last Sent: {formatDate(request.last_request_sent_at)}</span>
                      )}
                      {request.received_at && (
                        <span> • Received: {formatDate(request.received_at)}</span>
                      )}
                    </div>

                    <div className="mt-2 text-xs text-blue-600 font-medium">
                      💬 Click to view Daily Logs and replies
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteRequest(request.id);
                    }}
                    className="text-red-600 hover:text-red-800 p-1"
                    title="Delete request"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}

            {requests.length === 0 && (
              <div className="text-center py-12 bg-white border-2 border-dashed border-gray-300 rounded-lg">
                <div className="text-4xl mb-4">📝</div>
                <p className="text-gray-500 font-medium">No daily log requests yet</p>
                <p className="text-sm text-gray-400">Add requests to automatically ask PM managers for daily notes</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* View PM Notes Modal */}
      {showViewModal && selectedRequest && (
        <div className="fixed inset-0  bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Daily Logs - {selectedRequest.project?.name}
                </h3>
                <button
                  onClick={handleCloseViewModal}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mt-2 text-sm text-gray-600">
                <div>Project: {selectedRequest.project?.name} - {selectedRequest.project?.client_name}</div>
                <div>PM Phone: {selectedRequest.pm_phone_number}</div>
                <div>Request Status: {selectedRequest.request_status}</div>
                <div>Request Time: {selectedRequest.request_time || '18:00'} EST</div>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {loadingNotes ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">Loading PM notes...</span>
                </div>
              ) : pmNotes.length > 0 ? (
                <div className="space-y-4">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">
                    PM Notes from Payment Applications ({pmNotes.length})
                  </h4>
                  {pmNotes.map((note, index) => (
                    <div key={note.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900">
                          Payment App #{note.id}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          note.status === 'approved' ? 'bg-green-100 text-green-800' :
                          note.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          note.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {note.status}
                        </span>
                      </div>

                      <div className="text-sm text-gray-600 mb-2">
                        <div>Created: {formatDate(note.created_at)}</div>
                      </div>

                      <div className="bg-white rounded p-3 border border-gray-200">
                        <div className="text-sm text-gray-900 font-medium mb-1">PM Notes:</div>
                        <div className="text-sm text-gray-700 whitespace-pre-wrap">
                          {note.pm_notes}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">📝</div>
                  <p className="text-gray-500 font-medium">No Daily Logs found</p>
                  <p className="text-sm text-gray-400">
                    No Daily Logs have been submitted for this project yet.
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  {pmNotes.length > 0 ? (
                    <span>Found {pmNotes.length} PM note{pmNotes.length !== 1 ? 's' : ''} from payment applications</span>
                  ) : (
                    <span>No Daily Logs available</span>
                  )}
                </div>
                <button
                  onClick={handleCloseViewModal}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Mobile-Optimized Stat Card Component
function CompactStatCard({ icon, label, value, change, color, onClick }: any) {
  if (icon === undefined || label === undefined || value === undefined) return null;
  const colorClasses: Record<string, string> = {
    orange: "border-orange-400 bg-orange-50",
    blue: "border-blue-400 bg-blue-50",
    green: "border-green-400 bg-green-50",
    purple: "border-purple-400 bg-purple-50",
    red: "border-red-400 bg-red-50",
  };

  return (
    <div 
      className={`p-3 sm:p-4 rounded-lg border-l-4 ${colorClasses[color]} hover:shadow-md transition-shadow cursor-pointer`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-base sm:text-lg flex-shrink-0">{icon}</span>
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">{label}</p>
            <p className="text-lg sm:text-xl font-bold text-gray-900 truncate">{value}</p>
          </div>
        </div>
        {change && (
          <div className={`text-xs font-semibold flex-shrink-0 ml-2 ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
            <span className="hidden sm:inline">{change > 0 ? '↗' : '↘'} {Math.abs(change)}%</span>
            <span className="sm:hidden">{change > 0 ? '↗' : '↘'}{Math.abs(change)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Compact Stats Overview
function CompactStats({ pendingSMS, reviewQueue, readyChecks, weeklyTotal, onStatClick }: any) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <CompactStatCard
        icon="📱"
        label="SMS Pending"
        value={pendingSMS}
        change={-5}
        color="orange"
        onClick={() => onStatClick('sms_pending')}
      />
      <CompactStatCard
        icon="⚠️"
        label="Review Queue"
        value={reviewQueue}
        change={12}
        color="red"
        onClick={() => onStatClick('review_queue')}
      />
      <CompactStatCard
        icon="📤"
        label="SMS Sent"
        value={readyChecks}
        change={8}
        color="blue"
        onClick={() => onStatClick('ready')}
      />
      <CompactStatCard
        icon="💰"
        label="Weekly"
        value={formatCurrency(weeklyTotal)}
        change={15}
        color="purple"
        onClick={() => onStatClick('weekly')}
      />
    </div>
  );
}

// Mobile Payment Card Component
function PaymentCard({ application, isSelected, onSelect, onVerify, getDocumentForApp, sendForSignature }: any) {
  const [grandTotal, setGrandTotal] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

  if (!application) return null;

  useEffect(() => {
    async function fetchGrandTotal() {
      const lineItemIds = (application.line_item_progress || [])
        .map((lip: any) => lip.line_item?.id)
        .filter(Boolean);
      if (!lineItemIds.length) return setGrandTotal(0);
      const { data, error } = await supabase
        .from("project_line_items")
        .select("amount_for_this_period")
        .in("id", lineItemIds);
      if (!error && data) {
        const total = data.reduce(
          (sum: number, pli: any) => sum + (Number(pli.amount_for_this_period) || 0),
          0
        );
        setGrandTotal(total);
      }
    }
    fetchGrandTotal();
  }, [application.line_item_progress]);

  const statusConfig: any = {
    submitted: { 
      color: "bg-red-100 text-red-800 border-red-200", 
      priority: "URGENT",
      icon: "🚨"
    },
    needs_review: { 
      color: "bg-yellow-100 text-yellow-800 border-yellow-200", 
      priority: "HIGH",
      icon: "⚠️"
    },
    sms_complete: { 
      color: "bg-blue-100 text-blue-800 border-blue-200", 
      priority: "READY",
      icon: "📱"
    },
    approved: { 
      color: "bg-green-100 text-green-800 border-green-200", 
      priority: "DONE",
      icon: "✅"
    },
    check_ready: { 
      color: "bg-purple-100 text-purple-800 border-purple-200", 
      priority: "PICKUP",
      icon: "💰"
    },
  };

  const config = statusConfig[application.status] || statusConfig.needs_review;
  const doc = getDocumentForApp(application.id);

  return (
    <div className={`bg-white border rounded-lg p-4 transition-all ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelect(application.id, e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 mt-1"
          />
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm truncate">{application.project?.name}</h3>
            <p className="text-xs text-gray-500">#{application.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${config.color}`}>
            {config.icon}
          </span>
          {config.priority === "URGENT" && (
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <p className="text-xs text-gray-500">Contractor</p>
          <p className="text-sm font-medium text-gray-900 truncate">{application.contractor?.name}</p>
          {application.contractor?.trade && (
            <p className="text-xs text-gray-500">{application.contractor.trade}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Amount</p>
          <p className="text-lg font-bold text-green-600">{formatCurrency(grandTotal)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">
          {application.created_at ? formatDate(application.created_at) : "-"}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onVerify(application.id)}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
              config.priority === "URGENT" 
                ? "bg-red-600 text-white hover:bg-red-700" 
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {config.priority === "URGENT" ? "Review" : "View"}
          </button>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Toggle details"
          >
            <svg className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {showDetails && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <h4 className="font-semibold text-xs text-gray-700 mb-1">Line Items</h4>
              <p className="text-sm text-gray-600">
                {(application.line_item_progress || []).filter((lip: any) => lip.line_item).length} items
              </p>
            </div>
            {doc && (
              <div>
                <h4 className="font-semibold text-xs text-gray-700 mb-1">Actions</h4>
                <div className="flex gap-2">
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300 transition-colors"
                  >
                    📄 PDF
                  </a>
                  <button
                    onClick={() => sendForSignature(application.id)}
                    className="px-2 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700 transition-colors"
                  >
                    ✍️ Sign
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Payment Application Row Component
function PaymentRow({ application, isSelected, onSelect, onVerify, getDocumentForApp, sendForSignature }: any) {
  const [grandTotal, setGrandTotal] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

  if (!application) return null;

  useEffect(() => {
    async function fetchGrandTotal() {
      const lineItemIds = (application.line_item_progress || [])
        .map((lip: any) => lip.line_item?.id)
        .filter(Boolean);
      if (!lineItemIds.length) return setGrandTotal(0);
      const { data, error } = await supabase
        .from("project_line_items")
        .select("amount_for_this_period")
        .in("id", lineItemIds);
      if (!error && data) {
        const total = data.reduce(
          (sum: number, pli: any) => sum + (Number(pli.amount_for_this_period) || 0),
          0
        );
        setGrandTotal(total);
      }
    }
    fetchGrandTotal();
  }, [application.line_item_progress]);

  const statusConfig: any = {
    submitted: { 
      color: "bg-red-100 text-red-800 border-red-200", 
      priority: "URGENT",
      icon: "🚨"
    },
    needs_review: { 
      color: "bg-yellow-100 text-yellow-800 border-yellow-200", 
      priority: "HIGH",
      icon: "⚠️"
    },
    sms_complete: { 
      color: "bg-blue-100 text-blue-800 border-blue-200", 
      priority: "READY",
      icon: "📱"
    },
    approved: { 
      color: "bg-green-100 text-green-800 border-green-200", 
      priority: "DONE",
      icon: "✅"
    },
    check_ready: { 
      color: "bg-purple-100 text-purple-800 border-purple-200", 
      priority: "PICKUP",
      icon: "💰"
    },
  };

  const config = statusConfig[application.status] || statusConfig.needs_review;
  const doc = getDocumentForApp(application.id);

  return (
    <>
      <tr className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}>
        <td className="px-4 py-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelect(application.id, e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${config.color}`}>
              {config.icon}
            </span>
            {config.priority === "URGENT" && (
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            )}
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-col">
            <span className="font-semibold text-gray-900 text-sm">{application.project?.name}</span>
            <span className="text-xs text-gray-500">#{application.id}</span>
          </div>
        </td>
        <td className="px-4 py-3">
          <span className="text-sm text-gray-700">{application.contractor?.name}</span>
          <div className="text-xs text-gray-500">{application.contractor?.trade}</div>
        </td>
        <td className="px-4 py-3 text-right">
          <span className="font-semibold text-green-600">{formatCurrency(grandTotal)}</span>
        </td>
        <td className="px-4 py-3 text-sm text-gray-500">
          {application.created_at ? formatDate(application.created_at) : "-"}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onVerify(application.id)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                config.priority === "URGENT" 
                  ? "bg-red-600 text-white hover:bg-red-700" 
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {config.priority === "URGENT" ? "Review Now" : "View"}
            </button>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title="Toggle details"
            >
              <svg className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </td>
      </tr>
      {showDetails && (
        <tr className="bg-gray-50">
          <td colSpan={7} className="px-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h4 className="font-semibold text-sm text-gray-700 mb-2">Line Items</h4>
                <p className="text-sm text-gray-600">
                  {(application.line_item_progress || []).filter((lip: any) => lip.line_item).length} items
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-sm text-gray-700 mb-2">Actions</h4>
                <div className="flex gap-2">
                  {doc && (
                    <>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300 transition-colors"
                      >
                        📄 PDF
                      </a>
                      <button
                        onClick={() => sendForSignature(application.id)}
                        className="px-3 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700 transition-colors"
                      >
                        ✍️ Sign
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-sm text-gray-700 mb-2">Status Info</h4>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
                  {config.icon} {config.priority}
                </span>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// Pagination Component
function Pagination({ currentPage, totalPages, onPageChange, totalItems, itemsPerPage }: any) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...', totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1, '...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="bg-white px-4 py-3 border-t border-gray-200 flex items-center justify-between">
      <div className="flex-1 flex justify-between sm:hidden">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700">
            Showing <span className="font-medium">{startItem}</span> to <span className="font-medium">{endItem}</span> of{' '}
            <span className="font-medium">{totalItems}</span> results
          </p>
        </div>
        <div>
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
            {getPageNumbers().map((page, index) => (
              <button
                key={index}
                onClick={() => typeof page === 'number' ? onPageChange(page) : null}
                disabled={page === '...'}
                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                  page === currentPage
                    ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                    : page === '...'
                    ? 'border-gray-300 bg-white text-gray-400 cursor-default'
                    : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}

// Main Payment Table Component
function PaymentTable({ applications, onVerify, getDocumentForApp, sendForSignature, selectedItems, onSelectItem, onSelectAll, currentPage, totalPages, onPageChange, totalItems, itemsPerPage }: any) {
  const allSelected = applications.length > 0 && selectedItems.length === applications.length;
  const partiallySelected = selectedItems.length > 0 && selectedItems.length < applications.length;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Desktop Table View */}
      <div className="hidden sm:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = partiallySelected;
                    }}
                    onChange={(e) => onSelectAll(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Project</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contractor</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(applications || []).filter(Boolean).map((app: any) => (
                <PaymentRow
                  key={app.id}
                  application={app}
                  isSelected={selectedItems.includes(app.id)}
                  onSelect={onSelectItem}
                  onVerify={onVerify}
                  getDocumentForApp={getDocumentForApp}
                  sendForSignature={sendForSignature}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="sm:hidden">
        {/* Mobile Select All Header */}
        <div className="border-b border-gray-200 p-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = partiallySelected;
                }}
                onChange={(e) => onSelectAll(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                {selectedItems.length > 0 ? `${selectedItems.length} selected` : 'Select All'}
              </span>
            </div>
            <span className="text-xs text-gray-500">
              {applications.length} applications
            </span>
          </div>
        </div>

        {/* Mobile Cards */}
        <div className="divide-y divide-gray-200">
          {(applications || []).filter(Boolean).map((app: any) => (
            <div key={app.id} className="p-4">
              <PaymentCard
                application={app}
                isSelected={selectedItems.includes(app.id)}
                onSelect={onSelectItem}
                onVerify={onVerify}
                getDocumentForApp={getDocumentForApp}
                sendForSignature={sendForSignature}
              />
            </div>
          ))}
        </div>
      </div>

      {applications.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📭</div>
          <p className="text-gray-500 font-medium">No payment applications found</p>
          <p className="text-sm text-gray-400">All caught up!</p>
        </div>
      )}

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
      />
    </div>
  );
}

// Bulk Actions Bar
function BulkActionsBar({ selectedCount, onDeleteSelected, onApproveSelected, onClearSelection }: any) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-2 right-2 sm:left-1/2 sm:right-auto sm:transform sm:-translate-x-1/2 bg-white rounded-lg shadow-lg border border-gray-200 px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center gap-3 sm:gap-4 z-50 max-w-md sm:max-w-none mx-auto sm:mx-0">
      <span className="text-sm font-medium text-gray-700 order-2 sm:order-1">
        {selectedCount} selected
      </span>
      <div className="flex gap-2 w-full sm:w-auto order-1 sm:order-2">
        <button
          onClick={onApproveSelected}
          className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 bg-green-600 text-white rounded-md text-xs sm:text-sm font-medium hover:bg-green-700 transition-colors"
        >
          ✅ <span className="hidden sm:inline">Approve All</span>
          <span className="sm:hidden">Approve</span>
        </button>
        <button
          onClick={onDeleteSelected}
          className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 bg-red-600 text-white rounded-md text-xs sm:text-sm font-medium hover:bg-red-700 transition-colors"
        >
          🗑️ <span className="hidden sm:inline">Delete Selected</span>
          <span className="sm:hidden">Delete</span>
        </button>
        <button
          onClick={onClearSelection}
          className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-xs sm:text-sm font-medium hover:bg-gray-300 transition-colors"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

// Project Card Component
function ProjectCard({ project, onCreatePaymentApps }: any) {
  const [loading, setLoading] = useState(false);
  const percent = project.budget > 0 ? Math.min(100, Math.round((project.spent / project.budget) * 100)) : 0;

  const handleCreatePaymentApps = async () => {
    setLoading(true);
    try {
      await onCreatePaymentApps(project.id);
    } catch (error) {
      console.error("Failed to create payment apps:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="mb-3">
        <h3 className="font-semibold text-lg text-gray-900">{project.name}</h3>
        <p className="text-sm text-gray-600">{project.client_name}</p>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
            {project.current_phase}
          </span>
          {project.at_risk && (
            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
              ⚠️ At Risk
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2 text-sm mb-4">
        <div className="flex justify-between">
          <span className="text-gray-600">Contractors</span>
          <span className="font-medium">{project.active_contractors_count || 0}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Pending Apps</span>
          <span className="font-medium">{project.pending_payment_apps || 0}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Budget</span>
          <span className="font-medium">{formatCurrency(project.budget || 0)}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`bg-green-500 h-2 rounded-full transition-all duration-500`}
            style={{ width: `${percent}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-600">{percent}% used</span>
          <span className={percent > 90 ? "text-red-600 font-medium" : "text-green-600 font-medium"}>
            {percent > 90 ? "⚠️ Near limit" : "On track"}
          </span>
        </div>
      </div>

      <button
        onClick={handleCreatePaymentApps}
        disabled={loading}
        className="w-full bg-green-600 text-white py-2 rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "⏳ Loading..." : "💰 Create Payment Apps"}
      </button>
    </div>
  );
}

// Contractor Selection Modal
function ContractorSelectionModal({ 
  show, 
  onClose, 
  project, 
  contractors, 
  selectedContractors, 
  onContractorToggle, 
  onCreatePaymentApps, 
  creating 
}: any) {
  if (!show) return null;

  const allSelected = contractors.length > 0 && selectedContractors.length === contractors.length;
  const noneSelected = selectedContractors.length === 0;

  const handleSelectAll = () => {
    if (allSelected) {
      // Deselect all
      contractors.forEach((contractor: any) => {
        if (selectedContractors.includes(contractor.id)) {
          onContractorToggle(contractor.id);
        }
      });
    } else {
      // Select all
      contractors.forEach((contractor: any) => {
        if (!selectedContractors.includes(contractor.id)) {
          onContractorToggle(contractor.id);
        }
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-white-500 bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg sm:rounded-xl shadow-xl w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 sm:p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1 pr-4">
              <h3 className="text-lg sm:text-xl font-bold truncate">Create Payment Applications</h3>
              <p className="text-blue-100 text-sm mt-1 truncate">{project?.name}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
          <div className="mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-3">
              <h4 className="font-semibold text-gray-900">Select Contractors</h4>
              <button
                onClick={handleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium self-start sm:self-auto"
              >
                {allSelected ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Choose which contractors to create payment applications for. SMS will be sent to initiate the payment process.
            </p>
          </div>

          {contractors.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">👥</div>
              <p className="text-gray-500 font-medium">No contractors found</p>
              <p className="text-sm text-gray-400">Add contractors to this project first</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-48 sm:max-h-64 overflow-y-auto">
              {contractors.map((contractor: any) => (
                <div
                  key={contractor.id}
                  className={`border rounded-lg p-3 sm:p-4 cursor-pointer transition-all ${
                    selectedContractors.includes(contractor.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => onContractorToggle(contractor.id)}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedContractors.includes(contractor.id)}
                      onChange={() => onContractorToggle(contractor.id)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 mt-1 flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <h5 className="font-medium text-gray-900 truncate">{contractor.name}</h5>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm text-gray-600 mt-1">
                        {contractor.trade && (
                          <span className="bg-gray-100 px-2 py-1 rounded text-xs w-fit">
                            {contractor.trade}
                          </span>
                        )}
                        {contractor.phone && (
                          <span className="flex items-center gap-1 truncate">
                            📱 <span className="truncate">{contractor.phone}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div className="text-sm text-gray-600 order-2 sm:order-1">
              {selectedContractors.length} of {contractors.length} contractors selected
            </div>
            <div className="flex gap-2 sm:gap-3 order-1 sm:order-2">
              <button
                onClick={onClose}
                disabled={creating}
                className="flex-1 sm:flex-initial px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={onCreatePaymentApps}
                disabled={creating || noneSelected || contractors.length === 0}
                className="flex-1 sm:flex-initial px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm"
              >
                {creating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="hidden sm:inline">Creating...</span>
                    <span className="sm:hidden">...</span>
                  </>
                ) : (
                  <>
                    📨 <span className="hidden sm:inline">Create & Send SMS</span>
                    <span className="sm:hidden">Create</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Mobile Filter Drawer
function MobileFilterDrawer({ show, onClose, statusFilter, setStatusFilter, projectFilter, setProjectFilter, projects, sortBy, setSortBy, sortDir, setSortDir, onFilterChange }: any) {
  if (!show) return null;

      return (
      <div className="fixed inset-0 z-50 sm:hidden">
        <div className="fixed inset-0  bg-opacity-25" onClick={onClose}></div>
      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-xl shadow-xl max-h-[80vh] overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
              </svg>
              Filters
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  onFilterChange();
                }}
                className="w-full text-gray-700 border border-gray-300 rounded-md px-3 py-3 text-base focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="submitted">📄 Submitted</option>
                <option value="sms_sent">📤 SMS Sent</option>
                <option value="approved">✅ Approved</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Project</label>
              <select
                value={projectFilter}
                onChange={(e) => {
                  setProjectFilter(e.target.value);
                  onFilterChange();
                }}
                className="w-full border text-gray-700 border-gray-300 rounded-md px-3 py-3 text-base focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Projects</option>
                {projects.map((proj: any) => (
                  <option key={proj.id} value={proj.id}>
                    {proj.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="flex-1 text-gray-700 border border-gray-300 rounded-md px-3 py-3 text-base focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="status">Priority</option>
                  <option value="date">Date</option>
                  <option value="amount">Amount</option>
                </select>
                <button
                  onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
                  className="px-4 py-3 text-gray-700 border border-gray-300 rounded-md text-base hover:bg-gray-50 focus:ring-blue-500 focus:border-blue-500"
                  title={`Sort ${sortDir === "asc" ? "descending" : "ascending"}`}
                >
                  {sortDir === "asc" ? "↑" : "↓"}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Desktop Sidebar Filters
function FilterSidebar({ statusFilter, setStatusFilter, projectFilter, setProjectFilter, projects, sortBy, setSortBy, sortDir, setSortDir, onFilterChange }: any) {
  return (
    <div className="hidden sm:block w-64 bg-white rounded-lg border border-gray-200 p-4 h-fit">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
        </svg>
        Filters
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              onFilterChange();
            }}
            className="w-full text-gray-700 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="submitted">📄 Submitted</option>
            <option value="sms_sent">📤 SMS Sent</option>
            <option value="approved">✅ Approved</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Project</label>
          <select
            value={projectFilter}
            onChange={(e) => {
              setProjectFilter(e.target.value);
              onFilterChange();
            }}
            className="w-full border text-gray-700 border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Projects</option>
            {projects.map((proj: any) => (
              <option key={proj.id} value={proj.id}>
                {proj.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="flex-1 text-gray-700 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="status">Priority</option>
              <option value="date">Date</option>
              <option value="amount">Amount</option>
            </select>
            <button
              onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
              className="px-3 py-2 text-gray-700 border border-gray-300 rounded-md text-sm hover:bg-gray-50 focus:ring-blue-500 focus:border-blue-500"
              title={`Sort ${sortDir === "asc" ? "descending" : "ascending"}`}
            >
              {sortDir === "asc" ? "↑" : "↓"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PMDashboard() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<{name: string; email: string; avatar_url: string; role: string} | null>(null);
  const [stats, setStats] = useState<any>({
    pending_sms: 0,
    review_queue: 0,
    ready_checks: 0,
    weekly_total: 0,
  });
  const [paymentApps, setPaymentApps] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [error, setError] = useState<string | null>(null);
  const [paymentDocuments, setPaymentDocuments] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState<"status" | "date" | "amount">("status");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [statusFilter, setStatusFilter] = useState<string>("submitted");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [mounted, setMounted] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('payments'); // Default to 'payments'
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Stats modal state
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [statsModalData, setStatsModalData] = useState<any[]>([]);
  const [statsModalTitle, setStatsModalTitle] = useState('');
  const [statsModalType, setStatsModalType] = useState('');
  const [loadingStatsModal, setLoadingStatsModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch user profile
  const fetchUser = useCallback(async () => {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error || !user) {
        setUserData(null);
        return null;
      }
      const { data, error: userError } = await supabase
        .from("users")
        .select("id, name, role, email, uuid, avatar_url")
        .eq("uuid", user.id)
        .single();
      if (userError) {
        setUserData(null);
        return null;
      }

      const userDataObj = {
        name: data.name || '',
        email: data.email || user.email || '',
        avatar_url: data.avatar_url || '',
        role: data.role || ''
      };

      setUserData(userDataObj);
      return data;
    } catch (error) {
      setUserData(null);
      return null;
    }
  }, []);

  // Fetch dashboard data
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsRefreshing(true);
    try {
      const userData = await fetchUser();
      setUser(userData);
      const { data: appsRaw, error: appsError } = await supabase
        .from("payment_applications")
        .select(`
          id,
          status,
          current_payment,
          created_at,
          project:projects(id, name, client_name),
          contractor:contractors(id, name, trade),
          line_item_progress:payment_line_item_progress(
            id,
            line_item:project_line_items(id, description_of_work)
          )
        `)
        .order("created_at", { ascending: false });
      if (appsError) throw new Error(appsError.message);

      const sortedApps = (appsRaw || []).sort((a, b) => {
        if (a.status === "submitted" && b.status !== "submitted") return -1;
        if (a.status !== "submitted" && b.status === "submitted") return 1;
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });
      setPaymentApps(sortedApps);

      const { data: projectsRaw, error: projectsError } = await supabase
        .from("projects")
        .select("*, id, name, client_name, current_phase, at_risk, target_completion_date, budget, spent")
        .eq("status", "active");
      if (projectsError) throw new Error(projectsError.message);
      setProjects(projectsRaw || []);

      const { data: smsConvos } = await supabase
        .from("payment_sms_conversations")
        .select("id, conversation_state");
      const pendingSMS = (smsConvos || []).filter(
        (c: any) => c.conversation_state !== "completed"
      ).length;
      const reviewQueue = (appsRaw || []).filter((app: any) =>
        app.status === "submitted"
      ).length;
      const readyChecks = (appsRaw || []).filter((app: any) =>
        app.status === "sms_sent"
      ).length;
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const weeklyTotal = (appsRaw || [])
        .filter((a: any) => a.created_at && new Date(a.created_at) >= weekAgo && a.status !== 'approved')
        .reduce((sum: number, a: any) => sum + (a.current_payment || 0), 0);
      setStats({
        pending_sms: pendingSMS,
        review_queue: reviewQueue,
        ready_checks: readyChecks,
        weekly_total: weeklyTotal,
      });
      setLastRefresh(new Date());
    } catch (err: any) {
      console.error('Dashboard data loading error:', err);
      setError(err.message || "Failed to load dashboard data. Please try refreshing the page.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [fetchUser]);

  useEffect(() => {
    const getSessionAndRole = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      setSession(session);
      if (session?.user) {
        const { data, error } = await supabase
          .from("users")
          .select("role")
          .eq("uuid", session.user.id)
          .single();
        setRole(data?.role || "unknown");
      } else {
        setRole("unknown");
      }
      setLoading(false);
    };
    getSessionAndRole();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        supabase
          .from("users")
          .select("role")
          .eq("uuid", session.user.id)
          .single()
          .then(({ data, error }) => {
            setRole(data?.role || "unknown");
          });
      } else {
        setRole("unknown");
      }
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, [loadDashboardData]);

  useEffect(() => {
    async function fetchDocuments() {
      if (paymentApps.length === 0) return;
      const ids = paymentApps.map((app) => app.id);
      const { data, error } = await supabase
        .from("payment_documents")
        .select("*")
        .in("payment_app_id", ids);
      if (!error && data) setPaymentDocuments(data);
    }
    fetchDocuments();
  }, [paymentApps]);

  function getDocumentForApp(appId: number) {
    return paymentDocuments.find((doc) => doc.payment_app_id === appId);
  }

  async function sendForSignature(paymentAppId: number) {
    try {
      const res = await fetch(`/api/payments/send-docusign?id=${paymentAppId}`, {
        method: "POST",
      });
      if (!res.ok) {
        let errorMessage = res.statusText;
        try {
          const data = await res.json();
          errorMessage = data.error || errorMessage;
        } catch (e) {
          // Response is not JSON, use status text
        }
        alert("Failed to send for signature: " + errorMessage);
        return;
      }
      alert("Payment request sent successfully");
    } catch (error) {
      console.error('Error sending for signature:', error);
      alert("Failed to send for signature: Network error");
    }
  }

  const handleVerifyPayment = (paymentAppId: number) => {
    // Pass the current context as URL parameters for proper back navigation
    const returnTo = `/pm-dashboard?tab=payments`;
    router.push(`/payments/${paymentAppId}/verify?returnTo=${encodeURIComponent(returnTo)}`);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // You can implement search logic here or pass it to child components
    console.log('Search query:', query);
  };

  const handleProfileUpdate = (profileData: any) => {
    // Update local user data when profile is updated
    setUserData({
      name: profileData.name,
      email: profileData.email,
      avatar_url: profileData.avatar_url,
      role: profileData.role
    });
  };

  const handleSelectItem = (id: number, selected: boolean) => {
    if (selected) {
      setSelectedItems([...selectedItems, id]);
    } else {
      setSelectedItems(selectedItems.filter(item => item !== id));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedItems(paginatedApps.map(app => app.id));
    } else {
      setSelectedItems([]);
    }
  };

  const [showContractorModal, setShowContractorModal] = useState(false);
  const [selectedProjectForPayment, setSelectedProjectForPayment] = useState<any>(null);
  const [contractors, setContractors] = useState<any[]>([]);
  const [selectedContractors, setSelectedContractors] = useState<number[]>([]);
  const [creatingPaymentApps, setCreatingPaymentApps] = useState(false);

  const handleCreatePaymentApps = async (projectId: number) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    setSelectedProjectForPayment(project);
    // Fetch contractors for this project
    await fetchContractorsForProject(projectId);
    setShowContractorModal(true);
  };

  const fetchContractorsForProject = async (projectId: number) => {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          subcontractor_id,
          contract_nickname,
          contractors!contracts_subcontractor_id_fkey (
            id, name, trade, phone
          )
        `)
        .eq('project_id', projectId);

      if (error) throw error;
      
      // Transform the data to match the expected contractor structure
      const contractors = data?.map(contract => ({
        ...contract.contractors,
        contract_nickname: contract.contract_nickname
      })) || [];
      
      setContractors(contractors);
    } catch (error) {
      console.error('Error fetching contractors:', error);
      setContractors([]);
    }
  };

  const handleContractorToggle = (contractorId: number) => {
    setSelectedContractors(prev => 
      prev.includes(contractorId)
        ? prev.filter(id => id !== contractorId)
        : [...prev, contractorId]
    );
  };

  const handleCreatePaymentApplications = async () => {
    if (!selectedProjectForPayment || selectedContractors.length === 0) return;

    setCreatingPaymentApps(true);
    try {
      const response = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: selectedProjectForPayment.id,
          contractorIds: selectedContractors,
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to create payment applications';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // Response is not JSON, use default message
          errorMessage = `${errorMessage} (${response.status}: ${response.statusText})`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Payment applications created:', result);

      // Show success message
      const successCount = result.results.filter((r: any) => r.status === 'sms_sent').length;
      const errorCount = result.results.filter((r: any) => r.error).length;

      if (successCount > 0) {
        alert(`Successfully created ${successCount} payment application(s)${errorCount > 0 ? ` (${errorCount} failed)` : ''}`);
        // Refresh dashboard data
        await loadDashboardData();
      } else {
        alert('Failed to create payment applications. Please try again.');
      }

      // Close modal and reset state
      setShowContractorModal(false);
      setSelectedContractors([]);
      setSelectedProjectForPayment(null);
    } catch (error) {
      console.error('Error creating payment applications:', error);
      alert('Failed to create payment applications: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setCreatingPaymentApps(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedItems.length === 0) return;

    const confirmed = confirm(`Are you sure you want to delete ${selectedItems.length} payment application(s)?`);
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('payment_applications')
        .delete()
        .in('id', selectedItems);

      if (error) throw error;

      await loadDashboardData();
      setSelectedItems([]);
      alert(`${selectedItems.length} payment application(s) deleted successfully`);
    } catch (error) {
      console.error('Error deleting applications:', error);
      alert('Failed to delete applications');
    }
  };

  const handleApproveSelected = async () => {
    if (selectedItems.length === 0) return;

    const confirmed = confirm(`Are you sure you want to approve ${selectedItems.length} payment application(s)?`);
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('payment_applications')
        .update({ status: 'approved' })
        .in('id', selectedItems);

      if (error) throw error;

      await loadDashboardData();
      setSelectedItems([]);
      alert(`${selectedItems.length} payment application(s) approved successfully`);
    } catch (error) {
      console.error('Error approving applications:', error);
      alert('Failed to approve applications');
    }
  };

  // Stats modal handlers
  const handleStatClick = async (type: string) => {
    setStatsModalType(type);
    setLoadingStatsModal(true);
    setShowStatsModal(true);

    try {
      let data: any[] = [];
      let title = '';

      switch (type) {
        case 'sms_pending':
          const { data: smsConvos, error: smsError } = await supabase
            .from('payment_sms_conversations')
            .select(`
              *,
              payment_applications!inner(
                id,
                status,
                current_payment,
                created_at,
                project:projects(id, name, client_name),
                contractor:contractors(id, name, trade)
              )
            `)
            .neq('conversation_state', 'completed');

          if (smsError) throw smsError;
          data = smsConvos || [];
          title = 'SMS Pending Conversations';
          break;

        case 'review_queue':
          const { data: reviewApps, error: reviewError } = await supabase
            .from('payment_applications')
            .select(`
              id,
              status,
              current_payment,
              created_at,
              project:projects(id, name, client_name),
              contractor:contractors(id, name, trade)
            `)
            .eq('status', 'submitted');

          if (reviewError) throw reviewError;
          data = reviewApps || [];
          title = 'Review Queue Applications';
          break;

        case 'ready':
          const { data: readyApps, error: readyError } = await supabase
            .from('payment_applications')
            .select(`
              id,
              status,
              current_payment,
              created_at,
              project:projects(id, name, client_name),
              contractor:contractors(id, name, trade)
            `)
            .eq('status', 'sms_sent');

          if (readyError) throw readyError;
          data = readyApps || [];
          title = 'SMS Sent Applications';
          break;

        case 'weekly':
          const now = new Date();
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          const { data: weeklyApps, error: weeklyError } = await supabase
            .from('payment_applications')
            .select(`
              id,
              status,
              current_payment,
              created_at,
              project:projects(id, name, client_name),
              contractor:contractors(id, name, trade)
            `)
            .gte('created_at', weekAgo.toISOString());

          if (weeklyError) throw weeklyError;
          data = weeklyApps || [];
          title = 'Weekly Applications';
          break;

        default:
          data = [];
          title = 'Data';
      }

      setStatsModalData(data);
      setStatsModalTitle(title);
    } catch (error) {
      console.error('Error fetching stats data:', error);
      setStatsModalData([]);
      setStatsModalTitle('Error loading data');
    } finally {
      setLoadingStatsModal(false);
    }
  };

  const handleCloseStatsModal = () => {
    setShowStatsModal(false);
    setStatsModalData([]);
    setStatsModalTitle('');
    setStatsModalType('');
  };

  const handleStatsPaymentAppClick = (appId: number) => {
    // Pass the current context as URL parameters for proper back navigation
    const returnTo = `/pm-dashboard?tab=payments`;
    router.push(`/payments/${appId}/verify?returnTo=${encodeURIComponent(returnTo)}`);
  };

  const filteredApps = useMemo(() => {
    let apps = [...paymentApps];
    if (statusFilter !== "all") {
      apps = apps.filter((app) => app.status === statusFilter);
    }
    if (projectFilter !== "all") {
      apps = apps.filter((app) => app.project?.id === Number(projectFilter));
    }
    apps.sort((a, b) => {
      if (sortBy === "status") {
        if (a.status === "submitted" && b.status !== "submitted") return -1;
        if (a.status !== "submitted" && b.status === "submitted") return 1;
      }
      if (sortBy === "amount") {
        return sortDir === "asc"
          ? a.current_payment - b.current_payment
          : b.current_payment - a.current_payment;
      }
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return sortDir === "asc" ? dateA - dateB : dateB - dateA;
    });
    return apps;
  }, [paymentApps, statusFilter, projectFilter, sortBy, sortDir]);

  const totalPages = Math.ceil(filteredApps.length / itemsPerPage);
  const paginatedApps = filteredApps.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSelectedItems([]); // Clear selections when changing pages
  };

  const handleFilterChange = () => {
    setCurrentPage(1); // Reset to first page when filters change
    setSelectedItems([]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        onShowProfile={() => setShowProfile(true)} 
        onLogout={handleLogout} 
        userData={userData}
        onSearch={handleSearch}
        searchQuery={searchQuery}
      />
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Mobile-Optimized Header */}
        <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Project Management Dashboard</h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              <span className="inline-block">{filteredApps.length} applications</span>
              <span className="hidden sm:inline"> • </span>
              <span className="block sm:inline text-xs">
                Updated {mounted ? lastRefresh.toLocaleTimeString() : ""}
              </span>
            </p>
            {error && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-red-600">⚠️</span>
                  <span className="text-sm text-red-800">{error}</span>
                  <button
                    onClick={() => {
                      setError(null);
                      loadDashboardData();
                    }}
                    className="ml-auto text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-3">
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="sm:hidden flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
              </svg>
              Filters
            </button>
            <button
              onClick={loadDashboardData}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRefreshing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span className="hidden sm:inline">Syncing...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="hidden sm:inline">Refresh</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Content based on active tab */}
        {activeTab === 'payments' && (
          <>
            {/* Stats */}
            <CompactStats
              pendingSMS={stats.pending_sms}
              reviewQueue={stats.review_queue}
              readyChecks={stats.ready_checks}
              weeklyTotal={stats.weekly_total}
              onStatClick={handleStatClick}
            />

            {/* Main Content */}
            <div className="flex gap-6 mb-8">
              {/* Sidebar */}
              <FilterSidebar
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                projectFilter={projectFilter}
                setProjectFilter={setProjectFilter}
                projects={projects}
                sortBy={sortBy}
                setSortBy={setSortBy}
                sortDir={sortDir}
                setSortDir={setSortDir}
                onFilterChange={handleFilterChange}
              />

              {/* Main Table */}
              <div className="flex-1">
                <PaymentTable
                  applications={paginatedApps}
                  onVerify={handleVerifyPayment}
                  getDocumentForApp={getDocumentForApp}
                  sendForSignature={sendForSignature}
                  selectedItems={selectedItems}
                  onSelectItem={handleSelectItem}
                  onSelectAll={handleSelectAll}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  totalItems={filteredApps.length}
                  itemsPerPage={itemsPerPage}
                />
              </div>
            </div>

            {/* Bulk Actions */}
            <BulkActionsBar
              selectedCount={selectedItems.length}
              onDeleteSelected={handleDeleteSelected}
              onApproveSelected={handleApproveSelected}
              onClearSelection={() => setSelectedItems([])}
            />
          </>
        )}

        {activeTab === 'projects' && (
          <div className="space-y-6">
            {(projects || []).filter(Boolean).map((project) => (
              <ProjectOverview key={project.id} project={project} onCreatePaymentApps={handleCreatePaymentApps} onStatsPaymentAppClick={handleStatsPaymentAppClick} />
            ))}
            {projects.length === 0 && (
              <div className="text-center py-12 bg-white border-2 border-dashed border-gray-300 rounded-lg">
                <div className="text-4xl mb-4">🏗️</div>
                <p className="text-gray-500 font-medium">No active projects</p>
                <p className="text-sm text-gray-400">Create a new project to get started</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'notes' && (
          <DailyLogRequests projects={projects} />
        )}

        {/* Contractor Selection Modal - Available across all tabs */}
        <ContractorSelectionModal
          show={showContractorModal}
          onClose={() => {
            setShowContractorModal(false);
            setSelectedContractors([]);
            setSelectedProjectForPayment(null);
          }}
          project={selectedProjectForPayment}
          contractors={contractors}
          selectedContractors={selectedContractors}
          onContractorToggle={handleContractorToggle}
          onCreatePaymentApps={handleCreatePaymentApplications}
          creating={creatingPaymentApps}
        />

        {/* Mobile Filter Drawer */}
        <MobileFilterDrawer
          show={showMobileFilters}
          onClose={() => setShowMobileFilters(false)}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          projectFilter={projectFilter}
          setProjectFilter={setProjectFilter}
          projects={projects}
          sortBy={sortBy}
          setSortBy={setSortBy}
          sortDir={sortDir}
          setSortDir={setSortDir}
          onFilterChange={handleFilterChange}
        />

        {/* Stats Modal */}
        {showStatsModal && (
          <div className="fixed inset-0  bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">{statsModalTitle}</h2>
                <button
                  onClick={handleCloseStatsModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                {loadingStatsModal ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="ml-3 text-gray-600">Loading data...</span>
                  </div>
                ) : statsModalData.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">📊</div>
                    <p className="text-gray-500 font-medium">No data available</p>
                    <p className="text-sm text-gray-400">There are no items in this category</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {statsModalData.map((item: any, index: number) => {
                      // Handle different data types based on modal type
                      if (statsModalType === 'sms_pending') {
                        const app = item.payment_applications;
                        return (
                          <div
                            key={item.id}
                            className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors cursor-pointer"
                            onClick={() => handleStatsPaymentAppClick(app.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-sm font-medium text-gray-900">
                                    {app.project?.name || 'Unknown Project'}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {app.contractor?.name || 'Unknown Contractor'}
                                  </span>
                                </div>
                                <div className="text-sm text-gray-600">
                                  Status: {app.status} • Amount: {formatCurrency(app.current_payment || 0)}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  Created: {formatDate(app.created_at)}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium text-orange-600">
                                  SMS Pending
                                </div>
                                <div className="text-xs text-gray-500">
                                  {item.conversation_state}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      } else {
                        // Handle payment applications (review_queue, ready, weekly)
                        return (
                          <div
                            key={item.id}
                            className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors cursor-pointer"
                            onClick={() => handleStatsPaymentAppClick(item.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-sm font-medium text-gray-900">
                                    {item.project?.name || 'Unknown Project'}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {item.contractor?.name || 'Unknown Contractor'}
                                  </span>
                                </div>
                                <div className="text-sm text-gray-600">
                                  Status: {item.status} • Amount: {formatCurrency(item.current_payment || 0)}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  Created: {formatDate(item.created_at)}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className={`text-sm font-medium ${
                                  item.status === 'approved' ? 'text-green-600' :
                                  item.status === 'submitted' ? 'text-red-600' :
                                  item.status === 'needs_review' ? 'text-yellow-600' :
                                  item.status === 'check_ready' ? 'text-purple-600' :
                                  'text-gray-600'
                                }`}>
                                  {item.status.replace('_', ' ').toUpperCase()}
                                </div>
                                <div className="text-xs text-gray-500">
                                  ID: {item.id}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* User Profile Modal */}
      <UserProfile 
        isOpen={showProfile} 
        onClose={() => setShowProfile(false)}
        onProfileUpdate={handleProfileUpdate}
      />

      {/* Navigation Back to Main Dashboard */}
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => window.location.href = '/'}
          className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-colors"
          title="Back to Main Dashboard"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </button>
      </div>
    </div>
  );
}