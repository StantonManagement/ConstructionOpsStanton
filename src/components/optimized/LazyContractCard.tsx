'use client';

import React, { memo } from 'react';
import LazyCard from './LazyCard';
import { FileText, Calendar, DollarSign, Building, User, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import type { Contract } from '@/app/context/DataContext';

interface LazyContractCardProps {
  contract: Contract;
  onClick?: (contract: Contract) => void;
  onEdit?: (contract: Contract) => void;
  className?: string;
}

const ContractCardPlaceholder = memo(() => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
    {/* Header */}
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-gray-200 rounded-lg w-10 h-10"></div>
        <div>
          <div className="h-5 bg-gray-200 rounded w-40 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-32"></div>
        </div>
      </div>
      <div className="h-6 bg-gray-200 rounded-full w-16"></div>
    </div>

    {/* Contract details */}
    <div className="space-y-3 mb-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-2">
          <div className="h-4 w-4 bg-gray-200 rounded"></div>
          <div className="h-3 bg-gray-200 rounded w-24"></div>
          <div className="h-3 bg-gray-200 rounded w-32"></div>
        </div>
      ))}
    </div>

    {/* Actions */}
    <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200">
      <div className="h-8 bg-gray-200 rounded w-16"></div>
      <div className="h-8 bg-gray-200 rounded w-16"></div>
    </div>
  </div>
));

ContractCardPlaceholder.displayName = 'ContractCardPlaceholder';

const formatCurrency = (amount: number | null | undefined): string => {
  if (amount == null) return '-';
  return `$${amount.toLocaleString()}`;
};

const formatDate = (dateString?: string) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const OptimizedContractCard = memo<{
  contract: Contract;
  onClick?: (contract: Contract) => void;
  onEdit?: (contract: Contract) => void;
}>(({ contract, onClick, onEdit }) => {
  const getStatusIcon = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
      case 'suspended':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'terminated':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'completed': return 'text-blue-600 bg-blue-100';
      case 'suspended': return 'text-yellow-600 bg-yellow-100';
      case 'terminated': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const handleClick = () => onClick?.(contract);
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(contract);
  };

  return (
    <div
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <FileText className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {contract.contract_nickname || `Contract #${contract.id}`}
            </h3>
            <p className="text-sm text-gray-600">
              {contract.project?.name} - {contract.subcontractor?.name}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {contract.status && (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(contract.status)}`}>
              {contract.status}
            </span>
          )}
          {getStatusIcon(contract.status)}
        </div>
      </div>

      {/* Contract Details */}
      <div className="space-y-3 text-sm">
        <div className="flex items-center space-x-2">
          <Building className="h-4 w-4 text-gray-400" />
          <span className="text-gray-500">Project:</span>
          <span className="font-medium">{contract.project?.name || 'N/A'}</span>
        </div>

        <div className="flex items-center space-x-2">
          <User className="h-4 w-4 text-gray-400" />
          <span className="text-gray-500">Contractor:</span>
          <span className="font-medium">{contract.subcontractor?.name || 'N/A'}</span>
          {contract.subcontractor?.trade && (
            <span className="text-gray-400">({contract.subcontractor.trade})</span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <DollarSign className="h-4 w-4 text-gray-400" />
          <span className="text-gray-500">Amount:</span>
          <span className="font-medium">{formatCurrency(contract.contract_amount)}</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <div>
              <span className="text-gray-500">Start:</span>
              <span className="ml-1 font-medium">{formatDate(contract.start_date)}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <div>
              <span className="text-gray-500">End:</span>
              <span className="ml-1 font-medium">{formatDate(contract.end_date)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-2 pt-4 mt-4 border-t border-gray-200">
        {onEdit && (
          <button
            onClick={handleEdit}
            className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
          >
            Edit
          </button>
        )}
        <button
          onClick={handleClick}
          className="px-3 py-1 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
        >
          View
        </button>
      </div>
    </div>
  );
});

OptimizedContractCard.displayName = 'OptimizedContractCard';

const LazyContractCard = memo<LazyContractCardProps>(({
  contract,
  onClick,
  onEdit,
  className = ''
}) => {
  return (
    <LazyCard
      height={280}
      className={className}
      placeholder={<ContractCardPlaceholder />}
      threshold={0.1}
      rootMargin="100px" // Load cards 100px before they come into view
      fadeIn={true}
    >
      <OptimizedContractCard
        contract={contract}
        onClick={onClick}
        onEdit={onEdit}
      />
    </LazyCard>
  );
});

LazyContractCard.displayName = 'LazyContractCard';

export default LazyContractCard;