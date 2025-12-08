# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development
npm run dev              # Start development server with Turbopack
npm run build            # Production build
npm run start            # Start production server
npm run lint             # Run ESLint

# Testing
npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage report
npm run test:ci          # Run tests for CI (no watch)
```

## Architecture Overview

### Technology Stack
- **Frontend**: Next.js 15 with React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes with Server-Side Rendering
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **UI Components**: Radix UI primitives with custom styling
- **Performance**: Turbopack for development, optimized webpack for production

### Core Application Structure

**Construction Project Management System** with role-based access:
- **Admin Role**: Full CRUD access, user management, system configuration
- **PM Role**: Project management focused dashboard with limited admin features
- **Staff Role**: Basic project viewing and data entry capabilities

### Key Architectural Patterns

#### 1. Context-Based State Management
- **DataContext** (`src/app/context/DataContext.tsx`): Centralized state for projects, contractors, contracts, and payment applications
- Uses React's `useReducer` for predictable state updates
- Implements optimistic updates for better UX (no full refreshes after operations)
- Has built-in loading states and error handling

#### 2. Role-Based Rendering
- Main entry point (`src/app/page.tsx`) routes users based on role:
  - PM role → `PMDashboard.tsx`
  - Admin/Staff → `ConstructionDashboard.tsx` (wrapped in DataProvider)
- Authentication state managed separately from application data

#### 3. Lazy-Loaded Tab Architecture
- **ConstructionDashboard** uses React.lazy() for code splitting
- Tab components only load when accessed
- Each major view (Projects, Payments, Manage, etc.) is a separate component

#### 4. Performance Optimizations
- **Batch Database Queries**: Uses `.in()` queries to avoid N+1 problems
- **Smart Caching**: 30-second cache on complex data fetches
- **Optimistic Updates**: Immediate UI updates followed by background sync
- **Lazy Loading**: Tab content and enhanced data only loads when needed

### Critical Components

#### ManageView (`src/app/components/ManageView.tsx`)
- Unified CRUD interface for Projects, Contractors, and Contracts
- Uses optimistic updates instead of full data refreshes
- Implements tab-based lazy loading with caching

#### DataContext State Flow
```typescript
// Optimistic update pattern used throughout
dispatch({ type: 'ADD_PROJECT', payload: newProject });
// UI updates immediately, no loading screens for operations
```

#### Performance-Critical Queries
- Project enhancement queries batch-fetch all related data
- Payment applications use status-based filtering at database level
- User management API uses service role for admin operations

### API Architecture

#### Authentication Pattern
- Uses Supabase Auth with JWT tokens
- API routes validate tokens and check user roles
- Service role client for admin operations (`/api/users`)

#### Key API Endpoints
- `/api/users` - User management (admin only)
- `/api/payments/*` - Payment application lifecycle
- `/api/projects/*` - Project and contractor management
- `/api/sms/*` - SMS integration with Twilio

### Database Considerations

#### Performance-Critical Indexes (if not already present):
```sql
CREATE INDEX IF NOT EXISTS idx_project_contractors_project_id ON project_contractors(project_id);
CREATE INDEX IF NOT EXISTS idx_payment_applications_project_id ON payment_applications(project_id);
CREATE INDEX IF NOT EXISTS idx_payment_applications_status ON payment_applications(status);
CREATE INDEX IF NOT EXISTS idx_project_contractors_project_status ON project_contractors(project_id, contract_status);
```

### File Upload and External Integrations
- **AWS S3**: File storage for documents and images
- **Twilio SMS**: Automated notifications and responses
- **PDF Generation**: pdf-lib for lien waivers and payment documents
- **DocuSign**: Document signing integration (payment applications)

### Performance Notes

#### Avoid These Patterns:
- Full data refreshes after CRUD operations (use optimistic updates)
- N+1 queries in list views (use batch queries with `.in()`)
- Loading entire component trees on initial render (use lazy loading)

#### Current Optimizations:
- Turbopack for development builds
- Webpack code splitting for vendor libraries (Supabase, Radix UI)
- Image optimization with WebP/AVIF formats
- Bundle analysis and tree shaking

### Development Workflow

When adding new features:
1. Check if DataContext needs new actions/state
2. Use optimistic updates for immediate UI feedback
3. Implement proper error handling and rollback
4. Add to appropriate tab in ConstructionDashboard or PMDashboard
5. Consider batch queries for any list operations
6. Test role-based access controls

### Testing Strategy
- Jest with jsdom environment
- Coverage reports available via `npm run test:coverage`
- Focus on critical business logic in DataContext and API routes