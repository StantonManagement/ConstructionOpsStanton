'use client';

import React, { memo, useCallback } from 'react';
import { Phone, Mail, MapPin, DollarSign, CheckCircle, XCircle, AlertCircle, MessageSquare } from 'lucide-react';
import type { Subcontractor } from '@/app/context/DataContext';

interface OptimizedContractorCardProps {
  contractor: Subcontractor;
  onSendSMS?: (contractor: Subcontractor) => void;
  onEdit?: (contractor: Subcontractor) => void;
  className?: string;
}

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

const OptimizedContractorCard = memo<OptimizedContractorCardProps>(({
  contractor,
  onSendSMS,
  onEdit,
  className = ''
}) => {
  const handleSendSMS = useCallback(() => {
    onSendSMS?.(contractor);
  }, [onSendSMS, contractor]);

  const handleEdit = useCallback(() => {
    onEdit?.(contractor);
  }, [onEdit, contractor]);

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'inactive':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'pending':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getComplianceColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'valid':
        return 'text-green-600 bg-green-100';
      case 'expiring':
        return 'text-yellow-600 bg-yellow-100';
      case 'expired':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-semibold text-gray-900">{contractor.name}</h3>
            {getStatusIcon(contractor.status)}
          </div>
          <p className="text-sm text-gray-600 capitalize">{contractor.trade}</p>
        </div>

        <div className="flex items-center space-x-2">
          {contractor.hasOpenPaymentApp && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Payment Pending
            </span>
          )}
          {onSendSMS && contractor.phone && (
            <button
              onClick={handleSendSMS}
              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
              title="Send SMS"
            >
              <MessageSquare className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Contact Info */}
      <div className="space-y-2 mb-4">
        {contractor.phone && (
          <div className="flex items-center space-x-2 text-sm">
            <Phone className="h-4 w-4 text-gray-400" />
            <a href={`tel:${contractor.phone}`} className="text-blue-600 hover:text-blue-800">
              {contractor.phone}
            </a>
          </div>
        )}
        {contractor.email && (
          <div className="flex items-center space-x-2 text-sm">
            <Mail className="h-4 w-4 text-gray-400" />
            <a href={`mailto:${contractor.email}`} className="text-blue-600 hover:text-blue-800">
              {contractor.email}
            </a>
          </div>
        )}
      </div>

      {/* Financial Info */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="flex items-center space-x-2 text-sm">
            <DollarSign className="h-4 w-4 text-gray-400" />
            <div>
              <span className="text-gray-500">Contract:</span>
              <span className="ml-1 font-medium">{formatCurrency(contractor.contractAmount)}</span>
            </div>
          </div>
        </div>
        <div>
          <div className="flex items-center space-x-2 text-sm">
            <CheckCircle className="h-4 w-4 text-gray-400" />
            <div>
              <span className="text-gray-500">Paid:</span>
              <span className="ml-1 font-medium">{formatCurrency(contractor.paidToDate)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {contractor.contractAmount > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Payment Progress</span>
            <span>{Math.round((contractor.paidToDate / contractor.contractAmount) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${Math.min((contractor.paidToDate / contractor.contractAmount) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Compliance */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getComplianceColor(contractor.compliance.insurance)}`}>
            Insurance: {contractor.compliance.insurance}
          </span>
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getComplianceColor(contractor.compliance.license)}`}>
            License: {contractor.compliance.license}
          </span>
        </div>

        {contractor.lastPayment && (
          <span className="text-xs text-gray-500">
            Last: {formatDate(contractor.lastPayment)}
          </span>
        )}
      </div>

      {/* Edit Button */}
      {onEdit && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={handleEdit}
            className="w-full py-2 px-4 bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-medium rounded-md transition-colors"
          >
            Edit Details
          </button>
        </div>
      )}
    </div>
  );
});

OptimizedContractorCard.displayName = 'OptimizedContractorCard';

export default OptimizedContractorCard;