# Automated Bid Reminder System (SMS Only)

This document explains how to set up and configure the automated SMS bid reminder system.

## Overview

The automated reminder system sends SMS notifications via Twilio to contractors who haven't submitted their bids as the deadline approaches.

**Default Schedule:**
- 2 days before deadline
- 1 day before deadline

## Setup Instructions

### 1. Environment Variables

Ensure you have configured the following environment variables in your `.env` file:

```bash
# Required for automated SMS reminders
CRON_SECRET=your_secret_key_here  # Or use SECRET_KEY if already set

# Twilio SMS configuration (required)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_phone
```

### 2. Database Setup

Run the bid notifications migration if you haven't already:

```bash
psql $DATABASE_URL -f database/migrations/bid_notifications_sms_tracking.sql
```

This creates the `bid_notifications` table for tracking all sent SMS reminders.

### 3. Cron Job Configuration

You have several options for scheduling the cron job:

#### Option A: Vercel Cron Jobs (Recommended for Vercel deployments)

1. Create `vercel.json` in your project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/send-bid-reminders",
      "schedule": "0 9 * * *"
    }
  ]
}
```

2. Deploy to Vercel - the cron job will run automatically daily at 9 AM UTC.

#### Option B: External Cron Service (for other deployments)

Use a service like:
- **cron-job.org** (free, reliable)
- **EasyCron** (free tier available)
- **GitHub Actions** (if using GitHub)

Configure the service to make a POST request to:
```
POST https://yourdomain.com/api/cron/send-bid-reminders
Headers:
  Authorization: Bearer YOUR_CRON_SECRET
```

**Recommended Schedule:** `0 9 * * *` (Daily at 9 AM)

#### Option C: Manual Testing

You can manually trigger the cron job for testing:

```bash
curl -X POST https://yourdomain.com/api/cron/send-bid-reminders \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### 4. Verify Setup

1. **Test the endpoint:**

```bash
# GET request to verify the endpoint is working
curl https://yourdomain.com/api/cron/send-bid-reminders
```

This should return information about the cron job configuration.

2. **Test reminder sending:**

Create a test bid round with a deadline 2 days from now, invite a contractor (make sure they have a phone number), and manually trigger the cron job to verify SMS reminders are sent.

## How It Works

### Flow

1. **Cron job triggers** the `/api/cron/send-bid-reminders` endpoint
2. **System finds** all active bid rounds with deadlines matching reminder dates (2 days or 1 day away)
3. **For each bid round:**
   - Finds all contractors with draft bids (not yet submitted)
   - Filters for contractors with phone numbers
   - Sends SMS reminders via Twilio
   - Logs notifications in `bid_notifications` table
4. **Returns summary** of SMS reminders sent

### Reminder Logic

- Only sends to contractors with **draft status** bids (not submitted)
- Only sends to contractors with **phone numbers**
- Updates the `bid_notifications` table for tracking
- Includes Twilio webhook for delivery status tracking

### Message Content

**SMS:**
```
REMINDER: {contractor_name}, you have {X} day(s) left to submit your bid for "{bid_round_name}" ({project_name}). Deadline: {date}. Trade: {trade}. Please submit your bid soon!
```

## Monitoring

### View Notification History

All SMS reminders are tracked in the `bid_notifications` table and displayed on the bid round detail page in the "Notification History" section.

You can see:
- When SMS reminders were sent
- Delivery status (delivered, failed, etc.)
- Which contractors received reminders
- Any errors that occurred

### Database Query

To manually check sent reminders:

```sql
SELECT
  br.name as bid_round,
  c.name as contractor,
  bn.phone_number,
  bn.status,
  bn.sent_at,
  bn.delivered_at
FROM bid_notifications bn
JOIN bid_rounds br ON bn.bid_round_id = br.id
JOIN contractors c ON bn.contractor_id = c.id
WHERE bn.sent_at > NOW() - INTERVAL '7 days'
  AND bn.notification_type = 'sms'
ORDER BY bn.sent_at DESC;
```

### Cron Job Logs

Check your deployment platform's logs to see cron job execution:

**Vercel:**
```bash
vercel logs --follow
```

**Heroku:**
```bash
heroku logs --tail --app your-app-name
```

## Customization

### Change Reminder Schedule

Edit the `REMINDER_DAYS_BEFORE` array in `/src/app/api/cron/send-bid-reminders/route.ts`:

```typescript
const REMINDER_DAYS_BEFORE = [3, 2, 1]; // Send 3, 2, and 1 days before
```

### Customize Message Template

Edit the SMS message template in the same file (line ~187):

```typescript
const message = `REMINDER: ${contractor.name}, you have ${daysUntil} day(s) left...`;
```

**Note:** Keep SMS messages under 160 characters for best delivery and to avoid multi-part messages.

### Adjust Cron Schedule

Change when reminders are sent by adjusting the cron schedule:

- `0 9 * * *` - Daily at 9 AM
- `0 9,17 * * *` - Daily at 9 AM and 5 PM
- `0 9 * * 1-5` - Weekdays only at 9 AM

## Troubleshooting

### Reminders Not Sending

1. **Check environment variables:**
   ```bash
   # Verify CRON_SECRET is set
   echo $CRON_SECRET

   # Verify Twilio is configured
   echo $TWILIO_ACCOUNT_SID
   echo $TWILIO_PHONE_NUMBER
   ```

2. **Check cron job logs:**
   - Look for `[BID REMINDERS]` log entries
   - Verify the cron job is being triggered

3. **Verify bid round status:**
   - Bid round must have `status = 'active'`
   - Deadline must be exactly 1 or 2 days away

4. **Check contractor data:**
   - Contractors must have phone numbers
   - Bids must have `status = 'draft'`

### Authentication Errors

If you get `401 Unauthorized`:

1. Verify `CRON_SECRET` matches in both:
   - Your `.env` file
   - Your cron service configuration

2. Ensure Authorization header is formatted correctly:
   ```
   Authorization: Bearer YOUR_SECRET_HERE
   ```

### No Reminders Found

This is normal if:
- No active bid rounds have deadlines 1-2 days away
- All contractors have already submitted bids
- Bid rounds don't have deadlines set
- No contractors have phone numbers

### SMS Delivery Failures

Check Twilio console for delivery errors:
- Invalid phone numbers
- Unsubscribed numbers
- International number restrictions
- Account balance/credits

## SMS Delivery Status Tracking

The system includes Twilio webhook integration to track SMS delivery status in real-time:

1. **Webhook endpoint**: `/api/webhooks/twilio/sms-status`
2. **Tracks statuses**: queued, sending, sent, delivered, failed, read
3. **Updates**: `bid_notifications` table automatically
4. **View in UI**: Notification History on bid round detail page

### Configure Twilio Webhook

In your Twilio console:
1. Go to your phone number settings
2. Under "Messaging", set "A Message Comes In" webhook to:
   ```
   https://yourdomain.com/api/webhooks/twilio/sms-status
   ```
3. Select "HTTP POST"

## Security

- **Authentication Required:** All cron job requests must include the `CRON_SECRET`
- **Server-Side Only:** Endpoint runs server-side with no user session required
- **Twilio Signature Verification:** SMS webhooks verify Twilio signatures
- **Rate Limiting:** Consider adding rate limiting for production

## Cost Considerations

- **SMS:** Charged per message via Twilio (~$0.0075 per SMS in US)
- **Cron Jobs:** Free on Vercel (Hobby plan), GitHub Actions
- **Database:** Minimal storage for bid_notifications table

## Next Steps

1. Deploy the application with cron job configured
2. Set up monitoring/alerting for failed reminders
3. Create a dashboard to track reminder metrics
4. Add ability to customize reminder schedules per bid round
5. Implement "snooze" or "opt-out" functionality for contractors
