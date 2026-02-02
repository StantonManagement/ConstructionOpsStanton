'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ProjectScheduleTab from './schedule/ProjectScheduleTab';
import { ArrowLeft, Building, Users, DollarSign, FileText, CheckCircle, XCircle, TrendingUp, AlertCircle, ListChecks, Edit2, Calendar, Trash2, Image, Shield, Clipboard, FileSignature } from 'lucide-react';
import { Project } from '@/context/DataContext';
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
import { LocationList } from '@/components/LocationList';
import { CreateLocationModal } from './CreateLocationModal';
import { BulkLocationModal } from './BulkLocationModal';
import { LocationDetailView } from './LocationDetailView';
import { ProjectStatsCard } from './ProjectStatsCard';
import { authFetch } from '@/lib/authFetch';
import { addRecentItem } from '@/lib/recentItems';
import { TabDropdown } from './TabDropdown';
import ProjectRightSidebar from './ProjectRightSidebar';

interface ProjectDetailViewProps {
  project: Project;
  onBack: () => void;
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
}

  type SubTab = 'summary' | 'contractors' | 'budget' | 'schedule' | 'loan' | 'cashflow' | 'payments' | 'documents' | 'punchlists' | 'locations' | 'photos' | 'warranties' | 'daily-logs' | 'change-orders';

  // Sub-tab Navigation Component
  function SubTabNavigation({ activeSubTab, onSubTabChange }: { activeSubTab: SubTab; onSubTabChange: (tab: SubTab) => void }) {
    // Primary tabs (always visible) - reordered by user frequency
    const primaryTabs = [
      { id: 'summary' as const, label: 'Summary', icon: Building },
      { id: 'contractors' as const, label: 'Contractors', icon: Users },
      { id: 'budget' as const, label: 'Budget', icon: TrendingUp },
      { id: 'payments' as const, label: 'Payments', icon: DollarSign },
      { id: 'schedule' as const, label: 'Schedule', icon: Calendar },
      { id: 'locations' as const, label: 'Locations', icon: Building },
      { id: 'punchlists' as const, label: 'Punch Lists', icon: ListChecks },
      { id: 'documents' as const, label: 'Documents', icon: FileText },
    ];

    // Financial dropdown tabs
    const financialTabs = [
      { id: 'loan', label: 'Loan', icon: DollarSign },
      { id: 'cashflow', label: 'Cash Flow', icon: TrendingUp },
    ];

    // More dropdown tabs
    const moreTabs = [
      { id: 'photos', label: 'Photos', icon: Image, badge: 'Soon' },
      { id: 'warranties', label: 'Warranties', icon: Shield },
      { id: 'daily-logs', label: 'Daily Logs', icon: Clipboard, badge: 'Soon' },
      { id: 'change-orders', label: 'Change Orders', icon: FileSignature, badge: 'Soon' },
    ];

    // All tabs combined for mobile dropdown
    const allTabs = [...primaryTabs, ...financialTabs, ...moreTabs];

  return (
    <div className="border-b border-border mb-6">
      {/* Mobile: Show dropdown selector */}
      <div className="sm:hidden mb-4">
        <select
          value={activeSubTab}
          onChange={(e) => onSubTabChange(e.target.value as SubTab)}
          className="w-full px-3 py-2 border border-border rounded-lg bg-card text-card-foreground text-sm"
        >
          <optgroup label="Main">
            {primaryTabs.map(tab => (
              <option key={tab.id} value={tab.id}>{tab.label}</option>
            ))}
          </optgroup>
          <optgroup label="Financial">
            {financialTabs.map(tab => (
              <option key={tab.id} value={tab.id}>{tab.label}</option>
            ))}
          </optgroup>
          <optgroup label="More">
            {moreTabs.map(tab => (
              <option key={tab.id} value={tab.id}>
                {tab.label}{tab.badge ? ` (${tab.badge})` : ''}
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      {/* Desktop: Show tab buttons with dropdowns */}
      <nav className="hidden sm:flex -mb-px space-x-8 overflow-x-auto">
        {/* Primary tabs */}
        {primaryTabs.map((tab) => {
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
              type="button"
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}

        {/* Financial dropdown */}
        <TabDropdown
          label="Financial"
          items={financialTabs}
          activeTab={activeSubTab}
          onTabChange={onSubTabChange}
        />

        {/* More dropdown */}
        <TabDropdown
          label="More"
          items={moreTabs}
          activeTab={activeSubTab}
          onTabChange={onSubTabChange}
        />
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
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-semibold text-card-foreground mb-4">Project Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Project Name</label>
            <p className="mt-1 text-base text-card-foreground">{project.name}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Client</label>
            <p className="mt-1 text-base text-card-foreground">{project.client_name}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Location</label>
            <p className="mt-1 text-base text-card-foreground">{projectExt.location || project.address || 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Phase</label>
            <p className="mt-1 text-base text-card-foreground">{project.current_phase || 'N/A'}</p>
          </div>
          {projectExt.start_date && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Start Date</label>
              <p className="mt-1 text-base text-card-foreground">{formatDate(projectExt.start_date)}</p>
            </div>
          )}
          {projectExt.target_completion_date && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Target Completion</label>
              <p className="mt-1 text-base text-card-foreground">{formatDate(projectExt.target_completion_date)}</p>
            </div>
          )}
          {project.budget && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Budget</label>
              <p className="mt-1 text-base text-card-foreground">{formatCurrency(project.budget)}</p>
            </div>
          )}
        </div>
        {projectExt.description && (
          <div className="mt-6">
            <label className="text-sm font-medium text-muted-foreground">Description</label>
            <p className="mt-1 text-base text-card-foreground">{projectExt.description}</p>
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
    const validTabs: SubTab[] = ['summary', 'contractors', 'budget', 'schedule', 'loan', 'cashflow', 'payments', 'documents', 'punchlists', 'locations', 'photos', 'warranties', 'daily-logs', 'change-orders'];
    return (subtab && validTabs.includes(subtab as SubTab)) ? (subtab as SubTab) : 'contractors';
  };

  const [activeSubTab, setActiveSubTab] = useState<SubTab>(getInitialSubTab);

  // Sync with URL changes
  useEffect(() => {
    const subtab = searchParams.get('subtab');
    if (subtab && subtab !== activeSubTab) {
      const validTabs: SubTab[] = ['summary', 'contractors', 'budget', 'schedule', 'loan', 'cashflow', 'payments', 'documents', 'punchlists', 'locations', 'photos', 'warranties', 'daily-logs', 'change-orders'];
      if (validTabs.includes(subtab as SubTab)) {
        setActiveSubTab(subtab as SubTab);
      }
    }
  }, [searchParams, activeSubTab]);

  // Update URL when tab changes
  const handleSubTabChange = (tab: SubTab) => {
    setActiveSubTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('subtab', tab);
    // Keep the project ID in the URL
    router.replace(`/projects?${params.toString()}`, { scroll: false });
  };

  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [selectedContractor, setSelectedContractor] = useState<any>(null);
  const [showContractorDetail, setShowContractorDetail] = useState(false);
  const [showPunchListModal, setShowPunchListModal] = useState(false);
  const [showCreateLocationModal, setShowCreateLocationModal] = useState(false);
  const [showBulkLocationModal, setShowBulkLocationModal] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [punchListRefreshKey, setPunchListRefreshKey] = useState(0);

  // Track recent project views
  useEffect(() => {
    if (project?.id && project?.name) {
      addRecentItem('projects', {
        id: project.id.toString(),
        name: project.name,
        href: `/projects?project=${project.id}`
      });
    }
  }, [project?.id, project?.name]);

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
      const { data: budgetData, error: budgetError } = await supabase
        .from('property_budgets')
        .select('original_amount, revised_amount, actual_spend, committed_costs')
        .eq('project_id', project.id)
        .eq('is_active', true);

      if (budgetError) {
        console.error('Error fetching budget data:', budgetError);
      }

      // Calculate totals from budget line items
      const budgetTotals = (budgetData || []).reduce((acc, item) => {
        acc.budget += Number(item.revised_amount) || Number(item.original_amount) || 0;
        acc.spent += Number(item.actual_spend) || 0;
        return acc;
      }, { budget: 0, spent: 0 });

      // Fallback to contracts if no budget data
      if (!budgetData || budgetData.length === 0) {
        const { data: contractsData, error: contractsError } = await supabase
          .from('project_contractors')
          .select('contract_amount')
          .eq('project_id', project.id)
          .eq('contract_status', 'active');

        if (contractsError) {
          console.error('Error fetching contracts data:', contractsError);
        }

        budgetTotals.budget = (contractsData || []).reduce((sum, c) => sum + (Number(c.contract_amount) || 0), 0);
      }

      // Fetch committed amounts (submitted/needs_review payment applications)
      const { data: committedData, error: committedError } = await supabase
        .from('payment_applications')
        .select('current_payment')
        .eq('project_id', project.id)
        .in('status', ['submitted', 'needs_review']);

      if (committedError) {
        console.error('Error fetching committed data:', committedError);
      }

      const totalCommitted = (committedData || []).reduce((sum, p) => sum + (Number(p.current_payment) || 0), 0);

      const totalRemaining = budgetTotals.budget - budgetTotals.spent - totalCommitted;

      setBudgetStats({
        budget: budgetTotals.budget || 0,
        spent: budgetTotals.spent || 0,
        committed: totalCommitted || 0,
        remaining: totalRemaining || 0,
      });
    } catch (error) {
      console.error('Error fetching budget stats:', error);
      // Set to zeros on error
      setBudgetStats({
        budget: 0,
        spent: 0,
        committed: 0,
        remaining: 0,
      });
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
      const res = await authFetch('/api/payments/initiate', {
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
    <>
      {/* Right Sidebar - Hidden on mobile */}
      <div className="hidden lg:block">
        <ProjectRightSidebar activeTab={activeSubTab} onTabChange={handleSubTabChange} />
      </div>

      {/* Main Content - Add right padding to accommodate sidebar on desktop */}
      <div className="space-y-6 lg:pr-20">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back to Projects</span>
          </button>
        </div>
        <div className="flex items-center gap-2">
        {onEdit && (
          <button
            onClick={() => onEdit(project)}
            className="flex items-center gap-2 px-3 py-2 bg-card border border-border text-card-foreground rounded-lg hover:bg-secondary transition-colors text-sm font-medium"
          >
            <Edit2 className="w-4 h-4" />
            <span>Edit Project</span>
          </button>
        )}
          {onDelete && (
            <button
              onClick={() => onDelete(project)}
              className="flex items-center gap-2 px-3 py-2 bg-card border border-destructive/20 text-destructive rounded-lg hover:bg-destructive/10 transition-colors text-sm font-medium"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Project</span>
            </button>
          )}
        </div>
      </div>

      {/* Project Header */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-card-foreground mb-2">{project.name}</h1>
            <p className="text-muted-foreground">{project.client_name}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary">
              {project.current_phase || 'Active'}
            </span>
          </div>
        </div>
      </div>

      {/* Project Stats - Only shown on Summary tab */}
      {activeSubTab === 'summary' && (
        <ProjectStatsCard projectId={project.id} />
      )}

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
            <p className="text-xs text-muted-foreground mt-1">Budget remaining</p>
          )}
        </div>
      </div>

      {/* Success/Error Messages */}
      {paymentSuccess && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-700 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-green-700 dark:text-green-400 font-medium">{paymentSuccess}</p>
            <p className="text-green-600 dark:text-green-500 text-sm mt-1">
              The contractor will receive an SMS notification with a link to submit their payment application.
            </p>
          </div>
        </div>
      )}

      {paymentError && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-destructive font-medium">{paymentError}</p>
          </div>
        </div>
      )}

      {/* Sub-tab Navigation - Hidden on desktop, shown on mobile */}
      <div className="lg:hidden">
        <SubTabNavigation activeSubTab={activeSubTab} onSubTabChange={handleSubTabChange} />
      </div>

      {/* Sub-tab Content */}
      <div>
        {activeSubTab === 'summary' && <SummaryTab project={project} />}
        {activeSubTab === 'locations' && (
          selectedLocationId ? (
            <LocationDetailView 
              locationId={selectedLocationId} 
              onBack={() => setSelectedLocationId(null)} 
            />
          ) : (
            <LocationList
              projectId={project.id}
              onAddLocation={() => setShowCreateLocationModal(true)}
              onLocationClick={(id) => setSelectedLocationId(id)} 
            />
          )
        )}
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
        {activeSubTab === 'photos' && (
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Photos</h2>
              <button className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90 transition-colors">+ Upload Photo</button>
            </div>
            <p className="text-muted-foreground">Photo gallery coming soon. Upload and organize project photos here.</p>
          </div>
        )}
        {activeSubTab === 'warranties' && (
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Warranties</h2>
              <button className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90 transition-colors">+ Add Warranty</button>
            </div>
            <p className="text-muted-foreground">No warranties recorded for this project.</p>
          </div>
        )}
        {activeSubTab === 'daily-logs' && (
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Daily Logs</h2>
              <button className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90 transition-colors">+ New Log</button>
            </div>
            <p className="text-muted-foreground">No daily logs for this project.</p>
          </div>
        )}
        {activeSubTab === 'change-orders' && (
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Change Orders</h2>
              <button className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90 transition-colors">+ New Change Order</button>
            </div>
            <p className="text-muted-foreground">No change orders for this project.</p>
          </div>
        )}
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
      
      {/* Create Location Modal */}
      <CreateLocationModal
        isOpen={showCreateLocationModal}
        onClose={() => setShowCreateLocationModal(false)}
        projectId={project.id}
        onSuccess={() => {
          // React Query will handle cache invalidation automatically
          setPaymentSuccess('Location created successfully');
          setTimeout(() => setPaymentSuccess(null), 3000);
        }}
      />
      </div>
    </>
  );
};

export default ProjectDetailView;
