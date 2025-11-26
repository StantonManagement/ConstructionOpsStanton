'use client';

import React, { useState, useEffect, useCallback, ChangeEvent, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Building, Users, DollarSign, Calendar, AlertCircle, CheckCircle, Clock, RefreshCw, Eye, Plus, X, Edit2, Trash2, FolderKanban } from 'lucide-react';
import { EmptyState } from './ui/EmptyState';
import { useRouter, useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { getProjectStatusBadge, getStatusLabel } from '@/lib/statusColors';
import ProjectDetailView from './ProjectDetailView';
import ProjectFormWithEntity from './ProjectFormWithEntity';
import { Project, Contract, PaymentApplication } from '@/types/schema';
import { DataTable } from '@/components/ui/DataTable';
import { SignalBadge } from '@/components/ui/SignalBadge';
import { getBudgetStatus, formatCurrency, formatPercent, SystemStatus, getPaymentStatus } from '@/lib/theme';

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
      <div className="bg-card rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
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
                className={`w-full px-4 py-3 text-base border rounded-lg focus:ring-2 focus:ring-primary transition-all duration-200 bg-secondary text-foreground placeholder-gray-400 ${
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
              className="flex-1 px-4 py-3 text-foreground bg-secondary rounded-lg hover:bg-secondary/80 transition-colors font-medium"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50"
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
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const startTime = Date.now();

      // Call API
      const response = await fetch('/api/projects/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          excludeDeleted: true,
          enrich: true
        })
      });

      if (!response.ok) {
        let errorMessage = 'Failed to load projects';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage = `${errorMessage} (${response.status}: ${response.statusText})`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      const fetchTime = Date.now() - startTime;

      if (!result.success || !result.data) {
        throw new Error('Invalid API response');
      }

      const { projects: enrichedProjects } = result.data;

      setProjects(enrichedProjects || []);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load projects';
      console.error('[ProjectsView] Error fetching projects:', err);
      setError(errorMessage);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Keep selected project & detail view in sync with URL ?project= param
  useEffect(() => {
    const projectIdFromUrl = searchParams.get('project');

    // If there's no project in the URL, ensure we're in list mode
    if (!projectIdFromUrl) {
      if (showDetailView || selectedProject) {
        setShowDetailView(false);
        setSelectedProject(null);
      }
      return;
    }

    // Only try to resolve once projects have loaded
    if (projects.length === 0) return;

    const projectFromUrl = projects.find(p => p.id.toString() === projectIdFromUrl);

    // If we can't find the project (stale ID), leave current state alone
    if (!projectFromUrl) return;

    // If the URL already matches the current selection, do nothing
    if (selectedProject && selectedProject.id === projectFromUrl.id) return;

    // Otherwise, switch the detail view to the project from the URL
    setSelectedProject(projectFromUrl);
    setShowDetailView(true);
  }, [searchParams, projects, selectedProject, showDetailView]);

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

  // Handle creating a new project
  const handleCreateProject = async (formData: Record<string, string>) => {
    setIsCreatingProject(true);
    try {
      const projectData = {
        name: formData.name,
        address: formData.address,
        client_name: formData.client_name,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        start_date: formData.start_date || null,
        target_completion_date: formData.target_completion_date || null,
        status: formData.status || 'active',
        current_phase: formData.current_phase || 'Planning'
        // created_at and updated_at are handled by database DEFAULT values
      };

      const { data, error } = await supabase
        .from('projects')
        .insert([projectData])
        .select()
        .single();

      if (error) throw error;

      // Refresh the projects list
      await fetchProjects();
      
      // Close the form
      setShowNewProjectForm(false);
      
    } catch (err) {
      console.error('Error creating project:', err);
      setError('Failed to create project');
    } finally {
      setIsCreatingProject(false);
    }
  };

  // Handle editing a project
  const handleEditProject = async (formData: Record<string, string>) => {
    if (!editingProject) return;
    
    setIsEditingProject(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const updateData = {
        name: formData.name,
        client_name: formData.client_name,
        address: formData.address,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        start_date: formData.start_date || null,
        target_completion_date: formData.target_completion_date || null,
        current_phase: formData.current_phase,
        status: formData.status,
        owner_entity_id: formData.owner_entity_id ? parseInt(formData.owner_entity_id) : null,
        portfolio_name: formData.portfolio_name || null,
        total_units: formData.total_units ? parseInt(formData.total_units) : 1,
      };

      const response = await fetch(`/api/projects/${editingProject.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update project');
      }

      // Refresh the projects list
      await fetchProjects();
      
      // If we are in detail view, update the selected project with new data
      if (showDetailView && selectedProject && selectedProject.id === editingProject.id) {
        // Optimistic update or rely on fetchProjects
        // Since we refreshed the list, we should try to find the updated project in the new list
        // But fetchProjects is async and we don't have the new list yet here in this scope easily without refetching logic coupling.
        // Simplest is to just close the form. The UI will update when fetchProjects completes.
        // However, selectedProject state needs to be updated if it's not derived from projects list directly in render.
        // It IS state. So we should update it.
        
        // Construct updated project object
        const updatedProject = { ...editingProject, ...updateData } as Project;
        // Note: This is a partial update, some fields might be missing or different types (dates)
        // Ideally we'd use the response from API.
        
        // For now, just closing. The fetchProjects will eventually update the list, but selectedProject is separate state.
        // We need to update selectedProject to see changes immediately in Detail View.
        setSelectedProject(prev => prev ? ({ ...prev, ...updateData } as Project) : null);
      }
      
      // Close the form
      setShowEditProjectForm(false);
      setEditingProject(null);
      
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`/api/projects/${deletingProject.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
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
      const project = projects.find(p => p.id === projectId);
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
    router.replace(`/?tab=projects&${params.toString()}`, { scroll: false });
  };

  const handleBackToList = () => {
    setSelectedProject(null);
    setShowDetailView(false);
    // Remove project ID from URL
    const params = new URLSearchParams(searchParams.toString());
    params.delete('project');
    router.replace(`/?tab=projects&${params.toString()}`, { scroll: false });
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
    <div className="space-y-6">
      {/* MAIN CONTENT AREA - DETAIL VIEW OR LIST VIEW */}
      {showDetailView && selectedProject ? (
        <ProjectDetailView 
          project={selectedProject} 
          onBack={handleBackToList}
          onEdit={handleOpenEditForm}
        />
      ) : (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Projects</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {filteredProjects.length} projects • Updated {new Date().toLocaleTimeString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowNewProjectForm(true)}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-green-700"
              >
                <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">New Project</span>
                <span className="sm:hidden">+</span>
              </button>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-primary text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
                <span className="sm:hidden">↻</span>
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-[var(--status-critical-bg)] border border-[var(--status-critical-border)] rounded-lg p-4">
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
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-3 text-muted-foreground">Loading projects...</span>
            </div>
          ) : projects.length === 0 ? (
            /* Empty State */
            <div className="bg-card border border-border rounded-lg">
              <EmptyState
                icon={FolderKanban}
                title="No projects yet"
                description="Create your first project to start tracking budgets and payments. Projects help you organize contractors and manage construction progress."
                actionLabel="New Project"
                onAction={() => setShowProjectModal(true)}
              />
            </div>
          ) : (
            /* Projects Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  className="bg-card rounded-lg border border-border p-4 sm:p-6 hover:shadow-lg transition-shadow duration-200 cursor-pointer"
                  onClick={() => handleProjectClick(project)}
                >
                  {/* Project Header */}
                  <div className="flex items-start justify-between mb-3 sm:mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1 truncate">{project.name}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">{project.client_name}</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-2 ml-2">
                      {project.atRisk && (
                        <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium bg-[var(--status-critical-bg)] text-[var(--status-critical-text)]">
                          <AlertCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                          <span className="hidden sm:inline">At Risk</span>
                          <span className="sm:hidden">⚠️</span>
                        </span>
                      )}
                      <span className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium ${
                        (project.stats?.completionPercentage ?? 0) >= 80 
                          ? 'bg-[var(--status-success-bg)] text-[var(--status-success-text)]' 
                          : (project.stats?.completionPercentage ?? 0) >= 50 
                          ? 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]'
                          : 'bg-blue-100 text-primary'
                      }`}>
                        {(project.stats?.completionPercentage ?? 0).toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  {/* Interactive Stat Cards */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-4">
                    <div 
                      className="bg-blue-50 p-2 sm:p-3 rounded-lg cursor-pointer hover:shadow-md transition-all duration-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatCardClick(project, 'contractors');
                      }}
                    >
                      <div className="flex items-center gap-1 sm:gap-2 mb-1">
                        <Users className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                        <h4 className="font-medium text-foreground text-xs sm:text-sm">Contractors</h4>
                      </div>
                      <p className="text-lg sm:text-xl font-bold text-primary">{project.stats?.totalContractors ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Active</p>
                      <div className="mt-1 text-xs text-primary font-medium">
                        <span className="hidden sm:inline">Click to view</span>
                        <span className="sm:hidden">View</span>
                      </div>
                    </div>

                    <div 
                      className="bg-[var(--status-warning-bg)] p-2 sm:p-3 rounded-lg cursor-pointer hover:shadow-md transition-all duration-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatCardClick(project, 'payment_apps');
                      }}
                    >
                      <div className="flex items-center gap-1 sm:gap-2 mb-1">
                        <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 text-[var(--status-warning-text)]" />
                        <h4 className="font-medium text-foreground text-xs sm:text-sm">Payment Apps</h4>
                      </div>
                      <p className="text-lg sm:text-xl font-bold text-[var(--status-warning-text)]">{project.stats?.activePaymentApps ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Pending</p>
                      <div className="mt-1 text-xs text-[var(--status-warning-text)] font-medium">
                        <span className="hidden sm:inline">Click to view</span>
                        <span className="sm:hidden">View</span>
                      </div>
                    </div>

                    <div 
                      className="bg-[var(--status-success-bg)] p-2 sm:p-3 rounded-lg cursor-pointer hover:shadow-md transition-all duration-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatCardClick(project, 'completed');
                      }}
                    >
                      <div className="flex items-center gap-1 sm:gap-2 mb-1">
                        <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-[var(--status-success-text)]" />
                        <h4 className="font-medium text-foreground text-xs sm:text-sm">Completed</h4>
                      </div>
                      <p className="text-lg sm:text-xl font-bold text-[var(--status-success-text)]">{project.stats?.completedPaymentApps ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Approved</p>
                      <div className="mt-1 text-xs text-[var(--status-success-text)] font-medium">
                        <span className="hidden sm:inline">Click to view</span>
                        <span className="sm:hidden">View</span>
                      </div>
                    </div>
                  </div>

                  {/* Budget Progress */}
                  <div className="mb-3 sm:mb-4">
                    <div className="flex items-center justify-between text-xs sm:text-sm mb-2">
                      <span className="text-muted-foreground font-medium">Budget Progress</span>
                      <span className="text-foreground font-semibold">{formatCurrency(project.stats?.totalBudget ?? 0)}</span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-secondary/80 rounded-full h-2 sm:h-3 mb-2 relative overflow-hidden">
                      <div
                        className={`h-2 sm:h-3 rounded-full transition-all duration-500 ease-out ${
                          (project.stats?.completionPercentage ?? 0) > 95 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                          (project.stats?.completionPercentage ?? 0) > 90 ? 'bg-gradient-to-r from-orange-500 to-orange-600' :
                          (project.stats?.completionPercentage ?? 0) > 75 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                          'bg-gradient-to-r from-green-500 to-green-600'
                        }`}
                        style={{ 
                          width: `${Math.min((project.stats?.completionPercentage ?? 0) > 0 ? Math.max((project.stats?.completionPercentage ?? 0), 1) : 0, 100)}%`,
                          transition: 'width 0.5s ease-out'
                        }}
                        role="progressbar"
                        aria-valuenow={project.stats?.completionPercentage ?? 0}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Budget utilization: ${(project.stats?.completionPercentage ?? 0).toFixed(2)}%`}
                      >
                        {/* Animated shimmer effect for high usage */}
                        {((project.stats?.completionPercentage ?? 0) > 75) && (
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                        )}
                      </div>
                    </div>

                    {/* Budget Details */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 text-xs">
                      <span className="text-muted-foreground">
                        Spent: <span 
                          className="font-medium text-foreground cursor-pointer hover:text-primary hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBudgetClick(project.id, 'spent');
                          }}
                        >
                          {formatCurrency(project.stats?.totalSpent ?? 0)}
                        </span>
                      </span>
                      <span className="text-muted-foreground">
                        Remaining: <span 
                          className="font-medium text-foreground cursor-pointer hover:text-[var(--status-success-text)] hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBudgetClick(project.id, 'remaining');
                          }}
                        >
                          {formatCurrency((project.stats?.totalBudget ?? 0) - (project.stats?.totalSpent ?? 0))}
                        </span>
                      </span>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 text-xs mt-1">
                      <span className="text-muted-foreground font-medium">
                        {(project.stats?.completionPercentage ?? 0) < 0.01 ? '<0.01%' : (project.stats?.completionPercentage ?? 0).toFixed(2)}% utilized
                      </span>
                      <span className={`font-semibold ${
                        (project.stats?.completionPercentage ?? 0) > 95 ? 'text-[var(--status-critical-text)]' :
                        (project.stats?.completionPercentage ?? 0) > 90 ? 'text-orange-600' :
                        (project.stats?.completionPercentage ?? 0) > 75 ? 'text-[var(--status-warning-text)]' :
                        'text-[var(--status-success-text)]'
                      }`}>
                        {(project.stats?.completionPercentage ?? 0) > 95 ? '⚠️ Over budget' :
                        (project.stats?.completionPercentage ?? 0) > 90 ? '⚠️ Near limit' :
                        (project.stats?.completionPercentage ?? 0) > 75 ? '⚡ High usage' :
                        '✅ On track'}
                      </span>
                    </div>
                  </div>

                  {/* Project Details */}
                  <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Building className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Phase:</span>
                      <span className="font-medium text-foreground truncate">{project.current_phase}</span>
                    </div>
                    {project.daysToInspection > 0 && (
                      <div className="flex items-center gap-1 sm:gap-2">
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Inspection:</span>
                        <span className={`font-medium ${project.daysToInspection <= 3 ? 'text-[var(--status-critical-text)]' : 'text-foreground'}`}>
                          {project.daysToInspection} days
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditForm(project);
                        }}
                        className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm font-medium"
                      >
                        <Edit2 className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDeleteConfirmation(project);
                        }}
                        className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs sm:text-sm font-medium"
                      >
                        <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span>Delete</span>
                      </button>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const params = new URLSearchParams(searchParams.toString());
                        params.set('tab', 'payment');
                        params.set('subtab', 'processing');
                        params.set('project', project.id.toString());
                        router.replace(`/?${params.toString()}`, { scroll: false });
                      }}
                      className="w-full flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-xs sm:text-sm font-medium"
                    >
                      <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">Create Payment App</span>
                      <span className="sm:hidden">Create App</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredProjects.length === 0 && (
            <div className="text-center py-12 bg-card border-2 border-dashed border-border rounded-lg">
              <div className="text-4xl mb-4">🏗️</div>
              <p className="text-muted-foreground font-medium">No projects found</p>
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'Try adjusting your search terms' : 'Create a new project to get started'}
              </p>
            </div>
          )}
        </>
      )}

      {/* GLOBAL MODALS (Always rendered) */}

      {/* Data Modal (Contractors, Payment Apps List) */}
      {showDataModal && (
        <div className="fixed inset-0  bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-card rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
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
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
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
          <div className="bg-card rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] sm:max-h-[95vh] overflow-hidden flex flex-col">
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
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-3 text-muted-foreground">Loading project data...</span>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Project Overview */}
                  <div className="bg-secondary rounded-lg p-6">
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
                 className="px-3 sm:px-4 py-2 text-foreground bg-secondary rounded-lg hover:bg-secondary/80 text-sm sm:text-base"
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
          <div className="bg-card rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
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
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-3 text-muted-foreground">Loading data...</span>
                </div>
              ) : (
                // ... content ...
                <div className="space-y-6">
                  {/* ... budget data ... */}
                  {budgetModalType === 'remaining' ? (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <div className="text-sm text-primary font-medium">Total Budget</div>
                                <div className="text-2xl font-bold text-blue-900">{formatCurrency(budgetModalData.totalBudget)}</div>
                            </div>
                            <div className="bg-purple-50 p-4 rounded-lg">
                                <div className="text-sm text-purple-600 font-medium">Total Spent</div>
                                <div className="text-2xl font-bold text-purple-900">{formatCurrency(budgetModalData.totalSpent)}</div>
                            </div>
                            <div className="bg-[var(--status-success-bg)] p-4 rounded-lg">
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
                        <div className="bg-secondary p-4 rounded-lg mb-6">
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
          <div className="bg-card rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
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
                    <div className="bg-primary/10 rounded-lg p-6 text-center">
                        <div className="text-sm font-medium text-muted-foreground mb-2">Contract Amount</div>
                        <div className="text-3xl font-bold text-primary">
                            {formatCurrency(selectedContract.contract_amount || 0)}
                        </div>
                    </div>
                    {/* ... other contract details ... */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-secondary rounded-lg p-4">
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
                className="px-3 sm:px-4 py-2 text-foreground bg-secondary rounded-lg hover:bg-secondary/80 text-sm sm:text-base"
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
          <div className="bg-card rounded-lg shadow-xl w-full max-w-md">
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
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
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
                className="px-4 py-2 text-foreground bg-secondary rounded-lg hover:bg-secondary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProject}
                disabled={isDeletingProject}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
    </div>
  );
};

export default ProjectsView;
