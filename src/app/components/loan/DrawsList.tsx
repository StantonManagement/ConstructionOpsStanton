import React, { useState } from 'react';
import { LoanDraw } from '@/types/loan';
import { formatCurrency } from '@/lib/theme';
import { Eye, CheckCircle, XCircle, Clock } from 'lucide-react';
import { SignalBadge } from '@/components/ui/SignalBadge';

interface DrawsListProps {
  draws: LoanDraw[];
  onViewDraw: (draw: LoanDraw) => void;
  onUpdateStatus: (drawId: number, status: string) => void;
}

export const DrawsList: React.FC<DrawsListProps> = ({ draws, onViewDraw, onUpdateStatus }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h3 className="font-bold text-gray-900">Draw Requests</h3>
      </div>
      
      {draws.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          No draws requested yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 font-medium">
              <tr>
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Requested</th>
                <th className="px-4 py-3 text-left">Amount</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Funded</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {draws.map(draw => (
                <tr key={draw.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">#{draw.draw_number}</td>
                  <td className="px-4 py-3">{draw.request_date}</td>
                  <td className="px-4 py-3 font-medium">{formatCurrency(draw.amount_requested)}</td>
                  <td className="px-4 py-3">
                    <SignalBadge status={
                      draw.status === 'funded' ? 'success' :
                      draw.status === 'approved' ? 'neutral' : // Use neutral for approved (blueish typically)
                      draw.status === 'rejected' ? 'critical' : 'warning'
                    }>
                      {draw.status}
                    </SignalBadge>
                  </td>
                  <td className="px-4 py-3">{draw.funded_date || '-'}</td>
                  <td className="px-4 py-3 text-center flex justify-center gap-2">
                    <button 
                      onClick={() => onViewDraw(draw)}
                      className="p-1 text-gray-500 hover:text-primary rounded"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {draw.status === 'pending' && (
                      <button 
                        onClick={() => onUpdateStatus(draw.id, 'approved')}
                        className="p-1 text-gray-500 hover:text-green-600 rounded"
                        title="Approve"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                    {draw.status === 'approved' && (
                      <button 
                        onClick={() => onUpdateStatus(draw.id, 'funded')}
                        className="p-1 text-gray-500 hover:text-green-600 rounded"
                        title="Mark Funded"
                      >
                        <DollarSignIcon className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const DollarSignIcon = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);


