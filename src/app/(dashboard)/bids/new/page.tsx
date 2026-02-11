'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import AppLayout from '@/app/components/AppLayout';
import PageContainer from '@/app/components/PageContainer';
import { ArrowLeft, Upload, Loader2 } from 'lucide-react';

export default function NewBidPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [contractors, setContractors] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    contractor_id: '',
    project_id: '',
    amount: '',
    notes: '',
    source_type: 'manual' as 'manual' | 'photo' | 'pdf',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        router.push('/auth');
        return;
      }

      // Load contractors
      const { data: contractorsData } = await supabase
        .from('contractors')
        .select('id, name, trade, phone')
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
        router.push('/auth');
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

      const data = await response.json();
      router.push('/bids');
    } catch (err: any) {
      console.error('Error creating bid:', err);
      setError(err.message || 'Failed to create bid');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <AppLayout>
        <PageContainer>
          <div className="flex items-center justify-center min-h-[50vh]">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </PageContainer>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageContainer>
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Capture New Bid</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manually enter bid details or upload a document
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="max-w-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Display */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Contractor Selection */}
            <div className="bg-card border border-border rounded-lg p-4">
              <label className="block text-sm font-medium text-foreground mb-2">
                Contractor <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.contractor_id}
                onChange={(e) => setFormData({ ...formData, contractor_id: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                required
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
            <div className="bg-card border border-border rounded-lg p-4">
              <label className="block text-sm font-medium text-foreground mb-2">
                Project (Optional)
              </label>
              <select
                value={formData.project_id}
                onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
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
            <div className="bg-card border border-border rounded-lg p-4">
              <label className="block text-sm font-medium text-foreground mb-2">
                Bid Amount <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-muted-foreground">$</span>
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
            <div className="bg-card border border-border rounded-lg p-4">
              <label className="block text-sm font-medium text-foreground mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                rows={4}
                placeholder="Scope of work, exclusions, special conditions..."
              />
            </div>

            {/* File Upload */}
            <div className="bg-card border border-border rounded-lg p-4">
              <label className="block text-sm font-medium text-foreground mb-2">
                Attach Document (Optional)
              </label>
              <p className="text-xs text-muted-foreground mb-3">
                Upload a photo or PDF of the bid document
              </p>
              <div className="flex items-center gap-3">
                <label className="flex-1 cursor-pointer">
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
              </div>
              {selectedFile && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Type: {formData.source_type} • Size: {(selectedFile.size / 1024).toFixed(1)} KB
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 px-6 py-3 border border-border text-muted-foreground rounded-lg hover:bg-muted font-medium"
                disabled={loading || uploadingFile}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || uploadingFile}
                className="flex-1 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading || uploadingFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {uploadingFile ? 'Uploading...' : 'Saving...'}
                  </div>
                ) : (
                  'Save Bid'
                )}
              </button>
            </div>
          </form>
        </div>
      </PageContainer>
    </AppLayout>
  );
}
