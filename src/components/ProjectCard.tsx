import React from 'react';
import { Project } from '../app/context/DataContext';

type Props = {
  project: Project;
};

const ProjectCard: React.FC<Props> = ({ project }) => {
  const percent = project.budget > 0 ? Math.min(100, Math.round((project.spent / project.budget) * 100)) : 0;
  return (
    <div className="border rounded-lg p-4 bg-white shadow hover:shadow-md transition">
      <h4 className="font-semibold text-gray-900 text-lg mb-1">{project.name}</h4>
      <p className="text-sm text-black mb-1">{project.client_name}</p>
      <p className="text-xs text-blue-700 mb-2">Phase: {project.current_phase}</p>
      <div className="mb-2">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-black">Budget: ${Number(project.budget || 0).toLocaleString()}</span>
          <span className="text-black">Spent: ${Number(project.spent || 0).toLocaleString()}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-green-500 h-2.5 rounded-full transition-all"
            style={{ width: `${percent}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span className="text-black">{percent}% used</span>
          <span className={percent > 90 ? 'text-red-600' : 'text-green-700'}>
            {percent > 90 ? '⚠️ Near limit' : 'On track'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;