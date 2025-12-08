'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, MapPin, X, Building2 } from 'lucide-react';
import { useProject } from '@/app/context/ProjectContext';

export default function ProjectSelector() {
  const { selectedProject, projects, setSelectedProjectId, clearProject, isLoading } = useProject();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to open selector
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Filter projects by search
  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group projects by status
  const activeProjects = filteredProjects.filter(p => 
    p.status !== 'completed' && p.status !== 'closed'
  );
  const completedProjects = filteredProjects.filter(p => 
    p.status === 'completed' || p.status === 'closed'
  );

  const handleSelectProject = (projectId: number) => {
    setSelectedProjectId(projectId);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearProject();
  };

  if (isLoading) {
    return (
      <div className="h-10 bg-gray-100 rounded-lg animate-pulse w-48" />
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all min-w-[200px] max-w-[300px] ${
          selectedProject
            ? 'bg-primary/5 border-primary/30 text-foreground'
            : 'bg-card border-dashed border-gray-300 text-muted-foreground hover:border-gray-400'
        }`}
      >
        <MapPin className={`w-4 h-4 flex-shrink-0 ${selectedProject ? 'text-primary' : 'text-gray-400'}`} />
        <span className="flex-1 text-left truncate text-sm font-medium">
          {selectedProject ? selectedProject.name : 'All Projects'}
        </span>
        {selectedProject && (
          <button
            onClick={handleClearSelection}
            className="p-0.5 hover:bg-gray-200 rounded transition-colors"
            title="Clear selection"
          >
            <X className="w-3.5 h-3.5 text-gray-500" />
          </button>
        )}
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
          {/* Search Input */}
          <div className="p-2 border-b border-gray-100">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* Options */}
          <div className="max-h-80 overflow-y-auto">
            {/* All Projects Option */}
            <button
              onClick={() => {
                clearProject();
                setIsOpen(false);
                setSearchQuery('');
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors ${
                !selectedProject ? 'bg-primary/5' : ''
              }`}
            >
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-4 h-4 text-gray-500" />
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">All Projects</div>
                <div className="text-xs text-muted-foreground">View everything</div>
              </div>
            </button>

            {/* Divider */}
            {activeProjects.length > 0 && (
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-gray-50 border-y border-gray-100">
                Active Projects ({activeProjects.length})
              </div>
            )}

            {/* Active Projects */}
            {activeProjects.map((project) => (
              <button
                key={project.id}
                onClick={() => handleSelectProject(project.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors ${
                  selectedProject?.id === project.id ? 'bg-primary/5' : ''
                }`}
              >
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-sm">
                  🏗️
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{project.name}</div>
                  {project.address && (
                    <div className="text-xs text-muted-foreground truncate">{project.address}</div>
                  )}
                </div>
                {project.current_phase && (
                  <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                    {project.current_phase}
                  </span>
                )}
              </button>
            ))}

            {/* Completed Projects */}
            {completedProjects.length > 0 && (
              <>
                <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-gray-50 border-y border-gray-100">
                  Completed ({completedProjects.length})
                </div>
                {completedProjects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleSelectProject(project.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors opacity-60 ${
                      selectedProject?.id === project.id ? 'bg-primary/5 opacity-100' : ''
                    }`}
                  >
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-sm">
                      ✅
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{project.name}</div>
                    </div>
                  </button>
                ))}
              </>
            )}

            {/* No Results */}
            {filteredProjects.length === 0 && searchQuery && (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                No projects match "{searchQuery}"
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-3 py-2 border-t border-gray-100 bg-gray-50 text-xs text-muted-foreground">
            <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-xs">⌘K</kbd>
            <span className="ml-2">to open</span>
          </div>
        </div>
      )}
    </div>
  );
}
