import React, { useState } from 'react';
import { useTemplates, useCreateTemplate } from '@/hooks/queries/useTemplates';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, FileText, Search, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UnitType } from '@/types/schema';
import { TemplateDetailView } from './TemplateDetailView';

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

  if (isLoading) {
    return <div className="p-8 text-center">Loading templates...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">Error loading templates: {error.message}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scope Templates</h1>
          <p className="text-gray-500">Manage standard task lists for different unit types</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 bg-white p-3 rounded-lg border shadow-sm max-w-md">
        <Search className="w-4 h-4 text-gray-500 ml-2" />
        <Input 
          placeholder="Search templates..." 
          className="border-none shadow-none focus-visible:ring-0"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates?.map(template => (
          <Card 
            key={template.id}
            className="p-4 hover:shadow-md transition-all cursor-pointer border-l-4 border-l-blue-500"
            onClick={() => setSelectedTemplateId(template.id)}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-lg">{template.name}</h3>
              </div>
            </div>
            
            <p className="text-sm text-gray-500 mb-4 line-clamp-2 min-h-[40px]">
              {template.description || 'No description provided'}
            </p>

            <div className="flex justify-between items-center text-xs text-gray-600 border-t pt-3">
              <span className="bg-gray-100 px-2 py-1 rounded">
                {template.unit_type || 'Any Unit Type'}
              </span>
              <span className="font-medium">
                {template.task_count || 0} tasks
              </span>
            </div>
          </Card>
        ))}

        {filteredTemplates?.length === 0 && (
          <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg border border-dashed">
            <p className="text-gray-500 mb-2">No templates found</p>
            <Button variant="outline" onClick={() => setShowCreateModal(true)}>
              Create First Template
            </Button>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Template</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input 
                placeholder="e.g. 1BR Standard Renovation"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label>Description</Label>
              <Input 
                placeholder="Brief description of scope..."
                value={newTemplateDesc}
                onChange={(e) => setNewTemplateDesc(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Unit Type</Label>
              <Select 
                value={newTemplateUnitType} 
                onValueChange={(val) => setNewTemplateUnitType(val as UnitType | 'any')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any / General</SelectItem>
                  <SelectItem value="studio">Studio</SelectItem>
                  <SelectItem value="1BR">1 Bedroom</SelectItem>
                  <SelectItem value="2BR">2 Bedroom</SelectItem>
                  <SelectItem value="3BR">3 Bedroom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button type="submit" disabled={isCreating || !newTemplateName}>
                {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Template
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
