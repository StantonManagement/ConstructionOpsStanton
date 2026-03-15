# Changelog

All notable changes to the Construction Operations Center project.

## [2.2.0] - 2026-03-16

### Daily Logs - Independent Navigation & UX Improvements

#### Added
- **Independent daily logs page** - Completely separate navigation flow from project sidebar
- **Project-centric view** - Shows project cards first, then logs when project is clicked
- **State-based navigation** - Uses local state instead of URL navigation for cleaner UX
- **Back button navigation** - Easy return to projects grid from log view
- **Search functionality** - Filter projects by name or client
- **New Log button** - Create logs directly from the independent daily logs page

#### Changed
- **Separated daily log features** - Split into two distinct menu items:
  - "Daily Logs" (/daily-logs) - View and manage field logs by project
  - "Daily Log Requests" (/daily-logs/requests) - Track SMS requests
- **Simplified camera component** - Fixed video element lifecycle for reliable camera capture
- **Improved accessibility** - Added VisuallyHidden DialogTitle for Radix UI dialogs
- **Enhanced project cards** - Better visual design with gradients and hover effects
- **Streamlined buttons** - Request Payment and Edit on single row, icon-only Edit button

#### Fixed
- **Camera black screen issue** - Fixed video element timing with proper event handlers
- **Submit navigation delay** - Added 500ms timeout for reliable page transitions
- **URL encoding** - Properly encode returnTo parameters with special characters
- **React Hooks order** - Fixed hooks called after conditional returns
- **API flexibility** - Made project_id optional in daily logs API endpoint

#### Technical Details
- Created useProjects hook for fetching project list
- Created useAllDailyLogs hook for fetching logs across all projects
- Implemented conditional rendering based on selectedProjectId state
- Added comprehensive event handlers (onLoadedMetadata, onCanPlay, onPlaying)
- Used encodeURIComponent for returnTo parameter URL safety

---

## [2.1.0] - 2026-03-13

### Daily Logs - Major Enhancement

#### Added
- **Real-time auto-refresh** - Page automatically updates when SMS replies are received using Supabase Realtime
- **Dual photo upload options** - Both camera capture and gallery selection for photos
- **AppLayout integration** - Sidebar now visible on all daily log pages
- **Smart navigation** - returnTo parameter ensures users return to correct project tab after submission
- **Photo debugging** - Console logging for photo URL generation and loading
- **Error handling** - Image fallback when photos fail to load

#### Changed
- **Complete UI overhaul** - Modern card-based design with mobile-first approach
- **Photos section** - Responsive grid (2→3→4 columns), improved empty states
- **Notes section** - Larger textarea with better focus states
- **Audio section** - Redesigned cards with icons and better mobile layout
- **Action buttons** - Sticky positioning on mobile with backdrop blur effect
- **Improved responsiveness** - All sections optimized for mobile, tablet, and desktop

#### Fixed
- **Realtime subscription stability** - Used useRef to prevent subscription recreation
- **JSX structure errors** - Fixed missing closing tags causing build failures
- **Supabase client null errors** - Added proper null checks before using client
- **Modal auto-refresh** - Selected request now updates in real-time when modal is open
- **Navigation flow** - Users properly return to project daily logs tab after submission

#### Technical Details
- Implemented Supabase postgres_changes subscription
- Added comprehensive error handling and logging
- Used React useRef pattern for stable subscriptions
- Enhanced TypeScript types for better type safety
- Mobile-first Tailwind CSS utilities throughout

**Commits:**
- `dc1ae9c` - Add returnTo parameter for daily logs navigation
- `edd8c2b` - Fix realtime subscription stability with useRef
- `1da16b1` - Fix auto-refresh in modal and add photo loading debug
- `a022376` - Fix missing closing div tag
- `ce3c41e` - Fix JSX structure - add missing AppLayout closing tag
- `ae80d93` - Fix supabase client null check for realtime subscription
- `6968cb7` - Add realtime auto-refresh for daily log requests and photo URL debugging
- `55fe593` - Improve daily log edit page layout and mobile responsiveness

---

## [2.0.0] - 2026-01-19

### Initial Release
- Dashboard with action queue
- Project management with budget tracking
- Contractor management with drag-drop ordering
- Payment application workflow
- Change order tracking
- Field operations (daily logs, punch lists)
- Budget management with Excel import
- SMS integration via Twilio
- Photo verification with metadata
- Document management

---

## Version Format

Version numbers follow Semantic Versioning (MAJOR.MINOR.PATCH):
- **MAJOR** - Breaking changes
- **MINOR** - New features (backwards compatible)
- **PATCH** - Bug fixes (backwards compatible)
