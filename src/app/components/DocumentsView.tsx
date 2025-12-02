'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  FileText, Upload, Trash2, Download, ExternalLink, 
  Image as ImageIcon, File, FileSpreadsheet, MoreVertical, 
  Calendar, User, HardDrive, Search, X
} from 'lucide-react';
import { useModal } from '../context/ModalContext';

interface DocumentsViewProps {
  projectId: number;
}

interface Document {
  id: string;
  name: string;
  size: number;
  type: string;
  created_at: string;
  url: string;
  path: string;
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (type: string) => {
  if (type.includes('image')) return <ImageIcon className="w-5 h-5 text-purple-500" />;
  if (type.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
  if (type.includes('spreadsheet') || type.includes('excel') || type.includes('csv')) 
    return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
  return <File className="w-5 h-5 text-blue-500" />;
};

export default function DocumentsView({ projectId }: DocumentsViewProps) {
  const { showToast, showConfirm } = useModal();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      // List all files in the project folder
      const { data, error } = await supabase.storage
        .from('project-documents')
        .list(`${projectId}/`, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (error) {
        throw error;
      }

      if (data) {
        // Transform Supabase storage objects to Document interface
        const docs: Document[] = data.map(file => ({
          id: file.id,
          name: file.name,
          size: file.metadata?.size || 0,
          type: file.metadata?.mimetype || 'application/octet-stream',
          created_at: file.created_at,
          path: `${projectId}/${file.name}`,
          url: supabase.storage.from('project-documents').getPublicUrl(`${projectId}/${file.name}`).data.publicUrl
        }));
        setDocuments(docs);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      // Don't show error toast on 404 (empty bucket/folder), just empty list
      if ((error as any)?.message?.includes('The resource was not found')) {
        setDocuments([]);
      } else {
        showToast({ message: 'Failed to load documents', type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, showToast]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // Sanitize filename
        const fileName = file.name.replace(/[^\x00-\x7F]/g, '');
        const filePath = `${projectId}/${fileName}`;

        const { error } = await supabase.storage
          .from('project-documents')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true // Overwrite if exists
          });

        if (error) {
          console.error(`Error uploading ${file.name}:`, error);
          failCount++;
        } else {
          successCount++;
        }
      }

      if (successCount > 0) {
        showToast({ 
          message: `Successfully uploaded ${successCount} file${successCount !== 1 ? 's' : ''}`, 
          type: 'success' 
        });
        await fetchDocuments();
      }
      
      if (failCount > 0) {
        showToast({ 
          message: `Failed to upload ${failCount} file${failCount !== 1 ? 's' : ''}`, 
          type: 'error' 
        });
      }

    } catch (error) {
      console.error('Upload error:', error);
      showToast({ message: 'Error uploading files', type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc: Document) => {
    const { confirmed } = await showConfirm({
      title: 'Delete Document',
      message: `Are you sure you want to delete "${doc.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'delete'
    });

    if (!confirmed) return;

    try {
      const { error } = await supabase.storage
        .from('project-documents')
        .remove([doc.path]);

      if (error) throw error;

      showToast({ message: 'Document deleted successfully', type: 'success' });
      setDocuments(prev => prev.filter(d => d.id !== doc.id));
    } catch (error) {
      console.error('Delete error:', error);
      showToast({ message: 'Failed to delete document', type: 'error' });
    }
  };

  const filteredDocuments = documents.filter(doc => 
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Upload Area */}
      <div 
        className={`
          border-2 border-dashed rounded-lg p-8 transition-colors text-center
          ${dragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="bg-primary/10 p-3 rounded-full">
            <Upload className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Upload Documents</h3>
          <p className="text-sm text-gray-500 mb-2">Drag and drop files here, or click to select</p>
          <label className="relative">
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files)}
              disabled={uploading}
            />
            <span className={`
              inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white
              ${uploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-primary/90 cursor-pointer'}
            `}>
              {uploading ? 'Uploading...' : 'Select Files'}
            </span>
          </label>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
          />
        </div>
        <div className="text-sm text-gray-500">
          {filteredDocuments.length} file{filteredDocuments.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* File List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <HardDrive className="w-12 h-12 text-gray-300 mb-3" />
            <h3 className="text-lg font-medium text-gray-900">No documents found</h3>
            <p className="text-gray-500">Upload files to see them here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 font-medium text-gray-500">Name</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Size</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Date Uploaded</th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {getFileIcon(doc.type)}
                        <span className="font-medium text-gray-900 truncate max-w-xs" title={doc.name}>
                          {doc.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {formatFileSize(doc.size)}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-500 hover:text-primary hover:bg-primary/5 rounded-full transition-colors"
                          title="View/Download"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => handleDelete(doc)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


