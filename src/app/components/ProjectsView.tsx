'use client';

import React, { useState, useEffect, useCallback, ChangeEvent, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Building, Users, DollarSign, Calendar, AlertCircle, CheckCircle, Clock, RefreshCw, Eye, Plus, X, Edit2, Trash2, FolderKanban } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { useRouter, useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { getProjectStatusBadge, getStatusLabel } from '@/lib/statusColors';
import ProjectDetailView from './ProjectDetailView';
import ProjectFormWithEntity from './ProjectFormWithEntity';
import { Project, Contract, PaymentApplication } from '@/types/schema';
import { DataTable } from '@/components/ui/DataTable';
import { SignalBadge } from '@/components/ui/SignalBadge';
import { getBudgetStatus, formatCurrency, formatPercent, SystemStatus, getPaymentStatus } from '@/lib/theme';
import { authFetch } from '@/lib/authFetch';
import PageContainer from './PageContainer';
import ProjectsSkeleton from './ProjectsSkeleton';
import AuditLog from './AuditLog';

// Form validation utilities
const validators = {
  required: (value: string) => value.trim() !== '' || 'This field is required',
  email: (value: string) => {
    if (!value.trim()) return true; // Allow empty email
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || 'Please enter a valid email address';
  },
  phone: (value: string) => {
    if (!value.trim()) return true; // Allow empty phone
    return /^[\+]?[\s\-\(\)]?[\d\s\-\(\)]{10,}$/.test(value) || 'Please enter a valid phone number';
  },
  number: (value: string) => 
    !isNaN(Number(value)) && Number(value) >= 0 || 'Please enter a valid positive number',
  date: (value: string) => 
    !isNaN(Date.parse(value)) || 'Please enter a valid date'
};

interface FieldConfig {
  name: string;
  placeholder: string;
  type?: string;
  validators?: ((value: string) => string | true)[];
  required?: boolean;
  defaultValue?: string;
}

// AddForm component for creating new projects
type AddFormProps = {
  title: string;
  icon: React.ReactNode;
  fields: FieldConfig[];
  onSubmit: (formData: Record<string, string>) => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
};

const AddForm: React.FC<AddFormProps> = ({ 
  title, 
  icon, 
  fields, 
  onSubmit, 
  onClose, 
  isLoading = false
}) => {
  const [formData, setFormData] = useState<Record<string, string>>(
    () => {
      const defaultData = fields.reduce((acc, field) => {
        acc[field.name] = field.defaultValue || '';
        return acc;
      }, {} as Record<string, string>);
      return defaultData;
    }
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = useCallback((name: string, value: string) => {
    const field = fields.find(f => f.name === name);
    if (!field) return '';

    if (field.required && !value.trim()) {
      return 'This field is required';
    }

    if (field.validators) {
      for (const validator of field.validators) {
        const result = validator(value);
        if (result !== true) {
          return result;
        }
      }
    }

    return '';
  }, [fields]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleBlur = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));

    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    const newTouched: Record<string, boolean> = {};

    fields.forEach(field => {
      newTouched[field.name] = true;
      const error = validateField(field.name, formData[field.name] || '');
      if (error) newErrors[field.name] = error;
    });

    setTouched(newTouched);
    setErrors(newErrors);

    if (Object.values(newErrors).some(error => error !== '')) return;

    await onSubmit(formData);
  };

  const labelize = (str: string) => str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
            {icon}{title}
          </h3>
          <button 
            onClick={onClose} 
            className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-secondary"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          {fields.map(field => (
            <div key={field.name}>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {labelize(field.name)}
                {field.required && <span className="text-[var(--status-critical-text)] ml-1">*</span>}
              </label>
              <input
                type={field.type || 'text'}
                name={field.name}
                value={formData[field.name] !== undefined ? formData[field.name] : (field.defaultValue || '')}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full px-4 py-3 text-base border rounded focus:ring-2 focus:ring-primary transition-all duration-200 bg-secondary text-foreground placeholder-gray-400 ${
                  errors[field.name] && touched[field.name] 
                    ? 'border-[var(--status-critical-border)] focus:border-[var(--status-critical-border)] focus:ring-[var(--status-critical-border)]' 
                    : 'border-border focus:border-primary'
                }`}
                placeholder={field.placeholder}
                disabled={isLoading}
              />
              {errors[field.name] && touched[field.name] && (
                <p className="mt-1 text-sm text-[var(--status-critical-text)]">{errors[field.name]}</p>
              )}
            </div>
          ))}
          
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 text-foreground bg-secondary rounded hover:bg-secondary/80 transition-colors font-medium"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-primary text-white rounded hover:bg-primary/90 transition-colors font-medium disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Utility functions (removed duplicate formatCurrency)
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
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showDetailView, setShowDetailView] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showDataModal, setShowDataModal] = useState(false);
  const [modalData, setModalData] = useState<any[]>([]);
  const [modalTitle, setModalTitle] = useState('');
  const [modalType, setModalType] = useState('');
  const [loadingModalData, setLoadingModalData] = useState(false);
  const [projectModalData, setProjectModalData] = useState<any>({});
  const [loadingProjectModal, setLoadingProjectModal] = useState(false);
  
  // Budget details modal state
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetModalData, setBudgetModalData] = useState<any>({});
  const [budgetModalType, setBudgetModalType] = useState('');
  const [loadingBudgetModal, setLoadingBudgetModal] = useState(false);

  // Contract details modal state
  const [showContractModal, setShowContractModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

  // New project form state
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  // Edit project form state
  const [showEditProjectForm, setShowEditProjectForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isEditingProject, setIsEditingProject] = useState(false);

  // Delete confirmation state
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [isDeletingProject, setIsDeletingProject] = useState(false);

  const contractorColumns = useMemo(() => [
    { 
      header: 'Name', 
      accessor: (row: any) => <div className="font-medium text-foreground">{row.contractors?.name}</div> 
    },
    { 
      header: 'Trade', 
      accessor: (row: any) => <span className="text-muted-foreground">{row.contractors?.trade}</span> 
    },
    { 
      header: 'Contact', 
      accessor: (row: any) => (
        <div className="text-xs text-muted-foreground">
          <div>{row.contractors?.phone}</div>
          <div>{row.contractors?.email}</div>
        </div>
      )
    },
    { 
      header: 'Contract Amount', 
      accessor: (row: any) => formatCurrency(row.contract_amount), 
      align: 'right' as const 
    },
    { 
      header: 'Paid to Date', 
      accessor: (row: any) => formatCurrency(row.paid_to_date), 
      align: 'right' as const 
    },
    { 
      header: 'Status', 
      accessor: (row: any) => (
        <SignalBadge status={row.contract_status === 'active' ? 'success' : 'neutral'}>
          {row.contract_status}
        </SignalBadge>
      )
    }
  ], []);

  const budgetContractColumns = useMemo(() => [
    { 
      header: 'Contractor', 
      accessor: (row: any) => (
        <div>
          <div className="font-medium text-foreground truncate max-w-[150px]" title={row.name}>{row.name}</div>
          <div className="text-xs text-muted-foreground">{row.trade}</div>
        </div>
      )
    },
    { 
      header: 'Amount', 
      accessor: (row: any) => formatCurrency(row.contractAmount), 
      align: 'right' as const 
    },
    { 
      header: 'Paid', 
      accessor: (row: any) => formatCurrency(row.paidToDate), 
      align: 'right' as const 
    },
    { 
      header: 'Remaining', 
      accessor: (row: any) => formatCurrency(row.remaining), 
      align: 'right' as const 
    },
    { 
      header: 'Total', 
      accessor: (row: any) => `${row.percentage}%`, 
      align: 'right' as const 
    }
  ], []);

  const budgetPaymentColumns = useMemo(() => [
    { 
      header: 'Contractor', 
      accessor: (row: any) => (
        <div>
          <div className="font-medium text-foreground truncate max-w-[150px]" title={row.name}>{row.name}</div>
          <div className="text-xs text-muted-foreground">{row.trade}</div>
        </div>
      )
    },
    { 
      header: 'Date', 
      accessor: (row: any) => row.date,
    },
    { 
      header: '% Spent', 
      accessor: (row: any) => `${row.percentage}%`, 
      align: 'right' as const 
    },
    { 
      header: 'Amount', 
      accessor: (row: any) => formatCurrency(row.amount), 
      align: 'right' as const 
    }
  ], []);

  // Fetch projects from API
  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const startTime = Date.now();
      const response = await authFetch('/api/projects/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enrich: true,
          excludeDeleted: true,
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to fetch projects';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.data?.error || errorData.message || errorMessage;
        } catch (e) {
          errorMessage = `${errorMessage} (${response.status}: ${response.statusText})`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      const fetchTime = Date.now() - startTime;
      console.log(`[ProjectsView] Fetched projects in ${fetchTime}ms`);

      const projectsData = result?.data?.projects || result?.projects || [];
      setProjects(projectsData);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch projects');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const filteredProjects = useMemo(() => {
    const query = (searchQuery || '').trim().toLowerCase();
    if (!query) return projects;

    return projects.filter((p) => {
      const name = (p.name || '').toLowerCase();
      const client = ((p as any).client_name || '').toLowerCase();
      const address = ((p as any).address || '').toLowerCase();
      return name.includes(query) || client.includes(query) || address.includes(query);
    });
  }, [projects, searchQuery]);

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchProjects();
  };

  const handleCreateProject = async (formData: Record<string, any>) => {
    setIsCreatingProject(true);
    setError(null);
    try {
      const response = await authFetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const json = await response.json();
      if (!response.ok || json.error) {
        throw new Error(json.error || 'Failed to create project');
      }

      setShowNewProjectForm(false);
      await fetchProjects();
    } catch (err) {
      console.error('Error creating project:', err);
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleEditProject = async (formData: Record<string, any>) => {
    if (!editingProject) return;

    setIsEditingProject(true);
    setError(null);
    try {
      const response = await authFetch(`/api/projects/${editingProject.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const json = await response.json();
      if (!response.ok || json.error) {
        throw new Error(json.error || 'Failed to update project');
      }

      setShowEditProjectForm(false);
      setEditingProject(null);
      await fetchProjects();
    } catch (err) {
      console.error('Error updating project:', err);
      setError(err instanceof Error ? err.message : 'Failed to update project');
    } finally {
      setIsEditingProject(false);
    }
  };

  // Handle opening edit form
  const handleOpenEditForm = (project: Project) => {
    setEditingProject(project);
    setShowEditProjectForm(true);
  };

  // Handle delete project
  const handleDeleteProject = async () => {
    if (!deletingProject) return;
    
    setIsDeletingProject(true);
    try {
      const response = await authFetch(`/api/projects/${deletingProject.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[Delete Project] API Error Response:', errorData);
        const errorMessage = errorData.error || errorData.data?.error || errorData.message || 'Failed to delete project';
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      // Refresh the projects list
      await fetchProjects();
      
      // If in detail view, go back to list
      if (showDetailView) {
        handleBackToList();
      }

      // Close the confirmation modal
      setShowDeleteConfirmation(false);
      setDeletingProject(null);
      setError(null);
      
    } catch (err) {
      console.error('Error deleting project:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete project');
      // Keep modal open to show error
    } finally {
      setIsDeletingProject(false);
    }
  };

  // Handle opening delete confirmation
  const handleOpenDeleteConfirmation = (project: Project) => {
    setDeletingProject(project);
    setShowDeleteConfirmation(true);
  };

  const handleBudgetClick = async (projectId: number, type: 'spent' | 'remaining') => {
    setBudgetModalType(type);
    setLoadingBudgetModal(true);
    setShowBudgetModal(true);

    try {
      const project = projects.find(p => p.id === String(projectId));
      if (!project) return;

      let modalData: any = {};
      let modalTitle = '';

      switch (type) {
        case 'spent':
          modalTitle = `Spent Breakdown - ${project.name}`;
          // Fetch approved payment applications for this project
          const { data: approvedPaymentsData } = await supabase
            .from('payment_applications')
            .select(`
              current_period_value,
              created_at,
              contractor:contractors(name, trade)
            `)
            .eq('project_id', projectId)
            .eq('status', 'approved')
            .order('created_at', { ascending: false });

          modalData = {
            projectName: project.name,
            total: project.stats?.totalSpent ?? 0,
            items: approvedPaymentsData?.map((payment: any) => ({
              name: payment.contractor?.name || 'Unknown Contractor',
              trade: payment.contractor?.trade || 'Unknown Trade',
              amount: payment.current_period_value,
              date: new Date(payment.created_at).toLocaleDateString(),
              percentage: (project.stats?.totalSpent ?? 0) > 0 ? ((payment.current_period_value / (project.stats?.totalSpent ?? 1)) * 100).toFixed(2) : '0'
            })) || []
          };
          break;

        case 'remaining':
          modalTitle = `Budget Overview - ${project.name}`;
          // Fetch contract details for this project
          const { data: contractsData } = await supabase
            .from('project_contractors')
            .select(`
              contract_amount,
              paid_to_date,
              contractor:contractors(name, trade)
            `)
            .eq('project_id', projectId)
            .eq('contract_status', 'active');

          modalData = {
            projectName: project.name,
            totalBudget: project.stats?.totalBudget ?? 0,
            totalSpent: project.stats?.totalSpent ?? 0,
            remainingBudget: (project.stats?.totalBudget ?? 0) - (project.stats?.totalSpent ?? 0),
            utilizationRate: project.stats?.completionPercentage ?? 0,
            items: contractsData?.map((contract: any) => ({
              name: contract.contractor?.name || 'Unknown Contractor',
              trade: contract.contractor?.trade || 'Unknown Trade',
              contractAmount: contract.contract_amount,
              paidToDate: contract.paid_to_date,
              remaining: contract.contract_amount - contract.paid_to_date,
              percentage: (project.stats?.totalBudget ?? 0) > 0 ? ((contract.contract_amount / (project.stats?.totalBudget ?? 1)) * 100).toFixed(2) : '0'
            })) || []
          };
          break;
      }

      setBudgetModalData(modalData);
      setModalTitle(modalTitle);
    } catch (error) {
      console.error('Error fetching budget details:', error);
      setError('Failed to load budget details');
    } finally {
      setLoadingBudgetModal(false);
    }
  };

  // Function to handle stat card clicks
  const handleStatCardClick = async (project: Project, type: string) => {
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
            .in('status', ['submitted', 'needs_review']);

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
            .in('status', ['approved']);

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

  const handleProjectClick = async (project: Project) => {
    setSelectedProject(project);
    setShowDetailView(true);
    // Update URL to include project ID
    const params = new URLSearchParams(searchParams.toString());
    params.set('project', project.id.toString());
    router.replace(`/projects?${params.toString()}`, { scroll: false });
  };

  const handleBackToList = () => {
    setSelectedProject(null);
    setShowDetailView(false);
    // Remove project ID from URL
    const params = new URLSearchParams(searchParams.toString());
    params.delete('project');
    router.replace(`/projects?${params.toString()}`, { scroll: false });
  };

  const handleProjectClickOld = async (project: Project) => {
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
          .order('created_at', { ascending: false })
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

  return (
    <PageContainer>
      {/* MAIN CONTENT AREA - DETAIL VIEW OR LIST VIEW */}
      {showDetailView && selectedProject ? (
        <ProjectDetailView 
          project={selectedProject} 
          onBack={handleBackToList}
          onEdit={handleOpenEditForm}
          onDelete={handleOpenDeleteConfirmation}
        />
      ) : (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Projects</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {filteredProjects.length} projects
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowNewProjectForm(true)}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-green-600 text-white rounded text-xs sm:text-sm font-medium hover:bg-green-700"
              >
                <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">New Project</span>
                <span className="sm:hidden">+</span>
              </button>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-primary text-white rounded text-xs sm:text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
                <span className="sm:hidden">↻</span>
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-[var(--status-critical-bg)] border border-[var(--status-critical-border)] rounded p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-[var(--status-critical-text)]" />
                <span className="text-[var(--status-critical-text)]">{error}</span>
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

          {/* Loading State */}
          {loading ? (
            <ProjectsSkeleton />
          ) : projects.length === 0 ? (
            /* Empty State */
            <div className="bg-card border border-border rounded">
              <EmptyState
                icon={FolderKanban}
                title="No projects yet"
                description="Create your first project to start tracking budgets and payments. Projects help you organize contractors and manage construction progress."
                actionLabel="New Project"
                onAction={() => setShowProjectModal(true)}
              />
            </div>
          ) : (
            /* Projects Grid - Minimalist Design */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  className="bg-card rounded-lg border border-border p-3 hover:shadow-md hover:border-primary/50 transition-all cursor-pointer"
                  onClick={() => handleProjectClick(project)}
                >
                  {/* Compact Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-card-foreground truncate">{project.name}</h3>
                      <p className="text-xs text-muted-foreground truncate">{project.client_name}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded ml-2 whitespace-nowrap ${
                      (project.stats?.completionPercentage ?? 0) >= 80 ? 'bg-green-500/10 text-green-700 dark:text-green-400' :
                      (project.stats?.completionPercentage ?? 0) >= 50 ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400' :
                      'bg-blue-500/10 text-blue-700 dark:text-blue-400'
                    }`}>
                      {(project.stats?.completionPercentage ?? 0).toFixed(0)}%
                    </span>
                  </div>

                  {/* Compact Stats */}
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div className="text-center p-1.5 bg-blue-500/10 rounded">
                      <p className="text-sm font-bold text-blue-700 dark:text-blue-400">{project.stats?.totalContractors ?? 0}</p>
                      <p className="text-[10px] text-blue-600 dark:text-blue-500">Contractors</p>
                    </div>
                    <div className="text-center p-1.5 bg-amber-500/10 rounded">
                      <p className="text-sm font-bold text-amber-700 dark:text-amber-400">{project.stats?.activePaymentApps ?? 0}</p>
                      <p className="text-[10px] text-amber-600 dark:text-amber-500">Pending</p>
                    </div>
                    <div className="text-center p-1.5 bg-green-500/10 rounded">
                      <p className="text-sm font-bold text-green-700 dark:text-green-400">{project.stats?.completedPaymentApps ?? 0}</p>
                      <p className="text-[10px] text-green-600 dark:text-green-500">Done</p>
                    </div>
                  </div>

                  {/* Compact Budget */}
                  <div className="mb-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{formatCurrency(project.stats?.totalBudget ?? 0)}</span>
                      <span className={`font-medium ${
                        (project.stats?.completionPercentage ?? 0) > 95 ? 'text-red-600 dark:text-red-400' :
                        (project.stats?.completionPercentage ?? 0) > 75 ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-green-600 dark:text-green-400'
                      }`}>
                        {(project.stats?.completionPercentage ?? 0).toFixed(1)}%
                      </span>
                    </div>
                    {/* Thin Progress Bar */}
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${
                          (project.stats?.completionPercentage ?? 0) > 95 ? 'bg-red-500' :
                          (project.stats?.completionPercentage ?? 0) > 90 ? 'bg-orange-500' :
                          (project.stats?.completionPercentage ?? 0) > 75 ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        style={{
                          width: `${Math.min((project.stats?.completionPercentage ?? 0) > 0 ? Math.max((project.stats?.completionPercentage ?? 0), 2) : 0, 100)}%`
                        }}
                      />
                    </div>
                  </div>

                  {/* Phase Badge */}
                  <div className="pt-2 border-t border-border">
                    <span className="text-xs text-muted-foreground">{project.current_phase}</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditForm(project);
                      }}
                      className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded transition-colors"
                    >
                      <Edit2 className="w-3 h-3" />
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/payments?project=${project.id}&subtab=processing`);
                      }}
                      className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 rounded transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Pay App
                    </button>
                  </div>

                  {/* At Risk Badge */}
                  {project.atRisk && (
                    <div className="mt-2 text-xs px-2 py-1 bg-red-500/10 text-red-700 dark:text-red-400 rounded inline-flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      At Risk
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredProjects.length === 0 && (
            <div className="text-center py-12 bg-card border-2 border-dashed border-border rounded">
              <div className="text-4xl mb-4">🏗️</div>
              <p className="text-muted-foreground font-medium">No projects found</p>
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'Try adjusting your search terms' : 'Create a new project to get started'}
              </p>
            </div>
          )}

          {/* Audit Log */}
          {!selectedProject && <AuditLog limit={15} />}
        </>
      )}

      {/* GLOBAL MODALS (Always rendered) */}

      {/* Data Modal (Contractors, Payment Apps List) */}
      {showDataModal && (
        <div className="fixed inset-0  bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-card rounded shadow-xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-semibold text-foreground truncate pr-2">
                  {modalTitle}
                </h3>
                <button
                  onClick={handleCloseDataModal}
                  className="text-muted-foreground hover:text-muted-foreground p-1 flex-shrink-0"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(95vh-120px)] sm:max-h-[calc(90vh-120px)]">
              {loadingModalData ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-3 text-muted-foreground">Loading data...</span>
                </div>
              ) : (
                <DataTable
                  data={modalData}
                  columns={modalType === 'contractors' ? [
                    {
                      header: 'Name',
                      accessor: (row: any) => (
                        <div>
                          <div className="font-medium text-foreground">{row.name}</div>
                          <div className="text-xs text-muted-foreground">{row.trade}</div>
                        </div>
                      )
                    },
                    {
                      header: 'Contact',
                      accessor: (row: any) => (
                        <div className="text-xs text-muted-foreground">
                          <div>{row.email}</div>
                          <div>{row.phone}</div>
                        </div>
                      )
                    },
                    {
                      header: 'Contract',
                      accessor: (row: any) => formatCurrency(row.contract_amount),
                      align: 'right' as const
                    },
                    {
                      header: 'Paid',
                      accessor: (row: any) => formatCurrency(row.paid_to_date),
                      align: 'right' as const
                    },
                    {
                      header: 'Status',
                      accessor: (row: any) => (
                        <SignalBadge status={row.contract_status === 'active' ? 'success' : 'neutral'}>
                          {row.contract_status}
                        </SignalBadge>
                      )
                    }
                  ] : [
                    {
                      header: 'Contractor',
                      accessor: (row: any) => (
                        <div>
                          <div className="font-medium text-foreground">{row.contractor_name}</div>
                          <div className="text-xs text-muted-foreground">{row.trade}</div>
                        </div>
                      )
                    },
                    {
                      header: 'Created',
                      accessor: (row: any) => formatDate(row.created_at)
                    },
                    {
                      header: 'Amount',
                      accessor: (row: any) => formatCurrency(row.grand_total),
                      align: 'right' as const
                    },
                    {
                      header: 'Status',
                      accessor: (row: any) => (
                        <SignalBadge status={getPaymentStatus(row.status)}>
                          {row.status.replace(/_/g, ' ')}
                        </SignalBadge>
                      )
                    }
                  ]}
                  emptyMessage={
                    modalType === 'contractors' ? 'No contractors assigned to this project' :
                    modalType === 'payment_apps' ? 'No active payment applications found' :
                    modalType === 'completed' ? 'No completed payment applications found' :
                    'No data available'
                  }
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Project Detail Modal (Legacy / Quick View) */}
      {showProjectModal && selectedProject && (
        <div className="fixed inset-0  bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          {/* ... Modal Content ... */}
          <div className="bg-card rounded shadow-xl w-full max-w-6xl max-h-[90vh] sm:max-h-[95vh] overflow-hidden flex flex-col">
             <div className="p-4 sm:p-6 border-b border-border flex-shrink-0">
               <div className="flex items-center justify-between">
                 <h3 className="text-lg sm:text-xl font-semibold text-foreground truncate pr-2">
                   {loadingProjectModal ? 'Loading Project Details...' : `${projectModalData.project?.name || 'Project Details'}`}
                 </h3>
                 <button
                   onClick={handleCloseModal}
                   className="text-muted-foreground hover:text-muted-foreground p-1 flex-shrink-0"
                 >
                   <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                   </svg>
                 </button>
               </div>
             </div>

             <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              {loadingProjectModal ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-3 text-muted-foreground">Loading project data...</span>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Project Overview */}
                  <div className="bg-secondary rounded p-6">
                    <h4 className="text-lg font-semibold text-foreground mb-4">Project Overview</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Project Name</label>
                        <p className="text-lg font-semibold text-foreground">{projectModalData.project?.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Client</label>
                        <p className="text-lg font-semibold text-foreground">{projectModalData.project?.client_name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Status</label>
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          projectModalData.project?.at_risk 
                            ? 'bg-[var(--status-critical-bg)] text-[var(--status-critical-text)]' 
                            : 'bg-[var(--status-success-bg)] text-[var(--status-success-text)]'
                        }`}>
                          {projectModalData.project?.at_risk ? '⚠️ At Risk' : '✅ On Track'}
                        </span>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Phase</label>
                        <p className="text-lg font-semibold text-foreground">{projectModalData.project?.current_phase || 'N/A'}</p>
                      </div>
                      {/* ... other fields ... */}
                    </div>
                  </div>
                  {/* ... rest of modal ... */}
                </div>
              )}
             </div>
             {/* Footer */}
             <div className="flex items-center justify-end gap-3 p-4 sm:p-6 border-t border-border flex-shrink-0">
               <button
                 onClick={handleCloseModal}
                 className="px-3 sm:px-4 py-2 text-foreground bg-secondary rounded hover:bg-secondary/80 text-sm sm:text-base"
               >
                 Close
               </button>
             </div>
           </div>
        </div>
      )}

      {/* Budget Details Modal */}
      {showBudgetModal && (
        <div className="fixed inset-0  bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {/* ... budget modal content ... */}
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">
                  {modalTitle}
                </h3>
                <button
                  onClick={() => setShowBudgetModal(false)}
                  className="text-muted-foreground hover:text-muted-foreground p-1"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {loadingBudgetModal ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-3 text-muted-foreground">Loading data...</span>
                </div>
              ) : (
                // ... content ...
                <div className="space-y-6">
                  {/* ... budget data ... */}
                  {budgetModalType === 'remaining' ? (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="bg-primary/10 p-4 rounded">
                                <div className="text-sm text-primary font-medium">Total Budget</div>
                                <div className="text-2xl font-bold text-blue-900">{formatCurrency(budgetModalData.totalBudget)}</div>
                            </div>
                            <div className="bg-purple-50 p-4 rounded">
                                <div className="text-sm text-purple-600 font-medium">Total Spent</div>
                                <div className="text-2xl font-bold text-purple-900">{formatCurrency(budgetModalData.totalSpent)}</div>
                            </div>
                            <div className="bg-[var(--status-success-bg)] p-4 rounded">
                                <div className="text-sm text-[var(--status-success-text)] font-medium">Remaining</div>
                                <div className="text-2xl font-bold text-green-900">{formatCurrency(budgetModalData.remainingBudget)}</div>
                            </div>
                        </div>
                        <DataTable
                            data={budgetModalData.items || []}
                            columns={budgetContractColumns}
                            emptyMessage="No contracts found"
                        />
                    </div>
                  ) : (
                    <div className="space-y-4">
                        <div className="bg-secondary p-4 rounded mb-6">
                            <div className="text-sm text-muted-foreground">Total Spent</div>
                            <div className="text-2xl font-bold text-foreground">{formatCurrency(budgetModalData.total)}</div>
                        </div>
                        <DataTable
                            data={budgetModalData.items || []}
                            columns={budgetPaymentColumns}
                            emptyMessage="No payments found"
                        />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Contract Details Modal */}
      {showContractModal && selectedContract && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-card rounded shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* ... contract modal content ... */}
            <div className="p-4 sm:p-6 border-b border-border flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-lg sm:text-xl font-semibold text-foreground">
                  Contract Details
                </h3>
                <button
                  onClick={() => {
                    setShowContractModal(false);
                    setSelectedContract(null);
                  }}
                  className="text-muted-foreground hover:text-foreground p-1 flex-shrink-0"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
                <div className="space-y-6">
                    <div className="bg-primary/10 rounded p-6 text-center">
                        <div className="text-sm font-medium text-muted-foreground mb-2">Contract Amount</div>
                        <div className="text-3xl font-bold text-primary">
                            {formatCurrency(selectedContract.contract_amount || 0)}
                        </div>
                    </div>
                    {/* ... other contract details ... */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-secondary rounded p-4">
                            <label className="text-sm font-medium text-muted-foreground">Contractor</label>
                            <p className="text-lg font-semibold text-foreground mt-1">
                                {selectedContract.contractors?.name || 'Unknown Contractor'}
                            </p>
                        </div>
                        {/* ... */}
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-4 sm:p-6 border-t border-border flex-shrink-0">
              <button
                onClick={() => {
                  setShowContractModal(false);
                  setSelectedContract(null);
                }}
                className="px-3 sm:px-4 py-2 text-foreground bg-secondary rounded hover:bg-secondary/80 text-sm sm:text-base"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Project Form Modal */}
      {showNewProjectForm && (
        <ProjectFormWithEntity
          onSubmit={handleCreateProject}
          onClose={() => setShowNewProjectForm(false)}
          isLoading={isCreatingProject}
        />
      )}

      {/* Edit Project Form Modal */}
      {showEditProjectForm && editingProject && (
        <ProjectFormWithEntity
          onSubmit={handleEditProject}
          onClose={() => {
            setShowEditProjectForm(false);
            setEditingProject(null);
          }}
          isLoading={isEditingProject}
          initialData={{
            id: editingProject.id,
            name: editingProject.name || '',
            client_name: editingProject.client_name || '',
            address: editingProject.address || '',
            budget: editingProject.budget?.toString() || '',
            start_date: editingProject.start_date || '',
            target_completion_date: editingProject.target_completion_date || '',
            current_phase: editingProject.current_phase || '',
            status: editingProject.status || 'active',
            owner_entity_id: editingProject.owner_entity_id?.toString() || '',
            portfolio_name: editingProject.portfolio_name || '',
            total_units: editingProject.total_units?.toString() || '1',
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && deletingProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Delete Project</h3>
                  <p className="text-sm text-muted-foreground">This action cannot be undone</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <p className="text-foreground mb-4">
                Are you sure you want to delete <span className="font-semibold">&quot;{deletingProject.name}&quot;</span>?
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                This will set the project status to &quot;deleted&quot;. You can only delete projects with no contractors or payment applications.
              </p>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
              <button
                onClick={() => {
                  setShowDeleteConfirmation(false);
                  setDeletingProject(null);
                  setError(null);
                }}
                disabled={isDeletingProject}
                className="px-4 py-2 text-foreground bg-secondary rounded hover:bg-secondary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProject}
                disabled={isDeletingProject}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isDeletingProject ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Project</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
};

export default ProjectsView;
