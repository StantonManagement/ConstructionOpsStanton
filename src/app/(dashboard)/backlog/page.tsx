'use client';

import React, { useState } from 'react';
import { useBacklog } from '@/hooks/queries/useBacklog';
import { usePortfolio } from '@/context/PortfolioContext';
import { usePortfolios } from '@/hooks/queries/usePortfolios';
import { Button } from '@/components/ui/button';
import { Plus, Building2, Home } from 'lucide-react';
import ConvertToProjectModal from '@/components/ConvertToProjectModal';
import type { CreateBacklogItemInput } from '@/types/schema';
import { useRouter } from 'next/navigation';

export default function BacklogPage() {
  const router = useRouter();
  const { selectedPortfolioId } = usePortfolio();
  const { data: backlogData, isLoading } = useBacklog({
    portfolioId: selectedPortfolioId || undefined
  });
  const { data: portfolios } = usePortfolios();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedBacklogItem, setSelectedBacklogItem] = useState<any>(null);
  const [showConvertModal, setShowConvertModal] = useState(false);

  const backlogItems = backlogData?.items || [];
  const portfolioItems = backlogItems.filter(item => item.scope_level === 'portfolio') || [];
  const propertyItems = backlogItems.filter(item => item.scope_level === 'property') || [];

  const handleConvertClick = (item: any) => {
    setSelectedBacklogItem(item);
    setShowConvertModal(true);
  };

  const handleConvert = async (data: any) => {
    try {
      const res = await fetch(`/api/backlog/${selectedBacklogItem.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to convert');
      }

      const result = await res.json();
      router.push(`/projects?project=${result.project.id}`);
    } catch (error: any) {
      throw error;
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Backlog</h1>
          <p className="text-gray-600 mt-1">Future ideas and work not yet scheduled</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Portfolio-level items */}
      {portfolioItems.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Portfolio-Level
          </h2>
          <div className="space-y-4">
            {portfolioItems.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {item.portfolio?.name} · Added {new Date(item.created_at).toLocaleDateString()}
                    </p>
                    {item.description && (
                      <p className="text-gray-700 mb-3">{item.description}</p>
                    )}
                    {item.estimated_cost && (
                      <p className="text-sm text-gray-600">
                        Est. scope: ${item.estimated_cost.toLocaleString()}
                      </p>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleConvertClick(item)}
                  >
                    Convert to Project
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Property-level items */}
      {propertyItems.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Property-Level
          </h2>
          <div className="space-y-4">
            {propertyItems.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Home className="w-5 h-5 text-green-600" />
                      <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {item.property?.name} · Added {new Date(item.created_at).toLocaleDateString()}
                    </p>
                    {item.description && (
                      <p className="text-gray-700 mb-3">{item.description}</p>
                    )}
                    {item.estimated_cost && (
                      <p className="text-sm text-gray-600">
                        Est. cost: ${item.estimated_cost.toLocaleString()}
                      </p>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleConvertClick(item)}
                  >
                    Convert to Project
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {backlogItems.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No backlog items yet</h3>
          <p className="text-gray-600 mb-6">
            Add future project ideas and work that isn't scheduled yet
          </p>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add First Item
          </Button>
        </div>
      )}

      {/* Convert to Project Modal */}
      {showConvertModal && selectedBacklogItem && (
        <ConvertToProjectModal
          backlogItem={selectedBacklogItem}
          onClose={() => {
            setShowConvertModal(false);
            setSelectedBacklogItem(null);
          }}
          onConvert={handleConvert}
        />
      )}
    </div>
  );
}
