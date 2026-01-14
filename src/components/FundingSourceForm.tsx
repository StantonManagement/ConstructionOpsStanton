'use client';

import React, { useState } from 'react';
import { usePortfolios } from '@/hooks/queries/usePortfolios';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface FundingSourceFormProps {
  initialData?: {
    portfolio_id?: string;
    name?: string;
    type?: string;
    lender_name?: string;
    commitment_amount?: number;
    drawn_amount?: number;
    interest_rate?: number;
    maturity_date?: string;
    loan_number?: string;
    notes?: string;
    is_active?: boolean;
  };
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function FundingSourceForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting
}: FundingSourceFormProps) {
  const { data: portfolios } = usePortfolios();

  const [portfolioId, setPortfolioId] = useState(initialData?.portfolio_id || '');
  const [name, setName] = useState(initialData?.name || '');
  const [type, setType] = useState(initialData?.type || 'loan');
  const [lenderName, setLenderName] = useState(initialData?.lender_name || '');
  const [commitmentAmount, setCommitmentAmount] = useState(
    initialData?.commitment_amount?.toString() || ''
  );
  const [drawnAmount, setDrawnAmount] = useState(
    initialData?.drawn_amount?.toString() || ''
  );
  const [interestRate, setInterestRate] = useState(
    initialData?.interest_rate?.toString() || ''
  );
  const [maturityDate, setMaturityDate] = useState(
    initialData?.maturity_date?.split('T')[0] || ''
  );
  const [loanNumber, setLoanNumber] = useState(initialData?.loan_number || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [isActive, setIsActive] = useState(initialData?.is_active ?? true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      portfolio_id: portfolioId,
      name,
      type,
      lender_name: lenderName || undefined,
      commitment_amount: parseFloat(commitmentAmount) || 0,
      drawn_amount: parseFloat(drawnAmount) || 0,
      interest_rate: interestRate ? parseFloat(interestRate) : undefined,
      maturity_date: maturityDate || undefined,
      loan_number: loanNumber || undefined,
      notes: notes || undefined,
      is_active: isActive,
    });
  };

  const isValid = portfolioId && name && type;

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardContent className="pt-6 space-y-6">
          {/* Portfolio Selection */}
          <div className="space-y-2">
            <Label htmlFor="portfolio">Portfolio *</Label>
            <select
              id="portfolio"
              value={portfolioId}
              onChange={(e) => setPortfolioId(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
              required
            >
              <option value="">Select portfolio...</option>
              {portfolios?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Arbor Construction Loan"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full border rounded-md px-3 py-2"
                required
              >
                <option value="loan">Loan</option>
                <option value="grant">Grant</option>
                <option value="equity">Equity</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Lender */}
          <div className="space-y-2">
            <Label htmlFor="lender">Lender / Source Name</Label>
            <Input
              id="lender"
              value={lenderName}
              onChange={(e) => setLenderName(e.target.value)}
              placeholder="e.g., Arbor Realty Trust"
            />
          </div>

          {/* Amounts */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="commitment">Commitment Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <Input
                  id="commitment"
                  type="number"
                  value={commitmentAmount}
                  onChange={(e) => setCommitmentAmount(e.target.value)}
                  className="pl-7"
                  placeholder="0"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="drawn">Drawn Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <Input
                  id="drawn"
                  type="number"
                  value={drawnAmount}
                  onChange={(e) => setDrawnAmount(e.target.value)}
                  className="pl-7"
                  placeholder="0"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>

          {/* Loan Details (conditional on type) */}
          {type === 'loan' && (
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="loanNumber">Loan Number</Label>
                <Input
                  id="loanNumber"
                  value={loanNumber}
                  onChange={(e) => setLoanNumber(e.target.value)}
                  placeholder="Reference #"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="interestRate">Interest Rate (%)</Label>
                <Input
                  id="interestRate"
                  type="number"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  max="100"
                  step="0.001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maturityDate">Maturity Date</Label>
                <Input
                  id="maturityDate"
                  type="date"
                  value={maturityDate}
                  onChange={(e) => setMaturityDate(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional details about this funding source"
              rows={3}
            />
          </div>

          {/* Active toggle (edit mode only) */}
          {initialData && (
            <div className="flex items-center gap-2 pt-4 border-t">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="isActive" className="font-normal">
                Funding source is active
              </Label>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 mt-6">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || !isValid}>
          {isSubmitting ? 'Saving...' : initialData ? 'Save Changes' : 'Add Funding Source'}
        </Button>
      </div>
    </form>
  );
}
