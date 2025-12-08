# Daily Log Requests Setup

This document explains how to set up the Daily Log Requests SMS feature that sends daily reminders to Project Managers at 6 PM EST.

## Overview

The Daily Log Requests feature sends SMS reminders to Project Managers at 6 PM EST every day, asking for notes about their active projects. This system is designed to work with Vercel's hobby account limitations (one cron job per day).

## Database Setup

### Create the daily_log_requests table

```sql
CREATE TABLE daily_log_requests (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    request_date DATE NOT NULL DEFAULT CURRENT_DATE,
    pm_phone_number VARCHAR(20) NOT NULL,
    request_status VARCHAR(50) DEFAULT 'pending' CHECK (request_status IN ('pending', 'sent', 'received', 'failed')),
    first_request_sent_at TIMESTAMP,
    last_request_sent_at TIMESTAMP,
    retry_count INTEGER DEFAULT 0,
    received_notes TEXT,
    received_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, request_date)
);
```

## API Endpoints

### 1. Cron Job Endpoint: `/api/cron/daily-log-requests`

**Purpose**: Triggered by Vercel cron job to send daily log requests at 6 PM EST.

**Method**: GET

**Authentication**: Requires Bearer token (configure in Vercel environment variables)

**Functionality**:
- Runs only at 6 PM EST (due to hobby account limitations)
- Creates daily log requests for all active projects
- Sends SMS reminders to Project Managers
- Updates request status in database

### 2. SMS Response Webhook: `/api/sms/daily-log-response`

**Purpose**: Receives SMS responses from Project Managers.

**Method**: POST

**Functionality**:
- Processes inbound SMS messages
- Identifies the corresponding pending request
- Updates the request with received notes
- Marks request as 'received'

## Configuration

### Vercel Cron Job Setup

Due to Vercel hobby account limitations (one cron job per day), the system is configured to run only once per day at 6 PM EST:

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-log-requests",
      "schedule": "0 18 * * *"
    }
  ]
}
```

**Note**: Hobby accounts are limited to one cron job per day. If you need more frequent retries, consider upgrading to a Pro plan or using an external cron service.

### Environment Variables

Add these to your Vercel environment variables:

```bash
# SMS Service Configuration
SMS_SERVICE_API_KEY=your_sms_service_api_key
SMS_SERVICE_URL=https://your-sms-service.com/api

# Authentication for cron job
CRON_SECRET=your_secret_token_for_cron_authentication

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Usage Flow

### 1. Daily Request Process

1. **6 PM EST**: Cron job triggers `/api/cron/daily-log-requests`
2. **Active Projects**: System identifies all active projects
3. **PM Phone Numbers**: Retrieves Project Manager phone numbers
4. **SMS Sending**: Sends personalized messages to each PM
5. **Status Update**: Updates request status to 'sent'

### 2. Response Processing

1. **PM Response**: Project Manager replies to SMS
2. **Webhook Receives**: `/api/sms/daily-log-response` processes the message
3. **Request Matching**: System identifies the corresponding request
4. **Notes Storage**: Stores the received notes in the database
5. **Status Update**: Marks request as 'received'

## Message Templates

### Initial Request Message
```
Hi! This is your daily log reminder for project: [Project Name] ([Client Name]). Please reply with your notes about today's progress, any issues, or updates.
```

### Response Processing
The system automatically processes responses and stores them in the `received_notes` field.

## Hobby Account Limitations

### Current Limitations
- **One cron job per day**: Vercel hobby accounts only allow one cron job execution per day
- **No automatic retries**: The system cannot automatically retry failed requests every 30 minutes
- **Manual intervention**: Failed requests require manual intervention

### Workarounds for Hobby Accounts

1. **Manual Retry Endpoint**: Create a manual endpoint to retry failed requests
2. **External Cron Service**: Use services like cron-job.org for more frequent executions
3. **Upgrade to Pro**: Consider upgrading to Vercel Pro for unlimited cron jobs

### Alternative Solutions

#### Option 1: External Cron Service
Use an external service like cron-job.org to trigger retries:

```bash
# Set up external cron job to call retry endpoint
0,30 18-23 * * * curl -X POST https://your-app.vercel.app/api/retry-failed-requests
```

#### Option 2: Manual Retry Endpoint
Create a manual endpoint for retrying failed requests:

```typescript
// /api/manual-retry-requests
export async function POST(request: NextRequest) {
  // Logic to retry failed requests
  // Can be called manually or by external cron service
}
```

## Error Handling

### Common Issues

1. **SMS Service Failures**: Logged and marked as 'failed'
2. **Invalid Phone Numbers**: Skipped with appropriate logging
3. **Database Errors**: Retried with exponential backoff
4. **Authentication Failures**: Return 401 status

### Monitoring

Monitor the following:
- Cron job execution logs in Vercel
- SMS delivery success rates
- Response processing success rates
- Database error rates

## Security Considerations

1. **Authentication**: All cron endpoints require Bearer token authentication
2. **Rate Limiting**: Implement rate limiting on webhook endpoints
3. **Input Validation**: Validate all SMS responses before processing
4. **Phone Number Verification**: Verify phone numbers before sending SMS

## Future Enhancements

1. **Pro Plan Upgrade**: Enable unlimited cron jobs for automatic retries
2. **Advanced Analytics**: Track response rates and engagement
3. **Customizable Messages**: Allow PMs to customize reminder messages
4. **Integration**: Connect with project management tools
5. **Mobile App**: Create mobile app for easier response management

## Troubleshooting

### Cron Job Not Running
1. Check Vercel deployment status
2. Verify cron job configuration in vercel.json
3. Check environment variables
4. Review Vercel function logs

### SMS Not Sending
1. Verify SMS service credentials
2. Check phone number format
3. Review SMS service logs
4. Test with manual endpoint

### Responses Not Processing
1. Check webhook endpoint configuration
2. Verify SMS service webhook settings
3. Review webhook logs
4. Test webhook manually

## Support

For issues related to:
- **Vercel Cron Jobs**: Check Vercel documentation
- **SMS Service**: Contact your SMS provider
- **Database**: Check Supabase logs
- **Application Logic**: Review function logs in Vercel dashboard 