'use client';

import React from 'react';
import { usePortfolios } from '@/hooks/queries/usePortfolios';
import { usePortfolioContext } from '@/context/PortfolioContext';
import { FolderOpen, X } from 'lucide-react';

interface PortfolioSelectorProps {
  className?: string;
}

export function PortfolioSelector({ className }: PortfolioSelectorProps) {
  const { data: portfolios, isLoading } = usePortfolios();
  const { selectedPortfolioId, setSelectedPortfolioId, clearPortfolioFilter } = usePortfolioContext();

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 ${className}`}>
        <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
        <div className="w-24 h-4 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <FolderOpen className="w-4 h-4 text-gray-400" />
      <select
        value={selectedPortfolioId || ''}
        onChange={(e) => setSelectedPortfolioId(e.target.value || null)}
        className="bg-transparent border-none text-sm font-medium focus:outline-none focus:ring-0 cursor-pointer min-w-[140px]"
      >
        <option value="">All Portfolios</option>
        {portfolios?.map((p) => (
          <option key={p.id} value={p.id}>
            {p.code || p.name}
          </option>
        ))}
      </select>
      {selectedPortfolioId && (
        <button
          onClick={clearPortfolioFilter}
          className="p-1 hover:bg-gray-100 rounded"
          title="Clear filter"
        >
          <X className="w-3 h-3 text-gray-400" />
        </button>
      )}
    </div>
  );
}
