# Environment Variables Setup Guide

## Quick Start

1. Copy the `.env.example` file to `.env`
2. Fill in all required values (especially `SUPABASE_SERVICE_ROLE_KEY`)
3. Restart your development server

## Required Environment Variables

### Supabase Configuration (REQUIRED)

#### `NEXT_PUBLIC_SUPABASE_URL`
- **What**: Your Supabase project URL
- **Where to get it**: Supabase Dashboard -> Settings -> API -> Project URL
- **Example**: `https://your-project.supabase.co`
- **Used for**: Client-side Supabase connections

#### `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **What**: Public Supabase anon/public key
- **Where to get it**: Supabase Dashboard -> Settings -> API -> anon public key
- **Used for**: Client-side authentication and queries

#### `SUPABASE_SERVICE_ROLE_KEY` ⚠️ CRITICAL
- **What**: Supabase service role key (server-side only, never expose to client)
- **Where to get it**: Supabase Dashboard -> Settings -> API -> service_role key (secret)
- **Why it's critical**:
  - **Required for database relationship queries** (payment_applications -> projects, etc.)
  - Allows schema access and foreign key validation
  - Needed for admin operations in API routes
  - Bypasses Row Level Security for server operations
- **Common Error**: "Could not find a relationship between X and Y" often means this key is missing or incorrect

### Twilio SMS Configuration (REQUIRED for SMS features)

#### `TWILIO_ACCOUNT_SID`
- **What**: Your Twilio account SID
- **Where to get it**: https://console.twilio.com/

#### `TWILIO_AUTH_TOKEN`
- **What**: Your Twilio auth token
- **Where to get it**: https://console.twilio.com/

#### `TWILIO_PHONE_NUMBER`
- **What**: Your Twilio phone number (format: +1234567890)
- **Where to get it**: Twilio Console -> Phone Numbers

### Application Configuration

#### `NEXT_PUBLIC_SITE_URL`
- **What**: Your application URL
- **Development**: `http://localhost:3000`
- **Production**: `https://yourdomain.com`
- **Used for**: Redirects, password reset links, etc.

#### `SECRET_KEY`
- **What**: Secret key for session encryption
- **How to generate**: Run `openssl rand -base64 32`
- **Used for**: CSRF protection, session encryption

### Optional Variables

#### `OPENAI_API_KEY`
- **What**: OpenAI API key (if using AI features)
- **Optional**: Only needed if using OpenAI integration

#### `DATABASE_URL`
- **What**: Direct PostgreSQL connection string
- **Optional**: Used for migrations and direct database access
- **Format**: `postgresql://user:password@host:port/database`

## Troubleshooting

### "Could not find a relationship between 'payment_applications' and 'projects'"

This error typically means:

1. **Missing `SUPABASE_SERVICE_ROLE_KEY`**: Check your `.env` file and ensure this variable is set
2. **Incorrect service role key**: Verify the key matches your Supabase project
3. **Foreign key constraint missing**: Run `scripts/verify-foreign-keys.sql` to check
4. **Stale schema cache**: Try restarting your development server

**Fix Steps**:
1. Open `.env` file
2. Ensure `SUPABASE_SERVICE_ROLE_KEY=your-service-role-key` is present
3. Get the key from: Supabase Dashboard -> Settings -> API -> service_role key
4. Restart the development server (`npm run dev`)
5. If still failing, run `scripts/fix-payment-app-foreign-keys.sql` in Supabase SQL editor

### Other Common Issues

- **"Missing Supabase URL or Anon Key"**: Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
- **SMS not sending**: Check `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_PHONE_NUMBER`
- **Duplicate entries**: Your `.env` file should have each variable only once

## Verifying Your Setup

After setting up your `.env` file:

1. Restart your development server
2. Check console for initialization messages
3. Look for: `[Supabase] Client initialized: Connected to...`
4. Look for: `[Supabase] Service role client available for relationship queries: true`

If you see errors about missing variables, check the error message for which variable is missing.









