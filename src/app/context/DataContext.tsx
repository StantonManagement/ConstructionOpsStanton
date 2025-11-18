'use client';

import React, { createContext, useContext, useReducer, Dispatch, useEffect, useMemo, useCallback, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
// Removed caching imports to fix refresh issues

export interface Project {
  id: number;
  name: string;
  client_name: string;
  current_phase: string;
  daysToInspection: number;
  atRisk: boolean;
  budget: number;
  spent: number;
  permits: { [key: string]: string };
}

export interface Subcontractor {
  id: number;
  name: string;
  trade: string;
  contractAmount: number;
  paidToDate: number;
  lastPayment: string;
  status: string;
  changeOrdersPending: boolean;
  lineItemCount: number;
  phone: string;
  email?: string;
  hasOpenPaymentApp: boolean;
  compliance: { insurance: string; license: string };
}

export interface PaymentApplications {
  awaitingSMS: Array<{ id: number; contractor: string; project: string; daysOverdue: number; amount: number }>;
  pmReview: Array<{ id: number; contractor: string; project: string; submittedAmount: number; photosNeeded?: boolean; photosSubmitted?: boolean }>;
  checkReady: Array<{ id: number; contractor: string; project: string; amount: number; lienWaiverNeeded?: boolean; lienWaiverSigned?: boolean }>;
}

export interface Contract {
  id: number;
  project_id: number;
  subcontractor_id: number;
  contract_amount: number;
  contract_nickname?: string;
  start_date: string;
  end_date?: string;
  status?: string;
  project?: Project;
  subcontractor?: Subcontractor;
}

export interface DataContextType {
  projects: Project[];
  subcontractors: Subcontractor[];
  contracts: Contract[];
  paymentApplications: PaymentApplications;
  dispatch: Dispatch<{ type: string; payload?: unknown }>;
  refreshData: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

type InitialDataType = {
  projects: Project[];
  subcontractors: Subcontractor[];
  contracts: Contract[];
  paymentApplications: PaymentApplications;
};

const initialData: InitialDataType = {
  paymentApplications: {
    awaitingSMS: [],
    pmReview: [],
    checkReady: []
  },
  subcontractors: [],
  projects: [],
  contracts: []
};

type ContractorDB = {
  id: number;
  name: string;
  trade: string;
  phone: string;
  email?: string;
  status?: string;
  performance_score?: number;
  created_at?: string;
  updated_at?: string;
};

function dataReducer(state: InitialDataType, action: { type: string; payload?: unknown }) {
  switch (action.type) {
    case 'ADD_PROJECT': {
      const payload = action.payload as Project;
      // Use the actual project data from database (with real ID)
      return {
        ...state,
        projects: [
          ...state.projects,
          {
            id: payload.id, // Use real DB ID
            name: payload.name,
            client_name: payload.client_name,
            current_phase: payload.current_phase,
            daysToInspection: payload.daysToInspection ?? 0,
            atRisk: payload.atRisk ?? false,
            budget: payload.budget ?? 0,
            spent: payload.spent ?? 0,
            permits: payload.permits ?? {},
          },
        ],
      };
    }
    case 'UPDATE_PROJECT': {
      const payload = action.payload as Project;
      return {
        ...state,
        projects: state.projects.map(p => 
          p.id === payload.id ? payload : p
        )
      };
    }
    case 'DELETE_PROJECT':
      return {
        ...state,
        projects: state.projects.filter(p => p.id !== action.payload)
      };
    case 'SET_PROJECTS': {
      return {
        ...state,
        projects: action.payload as Project[],
      };
    }
    case 'ADD_SUBCONTRACTOR': {
      const payload = action.payload as Subcontractor;
      // Use the actual subcontractor data from database (with real ID)
      return {
        ...state,
        subcontractors: [
          ...state.subcontractors,
          {
            id: payload.id, // Use real DB ID
            name: payload.name,
            trade: payload.trade,
            phone: payload.phone,
            contractAmount: payload.contractAmount ?? 0,
            paidToDate: payload.paidToDate ?? 0,
            lastPayment: payload.lastPayment ?? '',
            status: payload.status ?? 'active',
            changeOrdersPending: payload.changeOrdersPending ?? false,
            lineItemCount: payload.lineItemCount ?? 0,
            hasOpenPaymentApp: payload.hasOpenPaymentApp ?? false,
            compliance: payload.compliance ?? { insurance: 'valid', license: 'valid' },
          },
        ],
      };
    }
    case 'SEND_SMS_REMINDER': {
      const payload = action.payload as { contractor: string; project: string };
      console.log(`API CALL (mock): Sending SMS to ${payload.contractor} for project ${payload.project}`);
      return state;
    }
    case 'SET_SUBCONTRACTORS': {
      return {
        ...state,
        subcontractors: action.payload as Subcontractor[],
      };
    }
    case 'DELETE_SUBCONTRACTOR':
      return {
        ...state,
        subcontractors: state.subcontractors.filter(s => s.id !== action.payload)
      };
    case 'SET_CONTRACTS': {
      return {
        ...state,
        contracts: action.payload as Contract[],
      };
    }
    case 'DELETE_CONTRACT':
      return {
        ...state,
        contracts: state.contracts.filter(contract => contract.id !== action.payload)
      };
    case 'REFRESH_DATA':
      // This will trigger a re-fetch via useEffect
      return state;
    default:
      return state;
  }
}

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(dataReducer, initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Internal data fetching function using API
  const performDataFetch = useCallback(async (shouldSetLoading = true) => {
    if (shouldSetLoading) {
      setLoading(true);
    }
    setError(null); // Clear previous errors
    
    try {
      console.log('[DataContext] Fetching data from API...');
      const startTime = Date.now();

      // Get auth token for API call
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      // Single API call to fetch all data
      const response = await fetch('/api/dashboard/data-context', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        let errorMessage = 'Failed to load dashboard data';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage = `${errorMessage} (${response.status}: ${response.statusText})`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      const fetchTime = Date.now() - startTime;
      console.log(`[DataContext] Data loaded in ${fetchTime}ms`);

      if (!result.success || !result.data) {
        throw new Error('Invalid API response');
      }

      const { projects, subcontractors, contracts, paymentApplications } = result.data;

      // Dispatch data to state
      dispatch({ type: 'SET_PROJECTS', payload: projects || [] });
      dispatch({ type: 'SET_SUBCONTRACTORS', payload: subcontractors || [] });
      dispatch({ type: 'SET_CONTRACTS', payload: contracts || [] });
      // paymentApplications are included in the API response but not currently used by DataContext

      console.log(`[DataContext] ✓ Loaded ${projects?.length || 0} projects, ${subcontractors?.length || 0} contractors, ${contracts?.length || 0} contracts`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('[DataContext] ❌ Error during data fetch:', error);
      
      // Set error state for UI to display
      setError(errorMessage);
      
      // Set empty arrays on error
      dispatch({ type: 'SET_PROJECTS', payload: [] });
      dispatch({ type: 'SET_SUBCONTRACTORS', payload: [] });
      dispatch({ type: 'SET_CONTRACTS', payload: [] });
    } finally {
      // Always clear loading state, even on error or timeout
      console.log('[DataContext] Setting loading to false');
      if (shouldSetLoading) {
        setLoading(false);
      }
    }
  }, []);

  // Initial data fetch with loading state
  const fetchAllData = useCallback(async () => {
    await performDataFetch(true);
  }, [performDataFetch]);

  // Refresh data without showing loading state
  const refreshData = useCallback(async () => {
    await performDataFetch(false);
  }, [performDataFetch]);

  // Initialize data on mount - only once
  useEffect(() => {
    fetchAllData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run ONLY on mount, ignore fetchAllData changes

  // Memoize context value to prevent unnecessary re-renders
  const value: DataContextType = useMemo(() => ({
    ...state,
    dispatch,
    refreshData,
    loading,
    error,
  }), [state, refreshData, loading, error]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};