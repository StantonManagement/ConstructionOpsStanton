'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { DataTable, Column } from '@/components/ui/DataTable';
import { SignalBadge } from '@/components/ui/SignalBadge';
import { Warranty, WarrantyFilters, ExpiringWarrantySummary } from '@/types/warranties';
import WarrantyFormModal from './WarrantyFormModal';

export default function WarrantiesList() {
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [summary, setSummary] = useState<ExpiringWarrantySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState<WarrantyFilters>({
    status: 'active',
  });

  const fetchWarranties = async () => {
    try {
      setLoading(true);
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) return;

      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      // API endpoint for warranties
      const response = await fetch(`/api/warranties?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setWarranties(result.data.warranties || []);
        setSummary(result.data.summary || null);
      }
    } catch (error) {
      console.error('Error fetching warranties:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarranties();
  }, [filters]);

  const getDaysUntilExpirationColor = (days: number | undefined) => {
    if (days === undefined) return 'text-gray-500';
    if (days < 0) return 'text-red-600 font-bold';
    if (days <= 30) return 'text-red-500 font-medium';
    if (days <= 60) return 'text-orange-500 font-medium';
    if (days <= 90) return 'text-yellow-600 font-medium';
    return 'text-green-600';
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-primary">
            <div className="text-sm font-medium text-gray-500">Active Warranties</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{summary.total_active}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
            <div className="text-sm font-medium text-gray-500">Expiring (30 Days)</div>
            <div className="text-2xl font-bold text-red-600 mt-1">{summary.expiring_30_days}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-400">
            <div className="text-sm font-medium text-gray-500">Expiring (60 Days)</div>
            <div className="text-2xl font-bold text-orange-600 mt-1">{summary.expiring_60_days}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-gray-400">
            <div className="text-sm font-medium text-gray-500">Recently Expired</div>
            <div className="text-2xl font-bold text-gray-600 mt-1">{summary.expired_recently}</div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Search warranties..."
            value={filters.search || ''}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-primary w-64"
          />
          <select
            value={filters.status || ''}
            onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-primary"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="expired">Expired</option>
          </select>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          + Add Warranty
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading warranties...</div>
        ) : (
          <DataTable<Warranty>
            data={warranties}
            columns={[
              { header: 'Project', accessor: 'project_name' as keyof Warranty },
              { header: 'Contractor', accessor: 'contractor_name' as keyof Warranty },
              { header: 'Type', accessor: 'warranty_type' as keyof Warranty },
              { 
                header: 'Status', 
                accessor: (row: Warranty) => (
                  <SignalBadge status={
                    row.status === 'active' ? 'success' :
                    row.status === 'expired' ? 'critical' :
                    row.status === 'pending' ? 'warning' : 'neutral'
                  }>
                    {row.status}
                  </SignalBadge>
                )
              },
              { 
                header: 'Expiration', 
                accessor: (row: Warranty) => (
                  <div className={getDaysUntilExpirationColor(row.days_until_expiration)}>
                    {new Date(row.end_date).toLocaleDateString()}
                    {row.days_until_expiration !== undefined && (
                      <span className="text-xs ml-2">
                        ({row.days_until_expiration > 0 ? `${row.days_until_expiration} days` : 'Expired'})
                      </span>
                    )}
                  </div>
                )
              },
              {
                header: 'Actions',
                align: 'right',
                accessor: () => (
                  <button className="text-primary hover:text-primary/80 text-sm font-medium">View</button>
                )
              }
            ] as Column<Warranty>[]}
            emptyMessage="No warranties found matching your filters."
          />
        )}
      </div>

      {showForm && (
        <WarrantyFormModal
          onClose={() => setShowForm(false)}
          onSuccess={() => fetchWarranties()}
        />
      )}
    </div>
  );
}



