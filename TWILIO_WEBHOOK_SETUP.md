# Twilio Webhook Setup Guide

## Current Status
- ✅ Webhook code implemented and working
- ✅ Test utility available at `/test-webhook`
- ✅ Webhook endpoint exists: `/api/webhooks/twilio/sms-incoming`
- ⚠️ **Twilio configuration required** (manual setup in Twilio Console)

## Overview

The webhook code is **fully functional**. You can test it locally without Twilio using the built-in test page at:
```
http://localhost:3000/test-webhook
```

The issue is that **Twilio needs to be configured** in the Twilio Console to send webhook requests to your server.

## Problem
Twilio is receiving incoming SMS but not calling your webhook. This means the configuration in Twilio Console is either:
1. Not saved properly
2. Blocked by Studio Flow
3. Using wrong settings

**This is a configuration issue, not a code issue.**

---

## TEST WEBHOOK LOCALLY (Recommended First Step)

Before configuring Twilio, verify the webhook logic works:

### Option 1: Use Web Interface (Easiest)
1. Navigate to: `http://localhost:3000/test-webhook`
2. Enter phone number (e.g., `+18603516816`)
3. Enter bid amount (e.g., `$777`)
4. Click "Send Test Webhook"
5. Check response to see if bid was created/updated

### Option 2: Use cURL
```bash
curl -X POST http://localhost:3000/api/webhooks/twilio/test-webhook \
  -H "Content-Type: application/json" \
  -d '{"phone":"+18603516816","message":"$777"}'
```

### Option 3: Direct Webhook Test
```bash
curl -X POST http://localhost:3000/api/webhooks/twilio/sms-incoming \
  -d "From=+18603516816" \
  -d "Body=\$777" \
  -d "MessageSid=TEST123"
```

**Requirements for test to work:**
- An active bid round exists in the database
- A bid invitation was sent to the test phone number
- The phone number matches the one in the notification

If the test works locally, then the webhook code is fine and you just need to configure Twilio.

---

## CONFIGURE TWILIO (After Local Test Passes)

### Step 1: Go to Twilio Console
1. Open: https://console.twilio.com
2. Navigate to: **Phone Numbers** → **Manage** → **Active numbers**
3. Click on your number: **(860) 689-1617**

### Step 2: Disable Studio Flow (IMPORTANT!)
1. Scroll to **"Configure with"** dropdown at the top
2. If it shows "Studio Flow", change it to:
   - **"Webhooks, TwiML Bins, Functions, Studio, or Proxy"**
3. This is CRITICAL - Studio Flow intercepts all messages

### Step 3: Configure Messaging Webhook
1. Scroll to **"Messaging Configuration"** section
2. Under **"A message comes in"**:
   - **URL:** `https://e44e-2001-4450-4f76-2f00-8152-dde7-579b-11e0.ngrok-free.app/api/webhooks/twilio/sms-incoming`
   - **Method:** `POST` (not GET)

3. Under **"Primary Handler Fails"** (optional but recommended):
   - Leave blank or set to same URL

### Step 4: SAVE THE CONFIGURATION ⚠️
1. Scroll to the **BOTTOM** of the page
2. Click the **"Save configuration"** button
3. Wait for success message

### Step 5: Test the Webhook
1. From your phone (+1 860 351 6816), send an SMS to (860) 689-1617:
   ```
   $777
   ```

2. Check your terminal - you should see:
   ```
   [INCOMING SMS] Received webhook from Twilio
   [INCOMING SMS] From: +18603516816, Body: "$777"
   [INCOMING SMS] Parsed bid amount: $777
   [INCOMING SMS] Matched to bid round: TEST ROUND (ID: 2)
   [INCOMING SMS] Contractor: Zeff (ID: 1)
   [INCOMING SMS] Created new bid 123 with amount: $777
   ```

3. You should receive a confirmation SMS back

### Step 6: Verify in Twilio Logs
1. Go to **Monitor** → **Logs** → **Messaging**
2. Click on the most recent incoming message
3. Verify you see:
   - **Webhook URL:** Shows your ngrok URL
   - **Webhook Response:** 200 OK (green)

---

## Troubleshooting

### If you still don't see webhook calls:

**Check 1: Is ngrok URL correct?**
```bash
curl http://localhost:4040/api/tunnels
```
Should show: `https://e44e-2001-4450-4f76-2f00-8152-dde7-579b-11e0.ngrok-free.app`

**Check 2: Test webhook locally**
```bash
# Test the endpoint directly
curl -X POST http://localhost:3000/api/webhooks/twilio/sms-incoming \
  -d "From=+18603516816" \
  -d "Body=\$777" \
  -d "MessageSid=TEST123"
```

You should see `[INCOMING SMS]` logs in your terminal.

**Check 3: ngrok inspector**
- Open: http://localhost:4040
- Send test SMS
- Check if any requests appear (should show POST to `/api/webhooks/twilio/sms-incoming`)

**Check 4: Studio Flow**
- Go to **Studio** → **Flows**
- Check if "Payment Application" flow is active
- If yes, either delete it or make sure it's not assigned to your phone number

---

## Common Mistakes

1. ❌ Filling in the URL but not clicking "Save configuration"
2. ❌ Leaving "Configure with" as "Studio Flow"
3. ❌ Using HTTP instead of HTTPS in webhook URL
4. ❌ Forgetting to include `/api/webhooks/twilio/sms-incoming` path
5. ❌ Selecting GET instead of POST

---

## What Should Happen

**Correct Flow:**
1. You send SMS: "$777" → (860) 689-1617
2. Twilio receives the SMS
3. Twilio sends POST request to your ngrok webhook
4. Your Next.js API receives it at `/api/webhooks/twilio/sms-incoming`
5. Code parses "$777" → 777
6. Code finds your recent bid invitation
7. Code creates/updates bid in database
8. Code sends confirmation SMS back to you

**Current Flow (BROKEN):**
1. You send SMS: "$777" → (860) 689-1617
2. Twilio receives the SMS
3. ~~Twilio sends POST request~~ ← NOT HAPPENING
4. Studio Flow might be responding instead
5. OR configuration not saved

---

## ngrok URL Updates

**NOTE:** If you restart ngrok, the URL will change!

If ngrok URL changes, you must:
1. Get new URL: `curl http://localhost:4040/api/tunnels | grep public_url`
2. Update Twilio webhook URL
3. Click "Save configuration"

Current URL expires when ngrok process stops.

---

## Production Setup (After Testing)

For production, replace ngrok with your actual domain:
```
https://your-domain.com/api/webhooks/twilio/sms-incoming
```

This will be stable and won't need updates.
