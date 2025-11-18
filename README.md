# ConstructionOpsStanton
Construction Ops Stanton

A construction operations management platform with payment processing, project tracking, and contractor management.

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account and project
- Twilio account (for SMS features)

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd ConstructionOpsStanton
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
# Copy the .env.example to .env (if it exists)
# Or see ENV_SETUP.md for required variables
```

See [ENV_SETUP.md](./ENV_SETUP.md) for detailed environment variable setup instructions.

4. Run database migrations
```bash
# Run scripts/verify-foreign-keys.sql in Supabase SQL Editor first
# Then run scripts/fix-payment-app-foreign-keys.sql if needed
```

5. Start development server
```bash
npm run dev
```

## Environment Variables

**CRITICAL**: Ensure all required environment variables are set, especially `SUPABASE_SERVICE_ROLE_KEY` which is required for database relationship queries.

See [ENV_SETUP.md](./ENV_SETUP.md) for complete documentation on environment variables.

### Required Variables
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` - **CRITICAL** - Required for relationship queries and admin operations
- `TWILIO_ACCOUNT_SID` - Twilio account SID (for SMS)
- `TWILIO_AUTH_TOKEN` - Twilio auth token (for SMS)
- `TWILIO_PHONE_NUMBER` - Twilio phone number (for SMS)

## Troubleshooting

### "Could not find a relationship between 'payment_applications' and 'projects'"

This error typically indicates:
1. Missing `SUPABASE_SERVICE_ROLE_KEY` in `.env` file
2. Foreign key constraints missing in database

**Fix Steps**:
1. Check your `.env` file has `SUPABASE_SERVICE_ROLE_KEY` set
2. Run `scripts/verify-foreign-keys.sql` in Supabase SQL Editor
3. If foreign keys are missing, run `scripts/fix-payment-app-foreign-keys.sql`
4. Restart your development server

See [ENV_SETUP.md](./ENV_SETUP.md) for detailed troubleshooting.

## Development

```bash
npm run dev          # Start development server with Turbopack
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm test             # Run tests
```

## Deployment

For deployment instructions, see the deployment guide in your hosting provider's documentation. Key points:

1. Ensure all environment variables are set in your hosting platform
2. Verify `SUPABASE_SERVICE_ROLE_KEY` is set (especially for relationship queries)
3. Run database migrations before deploying
4. Verify foreign key constraints exist using `scripts/verify-foreign-keys.sql`

## Architecture

Built with:
- **Next.js 15** - React framework with Server-Side Rendering
- **TypeScript** - Type-safe development
- **Supabase** - Database and authentication
- **Tailwind CSS** - Styling
- **Radix UI** - Accessible component primitives

See [CLAUDE.md](./CLAUDE.md) for detailed architecture documentation.
