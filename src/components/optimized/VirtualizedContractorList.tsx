'use client';

import React, { memo, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import OptimizedContractorCard from './OptimizedContractorCard';
import type { Subcontractor } from '@/app/context/DataContext';

interface VirtualizedContractorListProps {
  contractors: Subcontractor[];
  onSendSMS?: (contractor: Subcontractor) => void;
  onEditContractor?: (contractor: Subcontractor) => void;
  height?: number;
  itemHeight?: number;
  searchQuery?: string;
}

interface ContractorRowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    contractors: Subcontractor[];
    onSendSMS?: (contractor: Subcontractor) => void;
    onEditContractor?: (contractor: Subcontractor) => void;
  };
}

const ContractorRow = memo<ContractorRowProps>(({ index, style, data }) => {
  const { contractors, onSendSMS, onEditContractor } = data;
  const contractor = contractors[index];

  if (!contractor) return null;

  return (
    <div style={style} className="px-2">
      <OptimizedContractorCard
        contractor={contractor}
        onSendSMS={onSendSMS}
        onEdit={onEditContractor}
      />
    </div>
  );
});

ContractorRow.displayName = 'ContractorRow';

const VirtualizedContractorList = memo<VirtualizedContractorListProps>(({
  contractors,
  onSendSMS,
  onEditContractor,
  height = 600,
  itemHeight = 280,
  searchQuery = ''
}) => {
  const filteredContractors = useMemo(() => {
    if (!searchQuery.trim()) return contractors;

    const query = searchQuery.toLowerCase();
    return contractors.filter(contractor =>
      contractor.name.toLowerCase().includes(query) ||
      contractor.trade.toLowerCase().includes(query) ||
      contractor.status.toLowerCase().includes(query) ||
      contractor.phone.toLowerCase().includes(query) ||
      contractor.email?.toLowerCase().includes(query)
    );
  }, [contractors, searchQuery]);

  const itemData = useMemo(() => ({
    contractors: filteredContractors,
    onSendSMS,
    onEditContractor,
  }), [filteredContractors, onSendSMS, onEditContractor]);

  if (filteredContractors.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <p className="text-lg font-medium">No contractors found</p>
          {searchQuery && <p className="text-sm">Try adjusting your search query</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg p-2">
      <List
        height={height}
        itemCount={filteredContractors.length}
        itemSize={itemHeight}
        itemData={itemData}
        overscanCount={3}
        className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
      >
        {ContractorRow}
      </List>
    </div>
  );
});

VirtualizedContractorList.displayName = 'VirtualizedContractorList';

export default VirtualizedContractorList;