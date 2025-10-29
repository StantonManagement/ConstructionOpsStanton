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
  <div className="bg-card rounded-lg shadow-sm border border-border p-6 animate-pulse">
    {/* Header */}
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-secondary/80 rounded-lg w-10 h-10"></div>
        <div>
          <div className="h-5 bg-secondary/80 rounded w-40 mb-2"></div>
          <div className="h-3 bg-secondary/80 rounded w-32"></div>
        </div>
      </div>
      <div className="h-6 bg-secondary/80 rounded-full w-16"></div>
    </div>

    {/* Contract details */}
    <div className="space-y-3 mb-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-2">
          <div className="h-4 w-4 bg-secondary/80 rounded"></div>
          <div className="h-3 bg-secondary/80 rounded w-24"></div>
          <div className="h-3 bg-secondary/80 rounded w-32"></div>
        </div>
      ))}
    </div>

    {/* Actions */}
    <div className="flex justify-end space-x-2 pt-4 border-t border-border">
      <div className="h-8 bg-secondary/80 rounded w-16"></div>
      <div className="h-8 bg-secondary/80 rounded w-16"></div>
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
        return <CheckCircle className="h-5 w-5 text-[var(--status-success-text)]" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-primary" />;
      case 'suspended':
        return <AlertCircle className="h-5 w-5 text-[var(--status-warning-text)]" />;
      case 'terminated':
        return <XCircle className="h-5 w-5 text-[var(--status-critical-text)]" />;
      default:
        return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'text-[var(--status-success-text)] bg-[var(--status-success-bg)]';
      case 'completed': return 'text-primary bg-primary/10';
      case 'suspended': return 'text-[var(--status-warning-text)] bg-[var(--status-warning-bg)]';
      case 'terminated': return 'text-[var(--status-critical-text)] bg-[var(--status-critical-bg)]';
      default: return 'text-muted-foreground bg-secondary';
    }
  };

  const handleClick = () => onClick?.(contract);
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(contract);
  };

  return (
    <div
      className="bg-card rounded-lg shadow-sm border border-border p-6 hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {contract.contract_nickname || `Contract #${contract.id}`}
            </h3>
            <p className="text-sm text-muted-foreground">
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
          <Building className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Project:</span>
          <span className="font-medium">{contract.project?.name || 'N/A'}</span>
        </div>

        <div className="flex items-center space-x-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Contractor:</span>
          <span className="font-medium">{contract.subcontractor?.name || 'N/A'}</span>
          {contract.subcontractor?.trade && (
            <span className="text-muted-foreground">({contract.subcontractor.trade})</span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Amount:</span>
          <span className="font-medium">{formatCurrency(contract.contract_amount)}</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <span className="text-muted-foreground">Start:</span>
              <span className="ml-1 font-medium">{formatDate(contract.start_date)}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <span className="text-muted-foreground">End:</span>
              <span className="ml-1 font-medium">{formatDate(contract.end_date)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-2 pt-4 mt-4 border-t border-border">
        {onEdit && (
          <button
            onClick={handleEdit}
            className="px-3 py-1 text-sm font-medium text-primary hover:text-primary transition-colors"
          >
            Edit
          </button>
        )}
        <button
          onClick={handleClick}
          className="px-3 py-1 text-sm font-medium text-muted-foreground hover:text-gray-800 transition-colors"
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