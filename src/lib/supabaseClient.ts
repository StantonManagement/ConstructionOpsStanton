import { createClient } from '@supabase/supabase-js';

/**
 * Validates required environment variables for Supabase client initialization.
 * Throws clear, actionable errors if variables are missing.
 * Note: SUPABASE_SERVICE_ROLE_KEY is only required on the server side.
 */
function validateEnvironmentVariables() {
  const vars = [];
  const missing = [];
  const isServer = typeof window === 'undefined';
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl) {
    missing.push('NEXT_PUBLIC_SUPABASE_URL');
  } else {
    vars.push('NEXT_PUBLIC_SUPABASE_URL');
  }
  
  if (!supabaseAnonKey) {
    missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  } else {
    vars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  
  // Service role key is only available on the server (not exposed to client)
  // Only validate it when running on the server side
  if (isServer && !supabaseServiceKey) {
    missing.push('SUPABASE_SERVICE_ROLE_KEY (REQUIRED for database relationships)');
  } else if (supabaseServiceKey) {
    vars.push('SUPABASE_SERVICE_ROLE_KEY');
  }
  
  if (missing.length > 0) {
    const isProduction = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT || process.env.RENDER;
    const platform = process.env.RAILWAY_ENVIRONMENT ? 'Railway' : process.env.RENDER ? 'Render' : 'Local';
    
    let deploymentGuidance = '';
    if (isProduction) {
      deploymentGuidance = `
PRODUCTION DEPLOYMENT DETECTED (${platform})!

To fix this in production:
${platform === 'Railway' ? `
1. Go to your Railway project dashboard
2. Navigate to your service → Variables tab
3. Add each missing variable listed above
4. Railway will automatically redeploy after saving
5. Check the deployment logs to verify variables are loaded
` : platform === 'Render' ? `
1. Go to your Render Web Service dashboard
2. Navigate to Environment tab
3. Add each missing variable listed above
4. Render will automatically redeploy after saving
` : ''}
See DEPLOYMENT.md for detailed deployment instructions.
`;
    } else {
      deploymentGuidance = `
To fix this locally:
1. Check your .env file in the project root
2. Ensure all required variables from .env.example are present
3. Restart your development server after updating .env
`;
    }
    
    const errorMessage = `
[Supabase] Missing required environment variables!

Missing variables:
${missing.map(v => `  - ${v}`).join('\n')}

Found variables:
${vars.map(v => `  - ${v}`).join('\n')}
${deploymentGuidance}
The SUPABASE_SERVICE_ROLE_KEY is especially critical for:
- Database relationship queries (payment_applications -> projects, etc.)
- Admin operations and schema access
- Server-side API routes
- Production deployments (REQUIRED for server-side operations)

Get your keys from: https://app.supabase.com/project/_/settings/api

For production deployments, see DEPLOYMENT.md for platform-specific instructions.
`;
    console.error(errorMessage);
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  return { supabaseUrl, supabaseAnonKey, supabaseServiceKey };
}

// Validate environment variables on module load
// Note: On client side, only validate public variables. Server-only variables 
// (like SUPABASE_SERVICE_ROLE_KEY) are validated separately when used.
let supabaseUrl: string;
let supabaseAnonKey: string;
let supabaseServiceKey: string | undefined;

try {
  const validated = validateEnvironmentVariables();
  supabaseUrl = validated.supabaseUrl!;
  supabaseAnonKey = validated.supabaseAnonKey!;
  supabaseServiceKey = validated.supabaseServiceKey;
} catch (error) {
  // Re-throw only if we're on the server side
  if (typeof window === 'undefined') {
    throw error;
  }
  // On client side, only require public variables
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  supabaseServiceKey = undefined;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing required client-side environment variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
}

// Export service role client for admin operations and relationship queries
// Only available on the server side (SUPABASE_SERVICE_ROLE_KEY is server-only)
export const supabaseAdmin = typeof window === 'undefined' && supabaseServiceKey
  ? createClient(supabaseUrl!, supabaseServiceKey!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'x-client-info': 'cpps-web-admin'
        }
      }
    })
  : null;

// Export regular client for user operations
export const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    // Keep session alive - Supabase tokens expire in 1 hour by default
    // With autoRefreshToken enabled, tokens refresh automatically before expiring
    // This keeps users logged in even if they walk away from the computer
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

if (typeof window === 'undefined') {
  // Server-side logging
  console.log('[Supabase] Client initialized: Connected to', supabaseUrl);
  console.log('[Supabase] Service role client available for relationship queries:', !!supabaseServiceKey);
}