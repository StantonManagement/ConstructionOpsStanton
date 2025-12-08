'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ProjectScheduleTab from './schedule/ProjectScheduleTab';
import { ArrowLeft, Building, Users, DollarSign, FileText, CheckCircle, XCircle, TrendingUp, AlertCircle, ListChecks, Edit2, Calendar, Trash2 } from 'lucide-react';
import { Project } from '../context/DataContext';
import { supabase } from '@/lib/supabaseClient';
import ProjectContractorsTab from './ProjectContractorsTab';
import ContractorDetailView from './ContractorDetailView';
import ProjectBudgetDetail from './ProjectBudgetDetail';
import PunchListsTab from './PunchListsTab';
import CreatePunchListModal from './CreatePunchListModal';
import { useRouter, useSearchParams } from 'next/navigation';
import LoanBudgetView from './loan/LoanBudgetView';
import CashFlowView from './CashFlowView';
import PaymentApplicationsView from './PaymentsView';
import DocumentsView from './DocumentsView';

interface ProjectDetailViewProps {
  project: Project;
  onBack: () => void;
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
}

  type SubTab = 'summary' | 'contractors' | 'budget' | 'schedule' | 'loan' | 'cashflow' | 'payments' | 'documents' | 'punchlists';

  // Sub-tab Navigation Component
  function SubTabNavigation({ activeSubTab, onSubTabChange }: { activeSubTab: SubTab; onSubTabChange: (tab: SubTab) => void }) {
    const subTabs = [
      { id: 'summary' as const, label: 'Summary', icon: Building },
      { id: 'contractors' as const, label: 'Contractors', icon: Users },
      { id: 'budget' as const, label: 'Budget', icon: TrendingUp },
      { id: 'schedule' as const, label: 'Schedule', icon: Calendar },
      { id: 'loan' as const, label: 'Loan', icon: DollarSign },
      { id: 'cashflow' as const, label: 'Cash Flow', icon: TrendingUp },
      { id: 'payments' as const, label: 'Payments', icon: DollarSign },
      { id: 'punchlists' as const, label: 'Punch Lists', icon: ListChecks },
      { id: 'documents' as const, label: 'Documents', icon: FileText }
    ];

  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="-mb-px flex space-x-8 overflow-x-auto">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onSubTabChange(tab.id)}
              className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors whitespace-nowrap ${
                activeSubTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

// Summary Tab Component
function SummaryTab({ project }: { project: Project }) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Type assertion for extended project properties
  const projectExt = project as any;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-gray-500">Project Name</label>
            <p className="mt-1 text-base text-gray-900">{project.name}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Client</label>
            <p className="mt-1 text-base text-gray-900">{project.client_name}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Location</label>
            <p className="mt-1 text-base text-gray-900">{projectExt.location || project.address || 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Phase</label>
            <p className="mt-1 text-base text-gray-900">{project.current_phase || 'N/A'}</p>
          </div>
          {projectExt.start_date && (
            <div>
              <label className="text-sm font-medium text-gray-500">Start Date</label>
              <p className="mt-1 text-base text-gray-900">{formatDate(projectExt.start_date)}</p>
            </div>
          )}
          {projectExt.target_completion_date && (
            <div>
              <label className="text-sm font-medium text-gray-500">Target Completion</label>
              <p className="mt-1 text-base text-gray-900">{formatDate(projectExt.target_completion_date)}</p>
            </div>
          )}
          {project.budget && (
            <div>
              <label className="text-sm font-medium text-gray-500">Budget</label>
              <p className="mt-1 text-base text-gray-900">{formatCurrency(project.budget)}</p>
            </div>
          )}
        </div>
        {projectExt.description && (
          <div className="mt-6">
            <label className="text-sm font-medium text-gray-500">Description</label>
            <p className="mt-1 text-base text-gray-900">{projectExt.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}

const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({ project, onBack, onEdit, onDelete }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Initialize from URL or default to 'contractors'
  const getInitialSubTab = (): SubTab => {
    const subtab = searchParams.get('subtab');
    const validTabs: SubTab[] = ['summary', 'contractors', 'budget', 'schedule', 'loan', 'cashflow', 'payments', 'documents', 'punchlists'];
    return (subtab && validTabs.includes(subtab as SubTab)) ? (subtab as SubTab) : 'contractors';
  };

  const [activeSubTab, setActiveSubTab] = useState<SubTab>(getInitialSubTab);

  // Sync with URL changes
  useEffect(() => {
    const subtab = searchParams.get('subtab');
    if (subtab && subtab !== activeSubTab) {
      const validTabs: SubTab[] = ['summary', 'contractors', 'budget', 'schedule', 'loan', 'cashflow', 'payments', 'documents', 'punchlists'];
      if (validTabs.includes(subtab as SubTab)) {
        setActiveSubTab(subtab as SubTab);
      }
    }
  }, [searchParams]);

  // Update URL when tab changes
  const handleSubTabChange = (tab: SubTab) => {
    setActiveSubTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('subtab', tab);
    router.replace(`/?${params.toString()}`, { scroll: false });
  };

  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [selectedContractor, setSelectedContractor] = useState<any>(null);
  const [showContractorDetail, setShowContractorDetail] = useState(false);
  const [showPunchListModal, setShowPunchListModal] = useState(false);
  const [punchListRefreshKey, setPunchListRefreshKey] = useState(0);

  // Debug logging
  useEffect(() => {
    console.log('[ProjectDetailView] Project loaded:', {
      id: project.id,
      name: project.name,
      idType: typeof project.id,
      fullProject: project
    });
  }, [project]);
  
  // Budget stats
  const [budgetStats, setBudgetStats] = useState({
    budget: 0,
    spent: 0,
    committed: 0,
    remaining: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Fetch budget stats
  const fetchBudgetStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      // Fetch budget line items for totals
      const { data: budgetData } = await supabase
        .from('property_budgets')
        .select('original_amount, revised_amount, actual_spend, committed_costs')
        .eq('project_id', project.id)
        .eq('is_active', true);

      // Calculate totals from budget line items
      const budgetTotals = (budgetData || []).reduce((acc, item) => {
        acc.budget += Number(item.revised_amount) || Number(item.original_amount) || 0;
        acc.spent += Number(item.actual_spend) || 0;
        return acc;
      }, { budget: 0, spent: 0 });

      // Fallback to contracts if no budget data
      if (!budgetData || budgetData.length === 0) {
        const { data: contractsData } = await supabase
          .from('project_contractors')
          .select('contract_amount')
          .eq('project_id', project.id)
          .eq('contract_status', 'active');

        budgetTotals.budget = (contractsData || []).reduce((sum, c) => sum + (c.contract_amount || 0), 0);
      }

      // Fetch committed amounts (submitted/needs_review payment applications)
      const { data: committedData } = await supabase
        .from('payment_applications')
        .select('current_payment')
        .eq('project_id', project.id)
        .in('status', ['submitted', 'needs_review']);

      const totalCommitted = (committedData || []).reduce((sum, p) => sum + (p.current_payment || 0), 0);

      const totalRemaining = budgetTotals.budget - budgetTotals.spent - totalCommitted;

      setBudgetStats({
        budget: budgetTotals.budget,
        spent: budgetTotals.spent,
        committed: totalCommitted,
        remaining: totalRemaining,
      });
    } catch (error) {
      console.error('Error fetching budget stats:', error);
    } finally {
      setLoadingStats(false);
    }
  }, [project.id]);

  useEffect(() => {
    fetchBudgetStats();
  }, [fetchBudgetStats]);

  useEffect(() => {
    // Save last active project to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('lastActiveProjectId', project.id.toString());
    }
  }, [project.id]);

  // Handle Request Payment
  const handleRequestPayment = async (contractorId: number, contractId: number) => {
    setPaymentError(null);
    setPaymentSuccess(null);
    
    try {
      console.log('Sending payment request:', { projectId: project.id, contractorIds: [contractorId] });
      const res = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          contractorIds: [contractorId],
        }),
      });
      
      const data = await res.json();
      console.log('Payment request response:', res.status, data);
      
      if (!res.ok || data.error) {
        setPaymentError(data.error || 'Failed to send payment request.');
      } else {
        setPaymentSuccess('Payment request sent successfully!');
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          setPaymentSuccess(null);
        }, 5000);
      }
    } catch (e) {
      console.error('Network or fetch error:', e);
      setPaymentError('Network error. Please try again.');
    }
  };

  const handleEditContract = (contract: any) => {
    console.log('Edit contract:', contract);
    setSelectedContract(contract);
    setSelectedContractor(contract.contractors);
    setShowContractorDetail(true);
  };

  const handleViewLineItems = (contract: any) => {
    console.log('View line items:', contract);
    setSelectedContract(contract);
    setSelectedContractor(contract.contractors);
    setShowContractorDetail(true);
  };

  const handleViewContractorDetail = (contract: any) => {
    setSelectedContract(contract);
    setSelectedContractor(contract.contractors);
    setShowContractorDetail(true);
  };

  const handleBackFromContractorDetail = () => {
    setShowContractorDetail(false);
    setSelectedContract(null);
    setSelectedContractor(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // If viewing contractor detail, show that view
  if (showContractorDetail && selectedContract && selectedContractor) {
    return (
      <ContractorDetailView
        contract={selectedContract}
        contractor={selectedContractor}
        onBack={handleBackFromContractorDetail}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back to Projects</span>
          </button>
        </div>
        <div className="flex items-center gap-2">
        {onEdit && (
          <button
            onClick={() => onEdit(project)}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            <Edit2 className="w-4 h-4" />
            <span>Edit Project</span>
          </button>
        )}
          {onDelete && (
            <button
              onClick={() => onDelete(project)}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Project</span>
            </button>
          )}
        </div>
      </div>

      {/* Project Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{project.name}</h1>
            <p className="text-gray-600">{project.client_name}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-primary">
              {project.current_phase || 'Active'}
            </span>
          </div>
        </div>
      </div>

      {/* Budget Summary Cards */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 ${activeSubTab === 'summary' ? 'gap-4' : 'gap-2'}`}>
        <div className={`bg-card rounded-md border border-border ${activeSubTab === 'summary' ? 'p-4' : 'p-3'}`}>
          <div className={`flex ${activeSubTab === 'summary' ? 'flex-col items-start' : 'flex-row items-center justify-between'}`}>
            <div className={`flex items-center gap-2 ${activeSubTab === 'summary' ? 'mb-2' : ''}`}>
              <DollarSign className={`${activeSubTab === 'summary' ? 'w-5 h-5' : 'w-4 h-4'} text-primary`} />
              <h3 className="text-sm font-medium text-muted-foreground">Budget</h3>
            </div>
            <p className={`${activeSubTab === 'summary' ? 'text-2xl' : 'text-xl'} font-bold text-foreground`}>
              {loadingStats ? '...' : formatCurrency(budgetStats.budget)}
            </p>
          </div>
          {activeSubTab === 'summary' && (
            <p className="text-xs text-muted-foreground mt-1">Total project budget</p>
          )}
        </div>

        <div className={`bg-card rounded-md border border-border ${activeSubTab === 'summary' ? 'p-4' : 'p-3'}`}>
          <div className={`flex ${activeSubTab === 'summary' ? 'flex-col items-start' : 'flex-row items-center justify-between'}`}>
            <div className={`flex items-center gap-2 ${activeSubTab === 'summary' ? 'mb-2' : ''}`}>
              <CheckCircle className={`${activeSubTab === 'summary' ? 'w-5 h-5' : 'w-4 h-4'} text-muted-foreground`} />
              <h3 className="text-sm font-medium text-muted-foreground">Spent</h3>
            </div>
            <p className={`${activeSubTab === 'summary' ? 'text-2xl' : 'text-xl'} font-bold text-foreground`}>
              {loadingStats ? '...' : formatCurrency(budgetStats.spent)}
            </p>
          </div>
          {activeSubTab === 'summary' && (
            <p className="text-xs text-muted-foreground mt-1">Paid to date</p>
          )}
        </div>

        <div className={`bg-card rounded-md border border-border ${activeSubTab === 'summary' ? 'p-4' : 'p-3'}`}>
          <div className={`flex ${activeSubTab === 'summary' ? 'flex-col items-start' : 'flex-row items-center justify-between'}`}>
            <div className={`flex items-center gap-2 ${activeSubTab === 'summary' ? 'mb-2' : ''}`}>
              <TrendingUp className={`${activeSubTab === 'summary' ? 'w-5 h-5' : 'w-4 h-4'} text-[var(--status-warning-text)]`} />
              <h3 className="text-sm font-medium text-muted-foreground">Committed</h3>
            </div>
            <p className={`${activeSubTab === 'summary' ? 'text-2xl' : 'text-xl'} font-bold text-[var(--status-warning-text)]`}>
              {loadingStats ? '...' : formatCurrency(budgetStats.committed)}
            </p>
          </div>
          {activeSubTab === 'summary' && (
            <p className="text-xs text-muted-foreground mt-1">Approved but unpaid</p>
          )}
        </div>

        <div className={`bg-card rounded-md border border-border ${activeSubTab === 'summary' ? 'p-4' : 'p-3'}`}>
          <div className={`flex ${activeSubTab === 'summary' ? 'flex-col items-start' : 'flex-row items-center justify-between'}`}>
            <div className={`flex items-center gap-2 ${activeSubTab === 'summary' ? 'mb-2' : ''}`}>
              <AlertCircle className={`${activeSubTab === 'summary' ? 'w-5 h-5' : 'w-4 h-4'} text-[var(--status-success-text)]`} />
              <h3 className="text-sm font-medium text-muted-foreground">Remaining</h3>
            </div>
            <p className={`${activeSubTab === 'summary' ? 'text-2xl' : 'text-xl'} font-bold text-[var(--status-success-text)]`}>
              {loadingStats ? '...' : formatCurrency(budgetStats.remaining)}
            </p>
          </div>
          {activeSubTab === 'summary' && (
            <p className="text-xs text-muted-foreground mt-1">Available budget</p>
          )}
        </div>
      </div>

      {/* Success/Error Messages */}
      {paymentSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-green-800 font-medium">{paymentSuccess}</p>
            <p className="text-green-600 text-sm mt-1">
              The contractor will receive an SMS notification with a link to submit their payment application.
            </p>
          </div>
        </div>
      )}

      {paymentError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-800 font-medium">{paymentError}</p>
          </div>
        </div>
      )}

      {/* Sub-tab Navigation */}
      <SubTabNavigation activeSubTab={activeSubTab} onSubTabChange={handleSubTabChange} />

      {/* Sub-tab Content */}
      <div>
        {activeSubTab === 'summary' && <SummaryTab project={project} />}
        {activeSubTab === 'contractors' && (
          <ProjectContractorsTab
            project={project}
            onRequestPayment={handleRequestPayment}
            onEditContract={handleEditContract}
            onViewLineItems={handleViewLineItems}
            onViewContractorDetail={handleViewContractorDetail}
          />
        )}
        {activeSubTab === 'budget' && (
          <ProjectBudgetDetail
            projectId={project.id}
            projectName={project.name}
          />
        )}
        {activeSubTab === 'schedule' && (
          <ProjectScheduleTab projectId={project.id} />
        )}
        {activeSubTab === 'loan' && (
          <LoanBudgetView projectId={project.id} />
        )}
        {activeSubTab === 'cashflow' && (
          <CashFlowView projectId={project.id} />
        )}
        {activeSubTab === 'payments' && <PaymentApplicationsView projectId={project.id} />}
        {activeSubTab === 'punchlists' && (
          <>
            {project.id ? (
              <PunchListsTab
                key={punchListRefreshKey}
                projectId={project.id}
                onCreatePunchList={() => setShowPunchListModal(true)}
              />
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800">Project ID is missing. Please refresh the page.</p>
                <p className="text-xs text-yellow-600 mt-2">Debug: project.id = {JSON.stringify(project.id)}</p>
              </div>
            )}
          </>
        )}
        {activeSubTab === 'documents' && <DocumentsView projectId={project.id} />}
      </div>

      {/* Punch List Modal */}
      {showPunchListModal && project.id && (
        <CreatePunchListModal
          projectId={project.id}
          projectName={project.name}
          onClose={() => setShowPunchListModal(false)}
          onSuccess={() => {
            setShowPunchListModal(false);
            setPunchListRefreshKey(prev => prev + 1);
            setPaymentSuccess('Punch list created and sent to contractor successfully!');
            setTimeout(() => setPaymentSuccess(null), 5000);
          }}
        />
      )}
    </div>
  );
};

export default ProjectDetailView;
