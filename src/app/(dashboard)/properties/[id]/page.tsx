'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useProjects } from '@/hooks/queries/useProjects';
import { Building2, MapPin, Folder, ArrowLeft, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { addRecentItem } from '@/lib/recentItems';

export default function PropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const propertyId = params.id as string;
  const { data: projects, isLoading } = useProjects();

  const property = projects?.find(p => p.id === propertyId);
  const propertyProjects = projects?.filter(p => p.id === propertyId) || [];

  useEffect(() => {
    if (property?.id && property?.name) {
      addRecentItem('projects', {
        id: property.id.toString(),
        name: property.name,
        href: `/properties/${property.id}`
      });
    }
  }, [property?.id, property?.name]);

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Property not found</h3>
          <Button onClick={() => router.push('/properties')}>
            Back to Properties
          </Button>
        </div>
      </div>
    );
  }

  const totalBudget = propertyProjects.reduce((sum: number, p: any) => sum + (Number(p.budget) || 0), 0);
  const totalSpent = propertyProjects.reduce((sum: number, p: any) => sum + (Number(p.spent) || 0), 0);
  const progress = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/properties')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Properties
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">{property.name}</h1>
            </div>
            {property.address && (
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>{property.address}</span>
              </div>
            )}
            {property.portfolio_name && (
              <p className="text-sm text-gray-500 mt-2">{property.portfolio_name}</p>
            )}
          </div>
        </div>
      </div>

      {/* Property Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total Units</span>
            <Building2 className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{property.total_units || 1}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total Budget</span>
            <DollarSign className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            ${totalBudget.toLocaleString()}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total Spent</span>
            <DollarSign className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            ${totalSpent.toLocaleString()}
          </p>
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>Progress</span>
              <span>{progress.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Projects List */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Projects</h2>
          <span className="text-sm text-gray-600">
            {propertyProjects.length} {propertyProjects.length === 1 ? 'project' : 'projects'}
          </span>
        </div>

        {propertyProjects.length > 0 ? (
          <div className="space-y-4">
            {propertyProjects.map((project: any) => {
              const projectProgress = project.budget > 0 ? (project.spent / project.budget) * 100 : 0;
              
              return (
                <Link
                  key={project.id}
                  href={`/projects?project=${project.id}`}
                  className="block border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Folder className="w-5 h-5 text-blue-600" />
                        <h3 className="font-semibold text-gray-900">{project.name}</h3>
                      </div>
                      {project.current_phase && (
                        <p className="text-sm text-gray-600 mb-3">{project.current_phase}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Budget: </span>
                          <span className="font-medium">${Number(project.budget || 0).toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Spent: </span>
                          <span className="font-medium">${Number(project.spent || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-right mb-2">
                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                          project.status === 'active' ? 'bg-green-100 text-green-800' :
                          project.status === 'complete' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {project.status || 'active'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {projectProgress.toFixed(0)}% complete
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No projects for this property
          </div>
        )}
      </div>
    </div>
  );
}
