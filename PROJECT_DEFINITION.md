# ConstructionOps Project Definition

## Project Overview

**ConstructionOps** (also referred to as ConstructionOpsStanton) is a comprehensive construction project management system designed for managing projects, contractors, contracts, and payment applications. The application provides role-based access control with different views and capabilities for Admin, Project Manager (PM), and Staff roles.

## Technology Stack

### Frontend
- **Framework**: Next.js 15 with React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: Radix UI primitives with custom styling
- **Performance**: Turbopack for development, optimized webpack for production

### Backend
- **API**: Next.js API routes with Server-Side Rendering
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Authentication**: Supabase Auth with JWT tokens

### External Integrations
- **AWS S3**: File storage for documents and images
- **Twilio SMS**: Automated notifications and SMS communication
- **PDF Generation**: pdf-lib for lien waivers and payment documents (G-703 forms)
- **DocuSign**: Document signing integration (payment applications) - *referenced but needs verification*

## Architecture Overview

### Core Patterns

1. **Context-Based State Management**
   - `DataContext` (`src/app/context/DataContext.tsx`): Centralized state for projects, contractors, contracts, and payment applications
   - Uses React's `useReducer` for predictable state updates
   - Implements optimistic updates for better UX (no full refreshes after operations)
   - Built-in loading states and error handling

2. **Role-Based Rendering**
   - Main entry point (`src/app/page.tsx`) routes users based on role:
     - PM role → `PMDashboard.tsx`
     - Admin/Staff → `ConstructionDashboard.tsx` (wrapped in DataProvider)
   - Authentication state managed separately from application data

3. **Lazy-Loaded Tab Architecture**
   - `ConstructionDashboard` uses React.lazy() for code splitting
   - Tab components only load when accessed
   - Each major view is a separate component

4. **Performance Optimizations**
   - Batch Database Queries: Uses `.in()` queries to avoid N+1 problems
   - Smart Caching: 30-second cache on complex dataytt fetches
   - Optimistic Updates: Immediate UI updates followed by background sync
   - Lazy Loading: Tab content and enhanced data only loads when needed

### Key Components

#### Dashboard Views
- **ConstructionDashboard** (`src/app/components/ConstructionDashboard.tsx`): Main dashboard with tab-based navigation
- **PMDashboard** (`src/app/components/PMDashboard.tsx`): Specialized dashboard for Project Managers
- **OverviewView** (`src/app/components/OverviewView.tsx`): Dashboard overview with stats and decision queue

#### Feature Views
- **ProjectsView** (`src/app/components/ProjectsView.tsx`): Project listing with details and statistics
- **PaymentApplicationsView** (`src/app/components/PaymentApplicationsView.tsx`): Payment application management and review
- **PaymentProcessingView** (`src/app/components/PaymentProcessingView.tsx`): Payment processing workflow
- **ManageView** (`src/app/components/ManageView.tsx`): Unified CRUD interface for Projects, Contractors, and Contracts
- **SubcontractorsView** (`src/app/components/SubcontractorsView.tsx`): Subcontractor management
- **UserManagementView** (`src/app/components/UserManagementView.tsx`): User account and role management
- **DailyLogsView** (`src/app/components/DailyLogsView.tsx`): Daily log request management
- **SubcontractorSelectionView** (`src/app/components/SubcontractorSelectionView.tsx`): Contractor selection for payment requests
- **ComplianceView** (`src/app/components/ComplianceView.tsx`): Compliance metrics display
- **MetricsView** (`src/app/components/MetricsView.tsx`): Analytics and metrics dashboard

#### Specialized Pages
- **Payment Verification Page** (`src/app/payments/[id]/verify/page.tsx`): Detailed payment application review and approval workflow

#### Shared Components
- **UserProfile** (`src/app/components/UserProfile.tsx`): User profile management slide-out panel
- **Navigation** (`src/app/components/Navigation.tsx`): Main navigation component
- **ActionButton** (`src/components/ActionButton.tsx`): Semantic button wrappers

## Database Schema

### Core Tables
- `projects`: Project information
- `contractors`: Contractor/vendor information
- `contracts` (via `project_contractors`): Contract relationships between projects and contractors
- `payment_applications`: Payment application records
- `payment_line_item_progress`: Line item progress for payment applications
- `project_line_items`: Line items for projects
- `users`: User accounts
- `user_role`: Role assignments
- `daily_log_requests`: Daily log request automation
- `payment_documents`: Document attachments for payments
- `invoices`: Generated invoice records

### Key Relationships
- Projects ↔ Contractors (many-to-many via `project_contractors`)
- Projects → Payment Applications (one-to-many)
- Contractors → Payment Applications (one-to-many)
- Payment Applications → Payment Line Item Progress (one-to-many)
- Payment Applications → Project Line Items (via progress records)

## Current Feature Status

### ✅ Fully Functional Features

#### Overview & Dashboard
- Dashboard statistics (projects, budget, spent, remaining)
- Budget breakdown modals (budget, spent, progress details)
- Decision queue for payment applications needing review
- Project listing with enhanced statistics
- Click-through navigation to detailed views

#### Project Management
- Project CRUD operations (Create, Read, Update, Delete)
- Project detail modal with comprehensive information
- Contract management (add, edit, view, delete)
- Line item management within contracts
- Budget tracking and calculations
- Project status management

#### Payment Processing
- Payment application creation via SMS initiation
- Payment application listing with filters and search
- Bulk operations (delete, selection)
- Payment verification page with full approval workflow
- Line item percentage editing
- Change order management
- PDF generation (G-703 forms)
- Approval/rejection/recall workflows on verification page
- Payment application status tracking

#### User & Contractor Management
- User CRUD operations
- Role management (Admin, PM, Staff)
- Password reset functionality
- Contractor/subcontractor CRUD
- Contractor contact information management
- SMS contact functionality

#### Daily Logs
- Daily log request creation
- Automated SMS request scheduling
- PM notes tracking from payment applications
- Request status management

#### Compliance & Metrics
- Compliance metrics display
- Project-by-project compliance tracking
- Analytics dashboard

### ⚠️ Partially Implemented / Needs Work

1. **PaymentApplicationsView - Approve/Reject Buttons**
   - Status: Dialogs exist but don't call API endpoints
   - Issue: Dialog confirmation handlers only close dialog, don't execute approval/rejection
   - Fix Needed: Connect to `/api/payments/{id}/approve` and `/api/payments/{id}/reject` endpoints (which already exist)

2. **PaymentApplicationsView - Bulk Approve**
   - Status: Button exists, handler only logs to console
   - Issue: No bulk approval logic implemented
   - Fix Needed: Implement batch approval workflow

3. **PaymentApplicationsView - Send for Signature**
   - Status: Button exists, function only logs
   - Issue: No signature sending implementation
   - Fix Needed: Integrate with DocuSign or implement signature workflow

4. **PaymentProcessingView - Send Reminder**
   - Status: Shows alert placeholder
   - Issue: Should open Reminder Modal, not alert
   - Fix Needed: Create Reminder Modal component with SMS/email options

5. **PaymentProcessingView - Prepare Payment**
   - Status: Shows alert placeholder
   - Issue: Should open Payment Preparation Modal, not alert
   - Fix Needed: Create Payment Preparation Modal for invoice/workflow preparation

6. **PMDashboard - Send SMS**
   - Status: Button placeholder
   - Issue: Needs SMS sending implementation
   - Fix Needed: Integrate with Twilio SMS API

7. **PMDashboard - Sign Document**
   - Status: Button placeholder
   - Issue: Needs document signing implementation
   - Fix Needed: Integrate with DocuSign

8. **ManageView - Export**
   - Status: Shows "Export feature coming soon!" notification
   - Issue: Export functionality not implemented
   - Fix Needed: Implement CSV/Excel export for contracts

### ❌ Known Limitations

- Photo/image upload features excluded from scope (not audited)
- Some database relationship queries may need fallback patterns (already implemented in some views)
- Invoice generation code is commented out in approval endpoint (commented for deployment reasons)

## API Endpoints

### Payment Endpoints
- `POST /api/payments/{id}/approve` - Approve payment application ✅
- `POST /api/payments/{id}/reject` - Reject payment application ✅
- `POST /api/payments/{id}/recall` - Recall approved payment application ✅
- `POST /api/payments/{id}/update-percentage` - Update line item percentages ✅
- `POST /api/payments/initiate` - Initiate payment requests via SMS ✅

### User Management
- `/api/users` - User management (admin only) ✅

### Notifications
- `POST /api/notifications/vendor` - Send vendor notifications ✅
- `/api/sms/*` - SMS integration endpoints

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

## Environment Variables

Key environment variables needed (see `.env.example`):
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for admin operations)
- `TWILIO_ACCOUNT_SID` - Twilio account SID
- `TWILIO_AUTH_TOKEN` - Twilio authentication token
- `TWILIO_PHONE_NUMBER` - Twilio phone number
- AWS credentials for S3 (if used)

## Project Structure

```
src/
├── app/
│   ├── components/          # Main React components
│   ├── context/             # React Context providers (DataContext)
│   ├── api/                 # API routes
│   │   ├── payments/        # Payment-related endpoints
│   │   ├── users/           # User management endpoints
│   │   └── notifications/   # Notification endpoints
│   ├── payments/[id]/verify/ # Payment verification page
│   ├── pm-dashboard/        # PM-specific dashboard page
│   └── page.tsx             # Main entry point
├── components/
│   ├── ui/                  # UI primitives (Dialog, Button, etc.)
│   └── ActionButton.tsx     # Semantic button components
└── lib/
    ├── supabaseClient.ts    # Supabase client setup
    ├── g703Pdf.ts           # PDF generation utilities
    └── sms.ts               # SMS utility functions
```

## Design System

The project uses a custom design system with:
- Color variables (primary, secondary, status colors)
- Consistent spacing and typography
- Status-based color coding (success, warning, critical, neutral)
- Responsive design patterns
- Modern gradient and shadow effects

## Security Considerations

- Row Level Security (RLS) enabled on Supabase tables
- JWT token validation on API routes
- Role-based access control enforced in UI and API
- Service role client used only for admin operations
- Input validation on all forms

## Testing Strategy

- Jest with jsdom environment
- Coverage reports available via `npm run test:coverage`
- Focus on critical business logic (DataContext, API routes)
- Component testing for UI elements

## Deployment

- Configured for Vercel deployment
- Environment variables required for production
- Database migrations may need to be run separately
- File uploads require S3 bucket configuration

## Code Quality Notes

### Strengths
- Consistent component structure
- Good separation of concerns (Context, API, Components)
- Optimistic updates for better UX
- Error handling in place
- Loading states properly managed
- TypeScript for type safety

### Areas for Improvement
- Some duplicate code patterns could be extracted to utilities
- Form validation could be more centralized
- Error messages could be more user-friendly in some places
- Some components are quite large and could be split
- API error handling could be more consistent

## Documentation

- `BUTTONS_AND_MODALS_AUDIT.md` - Comprehensive audit of all buttons and modals
- `CLAUDE.md` - Development guidelines and architecture notes
- `README.md` - Basic project setup instructions
- Various setup guides (DATABASE_SETUP_GUIDE.md, ENV_SETUP.md, etc.)

## Immediate Next Steps (Based on Audit)

1. **High Priority**
   - Fix PaymentApplicationsView approve/reject button handlers
   - Create Reminder Modal and Payment Preparation Modal in PaymentProcessingView
   - Implement bulk approve functionality

2. **Medium Priority**
   - Implement signature sending workflow
   - Complete SMS and document signing in PMDashboard

3. **Low Priority**
   - Add export functionality to ManageView
   - Refactor large components
   - Improve error messaging consistency

## Questions for Discussion

1. **Feature Priorities**: Which of the partially implemented features should be prioritized?

2. **Architecture Decisions**: 
   - Should we refactor large components now or after completing missing features?
   - Should we add more comprehensive error boundaries?
   - Should we implement a more robust state management solution?

3. **Integration Questions**:
   - DocuSign integration status - is it configured and working?
   - AWS S3 setup status - are file uploads functional?
   - Are there other third-party integrations needed?

4. **Testing**: 
   - Should we add more comprehensive test coverage?
   - Which areas need the most testing attention?

5. **Performance**:
   - Are there any performance bottlenecks you've noticed?
   - Should we implement additional caching strategies?

6. **User Experience**:
   - Are there any UX improvements you'd like to prioritize?
   - Should we add more loading states or skeleton screens?

7. **Database**:
   - Are all relationships properly configured?
   - Do we need any additional indexes for performance?

---

**Last Updated**: Based on comprehensive audit completed [Date]
**Project Status**: Active development, core features functional, some features need completion








