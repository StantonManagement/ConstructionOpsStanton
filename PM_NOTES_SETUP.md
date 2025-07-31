# PM Notes SMS Setup (DEPRECATED)

⚠️ **This feature has been replaced by the Daily Log Requests system.**

This document explains the old PM Notes SMS functionality that sent daily reminders TO PM managers at 6 PM EST. This system has been replaced by a new system that **requests notes FROM PMs** instead of sending notes TO them.

**Please refer to `DAILY_LOG_SETUP.md` for the current implementation.**

## Overview

The PM Notes feature allows project managers to create notes that will be automatically sent as SMS messages to PM managers daily at 6 PM EST. This helps keep PM managers informed about important project updates and reminders.

## Database Setup

The `pm_notes` table has been created with the following structure:

```sql
CREATE TABLE pm_notes (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  scheduled_time TIME DEFAULT '18:00:00',
  is_daily BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  last_sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

### 1. Create PM Note
- **Endpoint**: `POST /api/notifications/pm-notes`
- **Purpose**: Create a new PM note
- **Body**:
  ```json
  {
    "projectId": 123,
    "note": "Check on concrete curing progress",
    "scheduledTime": "18:00:00",
    "isDaily": true
  }
  ```

### 2. Send PM Notes (Cron Job)
- **Endpoint**: `GET /api/cron/pm-notes`
- **Purpose**: Send scheduled PM notes as SMS
- **Authentication**: Requires Bearer token in Authorization header
- **Usage**: Called by external cron job scheduler

## Cron Job Setup

### Option 1: Using Vercel Cron Jobs (Recommended)

If you're deploying on Vercel, you can use their built-in cron job functionality:

1. Create a `vercel.json` file in your project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/pm-notes",
      "schedule": "0 18 * * *"
    }
  ]
}
```

2. Set up environment variables in Vercel:
   - `CRON_SECRET`: A secret token for authentication
   - `TWILIO_ACCOUNT_SID`: Your Twilio account SID
   - `TWILIO_AUTH_TOKEN`: Your Twilio auth token
   - `TWILIO_PHONE_NUMBER`: Your Twilio phone number

### Option 2: Using External Cron Services

You can use services like:
- **Cron-job.org**: Free cron job service
- **EasyCron**: Paid service with more features
- **AWS EventBridge**: If using AWS infrastructure

#### Setup with Cron-job.org:

1. Go to https://cron-job.org
2. Create an account and add a new cron job
3. Set the URL to: `https://your-domain.com/api/cron/pm-notes`
4. Set the schedule to: `0 18 * * *` (6 PM daily)
5. Add headers:
   - `Authorization: Bearer YOUR_SECRET_TOKEN`
   - `Content-Type: application/json`

### Option 3: Manual Testing

You can test the functionality manually by calling:

```bash
curl -X GET "https://your-domain.com/api/cron/pm-notes" \
  -H "Authorization: Bearer YOUR_SECRET_TOKEN"
```

## Configuration

### 1. Update PM Phone Numbers

Currently, the system uses a placeholder phone number (`+1234567890`). You need to update the logic to fetch actual PM phone numbers.

In `src/app/api/cron/pm-notes/route.ts`, replace this line:

```typescript
const pmPhoneNumber = '+1234567890'; // Replace with actual PM phone number logic
```

With logic to fetch the actual PM phone number, for example:

```typescript
// Fetch PM phone number from users table
const { data: pmUser } = await supabase
  .from('users')
  .select('phone')
  .eq('role', 'pm_manager')
  .eq('project_id', note.project_id)
  .single();

const pmPhoneNumber = pmUser?.phone;
```

### 2. SMS Service Configuration

Make sure your SMS service (Twilio, etc.) is properly configured in `src/lib/sms.ts`.

### 3. Environment Variables

Set up these environment variables:

```env
# Cron authentication
CRON_SECRET=your-secret-token-here

# SMS service (Twilio example)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=your-twilio-phone-number

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

## Usage

### Creating PM Notes

1. Navigate to the PM Dashboard
2. Click on the "PM Notes" tab
3. Click "Add Note"
4. Select a project
5. Enter your note
6. Click "Add Note"

The note will be scheduled to send daily at 6 PM EST.

### Managing PM Notes

- View all notes in the PM Notes tab
- Delete notes by clicking the trash icon
- Notes are automatically sent via SMS at the scheduled time

## Troubleshooting

### Common Issues

1. **SMS not sending**: Check your SMS service configuration and phone numbers
2. **Cron job not running**: Verify the cron job URL and authentication
3. **Database errors**: Check the `pm_notes` table structure and permissions

### Debugging

1. Check the application logs for error messages
2. Test the cron endpoint manually
3. Verify the database has the correct data
4. Check SMS service logs

## Security Considerations

1. **Authentication**: The cron endpoint requires a Bearer token
2. **Rate Limiting**: Consider adding rate limiting to prevent abuse
3. **Phone Number Validation**: Validate phone numbers before sending SMS
4. **Error Handling**: Implement proper error handling and logging

## Future Enhancements

1. **Multiple PM Support**: Allow multiple PMs per project
2. **Custom Schedules**: Allow custom scheduling (not just daily)
3. **SMS Templates**: Create customizable SMS templates
4. **Delivery Reports**: Track SMS delivery status
5. **Web Interface**: Add a web interface for managing PM notes 