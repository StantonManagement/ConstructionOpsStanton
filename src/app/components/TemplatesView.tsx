import React, { useState } from 'react';
import { useTemplates, useCreateTemplate } from '@/hooks/queries/useTemplates';
import { Plus, FileText, Search, Loader2, X } from 'lucide-react';
import { UnitType } from '@/types/schema';
import { TemplateDetailView } from '@/app/components/TemplateDetailView';

export const TemplatesView: React.FC = () => {
  const { data: templates, isLoading, error } = useTemplates();
  const { mutate: createTemplate, isPending: isCreating } = useCreateTemplate();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Create form state
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');
  const [newTemplateUnitType, setNewTemplateUnitType] = useState<UnitType | 'any'>('any');

  const filteredTemplates = templates?.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) return;

    createTemplate({
      name: newTemplateName,
      description: newTemplateDesc,
      unit_type: newTemplateUnitType === 'any' ? null : newTemplateUnitType
    }, {
      onSuccess: () => {
        setShowCreateModal(false);
        setNewTemplateName('');
        setNewTemplateDesc('');
        setNewTemplateUnitType('any');
      }
    });
  };

  if (selectedTemplateId) {
    return (
      <TemplateDetailView 
        templateId={selectedTemplateId} 
        onBack={() => setSelectedTemplateId(null)} 
      />
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
        Error loading templates: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Scope Templates</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage standard task lists for different unit types</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-xs rounded hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-3 h-3" />
          New
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-200 max-w-md">
        <Search className="w-3 h-3 text-gray-400" />
        <input
          type="text"
          placeholder="Search templates..."
          className="flex-1 text-xs border-none outline-none bg-transparent"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-3 animate-pulse">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-4 h-4 bg-gray-200 rounded" />
                <div className="h-3 bg-gray-200 rounded flex-1" />
              </div>
              <div className="space-y-2 mb-3">
                <div className="h-2 bg-gray-200 rounded w-full" />
                <div className="h-2 bg-gray-200 rounded w-3/4" />
              </div>
              <div className="flex justify-between items-center border-t border-gray-100 pt-2">
                <div className="h-2 bg-gray-200 rounded w-16" />
                <div className="h-2 bg-gray-200 rounded w-12" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredTemplates?.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <FileText className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <h3 className="text-sm font-semibold text-gray-900 mb-1">No templates found</h3>
          <p className="text-xs text-gray-500 mb-3">Create your first scope template.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-xs rounded hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Create Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredTemplates?.map(template => (
            <div
              key={template.id}
              className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-md hover:border-primary/50 transition-all cursor-pointer border-l-4 border-l-blue-500"
              onClick={() => setSelectedTemplateId(template.id)}
            >
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-sm text-gray-900 truncate flex-1">{template.name}</h3>
              </div>

              <p className="text-xs text-gray-500 mb-3 line-clamp-2 min-h-[32px]">
                {template.description || 'No description provided'}
              </p>

              <div className="flex justify-between items-center text-xs text-gray-600 border-t border-gray-100 pt-2">
                <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">
                  {template.unit_type || 'Any Type'}
                </span>
                <span className="font-medium text-[10px]">
                  {template.task_count || 0} tasks
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-3 border-b border-gray-200">
              <h2 className="text-sm font-bold text-gray-900">Create New Template</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-3 space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Template Name</label>
                <input
                  type="text"
                  placeholder="e.g. 1BR Standard Renovation"
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Description</label>
                <input
                  type="text"
                  placeholder="Brief description of scope..."
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary"
                  value={newTemplateDesc}
                  onChange={(e) => setNewTemplateDesc(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Unit Type</label>
                <select
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary"
                  value={newTemplateUnitType}
                  onChange={(e) => setNewTemplateUnitType(e.target.value as UnitType | 'any')}
                >
                  <option value="any">Any / General</option>
                  <option value="studio">Studio</option>
                  <option value="1BR">1 Bedroom</option>
                  <option value="2BR">2 Bedroom</option>
                  <option value="3BR">3 Bedroom</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newTemplateName}
                  className="flex-1 px-3 py-1.5 text-xs bg-primary text-white rounded hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {isCreating && <Loader2 className="w-3 h-3 animate-spin" />}
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
