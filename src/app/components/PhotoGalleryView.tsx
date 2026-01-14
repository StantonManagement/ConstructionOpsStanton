'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Photo, PhotoFilters, PhotoType } from '@/types/photos';
import { Camera } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

interface Project {
  id: number;
  name: string;
}

interface PhotoGalleryViewProps {
  initialProjectId?: number;
}

export default function PhotoGalleryView({ initialProjectId }: PhotoGalleryViewProps = {}) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [filters, setFilters] = useState<PhotoFilters>(initialProjectId ? { project_id: initialProjectId } : {});
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialProjectId) {
      setFilters(prev => ({ ...prev, project_id: initialProjectId }));
    }
  }, [initialProjectId]);

  // Fetch projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session?.access_token) return;

        const response = await fetch('/api/projects/list', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({})
        });

        if (response.ok) {
          const result = await response.json();
          setProjects(result.projects || []); // Fix: use result.projects instead of result.data
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
      }
    };

    fetchProjects();
  }, []);

  // Define fetchPhotos inside useEffect to avoid dependency issues or wrap in useCallback
  useEffect(() => {
    let isMounted = true;

    const fetchPhotos = async () => {
      try {
        setLoading(true);
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session?.access_token) return;

        const params = new URLSearchParams();
        if (filters.project_id) params.append('project_id', filters.project_id.toString());
        if (filters.photo_type) params.append('photo_type', filters.photo_type);
        if (filters.date_from) params.append('date_from', filters.date_from);
        if (filters.date_to) params.append('date_to', filters.date_to);

        const response = await fetch(`/api/photos?${params.toString()}`, {
          headers: {
            'Authorization': `Bearer ${session.session.access_token}`,
          },
        });

        if (response.ok && isMounted) {
          const result = await response.json();
          setPhotos(result.data || []);
        }
      } catch (error) {
        console.error('Error fetching photos:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPhotos();

    return () => {
      isMounted = false;
    };
  }, [filters, refreshTrigger]);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        alert('Please sign in to upload photos');
        return;
      }

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        if (!file.type.startsWith('image/')) {
          console.warn(`Skipping non-image file: ${file.name}`);
          continue;
        }

        const formData = new FormData();
        formData.append('file', file);
        if (filters.project_id) formData.append('project_id', filters.project_id.toString());
        formData.append('photo_type', 'general');
        formData.append('visibility', 'internal');

        const response = await fetch('/api/photos/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.session.access_token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          console.error(`Failed to upload ${file.name}:`, error);
        }
      }

      // Refresh photo list
      setRefreshTrigger(prev => prev + 1);
      setShowUploadModal(false);
    } catch (error) {
      console.error('Error uploading photos:', error);
      alert('Failed to upload photos. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleFileSelect(e.dataTransfer.files);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getPhotoTypeColor = (type: PhotoType) => {
    switch (type) {
      case 'before': return 'bg-blue-100 text-primary';
      case 'after': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'issue': return 'bg-red-100 text-red-800';
      case 'inspection': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Empty state when no photos exist
  if (photos.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Photo Gallery</h2>
            <p className="text-sm text-gray-600 mt-1">Job site photos and documentation</p>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Camera className="w-4 h-4" />
            <span>Upload Photos</span>
          </button>
        </div>
        <div className="bg-card border border-border rounded-lg">
          <EmptyState
            icon={Camera}
            title="No photos uploaded"
            description="Photos from job sites will appear here. Upload progress photos, site conditions, or documentation to keep track of your projects."
            actionLabel="Upload Photos"
            onAction={() => setShowUploadModal(true)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Photo Gallery</h2>
          <p className="text-sm text-gray-600 mt-1">{photos.length} photos</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          <Camera className="w-4 h-4" />
          <span>Upload Photos</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4">
          <select
            value={filters.project_id || ''}
            onChange={(e) => setFilters({ ...filters, project_id: e.target.value ? parseInt(e.target.value) : undefined })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            disabled={!!initialProjectId}
          >
            <option value="">All Projects</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>

          <select
            value={filters.photo_type || ''}
            onChange={(e) => setFilters({ ...filters, photo_type: e.target.value as PhotoType || undefined })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            <option value="before">Before</option>
            <option value="in_progress">In Progress</option>
            <option value="after">After</option>
            <option value="issue">Issue</option>
            <option value="inspection">Inspection</option>
            <option value="general">General</option>
          </select>

          <input
            type="date"
            value={filters.date_from || ''}
            onChange={(e) => setFilters({ ...filters, date_from: e.target.value || undefined })}
            placeholder="From date"
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />

          <input
            type="date"
            value={filters.date_to || ''}
            onChange={(e) => setFilters({ ...filters, date_to: e.target.value || undefined })}
            placeholder="To date"
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />

          {(filters.project_id || filters.photo_type || filters.date_from || filters.date_to) && (
            <button
              onClick={() => setFilters({})}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Photo Grid */}
      {photos.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">📸</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Photos Yet</h3>
          <p className="text-gray-600 mb-6">Upload your first photo to get started</p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Upload Photos
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {photos.map((photo) => (
            <div
              key={photo.id}
              onClick={() => setSelectedPhoto(photo)}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer overflow-hidden group"
            >
              <div className="aspect-square relative bg-gray-100">
                <img
                  src={photo.thumbnail_url || photo.photo_url}
                  alt={photo.caption || 'Photo'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  loading="lazy"
                />
                <div className="absolute top-2 right-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded ${getPhotoTypeColor(photo.photo_type)}`}>
                    {photo.photo_type}
                  </span>
                </div>
              </div>
              <div className="p-3">
                <p className="text-sm text-gray-900 line-clamp-2 mb-1">
                  {photo.caption || 'Untitled'}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(photo.timestamp).toLocaleDateString()}
                </p>
                {photo.project_name && (
                  <p className="text-xs text-gray-600 mt-1 truncate">
                    📁 {photo.project_name}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Upload Photos</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-500 hover:text-gray-700 text-3xl leading-none"
                disabled={uploading}
              >
                ×
              </button>
            </div>

            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
              />
              
              <div className="text-6xl mb-4">📸</div>
              <p className="text-lg font-medium text-gray-900 mb-2">
                Drag and drop photos here
              </p>
              <p className="text-sm text-gray-600 mb-4">
                or click to browse
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Select Files'}
              </button>
              <p className="text-xs text-gray-500 mt-4">
                Supports JPG, PNG, WebP (max 20MB each)
              </p>
            </div>

            {!filters.project_id && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  💡 Tip: Select a project filter before uploading to automatically link photos
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <button
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-4 right-4 text-white text-4xl hover:text-gray-300 z-10"
          >
            ×
          </button>
          
          <div 
            className="max-w-6xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded-lg overflow-hidden">
              <img
                src={selectedPhoto.photo_url}
                alt={selectedPhoto.caption || 'Photo'}
                className="w-full h-auto max-h-[70vh] object-contain bg-gray-100"
              />
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {selectedPhoto.caption || 'Untitled Photo'}
                    </h3>
                    {selectedPhoto.project_name && (
                      <p className="text-sm text-gray-600">
                        📁 Project: {selectedPhoto.project_name}
                      </p>
                    )}
                  </div>
                  <span className={`px-3 py-1 text-sm font-medium rounded ${getPhotoTypeColor(selectedPhoto.photo_type)}`}>
                    {selectedPhoto.photo_type}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500 mb-1">Date</div>
                    <div className="text-gray-900">
                      {new Date(selectedPhoto.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">Time</div>
                    <div className="text-gray-900">
                      {new Date(selectedPhoto.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  {selectedPhoto.file_size && (
                    <div>
                      <div className="text-gray-500 mb-1">Size</div>
                      <div className="text-gray-900">{formatFileSize(selectedPhoto.file_size)}</div>
                    </div>
                  )}
                  {selectedPhoto.width && selectedPhoto.height && (
                    <div>
                      <div className="text-gray-500 mb-1">Dimensions</div>
                      <div className="text-gray-900">
                        {selectedPhoto.width} × {selectedPhoto.height}
                      </div>
                    </div>
                  )}
                </div>

                {selectedPhoto.location_description && (
                  <div className="mt-4">
                    <div className="text-sm text-gray-500 mb-1">Location</div>
                    <div className="text-gray-900">📍 {selectedPhoto.location_description}</div>
                  </div>
                )}

                {(selectedPhoto.gps_latitude && selectedPhoto.gps_longitude) && (
                  <div className="mt-2">
                    <div className="text-sm text-gray-500 mb-1">GPS Coordinates</div>
                    <div className="text-gray-900">
                      {selectedPhoto.gps_latitude.toFixed(6)}, {selectedPhoto.gps_longitude.toFixed(6)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

