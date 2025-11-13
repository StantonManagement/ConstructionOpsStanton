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

  // Timeout wrapper to prevent infinite hangs
  const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number, queryName: string): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Query timeout: ${queryName} took longer than ${timeoutMs}ms`)), timeoutMs)
      ),
    ]);
  };

  // Internal data fetching function
  const performDataFetch = async (shouldSetLoading = true) => {
    if (shouldSetLoading) {
      setLoading(true);
    }
    setError(null); // Clear previous errors
    
    try {
      console.log('[DataContext] Starting data fetch...');
      const startTime = performance.now();
      
      // Fetch with individual timeouts and detailed logging
      console.log('[DataContext] Fetching projects...');
      const projectsQuery = Promise.resolve(supabase.from('projects').select('*'));
      
      console.log('[DataContext] Fetching contractors...');
      const contractorsQuery = Promise.resolve(supabase.from('contractors').select('*'));
      
      console.log('[DataContext] Fetching contracts...');
      const contractsQuery = Promise.resolve(
        supabase
          .from('project_contractors')
          .select(`
            *,
            projects (id, name, client_name),
            contractors (id, name, trade)
          `)
      );
      
      const [projectsResponse, contractorsResponse, contractsResponse] = await Promise.all([
        withTimeout(projectsQuery, 10000, 'projects'),
        withTimeout(contractorsQuery, 10000, 'contractors'),
        withTimeout(contractsQuery, 10000, 'contracts')
      ]) as any[];
      
      const fetchTime = performance.now() - startTime;
      console.log(`[DataContext] Data fetch completed in ${fetchTime.toFixed(0)}ms`);

        // Handle projects with proper error checking
        if (projectsResponse.error) {
          console.error('[DataContext] ❌ Error fetching projects:', {
            code: projectsResponse.error.code,
            message: projectsResponse.error.message,
            details: projectsResponse.error.details,
            hint: projectsResponse.error.hint
          });
          dispatch({ type: 'SET_PROJECTS', payload: [] });
        } else if (projectsResponse.data) {
          console.log(`[DataContext] ✓ Fetched ${projectsResponse.data.length} projects`);
          dispatch({ type: 'SET_PROJECTS', payload: projectsResponse.data });
        }

        // Handle contractors
        if (contractorsResponse.error) {
          console.error('[DataContext] ❌ Error fetching contractors:', {
            code: contractorsResponse.error.code,
            message: contractorsResponse.error.message,
            details: contractorsResponse.error.details,
            hint: contractorsResponse.error.hint
          });
          dispatch({ type: 'SET_SUBCONTRACTORS', payload: [] });
        } else if (contractorsResponse.data) {
          console.log(`[DataContext] ✓ Fetched ${contractorsResponse.data.length} contractors`);
          const mapped = contractorsResponse.data.map((c: ContractorDB) => ({
            id: c.id,
            name: c.name,
            trade: c.trade,
            contractAmount: 0,
            paidToDate: 0,
            lastPayment: '',
            status: c.status ?? 'active',
            changeOrdersPending: false,
            lineItemCount: 0,
            phone: c.phone ?? '',
            email: c.email ?? '',
            hasOpenPaymentApp: false,
            compliance: {
              insurance: 'valid',
              license: 'valid'
            },
          }));
          dispatch({ type: 'SET_SUBCONTRACTORS', payload: mapped });
        }

        // Handle contracts
        if (contractsResponse.error) {
          console.error('[DataContext] ❌ Error fetching contracts:', {
            code: contractsResponse.error.code,
            message: contractsResponse.error.message,
            details: contractsResponse.error.details,
            hint: contractsResponse.error.hint
          });
          // If relationship error, provide helpful message
          if (contractsResponse.error.message?.includes('relationship') || 
              contractsResponse.error.message?.includes('Could not find a relationship')) {
            console.warn('[DataContext] 💡 Relationship query failed. Run scripts/check-and-fix-relationships.sql in Supabase SQL Editor.');
          }
          dispatch({ type: 'SET_CONTRACTS', payload: [] });
        } else if (contractsResponse.data) {
          console.log(`[DataContext] ✓ Fetched ${contractsResponse.data.length} contracts`);
          const mapped = contractsResponse.data.map((c: any) => ({
            id: c.id,
            project_id: c.project_id,
            subcontractor_id: c.subcontractor_id,
            contract_amount: c.contract_amount,
            contract_nickname: c.contract_nickname,
            start_date: c.start_date,
            end_date: c.end_date,
            status: c.status ?? 'active',
            project: c.projects,
            subcontractor: c.contractors,
          }));
          dispatch({ type: 'SET_CONTRACTS', payload: mapped });
        }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('[DataContext] ❌ Critical error during data fetch:', error);
      
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
  };

  // Initial data fetch with loading state
  const fetchAllData = useCallback(async () => {
    await performDataFetch(true);
  }, []);

  // Refresh data without showing loading state
  const refreshData = useCallback(async () => {
    await performDataFetch(false);
  }, []);

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