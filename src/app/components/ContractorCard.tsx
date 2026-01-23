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
      className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-lg transition-shadow cursor-pointer relative pl-9 max-w-full overflow-hidden"
      onClick={() => onViewDetails(contract)}
    >
      {/* Drag Handle (if provided) */}
      {dragHandleProps && (
        <div
          {...dragHandleProps.attributes}
          {...dragHandleProps.listeners}
          className="absolute top-2 left-2 cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded touch-none"
          style={{ touchAction: 'none' }}
        >
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>
      )}

      {/* Header - Compact */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center text-lg flex-shrink-0">
            {getTradeIcon(contract.contractors.trade)}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm text-gray-900 truncate">
              {contract.contractors.name}
            </h3>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700">
              {contract.contractors.trade}
            </span>
          </div>
        </div>
      </div>

      {/* Budget Link Badge - Compact */}
      <div className="mb-2">
        {contract.property_budgets ? (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-100 truncate max-w-full">
            <Tag className="w-2.5 h-2.5 flex-shrink-0" />
            <span className="truncate">Budget: {contract.property_budgets.category_name}</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-50 text-gray-500 border border-gray-100 italic">
            <Tag className="w-2.5 h-2.5" />
            No Budget
          </span>
        )}
      </div>

      {/* Contact Info - Compact */}
      {(contract.contractors.phone || contract.contractors.email) && (
        <div className="mb-2 space-y-0.5">
          {contract.contractors.phone && (
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <Phone className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{contract.contractors.phone}</span>
            </div>
          )}
          {contract.contractors.email && (
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <Mail className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{contract.contractors.email}</span>
            </div>
          )}
        </div>
      )}

      {/* Contract Summary - Compact Grid */}
      <div className="bg-gray-50 rounded-lg p-2 mb-2">
        <div className="grid grid-cols-3 gap-2 mb-2">
          <div>
            <p className="text-[10px] text-gray-500 mb-0.5">Original</p>
            <p className="text-xs font-semibold text-gray-900 truncate">
              {formatCurrency(metrics.originalAmount)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500 mb-0.5">Changes</p>
            <p
              className={`text-xs font-semibold truncate ${
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
          </div>
          <div>
            <p className="text-[10px] text-gray-500 mb-0.5">Current</p>
            <p className="text-xs font-semibold text-primary truncate">
              {formatCurrency(metrics.currentAmount)}
            </p>
          </div>
        </div>

        {/* Payment Status - Compact */}
        <div className="grid grid-cols-2 gap-2 mb-2 pt-2 border-t border-gray-200">
          <div>
            <p className="text-[10px] text-gray-500 mb-0.5">Paid</p>
            <p className="text-xs font-semibold text-green-600 truncate">
              {formatCurrency(metrics.paidToDate)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500 mb-0.5">Remaining</p>
            <p className="text-xs font-semibold text-orange-600 truncate">
              {formatCurrency(metrics.remaining)}
            </p>
          </div>
        </div>

        {/* Progress Bar - Compact */}
        <div className="space-y-0.5">
          <div className="flex justify-between text-[10px] text-gray-600">
            <span>Progress</span>
            <span>{metrics.percentComplete}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-primary h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${metrics.percentComplete}%` }}
            />
          </div>
        </div>
      </div>

      {/* Line Items Preview - Compact */}
      {contract.line_items && contract.line_items.length > 0 && (
        <div className="mb-2">
          <p className="text-[10px] text-gray-500 mb-1">Recent Line Items</p>
          <div className="space-y-0.5">
            {contract.line_items.slice(0, 2).map((item: any, index: number) => (
              <div key={index} className="flex justify-between text-xs min-w-0">
                <span className="text-gray-600 truncate flex-1">
                  {item.description || `Item ${index + 1}`}
                </span>
                <span className="text-gray-900 font-medium ml-2 flex-shrink-0">
                  {formatCurrency(item.amount || 0)}
                </span>
              </div>
            ))}
            {contract.line_items.length > 2 && (
              <p className="text-[10px] text-gray-500 italic">
                +{contract.line_items.length - 2} more
              </p>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons - Compact */}
      <div className="flex flex-col gap-1.5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRequestPayment(contract.contractor_id, contract.id);
          }}
          disabled={isRequesting}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs"
        >
          {isRequesting ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Sending...</span>
            </>
          ) : (
            <>
              <Send className="w-3 h-3" />
              <span>Request Payment</span>
            </>
          )}
        </button>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditContract(contract);
            }}
            className="flex items-center justify-center gap-1 px-2 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Edit className="w-3 h-3" />
            <span className="text-[10px]">Edit</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewLineItems(contract);
            }}
            className="flex items-center justify-center gap-1 px-2 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Eye className="w-3 h-3" />
            <span className="text-[10px]">View</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(contract);
            }}
            className="flex items-center justify-center gap-1 px-2 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            <span className="text-[10px]">Remove</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContractorCard;
