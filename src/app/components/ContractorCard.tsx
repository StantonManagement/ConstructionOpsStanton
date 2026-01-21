'use client';

/**
 * Contractor Card Component
 * Following Single Responsibility - handles only the display of contractor information
 */

import React from 'react';
import { Phone, Mail, Send, Edit, Eye, Trash2, Tag, Loader2, GripVertical } from 'lucide-react';
import type { ContractWithContractor } from '@/lib/contractors/service';
import { formatCurrency, getTradeIcon, calculateContractMetrics } from '@/lib/contractors/utils';

interface ContractorCardProps {
  contract: ContractWithContractor;
  onRequestPayment: (contractorId: number, contractId: number) => void;
  onEditContract: (contract: ContractWithContractor) => void;
  onViewLineItems: (contract: ContractWithContractor) => void;
  onViewDetails: (contract: ContractWithContractor) => void;
  onDelete: (contract: ContractWithContractor) => void;
  isRequesting: boolean;
  dragHandleProps?: {
    attributes: Record<string, unknown>;
    listeners: Record<string, unknown>;
  };
}

const ContractorCard: React.FC<ContractorCardProps> = ({
  contract,
  onRequestPayment,
  onEditContract,
  onViewLineItems,
  onViewDetails,
  onDelete,
  isRequesting,
  dragHandleProps,
}) => {
  const metrics = calculateContractMetrics(contract);

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer relative pl-12"
      onClick={() => onViewDetails(contract)}
    >
      {/* Drag Handle (if provided) */}
      {dragHandleProps && (
        <div
          {...dragHandleProps.attributes}
          {...dragHandleProps.listeners}
          className="absolute top-4 left-4 cursor-grab active:cursor-grabbing p-2 hover:bg-gray-100 rounded touch-none"
          style={{ touchAction: 'none' }}
        >
          <GripVertical className="w-5 h-5 text-gray-400" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">
            {getTradeIcon(contract.contractors.trade)}
          </div>
          <div>
            <h3 className="font-semibold text-lg text-gray-900">
              {contract.contractors.name}
            </h3>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
              {contract.contractors.trade}
            </span>
          </div>
        </div>
      </div>

      {/* Budget Link Badge */}
      <div className="mb-4">
        {contract.property_budgets ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
            <Tag className="w-3 h-3" />
            Budget: {contract.property_budgets.category_name}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-gray-50 text-gray-500 border border-gray-100 italic">
            <Tag className="w-3 h-3" />
            No Budget Item Linked
          </span>
        )}
      </div>

      {/* Contact Info */}
      {(contract.contractors.phone || contract.contractors.email) && (
        <div className="mb-4 space-y-1">
          {contract.contractors.phone && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="w-4 h-4" />
              <span>{contract.contractors.phone}</span>
            </div>
          )}
          {contract.contractors.email && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Mail className="w-4 h-4" />
              <span>{contract.contractors.email}</span>
            </div>
          )}
        </div>
      )}

      {/* Contract Summary - Three Money Columns */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <p className="text-xs text-gray-500 mb-1">Original</p>
            <p className="text-sm font-semibold text-gray-900">
              {formatCurrency(metrics.originalAmount)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Change Orders</p>
            <p
              className={`text-sm font-semibold ${
                metrics.changeOrders > 0
                  ? 'text-orange-600'
                  : metrics.changeOrders < 0
                  ? 'text-red-600'
                  : 'text-gray-900'
              }`}
            >
              {metrics.changeOrders > 0 && '+'}
              {formatCurrency(metrics.changeOrders)}
            </p>
            {metrics.changeOrders !== 0 && (
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium mt-1 ${
                  metrics.changeOrders > 0
                    ? 'bg-orange-100 text-orange-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                CO
              </span>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Current Total</p>
            <p className="text-sm font-semibold text-primary">
              {formatCurrency(metrics.currentAmount)}
            </p>
          </div>
        </div>

        {/* Payment Status */}
        <div className="grid grid-cols-2 gap-3 mb-3 pt-3 border-t border-gray-200">
          <div>
            <p className="text-xs text-gray-500 mb-1">Paid to Date</p>
            <p className="text-sm font-semibold text-green-600">
              {formatCurrency(metrics.paidToDate)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Remaining</p>
            <p className="text-sm font-semibold text-orange-600">
              {formatCurrency(metrics.remaining)}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-600">
            <span>Progress</span>
            <span>{metrics.percentComplete}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${metrics.percentComplete}%` }}
            />
          </div>
        </div>
      </div>

      {/* Line Items Preview */}
      {contract.line_items && contract.line_items.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-2">Recent Line Items</p>
          <div className="space-y-1">
            {contract.line_items.slice(0, 3).map((item: any, index: number) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="text-gray-600 truncate">
                  {item.description || `Item ${index + 1}`}
                </span>
                <span className="text-gray-900 font-medium ml-2">
                  {formatCurrency(item.amount || 0)}
                </span>
              </div>
            ))}
            {contract.line_items.length > 3 && (
              <p className="text-xs text-gray-500 italic">
                +{contract.line_items.length - 3} more items
              </p>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRequestPayment(contract.contractor_id, contract.id);
          }}
          disabled={isRequesting}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRequesting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Sending...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Request Payment</span>
            </>
          )}
        </button>
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditContract(contract);
            }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Edit className="w-4 h-4" />
            <span className="text-sm">Edit</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewLineItems(contract);
            }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Eye className="w-4 h-4" />
            <span className="text-sm">Details</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(contract);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span className="text-sm">Remove from Project</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContractorCard;
