
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { APIResponse } from '@/types';

export const useSupabase = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeQuery = async <T>(
    queryFn: () => Promise<any>,
    successMessage?: string
  ): Promise<APIResponse<T>> => {
    setLoading(true);
    setError(null);

    try {
      const result = await queryFn();
      
      if (result.error) {
        throw new Error(result.error.message || 'Database operation failed');
      }

      setLoading(false);
      return {
        data: result.data,
        success: true,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setLoading(false);
      
      return {
        error: errorMessage,
        success: false,
      };
    }
  };

  return {
    loading,
    error,
    executeQuery,
    clearError: () => setError(null),
  };
};
