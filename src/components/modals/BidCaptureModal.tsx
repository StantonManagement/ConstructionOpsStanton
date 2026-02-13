'use client';

import { useState, useEffect } from 'react';
import { X, Upload, Loader2, Save } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface BidCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultBidRoundId?: number;
  defaultProjectId?: number;
  defaultContractorId?: number;
}

export default function BidCaptureModal({
  isOpen,
  onClose,
  onSuccess,
  defaultBidRoundId,
  defaultProjectId,
  defaultContractorId,
}: BidCaptureModalProps) {
  const [loading, setLoading] = useState(false);
  const [contractors, setContractors] = useState<Array<{ id: number; name: string; trade?: string }>>([]);
  const [projects, setProjects] = useState<Array<{ id: number; name: string }>>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    contractor_id: defaultContractorId?.toString() || '',
    project_id: defaultProjectId?.toString() || '',
    bid_round_id: defaultBidRoundId?.toString() || '',
    amount: '',
    notes: '',
    source_type: 'manual' as 'manual' | 'photo' | 'pdf',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
      // Reset form when modal opens with defaults
      setFormData({
        contractor_id: defaultContractorId?.toString() || '',
        project_id: defaultProjectId?.toString() || '',
        bid_round_id: defaultBidRoundId?.toString() || '',
        amount: '',
        notes: '',
        source_type: 'manual',
      });
      setSelectedFile(null);
      setError(null);
    }
  }, [isOpen, defaultContractorId, defaultProjectId, defaultBidRoundId]);

  const loadData = async () => {
    try {
      setLoadingData(true);

      // Load contractors
      const { data: contractorsData } = await supabase
        .from('contractors')
        .select('id, name, trade')
        .order('name');

      // Load projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, name')
        .order('name');

      setContractors(contractorsData || []);
      setProjects(projectsData || []);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load contractors and projects');
    } finally {
      setLoadingData(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-detect source type based on file type
      if (file.type.includes('pdf')) {
        setFormData(prev => ({ ...prev, source_type: 'pdf' }));
      } else if (file.type.includes('image')) {
        setFormData(prev => ({ ...prev, source_type: 'photo' }));
      }
    }
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      setUploadingFile(true);
      const session = await supabase.auth.getSession();
      if (!session.data.session) return null;

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `bids/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err) {
      console.error('File upload error:', err);
      return null;
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      // Validation
      if (!formData.contractor_id) {
        setError('Please select a contractor');
        setLoading(false);
        return;
      }
      if (!formData.amount || parseFloat(formData.amount) <= 0) {
        setError('Please enter a valid amount');
        setLoading(false);
        return;
      }

      // Upload file if selected
      let sourceUrl = null;
      if (selectedFile) {
        sourceUrl = await uploadFile(selectedFile);
        if (!sourceUrl) {
          setError('Failed to upload file');
          setLoading(false);
          return;
        }
      }

      // Create bid via API
      const response = await fetch('/api/bids', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.data.session.access_token}`,
        },
        body: JSON.stringify({
          contractor_id: parseInt(formData.contractor_id),
          project_id: formData.project_id ? parseInt(formData.project_id) : undefined,
          bid_round_id: formData.bid_round_id ? parseInt(formData.bid_round_id) : undefined,
          amount: parseFloat(formData.amount),
          notes: formData.notes || undefined,
          source_type: formData.source_type,
          source_url: sourceUrl || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create bid');
      }

      // Success!
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: unknown) {
      console.error('Error creating bid:', err);
      setError(err instanceof Error ? err.message : 'Failed to create bid');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-foreground">Capture New Bid</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Manually enter bid details or upload a document
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
            disabled={loading || uploadingFile}
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loadingData ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error Display */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Contractor Selection */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Contractor <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.contractor_id}
                  onChange={(e) => setFormData({ ...formData, contractor_id: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                  disabled={!!defaultContractorId}
                >
                  <option value="">Select a contractor...</option>
                  {contractors.map((contractor) => (
                    <option key={contractor.id} value={contractor.id}>
                      {contractor.name} {contractor.trade && `- ${contractor.trade}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Project Selection (Optional) */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Project (Optional)
                </label>
                <select
                  value={formData.project_id}
                  onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                  disabled={!!defaultProjectId}
                >
                  <option value="">No project selected</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Bid Amount <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full pl-7 pr-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                  rows={3}
                  placeholder="Scope of work, exclusions, special conditions..."
                />
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Attach Document (Optional)
                </label>
                <p className="text-xs text-muted-foreground mb-3">
                  Upload a photo or PDF of the bid document
                </p>
                <label className="cursor-pointer block">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-border rounded-lg hover:border-primary transition-colors">
                    <Upload className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">
                      {selectedFile ? selectedFile.name : 'Choose file...'}
                    </span>
                  </div>
                </label>
                {selectedFile && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Type: {formData.source_type} • Size: {(selectedFile.size / 1024).toFixed(1)} KB
                  </div>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        {!loadingData && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-border text-muted-foreground rounded-lg hover:bg-accent transition-colors"
              disabled={loading || uploadingFile}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || uploadingFile}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading || uploadingFile ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {uploadingFile ? 'Uploading...' : 'Saving...'}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Bid
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
