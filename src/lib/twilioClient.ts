import twilio from 'twilio';

/**
 * Validates required Twilio environment variables.
 * Throws clear, actionable errors if variables are missing.
 */
function validateTwilioEnvironmentVariables() {
  const vars = [];
  const missing = [];
  const isServer = typeof window === 'undefined';
  
  // Twilio credentials are only available on the server side
  if (!isServer) {
    return { accountSid: undefined, authToken: undefined, phoneNumber: undefined };
  }
  
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER;
  
  if (!accountSid) {
    missing.push('TWILIO_ACCOUNT_SID');
  } else {
    vars.push('TWILIO_ACCOUNT_SID');
  }
  
  if (!authToken) {
    missing.push('TWILIO_AUTH_TOKEN');
  } else {
    vars.push('TWILIO_AUTH_TOKEN');
  }
  
  if (!phoneNumber) {
    missing.push('TWILIO_PHONE_NUMBER');
  } else {
    vars.push('TWILIO_PHONE_NUMBER');
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
Get your Twilio credentials from: https://console.twilio.com

See DEPLOYMENT.md for detailed deployment instructions.
`;
    } else {
      deploymentGuidance = `
To fix this locally:
1. Check your .env file in the project root
2. Ensure all required Twilio variables from .env.example are present
3. Get your credentials from https://console.twilio.com
4. Restart your development server after updating .env
`;
    }
    
    const errorMessage = `
[Twilio] Missing required environment variables!

Missing variables:
${missing.map(v => `  - ${v}`).join('\n')}

Found variables:
${vars.map(v => `  - ${v}`).join('\n')}
${deploymentGuidance}
Twilio SMS is a core feature required for:
- Daily log request reminders
- PM notes notifications
- Payment application notifications
- Contractor communication

Get your keys from: https://console.twilio.com/
- Account SID → TWILIO_ACCOUNT_SID
- Auth Token → TWILIO_AUTH_TOKEN  
- Phone Number → TWILIO_PHONE_NUMBER (format: +1234567890)

For production deployments, see DEPLOYMENT.md for platform-specific instructions.
`;
    console.error(errorMessage);
    throw new Error(`Missing required Twilio environment variables: ${missing.join(', ')}`);
  }
  
  return { accountSid, authToken, phoneNumber };
}

// Validate environment variables on module load (server-side only)
let twilioAccountSid: string | undefined;
let twilioAuthToken: string | undefined;
let twilioPhoneNumber: string | undefined;

try {
  const validated = validateTwilioEnvironmentVariables();
  twilioAccountSid = validated.accountSid;
  twilioAuthToken = validated.authToken;
  twilioPhoneNumber = validated.phoneNumber;
} catch (error) {
  // Re-throw only if we're on the server side
  if (typeof window === 'undefined') {
    throw error;
  }
}

// Export Twilio client for SMS operations (only available on server side)
export const twilioClient = typeof window === 'undefined' && twilioAccountSid && twilioAuthToken
  ? twilio(twilioAccountSid, twilioAuthToken)
  : null;

// Export phone number constant
export const TWILIO_PHONE_NUMBER = twilioPhoneNumber;

if (typeof window === 'undefined') {
  // Server-side logging
  console.log('[Twilio] Client initialized:', !!twilioClient);
  console.log('[Twilio] Phone number configured:', !!twilioPhoneNumber);
}

