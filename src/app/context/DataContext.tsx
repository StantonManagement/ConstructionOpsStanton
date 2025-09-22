'use client';

import React, { createContext, useContext, useReducer, Dispatch, useEffect, useMemo } from 'react';
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
  contract_amount?: number;
  paid_to_date?: number;
  last_payment?: string;
  status?: string;
  change_orders_pending?: boolean;
  line_item_count?: number;
  phone?: string;
  email?: string;
  has_open_payment_app?: boolean;
  insurance_status?: string;
  license_status?: string;
  performance_score?: number;
};

function dataReducer(state: InitialDataType, action: { type: string; payload?: unknown }) {
  switch (action.type) {
    case 'ADD_PROJECT': {
      const payload = action.payload as {
        name: string;
        client_name: string;
        current_phase: string;
        daysToInspection?: number;
        atRisk?: boolean;
        budget?: number;
        spent?: number;
        permits?: { [key: string]: string };
      };
      return {
        ...state,
        projects: [
          ...state.projects,
          {
            id: state.projects.length + 1,
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
      const payload = action.payload as {
        name: string;
        trade: string;
        phone: string;
        contractAmount?: number;
        paidToDate?: number;
        lastPayment?: string;
        status?: string;
        changeOrdersPending?: boolean;
        lineItemCount?: number;
        hasOpenPaymentApp?: boolean;
        compliance?: { insurance: string; license: string };
      };
      return {
        ...state,
        subcontractors: [
          ...state.subcontractors,
          {
            id: state.subcontractors.length + 1,
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
    default:
      return state;
  }
}

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(dataReducer, initialData);

  // Simple data fetching without caching or complex timeouts
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        // Simple Promise.all without timeouts that cause issues
        const [projectsResponse, contractorsResponse, contractsResponse] = await Promise.all([
          supabase.from('projects').select('*'),
          supabase.from('contractors').select('*'),
          supabase
            .from('contracts')
            .select(`
              *,
              projects (id, name, client_name),
              contractors (id, name, trade)
            `)
        ]);

        // Handle projects
        if (projectsResponse.data) {
          dispatch({ type: 'SET_PROJECTS', payload: projectsResponse.data });
        }

        // Handle contractors
        if (contractorsResponse.data && !contractorsResponse.error) {
          const mapped = contractorsResponse.data.map((c: ContractorDB) => ({
            id: c.id,
            name: c.name,
            trade: c.trade,
            contractAmount: c.contract_amount ?? 0,
            paidToDate: c.paid_to_date ?? 0,
            lastPayment: c.last_payment ?? '',
            status: c.status ?? 'active',
            changeOrdersPending: c.change_orders_pending ?? false,
            lineItemCount: c.line_item_count ?? 0,
            phone: c.phone ?? '',
            email: c.email ?? '',
            hasOpenPaymentApp: c.has_open_payment_app ?? false,
            compliance: { 
              insurance: c.insurance_status ?? 'valid', 
              license: c.license_status ?? 'valid' 
            },
          }));
          dispatch({ type: 'SET_SUBCONTRACTORS', payload: mapped });
        }

        // Handle contracts
        if (contractsResponse.data && !contractsResponse.error) {
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

        // Log any errors
        if (contractorsResponse.error) {
          console.error('Error fetching contractors:', contractorsResponse.error);
        }
        if (contractsResponse.error) {
          console.error('Error fetching contracts:', contractsResponse.error);
        }

      } catch (error) {
        console.error('Error fetching data:', error);
        // Set empty arrays on error
        dispatch({ type: 'SET_PROJECTS', payload: [] });
        dispatch({ type: 'SET_SUBCONTRACTORS', payload: [] });
        dispatch({ type: 'SET_CONTRACTS', payload: [] });
      }
    };

    fetchAllData();
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const value: DataContextType = useMemo(() => ({
    ...state,
    dispatch,
  }), [state]);

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