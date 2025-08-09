
'use client';

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Project, Contractor, PaymentApplication, DailyLog } from '@/types';

// State interface
interface DataState {
  projects: Project[];
  contractors: Contractor[];
  paymentApplications: PaymentApplication[];
  dailyLogs: DailyLog[];
  loading: boolean;
  error: string | null;
}

// Action types
type DataAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_PROJECTS'; payload: Project[] }
  | { type: 'ADD_PROJECT'; payload: Project }
  | { type: 'UPDATE_PROJECT'; payload: Project }
  | { type: 'DELETE_PROJECT'; payload: string }
  | { type: 'SET_CONTRACTORS'; payload: Contractor[] }
  | { type: 'ADD_CONTRACTOR'; payload: Contractor }
  | { type: 'UPDATE_CONTRACTOR'; payload: Contractor }
  | { type: 'DELETE_CONTRACTOR'; payload: string }
  | { type: 'SET_PAYMENT_APPLICATIONS'; payload: PaymentApplication[] }
  | { type: 'ADD_PAYMENT_APPLICATION'; payload: PaymentApplication }
  | { type: 'UPDATE_PAYMENT_APPLICATION'; payload: PaymentApplication }
  | { type: 'DELETE_PAYMENT_APPLICATION'; payload: string }
  | { type: 'SET_DAILY_LOGS'; payload: DailyLog[] }
  | { type: 'ADD_DAILY_LOG'; payload: DailyLog }
  | { type: 'UPDATE_DAILY_LOG'; payload: DailyLog }
  | { type: 'DELETE_DAILY_LOG'; payload: string };

// Initial state
const initialState: DataState = {
  projects: [],
  contractors: [],
  paymentApplications: [],
  dailyLogs: [],
  loading: false,
  error: null,
};

// Reducer
const dataReducer = (state: DataState, action: DataAction): DataState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    
    case 'SET_PROJECTS':
      return { ...state, projects: action.payload };
    
    case 'ADD_PROJECT':
      return { ...state, projects: [...state.projects, action.payload] };
    
    case 'UPDATE_PROJECT':
      return {
        ...state,
        projects: state.projects.map(p => 
          p.id === action.payload.id ? action.payload : p
        )
      };
    
    case 'DELETE_PROJECT':
      return {
        ...state,
        projects: state.projects.filter(p => p.id !== action.payload)
      };
    
    case 'SET_CONTRACTORS':
      return { ...state, contractors: action.payload };
    
    case 'ADD_CONTRACTOR':
      return { ...state, contractors: [...state.contractors, action.payload] };
    
    case 'UPDATE_CONTRACTOR':
      return {
        ...state,
        contractors: state.contractors.map(c => 
          c.id === action.payload.id ? action.payload : c
        )
      };
    
    case 'DELETE_CONTRACTOR':
      return {
        ...state,
        contractors: state.contractors.filter(c => c.id !== action.payload)
      };
    
    case 'SET_PAYMENT_APPLICATIONS':
      return { ...state, paymentApplications: action.payload };
    
    case 'ADD_PAYMENT_APPLICATION':
      return { 
        ...state, 
        paymentApplications: [...state.paymentApplications, action.payload] 
      };
    
    case 'UPDATE_PAYMENT_APPLICATION':
      return {
        ...state,
        paymentApplications: state.paymentApplications.map(p => 
          p.id === action.payload.id ? action.payload : p
        )
      };
    
    case 'DELETE_PAYMENT_APPLICATION':
      return {
        ...state,
        paymentApplications: state.paymentApplications.filter(p => p.id !== action.payload)
      };
    
    case 'SET_DAILY_LOGS':
      return { ...state, dailyLogs: action.payload };
    
    case 'ADD_DAILY_LOG':
      return { ...state, dailyLogs: [...state.dailyLogs, action.payload] };
    
    case 'UPDATE_DAILY_LOG':
      return {
        ...state,
        dailyLogs: state.dailyLogs.map(d => 
          d.id === action.payload.id ? action.payload : d
        )
      };
    
    case 'DELETE_DAILY_LOG':
      return {
        ...state,
        dailyLogs: state.dailyLogs.filter(d => d.id !== action.payload)
      };
    
    default:
      return state;
  }
};

// Context
interface DataContextType {
  state: DataState;
  dispatch: React.Dispatch<DataAction>;
  fetchProjects: () => Promise<void>;
  fetchContractors: () => Promise<void>;
  fetchPaymentApplications: () => Promise<void>;
  fetchDailyLogs: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Provider component
export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(dataReducer, initialState);

  const fetchProjects = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const { data, error } = await supabase.from('projects').select('*');
      if (error) throw error;
      dispatch({ type: 'SET_PROJECTS', payload: data || [] });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch projects';
      dispatch({ type: 'SET_ERROR', payload: message });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const fetchContractors = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const { data, error } = await supabase.from('project_contractors').select('*');
      if (error) throw error;
      dispatch({ type: 'SET_CONTRACTORS', payload: data || [] });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch contractors';
      dispatch({ type: 'SET_ERROR', payload: message });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const fetchPaymentApplications = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const { data, error } = await supabase.from('payment_applications').select('*');
      if (error) throw error;
      dispatch({ type: 'SET_PAYMENT_APPLICATIONS', payload: data || [] });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch payment applications';
      dispatch({ type: 'SET_ERROR', payload: message });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const fetchDailyLogs = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const { data, error } = await supabase.from('daily_logs').select('*');
      if (error) throw error;
      dispatch({ type: 'SET_DAILY_LOGS', payload: data || [] });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch daily logs';
      dispatch({ type: 'SET_ERROR', payload: message });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchContractors();
    fetchPaymentApplications();
    fetchDailyLogs();
  }, []);

  return (
    <DataContext.Provider value={{
      state,
      dispatch,
      fetchProjects,
      fetchContractors,
      fetchPaymentApplications,
      fetchDailyLogs,
    }}>
      {children}
    </DataContext.Provider>
  );
};

// Hook to use the context
export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

// Export types for use in other files
export type { Project, Contractor, PaymentApplication, DailyLog };
