# Cron Job Setup Guide

## Overview

This system uses scheduled tasks (cron jobs) to handle automated workflows:
1. **Daily Task Reminders**: Sends SMS to contractors about tasks scheduled to start "tomorrow".
2. **PM Notes**: (Optional) Daily summary of notes or issues.

The primary endpoint for reminders is:
`GET /api/cron/daily-reminders`

## How it Works

The endpoint:
1. Checks for tasks where `scheduled_start` is tomorrow's date.
2. Filters for tasks that are `not_started` or `in_progress`.
3. Looks up the assigned contractor's phone number.
4. Sends an SMS reminder via the configured SMS provider (e.g., Twilio).
5. Logs the attempt in the `sms_log` table.

## Security

To prevent unauthorized access, the endpoint checks for a `CRON_SECRET` in the `Authorization` header:
`Authorization: Bearer <YOUR_CRON_SECRET>`

*Note: In the current development environment, this check might be commented out for easier testing.*

## Setup Instructions

### 1. Vercel Cron (Recommended)

If hosting on Vercel:
1. Create a file `vercel.json` in the root:
   ```json
   {
     "crons": [
       {
         "path": "/api/cron/daily-reminders",
         "schedule": "0 14 * * *"
       }
     ]
   }
   ```
   *(Schedule `0 14 * * *` runs at 14:00 UTC, which is 9:00 AM EST).*

### 2. Railway / Render / External Cron

If using an external service:
1. Set up a job to make a GET request to `https://your-domain.com/api/cron/daily-reminders`.
2. Add the header: `Authorization: Bearer <YOUR_CRON_SECRET>`.
3. Schedule it to run daily at your desired time (e.g., 7:00 AM).

### 3. Local Testing

You can test the cron locally by simply visiting the URL in your browser or using curl:
```bash
curl http://localhost:3000/api/cron/daily-reminders
```
Check the server logs or `/sms-logs` page to verify it ran.

## Environment Variables

Ensure these are set in your `.env`:
- `CRON_SECRET`: A secure random string.
- `OPENAI_API_KEY`: For AI features.
- `TWILIO_ACCOUNT_SID`: (If using real SMS)
- `TWILIO_AUTH_TOKEN`: (If using real SMS)
- `TWILIO_PHONE_NUMBER`: (If using real SMS)
