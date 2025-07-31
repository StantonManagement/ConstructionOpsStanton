# Daily Log Requests Setup Guide

This feature automatically requests daily notes from Project Managers (PMs) for each active project via SMS. The system sends initial requests at 6 PM EST daily and retries every 30 minutes until notes are received.

## Database Schema

The system uses a new `daily_log_requests` table with the following structure:

```sql
CREATE TABLE daily_log_requests (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    request_date DATE NOT NULL DEFAULT CURRENT_DATE,
    pm_phone_number VARCHAR(20) NOT NULL,
    request_status VARCHAR(50) DEFAULT 'pending' CHECK (request_status IN ('pending', 'sent', 'received', 'failed')),
    first_request_sent_at TIMESTAMP,
    last_request_sent_at TIMESTAMP,
    next_retry_at TIMESTAMP,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 48, -- 24 hours worth of 30-minute retries
    received_notes TEXT,
    received_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure only one request per project per day
    UNIQUE(project_id, request_date)
);
```

## API Endpoints

### 1. Daily Log Requests Cron Job
**Path:** `/api/cron/daily-log-requests`  
**Method:** GET  
**Purpose:** Automatically triggered by cron job to send SMS requests to PMs

**Features:**
- Runs at 6 PM EST daily for initial requests
- Retries every 30 minutes until 11:30 PM EST
- Creates requests for all active projects
- Sends SMS messages to PM phone numbers
- Tracks retry counts and status

### 2. SMS Response Webhook
**Path:** `/api/sms/daily-log-response`  
**Method:** POST  
**Purpose:** Receives SMS responses from PMs and updates the database

**Features:**
- Processes inbound SMS messages
- Updates request status to 'received'
- Stores received notes
- Records timestamp of receipt

## Cron Job Configuration

The system uses Vercel cron jobs with the following schedule:

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-log-requests",
      "schedule": "0,30 18-23 * * *"
    }
  ]
}
```

This schedule runs:
- At 6:00 PM, 6:30 PM, 7:00 PM, 7:30 PM, etc. until 11:30 PM EST
- Allows for initial requests at 6 PM and retries every 30 minutes

## SMS Provider Configuration

### Required Environment Variables

```env
# SMS Provider Configuration (e.g., Twilio)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Webhook URL for SMS responses
SMS_WEBHOOK_URL=https://your-domain.com/api/sms/daily-log-response
```

### SMS Provider Setup

1. **Twilio Setup:**
   - Create a Twilio account
   - Get Account SID and Auth Token
   - Purchase a phone number
   - Configure webhook URL for inbound messages

2. **Webhook Configuration:**
   - Set the webhook URL in your SMS provider dashboard
   - Ensure the endpoint can handle POST requests with SMS data

## Frontend Integration

### PMDashboard Component

The system includes a new `DailyLogRequests` component in the PMDashboard that provides:

- **Add Request Modal:** Configure PM phone numbers for projects
- **Request Status Tracking:** View pending, sent, received, and failed requests
- **Received Notes Display:** Show notes received from PMs
- **Retry Information:** Display retry counts and timing

### Usage Flow

1. **Admin Setup:**
   - Navigate to PMDashboard → Daily Log Requests tab
   - Click "Add Request" for each active project
   - Enter PM phone number for the project
   - System automatically handles the rest

2. **Daily Operation:**
   - System sends initial SMS at 6 PM EST
   - PM receives message asking for daily notes
   - PM replies with notes via SMS
   - System records notes and stops retrying
   - If no response, system retries every 30 minutes

3. **Monitoring:**
   - View request status in the dashboard
   - Track retry counts and timing
   - Read received notes from PMs
   - Monitor failed requests

## Message Templates

### Initial Request (6 PM)
```
Hi! This is your daily log reminder for project: [Project Name] ([Client Name]). Please reply with your notes about today's progress, any issues, or updates.
```

### Retry Request (30-minute intervals)
```
Reminder: We're still waiting for your daily log for project: [Project Name] ([Client Name]). Please reply with your notes.
```

### Confirmation Message (Optional)
```
Thank you! Your daily log for project "[Project Name]" has been received and recorded.
```

## Error Handling

### SMS Failure
- Requests marked as 'failed' if SMS sending fails
- System logs error details for debugging
- Failed requests can be manually retried

### No Response
- System continues retrying every 30 minutes
- Maximum 48 retries (24 hours)
- Requests automatically stop after max retries

### Invalid Phone Numbers
- System validates phone number format
- Invalid numbers are rejected during creation
- Error messages displayed to user

## Security Considerations

### Authentication
- Cron job requires Bearer token authentication
- Webhook endpoints should be secured
- Implement proper validation for SMS data

### Data Privacy
- PM phone numbers stored securely
- Notes data encrypted in transit
- Implement proper access controls

## Monitoring and Logging

### Log Levels
- **Info:** Request creation, SMS sending, note receipt
- **Warning:** Retry attempts, approaching max retries
- **Error:** SMS failures, database errors, webhook issues

### Metrics to Track
- Number of requests created daily
- Success rate of SMS delivery
- Average time to receive notes
- Retry frequency and patterns

## Troubleshooting

### Common Issues

1. **SMS Not Sending:**
   - Check SMS provider credentials
   - Verify phone number format
   - Review SMS provider logs

2. **Webhook Not Receiving Responses:**
   - Verify webhook URL configuration
   - Check endpoint accessibility
   - Review SMS provider webhook settings

3. **Cron Job Not Running:**
   - Verify Vercel cron configuration
   - Check deployment status
   - Review function logs

### Debug Steps

1. Check application logs for errors
2. Verify database connectivity
3. Test SMS provider API directly
4. Validate webhook endpoint manually
5. Review cron job execution logs

## Future Enhancements

### Potential Improvements
- Email notifications for failed requests
- Dashboard analytics for response rates
- Integration with project management tools
- Custom message templates per project
- Multi-language support
- Advanced retry strategies

### Scalability Considerations
- Database indexing for large datasets
- Rate limiting for SMS sending
- Caching for frequently accessed data
- Horizontal scaling for high volume 