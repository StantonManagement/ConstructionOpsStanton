import React from 'react';
import { Project } from '../app/context/DataContext';

type Props = {
  project: Project;
};

const ProjectCard: React.FC<Props> = ({ project }) => (
  <div className="border rounded-lg p-4">
    <h4 className="font-semibold text-gray-900">{project.name}</h4>
    <p className="text-sm text-gray-600">{project.client_name}</p>
    <p className="text-sm text-blue-600 mt-1">Phase: {project.current_phase}</p>
    <p className="text-sm">Budget: ${Number(project.budget || 0).toLocaleString()}</p>
    <p className="text-sm">Spent: ${Number(project.spent || 0).toLocaleString()}</p>
  </div>
);

export default ProjectCard;