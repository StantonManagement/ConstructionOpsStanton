# Claude AI Context - Construction Operations Center

This document provides context for Claude AI when working on this project.

## Project Overview

**Construction Operations Center** is a comprehensive construction management platform for Stanton Management. It manages the complete construction workflow from payment applications to field operations.

## Tech Stack

- **Framework:** Next.js 16.0.10 (App Router, Turbopack)
- **Language:** TypeScript (strict mode)
- **Database:** Supabase (PostgreSQL)
- **Styling:** Tailwind CSS
- **State Management:** React Query (@tanstack/react-query)
- **UI Components:** Radix UI primitives
- **SMS Integration:** Twilio
- **Deployment:** Railway (dev branch auto-deploys)

## Key Features

### 1. Payment Applications
- Upload and verify payment applications
- Photo verification with metadata
- Approval workflow
- SMS notifications to contractors

### 2. Project Management
- Project tracking with budget management
- Multiple contractors per project
- Change order tracking
- Document management

### 3. Daily Logs
**Recently Enhanced (March 2026)**
- Modern card-based UI with mobile-first design
- Real-time auto-refresh using Supabase Realtime
- Dual photo upload (camera + gallery)
- SMS integration for PM updates
- Smart navigation with returnTo parameters

### 4. Contractor Management
- Contractor directory with contact info
- Payment history
- W9 and insurance document storage
- Drag-and-drop ordering

### 5. Field Operations
- Punch lists with photo documentation
- Site inspection tracking
- Progress documentation

## Architecture Patterns

### File Organization
```
src/
├── app/
│   ├── api/              # API routes (Next.js Route Handlers)
│   ├── components/       # Page-level components
│   ├── [feature]/        # Feature-specific pages
│   └── layout.tsx        # Root layout
├── components/           # Shared/reusable components
├── hooks/               # Custom React hooks
├── lib/                 # Utilities and helpers
└── types/               # TypeScript type definitions
```

### Component Patterns
- **Client Components:** Use `"use client"` directive
- **Server Components:** Default for data fetching
- **Hooks:** Custom hooks in `/hooks` (e.g., `useDailyLogs.ts`)
- **Context:** Global state in `/app/context`

### Database Access
- **Client-side:** Use `supabase` client from `@/lib/supabaseClient`
- **Server-side:** Use `supabaseAdmin` for admin operations
- **Realtime:** Subscribe to postgres_changes for live updates

## Code Style & Best Practices

### TypeScript
- ✅ Use proper types (never use `any` unless absolutely necessary)
- ✅ Define interfaces for component props
- ✅ Use type inference where possible

### React Patterns
- ✅ Use functional components with hooks
- ✅ `useCallback` for functions passed as props
- ✅ `useMemo` for expensive calculations
- ✅ `useRef` for values that don't trigger re-renders
- ✅ `useEffect` cleanup functions for subscriptions

### Styling
- ✅ Tailwind utility classes (mobile-first: `sm:`, `md:`, `lg:`)
- ✅ Consistent spacing: `gap-3`, `p-4`, `mb-6`
- ✅ Color scheme: `bg-card`, `text-foreground`, `border-border`
- ✅ Responsive design: Always test mobile first

### Git Commits
- ✅ Clear, descriptive commit messages
- ✅ No AI attribution (no "Generated with Claude Code")
- ✅ Focus on what changed and why

## Common Tasks

### Adding a New Feature
1. Create page in `/app/[feature]/page.tsx`
2. Create component in `/components/[Feature].tsx`
3. Add API route in `/app/api/[feature]/route.ts`
4. Create hook in `/hooks/use[Feature].ts`
5. Add types in `/types/schema.ts`

### Database Queries
```typescript
// Client-side query
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('id', id);

// Server-side with relations
const { data } = await supabaseAdmin
  .from('table_name')
  .select(`
    *,
    related_table(id, name)
  `);
```

### Realtime Subscriptions
```typescript
useEffect(() => {
  const channel = supabase
    .channel('table-changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'table_name'
    }, (payload) => {
      // Handle update
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [dependencies]);
```

## Important Files

### Configuration
- `.env` - Environment variables (NOT committed)
- `next.config.ts` - Next.js configuration
- `tailwind.config.ts` - Tailwind configuration
- `tsconfig.json` - TypeScript configuration

### Core Utilities
- `src/lib/supabaseClient.ts` - Database client setup
- `src/lib/authFetch.ts` - Authenticated API requests
- `src/lib/phoneUtils.ts` - Phone number normalization
- `src/app/context/AuthProvider.tsx` - Authentication context

### Layout Components
- `src/app/components/AppLayout.tsx` - Main layout with sidebar
- `src/app/components/Sidebar.tsx` - Navigation sidebar
- `src/app/components/Header.tsx` - Top header bar

## Recent Updates (March 2026)

### Daily Logs Enhancement
**Files Modified:**
- `src/app/daily-logs/[id]/page.tsx` - Complete UI overhaul
- `src/components/DailyLogsList.tsx` - Added returnTo navigation
- `src/app/components/DailyLogsView.tsx` - Realtime auto-refresh
- `src/app/api/sms/webhook/route.ts` - Photo URL debugging

**Key Changes:**
- Real-time updates with Supabase postgres_changes
- Mobile-first responsive design
- Dual photo upload (camera + gallery)
- Smart navigation with returnTo parameters
- useRef pattern to prevent subscription recreation

**Git Commits (dev branch):**
- `dc1ae9c` - Add returnTo parameter for daily logs navigation
- `edd8c2b` - Fix realtime subscription stability with useRef
- `1da16b1` - Fix auto-refresh in modal and add photo loading debug
- `a022376` - Fix missing closing div tag
- And 4 more related commits

## Debugging

### Common Issues
1. **Realtime not working:** Check Supabase RLS policies
2. **Photos not loading:** Check CORS and bucket public settings
3. **Build failures:** Check for unclosed JSX tags
4. **Type errors:** Run `npm run build` to see all errors

### Logging
- Use descriptive console.log prefixes: `[FeatureName]`
- Add error boundaries for production
- Check Railway logs for server-side issues

## Environment-Specific Behavior

- **Development:** `npm run dev` on `localhost:3000`
- **Staging:** Railway dev branch at `dev-branch-production-1f0e.up.railway.app`
- **Production:** Railway main branch (TBD)

## Testing Checklist

Before pushing code, verify:
- ✅ TypeScript compilation (`npm run build`)
- ✅ Mobile responsiveness (test on phone or DevTools)
- ✅ Error handling (try edge cases)
- ✅ Cleanup functions (no memory leaks)
- ✅ Console logs removed (or prefixed for debugging)

## Support Documentation

See these files for detailed specs:
- `TWILIO_WEBHOOK_SETUP.md` - SMS integration
- `DARK_MODE_THEMING_GUIDE.md` - Theming system
- `BID_MANAGEMENT_SYSTEM.md` - Bid/payment workflow
- `USER_MANAGEMENT_STRATEGY.md` - User roles and auth

## Contact & Resources

- **Repository:** Private GitHub repo
- **Deployment:** Railway
- **Database:** Supabase (PostgreSQL)
- **SMS Provider:** Twilio

---

**Last Updated:** March 13, 2026
**Major Version:** Daily Logs v2.0 (Real-time enabled)
