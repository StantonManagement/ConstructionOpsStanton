import React from 'react';
import { ConstructionLoan } from '@/types/loan';
import { MetricCard } from '@/components/ui/MetricCard';
import { formatCurrency } from '@/lib/theme';
import { Lock, Unlock, Edit2 } from 'lucide-react';

interface LoanDetailsCardProps {
  loan: ConstructionLoan;
  totalDrawn: number;
  onLockBudget?: () => void;
  isBudgetLocked: boolean;
  onEdit?: () => void;
}

export const LoanDetailsCard: React.FC<LoanDetailsCardProps> = ({ 
  loan, 
  totalDrawn, 
  onLockBudget, 
  isBudgetLocked,
  onEdit
}) => {
  const percentDrawn = loan.total_amount > 0 ? (totalDrawn / loan.total_amount) * 100 : 0;
  const available = loan.total_amount - totalDrawn;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{loan.lender_name}</h3>
          <p className="text-sm text-gray-500">Loan #{loan.loan_number}</p>
        </div>
        <div className="flex gap-2">
          {onEdit && (
            <button 
              onClick={onEdit}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          )}
          {!isBudgetLocked && (
            <button 
              onClick={onLockBudget}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100"
            >
              <Lock className="w-4 h-4" />
              Lock Budget
            </button>
          )}
          {isBudgetLocked && (
            <span className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-50 text-gray-500 border border-gray-200 rounded-lg">
              <Lock className="w-4 h-4" />
              Budget Locked
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Total Loan"
          value={formatCurrency(loan.total_amount)}
          padding="sm"
        />
        <MetricCard
          title="Drawn"
          value={formatCurrency(totalDrawn)}
          status={percentDrawn > 90 ? 'warning' : 'neutral'}
          subtitle={`${percentDrawn.toFixed(1)}%`}
          padding="sm"
        />
        <MetricCard
          title="Available"
          value={formatCurrency(available)}
          status={available < 0 ? 'critical' : 'success'}
          padding="sm"
        />
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Progress</span>
          <span>{percentDrawn.toFixed(1)}% drawn</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${Math.min(percentDrawn, 100)}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 text-sm text-gray-500 pt-2 border-t">
        <div>
          <span className="block text-xs uppercase tracking-wider text-gray-400">Close Date</span>
          {loan.close_date || '-'}
        </div>
        <div className="text-right">
          <span className="block text-xs uppercase tracking-wider text-gray-400">Maturity Date</span>
          {loan.maturity_date || '-'}
        </div>
      </div>
    </div>
  );
};
