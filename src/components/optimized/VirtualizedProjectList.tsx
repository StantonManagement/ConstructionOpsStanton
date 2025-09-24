'use client';

import React, { memo, useMemo } from 'react';
import * as ReactWindow from 'react-window';
const List = (ReactWindow as any).FixedSizeList;
import OptimizedProjectCard from './OptimizedProjectCard';

interface Project {
  id: number;
  name: string;
  client_name: string;
  current_phase?: string;
  budget?: number;
  spent?: number;
  start_date?: string;
  end_date?: string;
  status?: string;
}

interface VirtualizedProjectListProps {
  projects: Project[];
  onProjectClick?: (project: Project) => void;
  onProjectView?: (project: Project) => void;
  height?: number;
  itemHeight?: number;
  searchQuery?: string;
}

interface ProjectRowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    projects: Project[];
    onProjectClick?: (project: Project) => void;
    onProjectView?: (project: Project) => void;
  };
}

const ProjectRow = memo<ProjectRowProps>(({ index, style, data }) => {
  const { projects, onProjectClick, onProjectView } = data;
  const project = projects[index];

  if (!project) return null;

  return (
    <div style={style} className="px-2">
      <OptimizedProjectCard
        project={project}
        onClick={onProjectClick}
        onView={onProjectView}
      />
    </div>
  );
});

ProjectRow.displayName = 'ProjectRow';

const VirtualizedProjectList = memo<VirtualizedProjectListProps>(({
  projects,
  onProjectClick,
  onProjectView,
  height = 600,
  itemHeight = 220,
  searchQuery = ''
}) => {
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;

    const query = searchQuery.toLowerCase();
    return projects.filter(project =>
      project.name.toLowerCase().includes(query) ||
      project.client_name.toLowerCase().includes(query) ||
      project.current_phase?.toLowerCase().includes(query) ||
      project.status?.toLowerCase().includes(query)
    );
  }, [projects, searchQuery]);

  const itemData = useMemo(() => ({
    projects: filteredProjects,
    onProjectClick,
    onProjectView,
  }), [filteredProjects, onProjectClick, onProjectView]);

  if (filteredProjects.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <p className="text-lg font-medium">No projects found</p>
          {searchQuery && <p className="text-sm">Try adjusting your search query</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg p-2">
      <List
        height={height}
        itemCount={filteredProjects.length}
        itemSize={itemHeight}
        itemData={itemData}
        overscanCount={3}
        className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
      >
        {ProjectRow}
      </List>
    </div>
  );
});

VirtualizedProjectList.displayName = 'VirtualizedProjectList';

export default VirtualizedProjectList;