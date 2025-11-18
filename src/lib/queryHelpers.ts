/**
 * Shared timeout wrapper for all database queries
 * Prevents infinite hangs by enforcing a maximum wait time
 * 
 * @param promise - The promise to wrap with timeout
 * @param timeoutMs - Maximum time to wait in milliseconds
 * @param queryName - Name of query for error messages
 * @returns Promise that resolves or rejects within timeoutMs
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  queryName: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Query timeout: ${queryName} took longer than ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ]);
}

/**
 * Type-safe query result handler
 * Ensures consistent error handling across all queries
 */
export type QueryResult<T> = {
  data: T | null;
  error: Error | null;
};

/**
 * Wraps Supabase query responses in consistent format
 */
export function handleQueryResult<T>(response: any): QueryResult<T> {
  if (response.error) {
    return {
      data: null,
      error: new Error(response.error.message || 'Database query failed'),
    };
  }
  
  return {
    data: response.data as T,
    error: null,
  };
}

