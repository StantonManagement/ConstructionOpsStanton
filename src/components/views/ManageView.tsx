import React, { useState, ChangeEvent, FormEvent, ReactNode, useCallback, useMemo, useEffect } from 'react';
import { useData } from '@/app/context/DataContext';
import { supabase } from '@/lib/supabaseClient';
import { Building, UserPlus, FilePlus, AlertCircle, CheckCircle, X, Search, Filter, Plus, Edit3, Eye, Trash2, Archive, Star, Calendar, DollarSign } from 'lucide-react';
import LineItemFormModal from '@/components/shared/LineItemFormModal';
import { useNotifications } from '@/hooks/useNotifications';

interface FormData {
  [key: string]: string;
}

interface EnhancedProject {
  id: string;
  name: string;
  client_name: string;
  current_phase: string;
  budget: number;
  start_date: string;
  target_completion_date: string;
  calculatedBudget?: number;
  calculatedSpent?: number;
  spent?: number;
}

const ManageView: React.FC = () => {
  const { state, dispatch } = useData();
  const { addNotification } = useNotifications();
  const [openForm, setOpenForm] = useState<string | null>(null);
  const [editModal, setEditModal] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [formData, setFormData] = useState<FormData>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enhancedProjects, setEnhancedProjects] = useState<EnhancedProject[]>([]);

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

  useEffect(() => {
    fetchEnhancedProjects();
  }, [fetchEnhancedProjects, state.projects]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addProject = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      const { name, client_name, current_phase, budget, start_date, target_completion_date } = formData;

      if (editModal === 'project' && selectedItem) {
        // Update existing project
        const { data, error } = await supabase
          .from('projects')
          .update({
            name,
            client_name,
            current_phase,
            budget: budget ? Number(budget) : null,
            start_date,
            target_completion_date,
          })
          .eq('id', selectedItem.id)
          .select()
          .single();

        if (error) throw error;

        dispatch({ type: 'UPDATE_PROJECT', payload: data });
        addNotification('success', 'Project updated successfully!');
        setEditModal(null);
        setSelectedItem(null);
        // Refresh enhanced projects data
        fetchEnhancedProjects();
      } else {
        // Add new project
        const { data, error } = await supabase.from('projects').insert([{
          name,
          client_name,
          current_phase,
          budget: budget ? Number(budget) : null,
          start_date,
          target_completion_date,
        }]).select().single();

        if (error) throw error;

        dispatch({ type: 'ADD_PROJECT', payload: data });
        addNotification('success', 'Project added successfully!');
        setOpenForm(null);
        // Refresh enhanced projects data
        fetchEnhancedProjects();
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save project';
      addNotification('error', message);
      throw error;
    } finally {
      setIsSubmitting(false);
      setFormData({});
    }
  };

  const addContractor = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      const { name, email, phone, trade, project_id } = formData;
      const { data, error } = await supabase.from('project_contractors').insert([{
        name,
        email,
        phone,
        trade,
        project_id,
        contract_amount: 0,
        paid_to_date: 0
      }]).select().single();

      if (error) throw error;

      dispatch({ type: 'ADD_CONTRACTOR', payload: data });
      addNotification('success', 'Contractor added successfully!');
      setOpenForm(null);

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add contractor';
      addNotification('error', message);
    } finally {
      setIsSubmitting(false);
      setFormData({});
    }
  };

  const filteredProjects = useMemo(() => {
    return enhancedProjects.filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          project.client_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterBy === 'all' || project.current_phase === filterBy;
      return matchesSearch && matchesFilter;
    });
  }, [enhancedProjects, searchTerm, filterBy]);

  const filteredContractors = useMemo(() => {
    return state.contractors.filter(contractor => {
      const name = contractor.name || '';
      const trade = contractor.trade || '';
      
      const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          trade.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [state.contractors, searchTerm]);

  const FormField: React.FC<{
    label: string;
    name: string;
    type?: string;
    value: string;
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    options?: Array<{ value: string; label: string }>;
    required?: boolean;
    placeholder?: string;
  }> = ({ label, name, type = 'text', value, onChange, options, required = false, placeholder }) => (
    <div className="space-y-1">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {options ? (
        <select
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          required={required}
        >
          <option value="">Select {label.toLowerCase()}</option>
          {options.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          required={required}
        />
      )}
    </div>
  );

  const ModalContainer: React.FC<{ children: ReactNode; title: string; onClose: () => void }> = ({ children, title, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Project Management</h2>
        <p className="text-gray-600">Create and manage projects, contractors, and resources</p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 mb-6">
        <button
          onClick={() => setOpenForm('project')}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Building className="w-4 h-4" />
          Add Project
        </button>
        <button
          onClick={() => setOpenForm('contractor')}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Add Contractor
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search projects or contractors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        <select
          value={filterBy}
          onChange={(e) => setFilterBy(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Phases</option>
          <option value="planning">Planning</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Projects Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Projects</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {filteredProjects.map((project) => {
            const budget = project.calculatedBudget || project.budget || 0;
            const spent = project.calculatedSpent || 0;
            const progress = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;

            return (
              <div key={project.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h4 className="font-medium text-gray-900">{project.name}</h4>
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        {project.current_phase}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{project.client_name}</p>

                    {/* Progress Bar */}
                    <div className="mt-2 flex items-center space-x-3">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 min-w-[3rem]">
                        {Math.round(progress)}%
                      </span>
                    </div>

                    <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                      <span className="flex items-center">
                        <DollarSign className="w-3 h-3 mr-1" />
                        Budget: ${budget.toLocaleString()}
                      </span>
                      <span className="flex items-center">
                        <DollarSign className="w-3 h-3 mr-1" />
                        Spent: ${spent.toLocaleString()}
                      </span>
                      {project.start_date && (
                        <span className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {new Date(project.start_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setSelectedItem(project);
                        setEditModal('project');
                        setFormData({
                          name: project.name,
                          client_name: project.client_name,
                          current_phase: project.current_phase,
                          budget: (project.calculatedBudget || project.budget || '').toString(),
                          start_date: project.start_date || '',
                          target_completion_date: project.target_completion_date || '',
                        });
                      }}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Contractors Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Contractors</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {filteredContractors.map((contractor) => (
            <div key={contractor.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">{contractor.name}</h4>
                  <p className="text-sm text-gray-600">{contractor.trade}</p>
                  <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                    <span>{contractor.email}</span>
                    <span>{contractor.phone}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Project Modal */}
      {openForm === 'project' && (
        <ModalContainer title="Add New Project" onClose={() => setOpenForm(null)}>
          <form onSubmit={addProject} className="space-y-4">
            <FormField
              label="Project Name"
              name="name"
              value={formData.name || ''}
              onChange={handleInputChange}
              required
              placeholder="Enter project name"
            />
            <FormField
              label="Client Name"
              name="client_name"
              value={formData.client_name || ''}
              onChange={handleInputChange}
              required
              placeholder="Enter client name"
            />
            <FormField
              label="Current Phase"
              name="current_phase"
              value={formData.current_phase || ''}
              onChange={handleInputChange}
              options={[
                { value: 'planning', label: 'Planning' },
                { value: 'active', label: 'Active' },
                { value: 'completed', label: 'Completed' },
                { value: 'on_hold', label: 'On Hold' }
              ]}
              required
            />
            <FormField
              label="Budget"
              name="budget"
              type="number"
              value={formData.budget || ''}
              onChange={handleInputChange}
              placeholder="Enter budget amount"
            />
            <FormField
              label="Start Date"
              name="start_date"
              type="date"
              value={formData.start_date || ''}
              onChange={handleInputChange}
            />
            <FormField
              label="Target Completion Date"
              name="target_completion_date"
              type="date"
              value={formData.target_completion_date || ''}
              onChange={handleInputChange}
            />
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
              >
                {isSubmitting ? 'Adding...' : 'Add Project'}
              </button>
              <button
                type="button"
                onClick={() => setOpenForm(null)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </ModalContainer>
      )}

      {/* Edit Project Modal */}
      {editModal === 'project' && selectedItem && (
        <ModalContainer title="Edit Project" onClose={() => setEditModal(null)}>
          <form onSubmit={addProject} className="space-y-4">
            <FormField
              label="Project Name"
              name="name"
              value={formData.name || ''}
              onChange={handleInputChange}
              required
              placeholder="Enter project name"
            />
            <FormField
              label="Client Name"
              name="client_name"
              value={formData.client_name || ''}
              onChange={handleInputChange}
              required
              placeholder="Enter client name"
            />
            <FormField
              label="Current Phase"
              name="current_phase"
              value={formData.current_phase || ''}
              onChange={handleInputChange}
              options={[
                { value: 'planning', label: 'Planning' },
                { value: 'active', label: 'Active' },
                { value: 'completed', label: 'Completed' },
                { value: 'on_hold', label: 'On Hold' }
              ]}
              required
            />
            <FormField
              label="Budget"
              name="budget"
              type="number"
              value={formData.budget || ''}
              onChange={handleInputChange}
              placeholder="Enter budget amount"
            />
            <FormField
              label="Start Date"
              name="start_date"
              type="date"
              value={formData.start_date || ''}
              onChange={handleInputChange}
            />
            <FormField
              label="Target Completion Date"
              name="target_completion_date"
              type="date"
              value={formData.target_completion_date || ''}
              onChange={handleInputChange}
            />
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
              >
                {isSubmitting ? 'Updating...' : 'Update Project'}
              </button>
              <button
                type="button"
                onClick={() => setEditModal(null)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </ModalContainer>
      )}

      {/* Add Contractor Modal */}
      {openForm === 'contractor' && (
        <ModalContainer title="Add New Contractor" onClose={() => setOpenForm(null)}>
          <form onSubmit={addContractor} className="space-y-4">
            <FormField
              label="Contractor Name"
              name="name"
              value={formData.name || ''}
              onChange={handleInputChange}
              required
              placeholder="Enter contractor name"
            />
            <FormField
              label="Email"
              name="email"
              type="email"
              value={formData.email || ''}
              onChange={handleInputChange}
              required
              placeholder="Enter email address"
            />
            <FormField
              label="Phone"
              name="phone"
              value={formData.phone || ''}
              onChange={handleInputChange}
              placeholder="Enter phone number"
            />
            <FormField
              label="Trade"
              name="trade"
              value={formData.trade || ''}
              onChange={handleInputChange}
              required
              placeholder="Enter trade/specialty"
            />
            <FormField
              label="Project"
              name="project_id"
              value={formData.project_id || ''}
              onChange={handleInputChange}
              options={state.projects.map(p => ({ value: p.id, label: p.name }))}
              required
            />
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
              >
                {isSubmitting ? 'Adding...' : 'Add Contractor'}
              </button>
              <button
                type="button"
                onClick={() => setOpenForm(null)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </ModalContainer>
      )}
    </div>
  );
};

export default ManageView;