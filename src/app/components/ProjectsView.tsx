'use client';

import React, { useState, useEffect, useCallback, ChangeEvent } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Building, Users, DollarSign, Calendar, AlertCircle, CheckCircle, Clock, RefreshCw, Eye, Plus, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

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
      <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            {icon}{title}
          </h3>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          {fields.map(field => (
            <div key={field.name}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {labelize(field.name)}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              <input
                type={field.type || 'text'}
                name={field.name}
                value={formData[field.name] !== undefined ? formData[field.name] : (field.defaultValue || '')}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full px-4 py-3 text-base border rounded-lg focus:ring-2 focus:ring-blue-500 transition-all duration-200 bg-gray-50 text-gray-900 placeholder-gray-400 ${
                  errors[field.name] && touched[field.name] 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                    : 'border-gray-200 focus:border-blue-500'
                }`}
                placeholder={field.placeholder}
                disabled={isLoading}
              />
              {errors[field.name] && touched[field.name] && (
                <p className="mt-1 text-sm text-red-600">{errors[field.name]}</p>
              )}
            </div>
          ))}
          
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
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
  
  // Budget details modal state
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetModalData, setBudgetModalData] = useState<any>({});
  const [budgetModalType, setBudgetModalType] = useState('');
  const [loadingBudgetModal, setLoadingBudgetModal] = useState(false);

  // New project form state
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);

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

      // Get all project IDs for batch queries to avoid N+1 problem
      const projectIds = (projectsData || []).map(p => p.id);

      // Batch fetch all data to prevent N+1 queries
      const [contractorsData, paymentAppsData, budgetData, approvedPayments] = await Promise.all([
        supabase
          .from('project_contractors')
          .select('id, project_id')
          .in('project_id', projectIds)
          .eq('contract_status', 'active'),
        supabase
          .from('payment_applications')
          .select('id, status, project_id')
          .in('project_id', projectIds),
        supabase
          .from('project_contractors')
          .select('contract_amount, paid_to_date, project_id')
          .in('project_id', projectIds)
          .eq('contract_status', 'active'),
        supabase
          .from('payment_applications')
          .select('current_payment, project_id')
          .in('project_id', projectIds)
          .eq('status', 'approved')
      ]);

      // Group data by project_id for efficient lookup
      const contractorsByProject = (contractorsData.data || []).reduce((acc: any, item) => {
        acc[item.project_id] = (acc[item.project_id] || 0) + 1;
        return acc;
      }, {});

      const paymentAppsByProject = (paymentAppsData.data || []).reduce((acc: any, item) => {
        if (!acc[item.project_id]) acc[item.project_id] = { active: 0, completed: 0 };
        if (['submitted', 'needs_review'].includes(item.status)) {
          acc[item.project_id].active++;
        } else if (item.status === 'approved') {
          acc[item.project_id].completed++;
        }
        return acc;
      }, {});

      const budgetByProject = (budgetData.data || []).reduce((acc: any, item) => {
        if (!acc[item.project_id]) acc[item.project_id] = 0;
        acc[item.project_id] += Number(item.contract_amount) || 0;
        return acc;
      }, {});

      const spentByProject = (approvedPayments.data || []).reduce((acc: any, item) => {
        if (!acc[item.project_id]) acc[item.project_id] = 0;
        acc[item.project_id] += Number(item.current_payment) || 0;
        return acc;
      }, {});

      // Enrich projects with pre-calculated stats
      const enrichedProjects = (projectsData || []).map((project: any) => {
        const totalContractors = contractorsByProject[project.id] || 0;
        const paymentApps = paymentAppsByProject[project.id] || { active: 0, completed: 0 };
        const totalBudget = budgetByProject[project.id] || 0;
        const totalSpent = spentByProject[project.id] || 0;

        const completionPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

        return {
          ...project,
          stats: {
            totalContractors,
            activePaymentApps: paymentApps.active,
            completedPaymentApps: paymentApps.completed,
            totalBudget,
            totalSpent,
            completionPercentage
          }
        };
      });

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
        end_date: formData.end_date || null,
        status: formData.status || 'active',
        current_phase: formData.current_phase || 'Planning',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
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
            total: project.stats.totalSpent,
            items: approvedPaymentsData?.map((payment: any) => ({
              name: payment.contractor?.name || 'Unknown Contractor',
              trade: payment.contractor?.trade || 'Unknown Trade',
              amount: payment.current_period_value,
              date: new Date(payment.created_at).toLocaleDateString(),
                             percentage: project.stats.totalSpent > 0 ? ((payment.current_period_value / project.stats.totalSpent) * 100).toFixed(2) : '0'
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
            totalBudget: project.stats.totalBudget,
            totalSpent: project.stats.totalSpent,
            remainingBudget: project.stats.totalBudget - project.stats.totalSpent,
            utilizationRate: project.stats.completionPercentage,
            items: contractsData?.map((contract: any) => ({
              name: contract.contractor?.name || 'Unknown Contractor',
              trade: contract.contractor?.trade || 'Unknown Trade',
              contractAmount: contract.contract_amount,
              paidToDate: contract.paid_to_date,
              remaining: contract.contract_amount - contract.paid_to_date,
                             percentage: project.stats.totalBudget > 0 ? ((contract.contract_amount / project.stats.totalBudget) * 100).toFixed(2) : '0'
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
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
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
            <span className="sm:hidden">↻</span>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filteredProjects.map((project) => (
          <div
            key={project.id}
            className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => handleProjectClick(project)}
          >
            {/* Project Header */}
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 truncate">{project.name}</h3>
                <p className="text-xs sm:text-sm text-gray-600 truncate">{project.client_name}</p>
              </div>
              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-2 ml-2">
                {project.atRisk && (
                  <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    <AlertCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                    <span className="hidden sm:inline">At Risk</span>
                    <span className="sm:hidden">⚠️</span>
                  </span>
                )}
                                 <span className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium ${
                   project.stats.completionPercentage >= 80 
                     ? 'bg-green-100 text-green-800' 
                     : project.stats.completionPercentage >= 50 
                     ? 'bg-yellow-100 text-yellow-800'
                     : 'bg-blue-100 text-blue-800'
                 }`}>
                   {project.stats.completionPercentage.toFixed(2)}%
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
                  <Users className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                  <h4 className="font-medium text-gray-900 text-xs sm:text-sm">Contractors</h4>
                </div>
                <p className="text-lg sm:text-xl font-bold text-blue-600">{project.stats.totalContractors}</p>
                <p className="text-xs text-gray-600">Active</p>
                <div className="mt-1 text-xs text-blue-600 font-medium">
                  <span className="hidden sm:inline">Click to view</span>
                  <span className="sm:hidden">View</span>
                </div>
              </div>

              <div 
                className="bg-yellow-50 p-2 sm:p-3 rounded-lg cursor-pointer hover:shadow-md transition-all duration-200"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatCardClick(project, 'payment_apps');
                }}
              >
                <div className="flex items-center gap-1 sm:gap-2 mb-1">
                  <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-600" />
                  <h4 className="font-medium text-gray-900 text-xs sm:text-sm">Payment Apps</h4>
                </div>
                <p className="text-lg sm:text-xl font-bold text-yellow-600">{project.stats.activePaymentApps}</p>
                <p className="text-xs text-gray-600">Pending</p>
                <div className="mt-1 text-xs text-yellow-600 font-medium">
                  <span className="hidden sm:inline">Click to view</span>
                  <span className="sm:hidden">View</span>
                </div>
              </div>

              <div 
                className="bg-green-50 p-2 sm:p-3 rounded-lg cursor-pointer hover:shadow-md transition-all duration-200"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatCardClick(project, 'completed');
                }}
              >
                <div className="flex items-center gap-1 sm:gap-2 mb-1">
                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                  <h4 className="font-medium text-gray-900 text-xs sm:text-sm">Completed</h4>
                </div>
                <p className="text-lg sm:text-xl font-bold text-green-600">{project.stats.completedPaymentApps}</p>
                <p className="text-xs text-gray-600">Approved</p>
                <div className="mt-1 text-xs text-green-600 font-medium">
                  <span className="hidden sm:inline">Click to view</span>
                  <span className="sm:hidden">View</span>
                </div>
              </div>
            </div>

            {/* Budget Progress */}
            <div className="mb-3 sm:mb-4">
              <div className="flex items-center justify-between text-xs sm:text-sm mb-2">
                <span className="text-gray-600 font-medium">Budget Progress</span>
                <span className="text-gray-900 font-semibold">{formatCurrency(project.stats.totalBudget)}</span>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3 mb-2 relative overflow-hidden">
                <div
                  className={`h-2 sm:h-3 rounded-full transition-all duration-500 ease-out ${
                    project.stats.completionPercentage > 95 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                    project.stats.completionPercentage > 90 ? 'bg-gradient-to-r from-orange-500 to-orange-600' :
                    project.stats.completionPercentage > 75 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                    'bg-gradient-to-r from-green-500 to-green-600'
                  }`}
                  style={{ 
                    width: `${Math.min(project.stats.completionPercentage > 0 ? Math.max(project.stats.completionPercentage, 1) : 0, 100)}%`,
                    transition: 'width 0.5s ease-out'
                  }}
                  role="progressbar"
                  aria-valuenow={project.stats.completionPercentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Budget utilization: ${project.stats.completionPercentage.toFixed(2)}%`}
                >
                  {/* Animated shimmer effect for high usage */}
                  {(project.stats.completionPercentage > 75) && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                  )}
                </div>
              </div>

              {/* Budget Details */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 text-xs">
                <span className="text-gray-600">
                  Spent: <span 
                    className="font-medium text-gray-900 cursor-pointer hover:text-blue-600 hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBudgetClick(project.id, 'spent');
                    }}
                  >
                    {formatCurrency(project.stats.totalSpent)}
                  </span>
                </span>
                <span className="text-gray-600">
                  Remaining: <span 
                    className="font-medium text-gray-900 cursor-pointer hover:text-green-600 hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBudgetClick(project.id, 'remaining');
                    }}
                  >
                    {formatCurrency(project.stats.totalBudget - project.stats.totalSpent)}
                  </span>
                </span>
              </div>
              
                             <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 text-xs mt-1">
                 <span className="text-gray-600 font-medium">
                   {project.stats.completionPercentage < 0.01 ? '<0.01%' : project.stats.completionPercentage.toFixed(2)}% utilized
                 </span>
                <span className={`font-semibold ${
                  project.stats.completionPercentage > 95 ? 'text-red-600' :
                  project.stats.completionPercentage > 90 ? 'text-orange-600' :
                  project.stats.completionPercentage > 75 ? 'text-yellow-600' :
                  'text-green-700'
                }`}>
                  {project.stats.completionPercentage > 95 ? '⚠️ Over budget' :
                   project.stats.completionPercentage > 90 ? '⚠️ Near limit' :
                   project.stats.completionPercentage > 75 ? '⚡ High usage' :
                   '✅ On track'}
                </span>
              </div>
            </div>

            {/* Project Details */}
            <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
              <div className="flex items-center gap-1 sm:gap-2">
                <Building className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                <span className="text-gray-600">Phase:</span>
                <span className="font-medium text-gray-900 truncate">{project.current_phase}</span>
              </div>
              {project.daysToInspection > 0 && (
                <div className="flex items-center gap-1 sm:gap-2">
                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                  <span className="text-gray-600">Inspection:</span>
                  <span className={`font-medium ${project.daysToInspection <= 3 ? 'text-red-600' : 'text-gray-900'}`}>
                    {project.daysToInspection} days
                  </span>
                </div>
              )}
            </div>

            {/* Action Button */}
            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const params = new URLSearchParams(searchParams.toString());
                  params.set('tab', 'payment');
                  params.set('subtab', 'processing');
                  params.set('project', project.id.toString());
                  router.replace(`/?${params.toString()}`, { scroll: false });
                }}
                className="w-full flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm font-medium"
              >
                <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Create Payment App</span>
                <span className="sm:hidden">Create App</span>
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
        <div className="fixed inset-0  bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate pr-2">
                  {modalTitle}
                </h3>
                <button
                  onClick={handleCloseDataModal}
                  className="text-gray-400 hover:text-gray-600 p-1 flex-shrink-0"
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
                <div className="space-y-3 sm:space-y-4">
                  {modalData.map((item: any) => (
                    <div key={item.id} className="bg-gray-50 rounded-lg p-3 sm:p-4 hover:bg-gray-100 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                            <span className="text-sm font-medium text-gray-900 truncate">
                              {item.name || item.contractor_name || 'Unknown'}
                            </span>
                            {item.trade && (
                              <span className="text-xs text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded">
                                {item.trade}
                              </span>
                            )}
                          </div>
                          <div className="space-y-0.5 text-xs sm:text-sm text-gray-600">
                            {item.email && (
                              <div className="truncate">{item.email}</div>
                            )}
                            {item.phone && (
                              <div>{item.phone}</div>
                            )}
                            {item.created_at && (
                              <div>Created: {formatDate(item.created_at)}</div>
                            )}
                            {item.grand_total && (
                              <div>Amount: {formatCurrency(item.grand_total)}</div>
                            )}
                          </div>
                        </div>
                        <div className="text-left sm:text-right">
                          {item.status && (
                            <div className={`text-xs sm:text-sm font-medium ${
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
                          <div className="space-y-0.5 text-xs sm:text-sm text-gray-600">
                            {item.contract_amount && (
                              <div>Contract: {formatCurrency(item.contract_amount)}</div>
                            )}
                            {item.paid_to_date && (
                              <div>Paid: {formatCurrency(item.paid_to_date)}</div>
                            )}
                          </div>
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
         <div className="fixed inset-0  bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
           <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] sm:max-h-[95vh] overflow-hidden flex flex-col">
             <div className="p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
               <div className="flex items-center justify-between">
                 <h3 className="text-lg sm:text-xl font-semibold text-gray-900 truncate pr-2">
                   {loadingProjectModal ? 'Loading Project Details...' : `${projectModalData.project?.name || 'Project Details'}`}
                 </h3>
                 <button
                   onClick={handleCloseModal}
                   className="text-gray-400 hover:text-gray-600 p-1 flex-shrink-0"
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

             <div className="flex items-center justify-end gap-3 p-4 sm:p-6 border-t border-gray-200 flex-shrink-0">
               <button
                 onClick={handleCloseModal}
                 className="px-3 sm:px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm sm:text-base"
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
                 className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm sm:text-base"
               >
                 Create Payment Apps
               </button>
             </div>
           </div>
         </div>
       )}

      {/* Budget Details Modal */}
      {showBudgetModal && (
        <div className="fixed inset-0  bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {modalTitle}
                </h3>
                <button
                  onClick={() => setShowBudgetModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1"
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
                  <span className="ml-3 text-gray-600">Loading data...</span>
                </div>
              ) : budgetModalType === 'remaining' ? (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-sm text-blue-600 font-medium">Total Budget</div>
                      <div className="text-2xl font-bold text-blue-900">{formatCurrency(budgetModalData.totalBudget)}</div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="text-sm text-purple-600 font-medium">Total Spent</div>
                      <div className="text-2xl font-bold text-purple-900">{formatCurrency(budgetModalData.totalSpent)}</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="text-sm text-green-600 font-medium">Remaining</div>
                      <div className="text-2xl font-bold text-green-900">{formatCurrency(budgetModalData.remainingBudget)}</div>
                    </div>
                  </div>
                  
                  {/* Contract Breakdown */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Contract Breakdown</h4>
                    <div className="space-y-3">
                      {budgetModalData.items?.map((contract: any, index: number) => (
                        <div key={index} className="bg-gray-50 p-4 rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="font-medium text-gray-900">{contract.name}</div>
                              <div className="text-sm text-gray-600">{contract.trade}</div>
                            </div>
                            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                              {contract.percentage}% of total
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <div className="text-gray-600">Contract Amount</div>
                              <div className="font-medium">{formatCurrency(contract.contractAmount)}</div>
                            </div>
                            <div>
                              <div className="text-gray-600">Paid to Date</div>
                              <div className="font-medium">{formatCurrency(contract.paidToDate)}</div>
                            </div>
                            <div>
                              <div className="text-gray-600">Remaining</div>
                              <div className="font-medium">{formatCurrency(contract.remaining)}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : budgetModalData.total ? (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="bg-gray-50 p-4 rounded-lg mb-6">
                    <div className="text-sm text-gray-600">Total Spent</div>
                    <div className="text-2xl font-bold text-gray-900">{formatCurrency(budgetModalData.total)}</div>
                  </div>
                  
                  {/* Payment Breakdown */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Payment Breakdown</h4>
                    <div className="space-y-3">
                      {budgetModalData.items?.map((payment: any, index: number) => (
                        <div key={index} className="bg-white border border-gray-200 p-4 rounded-lg">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-gray-900">{payment.name}</span>
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{payment.trade}</span>
                              </div>
                              <div className="text-sm text-gray-600 mb-2">
                                <div>Date: {payment.date}</div>
                              </div>
                              <div className="text-xs text-gray-500">
                                {payment.percentage}% of total spent
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-gray-900">{formatCurrency(payment.amount)}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">📊</div>
                  <p className="text-gray-500 font-medium">No data available</p>
                  <p className="text-sm text-gray-400">There are no items in this category</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Project Form Modal */}
      {showNewProjectForm && (
        <AddForm
          title="New Project"
          icon={<Building className="w-5 h-5 text-blue-600" />}
          fields={[
            {
              name: 'name',
              placeholder: 'Enter project name',
              required: true,
              validators: [validators.required]
            },
            {
              name: 'address',
              placeholder: 'Enter project address',
              required: true,
              validators: [validators.required]
            },
            {
              name: 'client_name',
              placeholder: 'Enter client name',
              required: true,
              validators: [validators.required]
            },
            {
              name: 'budget',
              placeholder: 'Enter project budget',
              type: 'number',
              validators: [validators.number]
            },
            {
              name: 'start_date',
              placeholder: 'Enter start date',
              type: 'date',
              validators: [validators.date]
            },
            {
              name: 'end_date',
              placeholder: 'Enter end date',
              type: 'date',
              validators: [validators.date]
            },
            {
              name: 'status',
              placeholder: 'Enter status',
              defaultValue: 'active'
            },
            {
              name: 'current_phase',
              placeholder: 'Enter current phase',
              defaultValue: 'Planning'
            }
          ]}
          onSubmit={handleCreateProject}
          onClose={() => setShowNewProjectForm(false)}
          isLoading={isCreatingProject}
        />
      )}
    </div>
  );
};

export default ProjectsView;
