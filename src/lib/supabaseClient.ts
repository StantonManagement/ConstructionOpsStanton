import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iyiqdgmpcuczzigotjhf.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5aXFkZ21wY3VjenppZ290amhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxNjkwMzksImV4cCI6MjA2NTc0NTAzOX0.iRYrhPiYHi4NjVBLk0c3AmwQfjZlT3-O8HHZHMsbY68';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] Error: Missing environment variables', {
    supabaseUrl: !!supabaseUrl,
    supabaseAnonKey: !!supabaseAnonKey,
  });
  throw new Error('Missing Supabase URL or Anon Key');
} else {
  console.log('[Supabase] Client initialized: Connected to', supabaseUrl);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'x-client-info': 'cpps-web'
    }
  }
});

console.log('[Supabase] Client initialized: Connected to', supabaseUrl);