# Deployment Guide

This guide provides step-by-step instructions for deploying ConstructionOpsStanton to Railway and Render, along with troubleshooting common deployment issues.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Deploying to Railway](#deploying-to-railway)
- [Deploying to Render](#deploying-to-render)
- [Environment Variables Setup](#environment-variables-setup)
- [Post-Deployment Verification](#post-deployment-verification)
- [Common Issues and Solutions](#common-issues-and-solutions)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before deploying, ensure:

- [ ] All required environment variables are documented (see [ENV_SETUP.md](./ENV_SETUP.md))
- [ ] Production build succeeds locally: `npm run build`
- [ ] Production server starts locally: `npm run start`
- [ ] Database migrations have been run in Supabase
- [ ] Foreign key constraints are verified (run `scripts/verify-foreign-keys.sql`)

## Deploying to Railway

Railway provides a modern platform-as-a-service with automatic deployments and excellent developer experience. This project uses Railway for both the main web service and scheduled cron jobs.

### Initial Setup

1. **Create a Railway Account**:
   - Go to [railway.app](https://railway.app) and sign in with your GitHub account
   - Railway offers a generous free tier and transparent pricing

2. **Create a New Project**:
   - Click "New Project" from your Railway dashboard
   - Select "Deploy from GitHub repo"
   - Connect your GitHub account if not already connected
   - Select your `ConstructionOpsStanton` repository

3. **Configure Web Service**:
   Railway will automatically detect your Next.js application and configure it.
   
   **Service Settings** (can be adjusted in service settings):
   - **Name**: `constructionops-web` (or your preferred name)
   - **Region**: Choose closest to your users (e.g., us-west1, us-east4)
   - **Build Command**: `npm install && npm run build` (auto-detected)
   - **Start Command**: `npm run start` (auto-detected)
   - **Node.js Version**: Detected from `.nvmrc` file (20)

4. **Configure Environment Variables**:
   - Go to your service in Railway
   - Click the "Variables" tab
   - Add all required variables (see [Environment Variables Setup](#environment-variables-setup) below)
   - **Critical**: Add `CRON_SECRET` for authenticating cron job requests

5. **Deploy**:
   - Railway automatically deploys on every push to your connected branch
   - Wait for the build to complete (check Deployments tab)
   - View build logs for any errors
   - Once deployed, Railway provides a public URL (e.g., `https://constructionops-web.up.railway.app`)

### Setting Up Cron Jobs on Railway

Railway requires cron jobs to be run as a separate service. This project includes configuration for running scheduled tasks.

#### Create Cron Jobs Service

1. **Add a New Service to Your Project**:
   - In your Railway project, click "New" → "Empty Service"
   - Name it `constructionops-cron`
   - Connect it to the same GitHub repository

2. **Configure Cron Service**:
   - **Root Directory**: Leave empty (same repo)
   - **Build Command**: `npm install` (specified in `railway-cron.toml`)
   - **Start Command**: `node scripts/railway-cron-runner.js`
   - **Railway Config File**: `railway-cron.toml`

3. **Set Environment Variables for Cron Service**:
   Add these variables to the cron service:
   - `RAILWAY_WEB_SERVICE_URL`: URL of your web service (e.g., `https://constructionops-web.up.railway.app`)
   - `CRON_SECRET`: Same secret used in web service for authentication
   - `NODE_VERSION`: `20` (to match main service)
   
   **Optional but recommended**:
   - Copy all environment variables from the web service (especially Supabase, Twilio)
   - This allows the cron runner to access the same resources

4. **Deploy Cron Service**:
   - Railway will automatically deploy the cron service
   - Check logs to verify cron jobs are scheduled:
     ```
     ✓ Cron jobs scheduled:
       - Daily Log Requests: 11:00 PM UTC daily (6:00 PM EST)
       - PM Notes: Every minute
     ```

#### Cron Jobs Schedule

The cron runner (`scripts/railway-cron-runner.js`) schedules:

1. **Daily Log Requests**: 
   - Runs at 11:00 PM UTC (6:00 PM EST) daily
   - Sends SMS reminders to PMs for daily log entries
   - Endpoint: `/api/cron/daily-log-requests`

2. **PM Notes**:
   - Runs every minute
   - Checks for scheduled PM notes and sends them
   - Endpoint: `/api/cron/pm-notes`

### Railway Configuration Files

The project includes two Railway configuration files:

**`railway.toml`** - Main web service configuration:
- Defines build and deploy commands
- Sets Node.js version
- Configures health checks and restart policy

**`railway-cron.toml`** - Cron jobs service configuration:
- Separate configuration for the cron runner
- Runs continuously to execute scheduled tasks

### Railway CLI (Optional)

Install the Railway CLI for local testing and deployment:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# View logs
railway logs

# Run commands in Railway environment
railway run npm run build
```

### Custom Domain (Optional)

1. Go to your service in Railway
2. Click "Settings" → "Domains"
3. Click "Generate Domain" for a custom railway.app subdomain
4. Or click "Custom Domain" to add your own domain
5. Follow DNS configuration instructions
6. Update `NEXT_PUBLIC_SITE_URL` to match your custom domain

## Deploying to Render

### Initial Setup

1. **Create a New Web Service**:
   - Go to [render.com](https://render.com) and sign in
   - Click "New +" → "Web Service"
   - Connect your GitHub account if not already connected
   - Select your `ConstructionOpsStanton` repository

2. **Configure Service Settings**:
   - **Name**: `constructionopsstanton` (or your preferred name)
   - **Region**: Choose closest to your users
   - **Branch**: `master` (or your main branch)
   - **Root Directory**: Leave empty (root of repository)
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
   - **Plan**: Choose appropriate plan (Free tier available)

3. **Set Environment Variables**:
   - Go to Environment section
   - Add all required variables (see [Environment Variables Setup](#environment-variables-setup) below)

4. **Advanced Settings**:
   - **Node Version**: Set to 20 (or it will use `.nvmrc` if present)
   - **Health Check Path**: `/api/health` (if you have one) or `/`

5. **Deploy**:
   - Click "Create Web Service"
   - Wait for the build to complete
   - Check build logs for any errors

### Environment Variables for Render

Navigate to: **Environment** tab in your Web Service settings

Add these variables:

**Required**:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **CRITICAL**
- `NEXT_PUBLIC_SITE_URL` (set to your Render deployment URL)
- `TWILIO_ACCOUNT_SID` (if using SMS)
- `TWILIO_AUTH_TOKEN` (if using SMS)
- `TWILIO_PHONE_NUMBER` (if using SMS)
- `SECRET_KEY`

**Optional**:
- `DATABASE_URL` (if using direct PostgreSQL connection)
- `OPENAI_API_KEY` (if using AI features)

### Render Auto-Deploy

Render automatically deploys when you push to your connected branch. To disable:
- Go to Settings → Auto-Deploy
- Toggle off if needed

### Render Health Checks

Render will automatically check if your service is responding. Ensure your app starts correctly by:
- Verifying `npm run start` works locally
- Checking that API routes respond correctly

## Environment Variables Setup

### Quick Reference

| Variable | Required | When | Platform Location |
|----------|----------|------|-------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Yes | Build + Runtime | Railway: Variables tab<br>Render: Environment tab |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Yes | Build + Runtime | Same as above |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Yes | Runtime | Same as above |
| `NEXT_PUBLIC_SITE_URL` | ✅ Yes | Build + Runtime | Same as above |
| `CRON_SECRET` | ✅ Yes (Railway) | Runtime | Railway only: both services |
| `RAILWAY_WEB_SERVICE_URL` | ✅ Yes (Railway) | Runtime | Railway cron service only |
| `TWILIO_ACCOUNT_SID` | ⚠️ Conditional | Runtime | Same as above |
| `TWILIO_AUTH_TOKEN` | ⚠️ Conditional | Runtime | Same as above |
| `TWILIO_PHONE_NUMBER` | ⚠️ Conditional | Runtime | Same as above |
| `SECRET_KEY` | ✅ Yes | Runtime | Same as above |

### Detailed Setup Instructions

#### For Railway:

1. Go to your project on railway.app
2. Select your service (web or cron)
3. Navigate to **Variables** tab
4. Click **New Variable**
5. Enter variable name and value
6. Click **Add** and the service will automatically redeploy

**Critical Notes**:
- Railway automatically makes all variables available at both build and runtime
- Changes to variables trigger automatic redeployment
- Use the `RAILWAY_ENVIRONMENT` variable to detect Railway in your code
- The web service needs `CRON_SECRET` to authenticate cron job requests
- The cron service needs `RAILWAY_WEB_SERVICE_URL` to call the web service endpoints

**Railway-Specific Variables**:
- `RAILWAY_ENVIRONMENT`: Automatically set by Railway (e.g., "production")
- `RAILWAY_WEB_SERVICE_URL`: Set manually in cron service to point to web service URL
- `CRON_SECRET`: Generate a random secret for authenticating cron requests

#### For Render:

1. Go to your Web Service on render.com
2. Navigate to **Environment** tab
3. Click **Add Environment Variable**
4. Enter variable name and value
5. Click **Save Changes**
6. Render will automatically redeploy

**Critical Notes**:
- All variables are available at both build and runtime in Render
- Changes to environment variables trigger automatic redeployment
- Be careful with `SUPABASE_SERVICE_ROLE_KEY` - it's sensitive

### Getting Your Keys

**Supabase Keys**:
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Settings** → **API**
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep secret!)

**Twilio Keys** (if using SMS):
1. Go to [Twilio Console](https://console.twilio.com)
2. Navigate to **Account** → **Account Info**
3. Copy **Account SID** → `TWILIO_ACCOUNT_SID`
4. Copy **Auth Token** → `TWILIO_AUTH_TOKEN`
5. Navigate to **Phone Numbers** → **Manage** → **Active numbers**
6. Copy your phone number → `TWILIO_PHONE_NUMBER` (format: `+1234567890`)

**Site URL**:
- **Development**: `http://localhost:3000`
- **Railway Production**: `https://your-service.up.railway.app` or your custom domain
- **Render Production**: `https://your-service.onrender.com` or your custom domain

**Secret Key**:
Generate a random secret key:
```bash
# On macOS/Linux:
openssl rand -base64 32

# On Windows (PowerShell):
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

**Cron Secret** (Railway only):
Generate a secure random string for authenticating cron job requests:
```bash
# Use the same method as Secret Key above
openssl rand -base64 32
```

## Post-Deployment Verification

After deploying, verify everything works:

### 1. Check Build Logs

**Railway**:
- Go to your service → Deployments tab
- Click on latest deployment → View Logs
- Look for any errors during build

**Render**:
- Go to your Web Service → Logs tab
- Check build logs for errors

### 2. Check Runtime Logs

**Railway**:
- Go to your service → View Logs (top right)
- Watch for Supabase initialization messages:
  - `[Supabase] Client initialized: Connected to...`
  - `[Supabase] Service role client available for relationship queries: true`

**Render**:
- Go to Logs tab
- Watch for same Supabase initialization messages

### 3. Verify Cron Jobs (Railway only)

- Go to the cron service → View Logs
- Look for cron startup messages:
  ```
  ✓ Cron jobs scheduled:
    - Daily Log Requests: 11:00 PM UTC daily (6:00 PM EST)
    - PM Notes: Every minute
  ```
- Watch for periodic execution logs

### 4. Test Critical Features

- [ ] **Homepage loads**: Visit your deployment URL
- [ ] **Authentication works**: Try logging in
- [ ] **API routes respond**: Test an API endpoint (e.g., `/api/projects`)
- [ ] **Database queries work**: Navigate to a page that fetches data
- [ ] **SMS features** (if enabled): Test sending an SMS
- [ ] **Cron jobs** (if Railway): Wait for scheduled time and check logs

### 5. Verify Environment Variables

Run the verification script locally with production URLs, or check logs for:
- Missing variable errors
- Connection errors
- Initialization messages

## Common Issues and Solutions

### Issue: "Missing required environment variables" during build

**Symptoms**:
- Build fails with error about missing variables
- `NEXT_PUBLIC_*` variables not available at runtime

**Solution**:
1. In Railway: Ensure all `NEXT_PUBLIC_*` variables are set in Variables tab
2. In Render: Ensure all variables are added in Environment tab
3. Trigger a new deployment after adding variables
4. Check deployment logs to verify variables are loaded

### Issue: "Could not find a relationship between X and Y"

**Symptoms**:
- Database queries fail with relationship errors
- API routes return 500 errors

**Solution**:
1. Verify `SUPABASE_SERVICE_ROLE_KEY` is set in deployment platform
2. Check deployment logs for Supabase initialization messages
3. Run `scripts/verify-foreign-keys.sql` in Supabase SQL Editor
4. If missing, run `scripts/fix-payment-app-foreign-keys.sql`

### Issue: Build succeeds but app crashes at runtime

**Symptoms**:
- Build completes successfully
- App returns 500 errors or blank pages
- Runtime logs show errors

**Solution**:
1. Check runtime logs for specific error messages
2. Verify all environment variables are set (especially `SUPABASE_SERVICE_ROLE_KEY`)
3. Check for Node.js version mismatches
4. Verify database connection works
5. Test API routes individually

### Issue: API routes return 404 in production

**Symptoms**:
- API routes work locally but not in production
- 404 errors for `/api/*` routes

**Solution**:
1. Verify Next.js API routes are in `src/app/api/` directory
2. Ensure proper route structure
3. Check for case-sensitive path issues
4. Verify build includes API routes (check build logs)

### Issue: Environment variables not updating

**Symptoms**:
- Changed variables in platform but app still uses old values
- `NEXT_PUBLIC_*` variables seem cached

**Solution**:
1. **Railway**: Variables update automatically, service restarts after save
2. **Render**: Variables update automatically, service needs to restart
3. Manually trigger a redeploy if automatic deployment doesn't start
4. Verify variables are actually saved in platform dashboard
5. For `NEXT_PUBLIC_*` vars, ensure you triggered a new build

### Issue: Cron jobs not running (Railway)

**Symptoms**:
- Cron service is running but jobs don't execute
- No cron execution logs appearing

**Solution**:
1. Check cron service logs for startup messages
2. Verify `RAILWAY_WEB_SERVICE_URL` is set correctly in cron service
3. Verify `CRON_SECRET` matches between web and cron services
4. Check web service logs for incoming cron requests
5. Ensure cron service is using `railway-cron.toml` configuration
6. Verify `node-cron` is installed in dependencies

### Issue: CORS errors in production

**Symptoms**:
- Requests from frontend fail with CORS errors
- Works locally but not in production

**Solution**:
1. Check `NEXT_PUBLIC_SITE_URL` is set to production URL
2. Verify Supabase project allows requests from production domain
3. Check Supabase Dashboard → Settings → API → Allowed origins
4. Ensure your deployment URL is whitelisted

## Troubleshooting

### Quick Diagnosis Steps

1. **Check Build Logs**:
   - Look for environment variable errors
   - Check for compilation errors
   - Verify dependencies installed correctly

2. **Check Runtime Logs**:
   - Look for Supabase initialization messages
   - Check for missing variable errors
   - Look for database connection errors

3. **Test Locally with Production Build**:
   ```powershell
   npm run build
   npm run start
   ```
   This simulates production environment locally

4. **Verify Environment Variables**:
   - Compare variables in deployment platform with your local `.env`
   - Ensure all required variables are present
   - Check for typos in variable names

5. **Check Node.js Version**:
   - Verify platform uses Node 20 (or version specified in `.nvmrc`)
   - Check `package.json` engines field

6. **Test Cron Jobs Locally** (Railway):
   ```powershell
   # Set environment variables
   $env:RAILWAY_WEB_SERVICE_URL="http://localhost:3000"
   $env:CRON_SECRET="test-secret"
   
   # Run cron runner
   node scripts/railway-cron-runner.js
   ```

### Getting Help

If issues persist:

1. **Check Logs**: Full deployment and runtime logs provide the most clues
2. **Verify Configuration**: Double-check all environment variables
3. **Test Locally**: Ensure production build works locally first
4. **Review Documentation**:
   - [ENV_SETUP.md](./ENV_SETUP.md) - Environment variable details
   - [README.md](./README.md) - Project setup
   - Platform-specific docs: [Railway](https://docs.railway.app) | [Render](https://render.com/docs)

### Verification Script

Use the included verification script to check your deployment:

```powershell
# Run verification script
npm run verify:db
```

Or verify environment variables are set:

```powershell
# Check environment variables script
node scripts/verify-env-production.js
```

## Additional Resources

- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)
- [Railway Documentation](https://docs.railway.app)
- [Render Documentation](https://render.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Environment Variables Setup](./ENV_SETUP.md)
