# Changelog

All notable changes to the Construction Operations Center project.

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
