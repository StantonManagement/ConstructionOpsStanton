'use client';

import React, { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/theme';
import { ProjectCashFlow } from '@/lib/cashflow';
import { supabase } from '@/lib/supabaseClient';
import { TrendingUp, AlertTriangle, Clock, DollarSign } from 'lucide-react';

interface CashFlowViewProps {
  projectId: number;
}

export default function CashFlowView({ projectId }: CashFlowViewProps) {
  const [data, setData] = useState<ProjectCashFlow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const { data: session } = await supabase.auth.getSession();
        const token = session?.session?.access_token;
        if (!token) return;

        const res = await fetch(`/api/projects/${projectId}/cash-flow`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error('Failed to fetch cash flow data');
        
        const result = await res.json();
        if (result.success) {
          setData(result.data);
        } else {
          throw new Error(result.error || 'Unknown error');
        }
      } catch (e: any) {
        console.error(e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId]);

  if (loading) return <div className="p-12 text-center">Loading cash flow projection...</div>;
  if (error) return <div className="p-12 text-center text-red-500">Error: {error}</div>;
  if (!data) return <div className="p-12 text-center">No data available</div>;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="text-sm text-gray-500 mb-1">Current Balance</div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(data.summary.currentBalance)}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="text-sm text-gray-500 mb-1">4-Week Net Flow</div>
          <div className={`text-2xl font-bold ${data.summary.netCashFlow4Weeks >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(data.summary.netCashFlow4Weeks)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="text-sm text-gray-500 mb-1">Pending Draws</div>
          <div className="text-2xl font-bold text-primary flex items-center gap-2">
            {formatCurrency(data.summary.pendingDraws)}
            <Clock className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
        <div className={`p-4 rounded-lg border shadow-sm ${data.summary.projectedLowBalance < 0 ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
          <div className="text-sm text-gray-500 mb-1">Projected Low (8wks)</div>
          <div className={`text-2xl font-bold ${data.summary.projectedLowBalance < 0 ? 'text-red-600' : 'text-gray-900'} flex items-center gap-2`}>
            {formatCurrency(data.summary.projectedLowBalance)}
            {data.summary.projectedLowBalance < 0 && <AlertTriangle className="w-5 h-5 text-red-500" />}
          </div>
        </div>
      </div>

      {data.summary.projectedLowBalance < 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 text-red-800">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-medium">Warning: Negative balance projected. Consider requesting a draw or delaying payments.</span>
        </div>
      )}

      {/* Projection Table */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50 font-semibold">Weekly Projection</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="p-3">Week Of</th>
                <th className="p-3 text-right">Pay Apps</th>
                <th className="p-3 text-right">Sched. Work</th>
                <th className="p-3 text-right font-semibold text-gray-900">Total Out</th>
                <th className="p-3 text-right text-primary">Draws In</th>
                <th className="p-3 text-right font-bold">Net Change</th>
                <th className="p-3 text-right font-bold">End Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.weeks.map((week, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="p-3 font-medium text-gray-900">
                    {new Date(week.weekStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="p-3 text-right text-red-500">
                    {week.outflows.paymentApps > 0 ? `-${formatCurrency(week.outflows.paymentApps)}` : '-'}
                  </td>
                  <td className="p-3 text-right text-orange-500 italic">
                    {week.outflows.scheduledWork > 0 ? `-${formatCurrency(week.outflows.scheduledWork)}` : '-'}
                  </td>
                  <td className="p-3 text-right font-semibold text-red-600 bg-red-50/50">
                    {week.outflows.total > 0 ? `-${formatCurrency(week.outflows.total)}` : '-'}
                  </td>
                  <td className="p-3 text-right text-primary font-medium">
                    {week.inflows.draws > 0 ? `+${formatCurrency(week.inflows.draws)}` : '-'}
                  </td>
                  <td className={`p-3 text-right font-bold ${week.netCashFlow > 0 ? 'text-green-600' : week.netCashFlow < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                    {week.netCashFlow > 0 ? '+' : ''}{formatCurrency(week.netCashFlow)}
                  </td>
                  <td className={`p-3 text-right font-bold ${week.runningBalance < 0 ? 'text-red-600 bg-red-50' : 'text-gray-900'}`}>
                    {formatCurrency(week.runningBalance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

