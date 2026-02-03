import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { LoanDetailsCard } from './LoanDetailsCard';
import { LoanBudgetTable } from './LoanBudgetTable';
import { DrawsList } from './DrawsList';
import { DrawRequestModal } from './DrawRequestModal';
import EditLoanModal from './EditLoanModal';
import { ConstructionLoan, LoanBudgetItem, LoanDraw } from '@/types/loan';
import { Loader2, Plus, AlertCircle } from 'lucide-react';

// Updated to accept both number and string for Project.id type compatibility
interface LoanBudgetViewProps {
  projectId: number | string;
}

export default function LoanBudgetView({ projectId }: LoanBudgetViewProps) {
  const numericProjectId = typeof projectId === 'string' ? Number(projectId) : projectId;
  const [loading, setLoading] = useState(true);
  const [loan, setLoan] = useState<ConstructionLoan | null>(null);
  const [budgetItems, setBudgetItems] = useState<LoanBudgetItem[]>([]);
  const [draws, setDraws] = useState<LoanDraw[]>([]);
  const [showDrawModal, setShowDrawModal] = useState(false);
  const [showCreateLoan, setShowCreateLoan] = useState(false);
  const [showEditLoanModal, setShowEditLoanModal] = useState(false);

  // New Loan Form State
  const [newLoanData, setNewLoanData] = useState({
    lender_name: '',
    loan_number: '',
    total_amount: 0
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) return;

      // Fetch Loan & Budget
      try {
        const res = await fetch(`/api/projects/${numericProjectId}/loan`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
             if(res.status === 404) {
                 setLoan(null);
                 return;
             }
             throw new Error('Failed to fetch loan');
        }
        const data = await res.json();

        if (data.success) {
            setLoan(data.data.loan);
            setBudgetItems(data.data.budgetItems || []);

            if (data.data.loan) {
            // Fetch Draws
            const drawsRes = await fetch(`/api/loans/${data.data.loan.id}/draws`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const drawsData = await drawsRes.json();
            if (drawsData.success) {
                setDraws(drawsData.data.draws);
            }
            }
        }
      } catch(err) {
          console.error("Loan fetch error", err);
          // Don't set global error state to block UI, just log
      }
    } catch (e) {
      console.error('Error fetching loan data:', e);
    } finally {
      setLoading(false);
    }
  }, [numericProjectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch(`/api/projects/${numericProjectId}/loan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newLoanData)
      });

      if (res.ok) {
        setShowCreateLoan(false);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateLoan = async (updatedLoan: Partial<ConstructionLoan>) => {
    if (!loan) return;
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch(`/api/projects/${numericProjectId}/loan`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(updatedLoan)
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to update loan');
      }

      fetchData();
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const handleSaveItem = async (item: Partial<LoanBudgetItem>) => {
    if (!loan) return;
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      await fetch(`/api/loans/${loan.id}/budget-items`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ items: [item] })
      });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleBulkCreate = async (items: Partial<LoanBudgetItem>[]) => {
    if (!loan) return;
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      await fetch(`/api/loans/${loan.id}/budget-items`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ items })
      });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleLockBudget = async () => {
    if (!loan || !confirm('Are you sure you want to lock the original budget? This cannot be undone.')) return;
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      await fetch(`/api/loans/${loan.id}/lock`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateDraw = async (drawData: any) => {
    if (!loan) return;
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      await fetch(`/api/loans/${loan.id}/draws`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(drawData)
      });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateDrawStatus = async (drawId: number, status: string) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      await fetch(`/api/loan-draws/${drawId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ status })
      });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>;
  }

  if (!loan) {
    if (showCreateLoan) {
      return (
        <div className="max-w-md mx-auto bg-white p-6 rounded-lg border shadow-sm">
          <h2 className="text-xl font-bold mb-4">Setup Construction Loan</h2>
          <form onSubmit={handleCreateLoan} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Lender Name</label>
              <input 
                required
                className="w-full border rounded px-3 py-2"
                value={newLoanData.lender_name}
                onChange={e => setNewLoanData({...newLoanData, lender_name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Loan Number</label>
              <input 
                className="w-full border rounded px-3 py-2"
                value={newLoanData.loan_number}
                onChange={e => setNewLoanData({...newLoanData, loan_number: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Total Amount ($)</label>
              <input 
                type="number"
                required
                className="w-full border rounded px-3 py-2"
                value={newLoanData.total_amount}
                onChange={e => setNewLoanData({...newLoanData, total_amount: Number(e.target.value)})}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button 
                type="button" 
                onClick={() => setShowCreateLoan(false)}
                className="flex-1 px-4 py-2 border rounded"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="flex-1 px-4 py-2 bg-primary text-white rounded"
              >
                Create Loan
              </button>
            </div>
          </form>
        </div>
      );
    }

    return (
      <div className="p-12 text-center bg-gray-50 rounded-lg border border-dashed">
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Loan Configured</h3>
        <p className="text-gray-500 mb-6">Set up a construction loan to track draws and budget.</p>
        <button
          onClick={() => setShowCreateLoan(true)}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Setup Loan
        </button>
      </div>
    );
  }

  const totalDrawn = budgetItems.reduce((sum, item) => sum + Number(item.drawn_amount), 0);
  const isLocked = budgetItems.some(item => !!item.locked_at);

  return (
    <div className="space-y-6">
      <LoanDetailsCard 
        loan={loan} 
        totalDrawn={totalDrawn}
        onLockBudget={handleLockBudget}
        isBudgetLocked={isLocked}
        onEdit={() => setShowEditLoanModal(true)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <LoanBudgetTable 
            items={budgetItems} 
            isLocked={isLocked}
            onSaveItem={handleSaveItem}
            onBulkCreate={handleBulkCreate}
          />
        </div>
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-900">Draws</h3>
            <button 
              onClick={() => setShowDrawModal(true)}
              className="text-sm bg-primary/10 text-primary px-3 py-1.5 rounded hover:bg-primary/20 font-medium"
            >
              + Request Draw
            </button>
          </div>
          <DrawsList 
            draws={draws} 
            onViewDraw={(draw) => console.log(draw)}
            onUpdateStatus={handleUpdateDrawStatus}
          />
        </div>
      </div>

      {showDrawModal && (
        <DrawRequestModal
          budgetItems={budgetItems}
          onClose={() => setShowDrawModal(false)}
          onSubmit={handleCreateDraw}
        />
      )}

      {showEditLoanModal && (
        <EditLoanModal
          loan={loan}
          isOpen={showEditLoanModal}
          onClose={() => setShowEditLoanModal(false)}
          onSave={handleUpdateLoan}
        />
      )}
    </div>
  );
}
