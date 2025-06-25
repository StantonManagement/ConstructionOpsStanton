import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] Error: Missing environment variables', {
    supabaseUrl: !!supabaseUrl,
    supabaseAnonKey: !!supabaseAnonKey,
  });
  throw new Error('Missing Supabase URL or Anon Key');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('[Supabase] Client initialized: Connected to', supabaseUrl);