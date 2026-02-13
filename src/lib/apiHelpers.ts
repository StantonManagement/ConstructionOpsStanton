import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from './supabaseClient';
import { User } from '@/types/schema';

/**
 * Shared API utilities for consistent request handling, validation, and response formatting
 */

// Standard API error responses
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Extract and validate auth token from request
 * Returns the user object if valid, throws APIError if invalid
 */
export async function validateAuth(request: NextRequest): Promise<User> {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new APIError('Missing or invalid authorization header', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.replace('Bearer ', '');
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      throw new APIError('Invalid or expired token', 401, 'UNAUTHORIZED');
    }

    return user as User;
  } catch (err) {
    if (err instanceof APIError) throw err;
    throw new APIError('Authentication failed', 401, 'AUTH_FAILED');
  }
}

/**
 * Get user role from database
 */
export async function getUserRole(userId: string): Promise<string> {
  if (!supabaseAdmin) {
    throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
  }

  const { data, error } = await supabaseAdmin
    .from('user_role')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle(); // Use maybeSingle() to avoid error if no rows found

  if (error || !data) {
    return 'staff'; // Default role
  }

  return data.role;
}

/**
 * Validate request body against required fields
 */
export function validateRequestBody<T extends Record<string, any>>(
  body: any,
  requiredFields: (keyof T)[]
): T {
  if (!body || typeof body !== 'object') {
    throw new APIError('Invalid request body', 400, 'INVALID_BODY');
  }

  const missing = requiredFields.filter(field => !(field in body));
  
  if (missing.length > 0) {
    throw new APIError(
      `Missing required fields: ${missing.join(', ')}`,
      400,
      'MISSING_FIELDS'
    );
  }

  return body as T;
}

/**
 * Standard success response formatter
 */
export function successResponse<T>(data: T, status: number = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date().toISOString()
    },
    { status }
  );
}

/**
 * Standard error response formatter
 */
export function errorResponse(
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: any
) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      code: code || 'SERVER_ERROR',
      details: details || undefined,
      timestamp: new Date().toISOString()
    },
    { status: statusCode }
  );
}

/**
 * Wrap API route handler with error handling
 */
export function withErrorHandling(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    try {
      return await handler(request);
    } catch (err) {
      console.error('[API Error]', err);
      
      if (err instanceof APIError) {
        return errorResponse(err.message, err.statusCode, err.code);
      }
      
      if (err instanceof Error) {
        return errorResponse(err.message, 500, 'INTERNAL_ERROR');
      }
      
      return errorResponse('An unexpected error occurred', 500, 'UNKNOWN_ERROR');
    }
  };
}

/**
 * Wrap API route handler with auth + error handling
 * Supports dynamic routes by forwarding the context parameter
 */
export function withAuth<T = any>(
  handler: (request: NextRequest, context: T, user: User) => Promise<NextResponse>
) {
  return async (request: NextRequest, context: T) => {
    try {
      const user = await validateAuth(request);
      return await handler(request, context, user);
    } catch (err) {
      console.error('[API Error]', err);
      
      if (err instanceof APIError) {
        return errorResponse(err.message, err.statusCode, err.code);
      }
      
      if (err instanceof Error) {
        return errorResponse(err.message, 500, 'INTERNAL_ERROR');
      }
      
      return errorResponse('An unexpected error occurred', 500, 'UNKNOWN_ERROR');
    }
  };
}

/**
 * Parse query parameters with defaults
 */
export function getQueryParams<T extends Record<string, any>>(
  request: NextRequest,
  defaults: T
): T {
  const { searchParams } = new URL(request.url);
  const params: any = { ...defaults };

  for (const [key, defaultValue] of Object.entries(defaults)) {
    const value = searchParams.get(key);
    if (value !== null) {
      // Try to parse as the same type as the default
      if (typeof defaultValue === 'number') {
        params[key] = Number(value);
      } else if (typeof defaultValue === 'boolean') {
        params[key] = value === 'true';
      } else {
        params[key] = value;
      }
    }
  }

  return params as T;
}

/**
 * Cache response helper
 * Sets appropriate cache-control headers
 */
export function withCache(
  response: NextResponse,
  maxAge: number = 30
): NextResponse {
  response.headers.set(
    'Cache-Control',
    `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 2}`
  );
  return response;
}

/**
 * Timeout wrapper for database queries
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  queryName: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new APIError(`Query timeout: ${queryName} took longer than ${timeoutMs}ms`, 504, 'TIMEOUT')),
        timeoutMs
      )
    ),
  ]);
}

