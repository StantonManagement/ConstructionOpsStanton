'use client';

import React, { createContext, useContext, useReducer, Dispatch, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

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
    awaitingSMS: [
      { id: 1, contractor: 'ABC Electric', project: 'Highland Plaza Renovation', daysOverdue: 2, amount: 12500 },
      { id: 2, contractor: 'Metro Plumbing', project: 'Oak Street Apartments', daysOverdue: 0, amount: 8900 },
    ],
    pmReview: [
      { id: 4, contractor: 'Drywall Pro', project: 'Highland Plaza Renovation', submittedAmount: 8500, photosNeeded: true },
      { id: 5, contractor: 'Paint Company', project: 'Oak Street Apartments', submittedAmount: 6200, photosSubmitted: true }
    ],
    checkReady: [
      { id: 6, contractor: 'Flooring Plus', project: 'Highland Plaza Renovation', amount: 4200, lienWaiverNeeded: false },
      { id: 7, contractor: 'HVAC Services', project: 'Oak Street Apartments', amount: 12800, lienWaiverNeeded: true, lienWaiverSigned: true }
    ]
  },
  subcontractors: [
    { id: 1, name: 'ABC Electric', trade: 'Electrical', contractAmount: 125000, paidToDate: 87500, lastPayment: '2025-02-15', status: 'active', changeOrdersPending: true, lineItemCount: 4, phone: '(555) 123-4567', hasOpenPaymentApp: false, compliance: { insurance: 'valid', license: 'valid'} },
    { id: 2, name: 'Metro Plumbing', trade: 'Plumbing', contractAmount: 98000, paidToDate: 65000, lastPayment: '2025-02-10', status: 'active', changeOrdersPending: false, lineItemCount: 3, phone: '(555) 234-5678', hasOpenPaymentApp: true, compliance: { insurance: 'expiring', license: 'valid'} },
    { id: 3, name: 'Drywall Pro', trade: 'Drywall', contractAmount: 45000, paidToDate: 36000, lastPayment: '2025-01-28', status: 'nearing_completion', changeOrdersPending: false, lineItemCount: 2, phone: '(555) 345-6789', hasOpenPaymentApp: false, compliance: { insurance: 'valid', license: 'invalid'} },
  ],
  projects: [
    { id: 1, name: 'Highland Plaza Renovation', client_name: 'Metro Development', current_phase: 'Electrical Rough-in', daysToInspection: 3, atRisk: true, budget: 500000, spent: 375000, permits: { electrical: 'approved', plumbing: 'pending' } },
    { id: 2, name: 'Oak Street Apartments', client_name: 'City Housing', current_phase: 'Finish Work', daysToInspection: 7, atRisk: false, budget: 1200000, spent: 950000, permits: { electrical: 'approved', plumbing: 'approved' } },
  ],
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
    case 'SET_CONTRACTS': {
      return {
        ...state,
        contracts: action.payload as Contract[],
      };
    }
    default:
      return state;
  }
}

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(dataReducer, initialData);

  useEffect(() => {
    const fetchProjects = async () => {
      const { data } = await supabase.from('projects').select('*');
      if (data) {
        dispatch({ type: 'SET_PROJECTS', payload: data });
      }
    };
    fetchProjects();
  }, []);

  useEffect(() => {
    const fetchSubcontractors = async () => {
      const { data } = await supabase.from('contractors').select('*');
      if (data) {
        // Map DB fields to Subcontractor interface as needed
        const mapped = data.map((c: ContractorDB) => ({
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
          compliance: { insurance: c.insurance_status ?? 'valid', license: c.license_status ?? 'valid' },
        }));
        dispatch({ type: 'SET_SUBCONTRACTORS', payload: mapped });
      }
    };
    fetchSubcontractors();
  }, []);

  useEffect(() => {
    const fetchContracts = async () => {
      const { data } = await supabase
        .from('contracts')
        .select(`
          *,
          projects (id, name, client_name),
          contractors (id, name, trade)
        `);
      if (data) {
        const mapped = data.map((c: any) => ({
          id: c.id,
          project_id: c.project_id,
          subcontractor_id: c.subcontractor_id,
          contract_amount: c.contract_amount,
          start_date: c.start_date,
          end_date: c.end_date,
          status: c.status ?? 'active',
          project: c.projects,
          subcontractor: c.contractors,
        }));
        dispatch({ type: 'SET_CONTRACTS', payload: mapped });
      }
    };
    fetchContracts();
  }, []);

  const value: DataContextType = {
    ...state,
    dispatch,
  };

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