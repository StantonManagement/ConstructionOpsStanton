import React from 'react';

interface FundingSourceCardProps {
  fundingSource: {
    id: string;
    name: string;
    type: string;
    commitment_amount: number;
    drawn_amount: number;
    remaining: number;
    eligible_to_draw: number;
    lender_name?: string;
  };
  onCreateDraw: (fundingSourceId: string) => void;
}

export default function FundingSourceCard({ fundingSource, onCreateDraw }: FundingSourceCardProps) {
  const percentDrawn = fundingSource.commitment_amount > 0
    ? (fundingSource.drawn_amount / fundingSource.commitment_amount) * 100
    : 0;

  const hasEligible = fundingSource.eligible_to_draw > 0;
  const exceedsRemaining = fundingSource.eligible_to_draw > fundingSource.remaining;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      loan: 'Construction Loan',
      grant: 'Grant',
      equity: 'Equity',
      other: 'Other',
    };
    return labels[type] || type;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-3">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-medium text-gray-900">{fundingSource.name}</h3>
          <p className="text-sm text-gray-500">
            {getTypeLabel(fundingSource.type)}
            {fundingSource.lender_name && ` • ${fundingSource.lender_name}`}
          </p>
        </div>
        {hasEligible && (
          <span className={`px-2 py-1 text-xs font-medium rounded ${
            exceedsRemaining ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
          }`}>
            {formatCurrency(fundingSource.eligible_to_draw)} eligible
          </span>
        )}
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">
            Commitment: {formatCurrency(fundingSource.commitment_amount)}
          </span>
          <span className="text-gray-600">
            Drawn: {formatCurrency(fundingSource.drawn_amount)}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${Math.min(percentDrawn, 100)}%` }}
          />
        </div>
        <div className="text-right mt-1">
          <span className="text-sm font-medium text-gray-900">
            {formatCurrency(fundingSource.remaining)} remaining
          </span>
        </div>
      </div>

      {exceedsRemaining && (
        <div className="mb-3 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
          Warning: Eligible amount exceeds remaining capacity
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => onCreateDraw(fundingSource.id)}
          disabled={!hasEligible}
          className={`px-4 py-2 text-sm font-medium rounded ${
            hasEligible
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          Create Draw
        </button>
      </div>
    </div>
  );
}
