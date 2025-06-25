import React, { useState, ChangeEvent, FormEvent, ReactNode } from 'react';
import { useData } from '../context/DataContext';
import { supabase } from '@/lib/supabaseClient';
import { Building, UserPlus, FilePlus } from 'lucide-react';

type AddFormProps = {
  title: string;
  icon: ReactNode;
  fields: Array<{ name: string; placeholder: string; type?: string }>;
  onSubmit: (formData: Record<string, string>) => void;
  onClose: () => void;
};

const AddForm: React.FC<AddFormProps> = ({ title, icon, fields, onSubmit, onClose }) => {
  const [formData, setFormData] = useState<Record<string, string>>({});
  
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => 
    setFormData({ ...formData, [e.target.name]: e.target.value });
  
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData(fields.reduce((acc, field) => ({ ...acc, [field.name]: '' }), {}));
    onClose();
  };
  
  const labelize = (str: string) => 
    str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            {icon}
            {title}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          {fields.map(field => (
            <div key={field.name}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {labelize(field.name)}
              </label>
              <input
                type={field.type || 'text'}
                name={field.name}
                value={formData[field.name] || ''}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 text-gray-900 placeholder-gray-400"
                placeholder={field.placeholder}
              />
            </div>
          ))}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AddContractForm: React.FC<{ onClose: () => void; onSuccess?: () => void }> = ({ onClose, onSuccess }) => {
  const { projects, subcontractors } = useData();
  const [projectId, setProjectId] = useState("");
  const [subcontractorId, setSubcontractorId] = useState("");
  const [contractAmount, setContractAmount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.from('contracts').insert([
      {
        project_id: Number(projectId),
        subcontractor_id: Number(subcontractorId),
        contract_amount: Number(contractAmount),
        start_date: startDate,
        end_date: endDate,
      },
    ]);
    if (!error) {
      if (onSuccess) onSuccess();
      onClose();
    } else {
      setError('Failed to add contract');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <FilePlus className="w-6 h-6 text-blue-600" />
            Add Contract
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Project</label>
            <select
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 text-gray-900"
              required
            >
              <option value="">Select a project</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Vendor</label>
            <select
              value={subcontractorId}
              onChange={e => setSubcontractorId(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 text-gray-900"
              required
            >
              <option value="">Select a vendor</option>
              {subcontractors.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Contract Amount</label>
            <input
              type="number"
              value={contractAmount}
              onChange={e => setContractAmount(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 text-gray-900"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 text-gray-900"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 text-gray-900"
            />
          </div>
          {error && <div className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</div>}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:bg-blue-400"
            >
              {loading ? 'Saving...' : 'Add Contract'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ManageView: React.FC = () => {
  const { dispatch } = useData();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showAddProject, setShowAddProject] = useState(false);
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [showAddContract, setShowAddContract] = useState(false);

  const addProject = async (formData: Record<string, string>) => {
    const { name, client_name, current_phase, budget, start_date, target_completion_date } = formData;
    const { data, error } = await supabase.from('projects').insert([{
      name,
      client_name,
      current_phase,
      budget: budget ? Number(budget) : null,
      start_date,
      target_completion_date,
    }]).select();
    if (!error && data && data.length > 0) {
      dispatch({ type: 'ADD_PROJECT', payload: data[0] });
      setSuccessMsg('Project added successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } else {
      alert('Failed to add project: ' + (error?.message || 'Unknown error'));
    }
  };

  const addSubcontractor = async (formData: Record<string, string>) => {
    const { name, trade, phone, email } = formData;
    const { data, error } = await supabase.from('contractors').insert([{
      name,
      trade,
      phone,
      email,
    }]).select();
    if (!error && data && data.length > 0) {
      dispatch({ type: 'ADD_SUBCONTRACTOR', payload: data[0] });
      setSuccessMsg('Vendor added successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } else {
      alert('Failed to add vendor: ' + (error?.message || 'Unknown error'));
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-100 min-h-screen">
      {successMsg && (
        <div className="fixed top-6 right-6 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg animate-slide-in">
          {successMsg}
        </div>
      )}
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Construction Management</h1>
      <div className="flex flex-wrap gap-4 mb-8">
        <button
          onClick={() => setShowAddProject(true)}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium flex items-center gap-2"
        >
          <Building className="w-5 h-5" />
          Add Project
        </button>
        <button
          onClick={() => setShowAddVendor(true)}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium flex items-center gap-2"
        >
          <UserPlus className="w-5 h-5" />
          Add Vendor
        </button>
        <button
          onClick={() => setShowAddContract(true)}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium flex items-center gap-2"
        >
          <FilePlus className="w-5 h-5" />
          Add Contract
        </button>
      </div>
      {showAddProject && (
        <AddForm
          title="Add New Project"
          icon={<Building className="w-6 h-6 text-blue-600" />}
          fields={[
            { name: 'name', placeholder: 'Project Name' },
            { name: 'client_name', placeholder: 'Client Name' },
            { name: 'current_phase', placeholder: 'Current Phase' },
            { name: 'budget', placeholder: 'Budget (USD)', type: 'number' },
            { name: 'start_date', placeholder: 'Start Date', type: 'date' },
            { name: 'target_completion_date', placeholder: 'Target Completion Date', type: 'date' },
          ]}
          onSubmit={addProject}
          onClose={() => setShowAddProject(false)}
        />
      )}
      {showAddVendor && (
        <AddForm
          title="Add New Vendor"
          icon={<UserPlus className="w-6 h-6 text-blue-600" />}
          fields={[
            { name: 'name', placeholder: 'Vendor Name' },
            { name: 'trade', placeholder: 'Trade' },
            { name: 'phone', placeholder: 'Phone', type: 'tel' },
            { name: 'email', placeholder: 'Email', type: 'email' },
          ]}
          onSubmit={addSubcontractor}
          onClose={() => setShowAddVendor(false)}
        />
      )}
      {showAddContract && (
        <AddContractForm
          onClose={() => setShowAddContract(false)}
          onSuccess={() => {
            setSuccessMsg('Contract added successfully!');
            setTimeout(() => setSuccessMsg(null), 3000);
          }}
        />
      )}
    </div>
  );
};

export default ManageView;