'use client';

import React from 'react';
import { useProperties } from '@/hooks/queries/useProperties';
import { usePortfolio } from '@/context/PortfolioContext';
import { Building2, MapPin, Folder } from 'lucide-react';
import Link from 'next/link';

export default function PropertiesPage() {
  const { selectedPortfolioId } = usePortfolio();
  const { data: properties, isLoading } = useProperties(selectedPortfolioId || undefined);

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Properties</h1>
        <p className="text-gray-600 mt-1">
          {properties?.length || 0} {properties?.length === 1 ? 'property' : 'properties'}
          {selectedPortfolioId && ' in selected portfolio'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(properties || []).map((property) => {
          const activeProjects = (property.projects || []).filter((p: any) => p.status === 'active').length;
          const totalBudget = (property.projects || []).reduce((sum: number, p: any) => sum + (Number(p.budget) || 0), 0);
          const totalSpent = (property.projects || []).reduce((sum: number, p: any) => sum + (Number(p.spent) || 0), 0);
          const progress = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

          return (
            <Link
              key={property.id}
              href={`/properties/${property.id}`}
              className="block bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">{property.name}</h3>
                  </div>
                  {property.address && (
                    <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
                      <MapPin className="w-4 h-4" />
                      <span>{property.address}</span>
                    </div>
                  )}
                  {property.portfolio?.name && (
                    <p className="text-xs text-gray-500 mb-3">{property.portfolio.name}</p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Units</span>
                  <span className="font-medium">{property.unit_count || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Active Projects</span>
                  <span className="font-medium flex items-center gap-1">
                    <Folder className="w-4 h-4" />
                    {activeProjects}
                  </span>
                </div>
                <div className="pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">Overall Progress</span>
                    <span className="font-medium">{progress.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {(!properties || properties.length === 0) && (
        <div className="text-center py-12">
          <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No properties found</h3>
          <p className="text-gray-600">
            {selectedPortfolioId 
              ? 'No properties in the selected portfolio'
              : 'No properties available'}
          </p>
        </div>
      )}
    </div>
  );
}
