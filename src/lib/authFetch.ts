import { supabase } from '@/lib/supabaseClient';

type AuthFetchOptions = {
  requireAuth?: boolean;
};

export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: AuthFetchOptions = {}
): Promise<Response> {
  const { requireAuth = true } = options;

  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    if (requireAuth) {
      throw new Error('Authentication required');
    }
    return fetch(input, init);
  }

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${session.access_token}`);

  return fetch(input, { ...init, headers });
}
