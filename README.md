# Construction Operations Center

A comprehensive construction operations management platform for Stanton Management, featuring payment processing, project tracking, contractor management, and real-time dashboards.

## Features

- **Dashboard** - Action queue with urgent items, pending reviews, and ready-to-pay tracking
- **Projects** - Full project lifecycle management with budget tracking
- **Contractors** - Contractor cards with drag-drop ordering and payment status
- **Payments** - Payment application workflow with verification and approval
- **Change Orders** - Change order tracking and approval workflow
- **Field Ops** - Daily logs, punch lists, and site documentation
- **Budget** - Excel import, line item tracking, and variance analysis

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment (copy .env.example to .env and configure)
cp .env.example .env

# Start development server
npm run dev
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key for admin operations |
| `TWILIO_ACCOUNT_SID` | Optional | For SMS notifications |
| `TWILIO_AUTH_TOKEN` | Optional | For SMS notifications |
| `TWILIO_PHONE_NUMBER` | Optional | For SMS notifications |

See [docs/ENV_SETUP.md](./docs/ENV_SETUP.md) for detailed setup.

## Development

```bash
npm run dev          # Start dev server (Turbopack)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm test             # Run tests
```

## Tech Stack

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **Supabase** - PostgreSQL database + Auth
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Accessible component primitives
- **@dnd-kit** - Drag and drop functionality

## Documentation

| Document | Description |
|----------|-------------|
| [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) | System design and data flow |
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | Database tables and relationships |
| [STYLE_AND_DESIGN_SYSTEM.md](./STYLE_AND_DESIGN_SYSTEM.md) | UI/UX guidelines |
| [docs/](./docs/) | Feature documentation and setup guides |

## Project Structure

```
src/
├── app/
│   ├── api/           # API routes
│   ├── components/    # React components
│   ├── context/       # React contexts
│   └── lib/           # Utilities
├── lib/               # Shared libraries
docs/
├── archive/           # Historical documentation
├── PRD_*.md           # Product requirements
└── *.md               # Setup guides
```

## Deployment

Deployed on Railway with automatic builds from main branch. See [DEPLOYMENT.md](./DEPLOYMENT.md) for details.
